<?php
/**
 * vpress_figure_rows() / vpress_figure_alt_text() / vpress_figure_data_table().
 *
 * @package Vpress
 */

use PHPUnit\Framework\TestCase;

final class FigureTextTest extends TestCase {

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		vpress_guard_columns_reset();
		vpress_figure_rows_reset();
		$this->wpdb      = new FakeWpdb();
		$GLOBALS['wpdb'] = $this->wpdb;
	}

	private static function chart( array $value, array $row = array() ): object {
		return (object) array_merge(
			array(
				'id'          => '1',
				'dataset_id'  => '2',
				'title'       => null,
				'permissions' => 'public',
				'value'       => json_encode( $value ),
			),
			$row
		);
	}

	private static function bars( array $overrides = array() ): array {
		return array_merge(
			array(
				'chart'   => 'bars',
				'xAxis'   => array( 'title' => 'Estado', 'type' => 'ordinal', 'slug' => 'estado' ),
				'yAxis'   => array( 'title' => 'Ventas', 'type' => 'linear', 'slug' => 'ventas', 'func' => 'sum' ),
				'groupBy' => array( 'title' => '', 'type' => '', 'slug' => '' ),
			),
			$overrides
		);
	}

	private static function chart_1_rows(): array {
		return json_decode( file_get_contents( __DIR__ . '/fixtures/chart-1-rows.json' ), true );
	}

	// --- vpress_figure_rows ------------------------------------------------

	private function script_chart_1_database(): void {
		$this->wpdb->on( '/vpresscore_datasets WHERE id = 2$/', (object) array( 'slug' => VpressFixtures::DATASET_SLUG, 'source' => null ) );
		$this->wpdb->on( '/^SHOW COLUMNS FROM `vpress_vpress_test_ventas`$/', VpressFixtures::real_columns() );
		$this->wpdb->on( '/^SELECT .* FROM `vpress_vpress_test_ventas` as f1/', self::chart_1_rows() );
	}

	public function test_rows_run_the_saved_query_through_the_hardened_builder(): void {
		$this->script_chart_1_database();
		$chart = (object) array( 'id' => '1', 'dataset_id' => '2', 'permissions' => 'public', 'value' => VpressFixtures::CHART_1_VALUE );

		$rows = vpress_figure_rows( $chart );

		$this->assertSame( self::chart_1_rows(), $rows );
		$select = end( $this->wpdb->queries );
		$this->assertSame(
			'SELECT f1.`estado`,f1.`canal`,SUM(`ventas`) AS `ventas` FROM `vpress_vpress_test_ventas` as f1 GROUP BY f1.`estado`,f1.`canal` ORDER BY `ventas` ASC LIMIT 5000',
			$select,
			'the SQL the anonymous /chart/query builds for chart #1, bounded to 5000 rows'
		);
	}

	public function test_every_saved_chart_query_is_bounded(): void {
		$this->script_chart_1_database();
		$value          = VpressFixtures::chart_1_context();
		$value['limit'] = 10;
		// queryBody() carries no limit from the config; a body limit only comes
		// from the builder's own clamp, so a saved chart always gets LIMIT 5000.
		vpress_figure_rows( (object) array( 'id' => '1', 'dataset_id' => '2', 'value' => json_encode( $value ) ) );
		$this->assertStringEndsWith( ' LIMIT 5000', end( $this->wpdb->queries ) );
	}

	private static function many_rows( int $n ): array {
		$rows = array();
		for ( $i = 1; $i <= $n; $i++ ) {
			$rows[] = array( 'estado' => "E$i", 'ventas' => (string) $i );
		}
		return $rows;
	}

	public function test_a_result_at_the_row_bound_says_it_is_partial(): void {
		$chart = self::chart( self::bars() );

		$alt = vpress_figure_alt_text( $chart, self::many_rows( 5000 ) );
		$this->assertStringEndsWith( 'lowest: E1 (1). (first 5,000 rows)', $alt );

		$this->assertStringNotContainsString( 'first', vpress_figure_alt_text( $chart, self::many_rows( 3 ) ) );
		$this->assertStringNotContainsString( 'first', vpress_figure_alt_text( $chart, self::many_rows( 4999 ) ) );
	}

	public function test_a_table_at_the_row_bound_prints_200_and_says_more_exist(): void {
		$html = vpress_figure_data_table( self::chart( self::bars() ), self::many_rows( 5000 ) );

		$this->assertSame( 201, substr_count( $html, '<tr><td' ) );
		$this->assertStringContainsString( '<tr><td colspan="2">… and 4,800 more rows (first 5,000 rows)</td></tr>', $html );
	}

	public function test_rows_are_cached_per_request_by_chart_id(): void {
		$this->script_chart_1_database();
		$chart = (object) array( 'id' => '1', 'dataset_id' => '2', 'value' => VpressFixtures::CHART_1_VALUE );

		vpress_figure_rows( $chart );
		$count = count( $this->wpdb->queries );
		vpress_figure_rows( $chart );

		$this->assertSame( $count, count( $this->wpdb->queries ), 'no second round-trip' );
	}

	public function test_rows_fail_as_wp_error_never_as_an_exception(): void {
		$missing = vpress_figure_rows( (object) array( 'id' => '5', 'dataset_id' => '99', 'value' => VpressFixtures::CHART_1_VALUE ) );
		$this->assertInstanceOf( WP_Error::class, $missing );
		$this->assertSame( 'vpress_dataset_not_found', $missing->get_error_code() );

		$this->assertSame( 'vpress_invalid_chart', vpress_figure_rows( (object) array( 'id' => '6', 'dataset_id' => '2', 'value' => '{not json' ) )->get_error_code() );

		$this->wpdb->on( '/vpresscore_datasets WHERE id = 3$/', (object) array( 'slug' => 'x; DROP TABLE wp_users', 'source' => null ) );
		$this->assertSame( 'vpress_unknown_dataset', vpress_figure_rows( (object) array( 'id' => '7', 'dataset_id' => '3', 'value' => VpressFixtures::CHART_1_VALUE ) )->get_error_code() );

		$this->script_chart_1_database();
		$this->wpdb->fail_on( '/^SELECT .* FROM `vpress_vpress_test_ventas`/', 'Table is marked as crashed' );
		$this->assertSame( 'db_error', vpress_figure_rows( (object) array( 'id' => '8', 'dataset_id' => '2', 'value' => VpressFixtures::CHART_1_VALUE ) )->get_error_code() );
	}

	// --- vpress_figure_alt_text --------------------------------------------

	public function test_bars_alt_text_for_three_rows(): void {
		$rows = array(
			array( 'estado' => 'Jalisco', 'ventas' => '1500' ),
			array( 'estado' => 'Puebla', 'ventas' => '250.5' ),
			array( 'estado' => 'Sonora', 'ventas' => '9000' ),
		);

		$this->assertSame(
			'Bar chart of Ventas by Estado, 3 categories. Highest: Sonora (9,000); lowest: Puebla (250.50).',
			vpress_figure_alt_text( self::chart( self::bars() ), $rows )
		);
		$this->assertSame(
			'Bar chart of Ventas by Estado, 3 categories. Highest: Sonora ($9,000 MXN); lowest: Puebla ($251 MXN).',
			vpress_figure_alt_text( self::chart( self::bars( array( 'decimals' => 0, 'preffix' => '$', 'suffix' => ' MXN' ) ) ), $rows ),
			'decimals, prefix and suffix come from the chart config'
		);
	}

	public function test_chart_1_alt_text_combines_the_series_per_category(): void {
		$chart = (object) array( 'id' => '1', 'dataset_id' => '2', 'title' => null, 'value' => VpressFixtures::CHART_1_VALUE );

		$this->assertSame(
			'Bar chart of ventas by estado, 8 categories. Highest: Veracruz (4,379,280.0); lowest: Nuevo León (1,425,940.0). Grouped by canal, 3 series.',
			vpress_figure_alt_text( $chart, self::chart_1_rows() )
		);
	}

	public function test_alt_text_is_deterministic(): void {
		$chart    = (object) array( 'id' => '1', 'value' => VpressFixtures::CHART_1_VALUE );
		$shuffled = self::chart_1_rows();
		usort(
			$shuffled,
			static function ( $a, $b ) {
				return strcmp( $b['canal'] . $b['estado'], $a['canal'] . $a['estado'] );
			}
		);
		$this->assertSame( vpress_figure_alt_text( $chart, self::chart_1_rows() ), vpress_figure_alt_text( $chart, self::chart_1_rows() ) );
		$this->assertSame( vpress_figure_alt_text( $chart, self::chart_1_rows() ), vpress_figure_alt_text( $chart, $shuffled ), 'row order does not change extremes or counts' );
	}

	public function test_horizontal_bars_use_the_ordinal_y_as_categories(): void {
		$value = self::bars(
			array(
				'xAxis' => array( 'title' => 'Ventas', 'type' => 'linear', 'slug' => 'ventas', 'func' => 'sum' ),
				'yAxis' => array( 'title' => 'Canal', 'type' => 'ordinal', 'slug' => 'canal' ),
			)
		);
		$rows  = array( array( 'canal' => 'Web', 'ventas' => '5' ), array( 'canal' => 'Directo', 'ventas' => '7' ) );

		$this->assertSame( 'Bar chart of Ventas by Canal, 2 categories. Highest: Directo (7); lowest: Web (5).', vpress_figure_alt_text( self::chart( $value ), $rows ) );
	}

	private static function timeline(): array {
		return array(
			'chart'   => 'timeline',
			'xAxis'   => array( 'title' => 'Fecha', 'type' => 'date', 'slug' => 'fecha' ),
			'yAxis'   => array( 'title' => 'Ventas', 'type' => 'linear', 'slug' => 'ventas', 'func' => 'sum' ),
			'groupBy' => array( 'slug' => '' ),
		);
	}

	public function test_timeline_alt_text_rose(): void {
		// Out of order on purpose: the description walks the x axis in order.
		$rows = array(
			array( 'fecha' => '2026-03-01', 'ventas' => '30' ),
			array( 'fecha' => '2026-01-01', 'ventas' => '10' ),
			array( 'fecha' => '2026-02-01', 'ventas' => '5' ),
		);

		$this->assertSame(
			'Line chart of Ventas over Fecha from 2026-01-01 to 2026-03-01, 3 points; Ventas rose from 10 to 30.',
			vpress_figure_alt_text( self::chart( self::timeline() ), $rows )
		);
	}

	public function test_timeline_alt_text_fell_and_flat(): void {
		$fell = array( array( 'fecha' => '2026-01-01', 'ventas' => '30' ), array( 'fecha' => '2026-02-01', 'ventas' => '12.5' ) );
		$flat = array( array( 'fecha' => '2026-01-01', 'ventas' => '4' ), array( 'fecha' => '2026-02-01', 'ventas' => '4' ) );

		$this->assertSame(
			'Line chart of Ventas over Fecha from 2026-01-01 to 2026-02-01, 2 points; Ventas fell from 30 to 12.50.',
			vpress_figure_alt_text( self::chart( self::timeline() ), $fell )
		);
		$this->assertStringEndsWith( 'Ventas was flat from 4 to 4.', vpress_figure_alt_text( self::chart( self::timeline() ), $flat ) );
	}

	public function test_timeline_orders_day_first_dates_chronologically_not_lexically(): void {
		// Dataset columns are TEXT: lexically '01/02/2026' sorts before
		// '31/01/2026', which would report the trend backwards.
		$rows = array(
			array( 'fecha' => '01/02/2026', 'ventas' => '5' ),
			array( 'fecha' => '31/01/2026', 'ventas' => '10' ),
			array( 'fecha' => '15/03/2026', 'ventas' => '30' ),
		);

		$this->assertSame(
			'Line chart of Ventas over Fecha from 31/01/2026 to 15/03/2026, 3 points; Ventas rose from 10 to 30.',
			vpress_figure_alt_text( self::chart( self::timeline() ), $rows )
		);
	}

	public function test_timeline_reads_ambiguous_dates_with_the_charts_own_format(): void {
		$rows = array(
			array( 'fecha' => '01/02/2026', 'ventas' => '10' ),
			array( 'fecha' => '03/01/2026', 'ventas' => '30' ),
		);

		// Month first: 2 January, then 1 March.
		$us = self::timeline();
		$us['dateFormat'] = '%m/%d/%Y';
		$this->assertSame(
			'Line chart of Ventas over Fecha from 01/02/2026 to 03/01/2026, 2 points; Ventas rose from 10 to 30.',
			vpress_figure_alt_text( self::chart( $us ), $rows )
		);

		// Day first (the default guess): 3 January, then 1 February.
		$this->assertSame(
			'Line chart of Ventas over Fecha from 03/01/2026 to 01/02/2026, 2 points; Ventas fell from 30 to 10.',
			vpress_figure_alt_text( self::chart( self::timeline() ), $rows )
		);
	}

	public function test_timeline_claims_no_trend_when_the_x_values_are_not_dates(): void {
		$rows = array(
			array( 'fecha' => 'Trimestre 2', 'ventas' => '5' ),
			array( 'fecha' => 'Trimestre 1', 'ventas' => '30' ),
			array( 'fecha' => 'Trimestre 10', 'ventas' => '50' ),
		);

		$this->assertSame(
			'Line chart of Ventas over Fecha, 3 points.',
			vpress_figure_alt_text( self::chart( self::timeline() ), $rows )
		);
	}

	public function test_timeline_claims_no_trend_when_only_some_values_parse(): void {
		$rows = array(
			array( 'fecha' => '2026-01-01', 'ventas' => '5' ),
			array( 'fecha' => 'sin fecha', 'ventas' => '30' ),
		);

		$this->assertSame(
			'Line chart of Ventas over Fecha, 2 points.',
			vpress_figure_alt_text( self::chart( self::timeline() ), $rows )
		);
	}

	public function test_scatter_heatmap_map_and_fallback_templates(): void {
		$scatter = array(
			'chart' => 'scatter',
			'xAxis' => array( 'title' => 'Unidades', 'type' => 'linear', 'slug' => 'unidades' ),
			'yAxis' => array( 'title' => 'Ventas', 'type' => 'linear', 'slug' => 'ventas' ),
		);
		$this->assertSame(
			'Scatter plot of Ventas against Unidades, 2 points; Unidades ranges 1–9, Ventas ranges 10–90.',
			vpress_figure_alt_text( self::chart( $scatter ), array( array( 'unidades' => '9', 'ventas' => '10' ), array( 'unidades' => '1', 'ventas' => '90' ) ) )
		);

		$heatmap = array(
			'chart'      => 'heatmap',
			'xAxis'      => array( 'title' => 'Estado', 'type' => 'ordinal', 'slug' => 'estado' ),
			'yAxis'      => array( 'title' => 'Canal', 'type' => 'ordinal', 'slug' => 'canal' ),
			'collapseBy' => array( 'title' => 'Ventas', 'type' => 'linear', 'slug' => 'ventas', 'func' => 'sum' ),
		);
		$cells   = array(
			array( 'estado' => 'A', 'canal' => 'Web', 'ventas' => '1' ),
			array( 'estado' => 'B', 'canal' => 'Web', 'ventas' => '8' ),
			array( 'estado' => 'A', 'canal' => 'Directo', 'ventas' => '3' ),
			array( 'estado' => 'B', 'canal' => 'Directo', 'ventas' => '2' ),
			array( 'estado' => 'C', 'canal' => 'Directo', 'ventas' => '2' ),
		);
		$this->assertSame(
			'Heat map of Ventas by Estado and Canal, 2×3 cells; highest 8 at (B,Web).',
			vpress_figure_alt_text( self::chart( $heatmap ), $cells )
		);

		$map = array(
			'chart' => 'map',
			'xAxis' => array( 'title' => 'Estado', 'type' => 'ordinal', 'slug' => 'estado' ),
			'yAxis' => array( 'title' => 'Ventas', 'type' => 'linear', 'slug' => 'ventas', 'func' => 'sum' ),
		);
		$this->assertSame(
			'Map of Ventas by region, 2 regions; highest Sonora (20), lowest Yucatán (3).',
			vpress_figure_alt_text( self::chart( $map ), array( array( 'estado' => 'Yucatán', 'ventas' => '3' ), array( 'estado' => 'Sonora', 'ventas' => '20' ) ) )
		);

		$spine = array_merge( $heatmap, array( 'chart' => 'spineplot', 'yAxis' => array( 'title' => 'Ventas', 'slug' => 'ventas' ) ) );
		$this->assertSame(
			'Spine plot of Ventas by Estado, 5 data points.',
			vpress_figure_alt_text( self::chart( $spine ), $cells )
		);
	}

	public function test_empty_rows_say_so(): void {
		$this->assertSame( 'No data available for this chart.', vpress_figure_alt_text( self::chart( self::bars() ), array() ) );
		$this->assertSame( 'No data available for this chart.', vpress_figure_alt_text( self::chart( self::timeline() ), array() ) );
		$this->assertSame( '', vpress_figure_data_table( self::chart( self::bars() ), array() ) );
	}

	public function test_alt_text_is_plain_text_that_the_figure_escapes(): void {
		$rows = array( array( 'estado' => '<b>Jalisco</b>', 'ventas' => '5' ) );

		$this->assertStringContainsString( 'Highest: <b>Jalisco</b> (5)', vpress_figure_alt_text( self::chart( self::bars() ), $rows ), 'raw here; escaped on output' );
	}

	// --- vpress_figure_data_table ------------------------------------------

	public function test_data_table_markup_uses_axis_titles_and_right_aligns_numbers(): void {
		$chart = (object) array( 'id' => '1', 'title' => 'Ventas 2026', 'value' => VpressFixtures::CHART_1_VALUE );
		$rows  = array( array( 'estado' => 'Jalisco', 'canal' => 'Web', 'ventas' => '669924', 'extra' => 'x' ) );

		$this->assertSame(
			'<details class="vpress-figure__data"><summary>View data</summary>'
			. '<table class="vpress-figure__table"><caption>Ventas 2026</caption>'
			. '<thead><tr><th scope="col">estado</th><th scope="col">canal</th><th scope="col">ventas</th><th scope="col">extra</th></tr></thead>'
			. '<tbody><tr><td>Jalisco</td><td>Web</td><td class="vpress-figure__num">669,924.0</td><td>x</td></tr></tbody></table></details>',
			vpress_figure_data_table( $chart, $rows )
		);
	}

	public function test_data_table_labels_prefer_titles_and_caption_falls_back_to_the_chart_number(): void {
		$chart = self::chart( self::bars(), array( 'id' => '4' ) );
		$html  = vpress_figure_data_table( $chart, array( array( 'estado' => 'A', 'ventas' => '1' ) ) );

		$this->assertStringContainsString( '<caption>Chart 4</caption>', $html );
		$this->assertStringContainsString( '<th scope="col">Estado</th><th scope="col">Ventas</th>', $html );
	}

	public function test_data_table_is_capped_at_200_rows(): void {
		$rows = array();
		for ( $i = 1; $i <= 250; $i++ ) {
			$rows[] = array( 'estado' => "E$i", 'ventas' => (string) $i );
		}

		$html = vpress_figure_data_table( self::chart( self::bars() ), $rows );

		$this->assertSame( 201, substr_count( $html, '<tr><td' ), '200 data rows + 1 "more" row' );
		$this->assertStringContainsString( '<td>E200</td>', $html );
		$this->assertStringNotContainsString( '<td>E201</td>', $html );
		$this->assertStringContainsString( '<tr><td colspan="2">… and 50 more rows</td></tr></tbody>', $html );

		$this->assertStringNotContainsString( 'more row', vpress_figure_data_table( self::chart( self::bars() ), array_slice( $rows, 0, 200 ) ), 'exactly 200 rows: no "more" row' );
		$this->assertStringContainsString( '… and 1 more row<', vpress_figure_data_table( self::chart( self::bars() ), array_slice( $rows, 0, 201 ) ) );
	}

	public function test_data_table_escapes_every_value(): void {
		$chart = self::chart(
			self::bars( array( 'xAxis' => array( 'title' => '<i>Estado</i>', 'type' => 'ordinal', 'slug' => 'estado' ) ) ),
			array( 'title' => '<script>alert(1)</script>' )
		);
		$rows  = array( array( 'estado' => '<b>Jalisco</b>', 'ventas' => '5', '<img src=x>' => '" onmouseover="x' ) );

		$html = vpress_figure_data_table( $chart, $rows );

		$this->assertStringContainsString( '<td>&lt;b&gt;Jalisco&lt;/b&gt;</td>', $html );
		$this->assertStringContainsString( '<caption>&lt;script&gt;alert(1)&lt;/script&gt;</caption>', $html );
		$this->assertStringContainsString( '<th scope="col">&lt;i&gt;Estado&lt;/i&gt;</th>', $html );
		$this->assertStringContainsString( '<th scope="col">&lt;img src=x&gt;</th>', $html );
		$this->assertStringContainsString( '<td>&quot; onmouseover=&quot;x</td>', $html );
		$own = array( '<details ', '</details>', '<summary>', '</summary>', '<table ', '</table>', '<caption>', '</caption>', '<thead>', '</thead>', '<tbody>', '</tbody>', '<tr>', '</tr>', '<th ', '</th>', '<td>', '<td ', '</td>' );
		$this->assertStringNotContainsString( '<', str_replace( $own, '', $html ), 'no raw < outside the table tags' );
	}
}
