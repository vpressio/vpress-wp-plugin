<?php
/**
 * The text alternative and data table wired into vpress_render_figure().
 *
 * @package Vpress
 */

use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
use PHPUnit\Framework\TestCase;

/*
 * vpress_render_figure() keeps per-request statics (enqueue flag, id
 * counter, rows cache), so each test starts from a clean process.
 */
#[RunTestsInSeparateProcesses]
#[PreserveGlobalState( false )]
final class FigureA11yTest extends TestCase {

	const CHART_1_ALT = 'Bar chart of ventas by estado, 8 categories. Highest: Veracruz (4,379,280.0); lowest: Nuevo León (1,425,940.0). Grouped by canal, 3 series.';

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		$this->wpdb      = new FakeWpdb();
		$GLOBALS['wpdb'] = $this->wpdb;
		$this->wpdb->on( '/vpresscore_charts WHERE id = 1$/', (object) array( 'id' => '1', 'dataset_id' => '2', 'title' => null, 'permissions' => 'public', 'value' => VpressFixtures::CHART_1_VALUE ) );
		$this->wpdb->on( '/vpresscore_datasets WHERE id = 2$/', (object) array( 'slug' => VpressFixtures::DATASET_SLUG, 'source' => null ) );
		$this->wpdb->on( '/^SHOW COLUMNS FROM `vpress_vpress_test_ventas`$/', VpressFixtures::real_columns() );
		$this->wpdb->on( '/^SELECT .* FROM `vpress_vpress_test_ventas` as f1/', json_decode( file_get_contents( __DIR__ . '/fixtures/chart-1-rows.json' ), true ) );
	}

	public function test_figure_carries_the_description_and_the_data_table(): void {
		$html = vpress_render_figure( 1 );

		$this->assertStringContainsString(
			'<div class="vpress-figure__chart" role="group" aria-label="Chart 1" aria-describedby="vpress-figure-1-desc" aria-busy="true"></div>',
			$html,
			'aria-label stays the title; the description is referenced'
		);
		$this->assertStringContainsString( '<p class="vpress-figure__alt screen-reader-text" id="vpress-figure-1-desc">' . self::CHART_1_ALT . '</p>', $html );
		$this->assertMatchesRegularExpression(
			'#^<figure [^>]*><div class="vpress-figure__chart"[^>]*></div><p class="vpress-figure__alt screen-reader-text"[^>]*>[^<]*</p><details class="vpress-figure__data">.*</details><figcaption class="vpress-figure__caption">.*</figcaption></figure>$#s',
			$html,
			'child order: chart slot, description, data table, caption (last)'
		);
		$this->assertSame( 24, substr_count( $html, '<tr><td>' ), 'every chart #1 row is in the table' );
	}

	public function test_description_id_follows_the_actual_figure_id_on_repeats(): void {
		vpress_render_figure( 1 );
		$second = vpress_render_figure( 1 );

		$this->assertStringContainsString( ' id="vpress-figure-1-2"', $second );
		$this->assertStringContainsString( 'aria-describedby="vpress-figure-1-2-desc"', $second );
		$this->assertStringContainsString( 'id="vpress-figure-1-2-desc"', $second );
		$chart_queries = array_filter( $this->wpdb->queries, static fn( $q ) => str_starts_with( $q, 'SELECT f1.' ) );
		$this->assertCount( 1, $chart_queries, 'the chart query ran once for both renders' );
	}

	public function test_description_id_follows_a_block_anchor_and_survives_a_hidden_caption(): void {
		$html = vpress_render_figure(
			1,
			array(
				'wrapper_attributes' => 'class="wp-block-vpress-chart" id="ventas-anchor"',
				'show_caption'       => false,
			)
		);

		$this->assertStringContainsString( ' id="ventas-anchor"', $html );
		$this->assertStringContainsString( 'aria-describedby="ventas-anchor-desc"', $html );
		$this->assertStringContainsString( '<p class="vpress-figure__alt screen-reader-text" id="ventas-anchor-desc">', $html );
		$this->assertStringNotContainsString( '<figcaption', $html );
		$this->assertMatchesRegularExpression( '#</p><details class="vpress-figure__data">.*</details></figure>$#s', $html, 'the table stays, last, without a caption' );
	}

	public function test_alt_text_filter_can_override_and_is_escaped(): void {
		$seen = array();
		$GLOBALS['vpress_test_filters']['vpress_figure_alt_text'] = static function ( $text, $chart, $rows ) use ( &$seen ) {
			$seen = array( $text, (int) $chart->id, count( $rows ) );
			return 'Custom <b>alt</b> "text"';
		};

		$html = vpress_render_figure( 1 );

		$this->assertSame( array( self::CHART_1_ALT, 1, 24 ), $seen );
		$this->assertStringContainsString( 'id="vpress-figure-1-desc">Custom &lt;b&gt;alt&lt;/b&gt; &quot;text&quot;</p>', $html );
	}

	public function test_description_text_from_the_data_is_escaped(): void {
		$this->wpdb = new FakeWpdb();
		$GLOBALS['wpdb'] = $this->wpdb;
		$this->wpdb->on( '/vpresscore_charts WHERE id = 1$/', (object) array( 'id' => '1', 'dataset_id' => '2', 'title' => 'T', 'permissions' => 'public', 'value' => json_encode( array( 'chart' => 'bars', 'xAxis' => array( 'title' => 'estado', 'type' => 'ordinal', 'slug' => 'estado' ), 'yAxis' => array( 'title' => 'ventas', 'type' => 'linear', 'slug' => 'ventas', 'func' => 'sum' ) ) ) ) );
		$this->wpdb->on( '/vpresscore_datasets WHERE id = 2$/', (object) array( 'slug' => VpressFixtures::DATASET_SLUG, 'source' => null ) );
		$this->wpdb->on( '/^SHOW COLUMNS/', VpressFixtures::real_columns() );
		$this->wpdb->on( '/^SELECT f1\./', array( array( 'estado' => '<b>Jalisco</b>', 'ventas' => '5' ) ) );

		$html = vpress_render_figure( 1 );

		$this->assertStringContainsString( 'Highest: &lt;b&gt;Jalisco&lt;/b&gt; (5)', $html );
		$this->assertStringNotContainsString( '<b>', $html );
	}

	public function test_query_failure_renders_the_plain_figure_and_logs_in_debug(): void {
		file_put_contents( $GLOBALS['vpress_test_error_log'], '' );
		$this->wpdb->fail_on( '/^SELECT f1\./', 'Table is marked as crashed' );

		$html = vpress_render_figure( 1 );

		$this->assertStringContainsString( '<div class="vpress-figure__chart" role="group" aria-label="Chart 1" aria-busy="true"></div>', $html );
		$this->assertStringNotContainsString( 'aria-describedby', $html );
		$this->assertStringNotContainsString( 'vpress-figure__alt', $html );
		$this->assertStringNotContainsString( '<details', $html );
		$this->assertStringEndsWith( '</figcaption></figure>', $html );
		$this->assertStringContainsString( '[vpress] chart 1 text alternative unavailable: db_error', file_get_contents( $GLOBALS['vpress_test_error_log'] ) );
	}

	public function test_empty_rows_describe_the_absence_without_a_table(): void {
		$this->wpdb = new FakeWpdb();
		$GLOBALS['wpdb'] = $this->wpdb;
		$this->wpdb->on( '/vpresscore_charts WHERE id = 1$/', (object) array( 'id' => '1', 'dataset_id' => '2', 'title' => 'T', 'permissions' => 'public', 'value' => VpressFixtures::CHART_1_VALUE ) );
		$this->wpdb->on( '/vpresscore_datasets WHERE id = 2$/', (object) array( 'slug' => VpressFixtures::DATASET_SLUG, 'source' => null ) );
		$this->wpdb->on( '/^SHOW COLUMNS/', VpressFixtures::real_columns() );

		$html = vpress_render_figure( 1 );

		$this->assertStringContainsString( 'id="vpress-figure-1-desc">No data available for this chart.</p>', $html );
		$this->assertStringNotContainsString( '<details', $html );
	}
}
