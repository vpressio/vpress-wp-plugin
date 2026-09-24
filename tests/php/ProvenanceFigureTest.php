<?php
/**
 * Provenance under the figure, on the chart page (JSON-LD) and in
 * /chart/{id}/export.json.
 *
 * @package Vpress
 */

use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
use PHPUnit\Framework\TestCase;

/*
 * The figure keeps per-request statics (enqueue flag, id counter, rows and
 * dataset caches), so each test starts from a clean process.
 */
#[RunTestsInSeparateProcesses]
#[PreserveGlobalState( false )]
final class ProvenanceFigureTest extends TestCase {

	const EXPORT_URL = 'http://example.test/wp-json/vpress/v1/chart/1/export.json';

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		$GLOBALS['vpress_test_options']['date_format'] = 'F j, Y';
		$this->seed();
	}

	/** Chart #1 (public unless overridden) on dataset #2 with the given registry fields. */
	private function seed( array $dataset = array(), array $chart = array() ): void {
		$this->wpdb      = new FakeWpdb();
		$GLOBALS['wpdb'] = $this->wpdb;
		$this->wpdb->on(
			'/vpresscore_charts WHERE id = 1$/',
			(object) array_merge(
				array(
					'id'          => '1',
					'dataset_id'  => '2',
					'title'       => 'Presupuesto por estado',
					'description' => 'Gasto aprobado 2026.',
					'permissions' => 'public',
					'value'       => VpressFixtures::CHART_1_VALUE,
				),
				$chart
			)
		);
		$this->wpdb->on(
			'/vpresscore_datasets WHERE id = 2$/',
			(object) array_merge(
				array(
					'id'                 => '2',
					'name'               => 'Ventas 2026',
					'slug'               => VpressFixtures::DATASET_SLUG,
					'source'             => null,
					'source_type'        => 'upload',
					'source_url'         => null,
					'source_name'        => null,
					'license'            => null,
					'retrieved_at'       => null,
					'source_notes'       => null,
					'last_refreshed_at'  => null,
					'last_refresh_error' => 'cURL error 6: private diagnostics',
					'updated'            => '2026-09-20 08:30:00',
				),
				$dataset
			)
		);
		$this->wpdb->on( '/^SHOW COLUMNS FROM `vpress_vpress_test_ventas`$/', VpressFixtures::real_columns() );
		$this->wpdb->on( '/^SELECT .* FROM `vpress_vpress_test_ventas` as f1/', json_decode( file_get_contents( __DIR__ . '/fixtures/chart-1-rows.json' ), true ) );
	}

	private function full(): array {
		return array(
			'source_name'  => 'Secretaría de Hacienda',
			'source_url'   => 'https://datos.gob.mx/presupuesto.csv',
			'license'      => 'CC-BY-4.0',
			'retrieved_at' => '2026-09-01',
		);
	}

	private function footer( string $html ): string {
		return preg_match( '#<footer class="vpress-figure__source">.*?</footer>#s', $html, $m ) ? $m[0] : '';
	}

	// ---- Figure footer -------------------------------------------------

	public function test_no_footer_without_a_source_name_or_url(): void {
		$this->assertStringNotContainsString( '<footer', vpress_render_figure( 1 ) );
	}

	public function test_no_footer_when_only_licence_and_date_are_set(): void {
		$this->seed( array( 'license' => 'CC0-1.0', 'retrieved_at' => '2026-09-01', 'source_name' => '  ' ) );

		$this->assertStringNotContainsString( '<footer', vpress_render_figure( 1 ) );
	}

	public function test_full_provenance_prints_the_source_line_before_the_caption(): void {
		$this->seed( $this->full() );

		$html = vpress_render_figure( 1 );

		$this->assertSame(
			'<footer class="vpress-figure__source">Source: <a href="https://datos.gob.mx/presupuesto.csv" rel="noopener">Secretaría de Hacienda</a> · CC-BY-4.0 · Data as of September 1, 2026 · <a class="vpress-figure__export" href="' . self::EXPORT_URL . '">Download data (JSON)</a></footer>',
			$this->footer( $html )
		);
		$this->assertMatchesRegularExpression( '#</details><footer class="vpress-figure__source">.*</footer><figcaption#s', $html, 'after the data table, the caption stays last' );
	}

	public function test_source_name_and_url_are_escaped(): void {
		$this->seed(
			array(
				'source_name' => '</a><script>alert(1)</script>',
				'source_url'  => 'https://example.org/?a=1&b="x"',
				'license'     => '<b>MIT</b>',
			)
		);

		$footer = $this->footer( vpress_render_figure( 1 ) );

		$this->assertStringNotContainsString( '<script', $footer );
		$this->assertStringNotContainsString( '<b>', $footer );
		$this->assertStringContainsString( '&lt;/a&gt;&lt;script&gt;alert(1)&lt;/script&gt;</a>', $footer );
		$this->assertStringContainsString( 'href="https://example.org/?a=1&amp;b=&quot;x&quot;"', $footer );
		$this->assertStringContainsString( ' · &lt;b&gt;MIT&lt;/b&gt; · ', $footer );
	}

	public function test_a_name_without_url_is_plain_text(): void {
		$this->seed( array( 'source_name' => 'INEGI' ) );
		$this->assertStringStartsWith( '<footer class="vpress-figure__source">Source: INEGI · <a class="vpress-figure__export"', $this->footer( vpress_render_figure( 1 ) ) );
	}

	public function test_a_url_without_name_shows_its_host(): void {
		$this->seed( array( 'source_url' => 'https://www.inegi.org.mx/datos/' ) );
		$this->assertStringStartsWith( '<footer class="vpress-figure__source">Source: <a href="https://www.inegi.org.mx/datos/" rel="noopener">www.inegi.org.mx</a> · <a class="vpress-figure__export"', $this->footer( vpress_render_figure( 1 ) ) );
	}

	public function test_a_non_http_source_url_is_not_linked(): void {
		$this->seed( array( 'source_name' => 'X', 'source_url' => 'javascript:alert(1)' ) );

		$footer = $this->footer( vpress_render_figure( 1 ) );

		$this->assertStringContainsString( 'Source: X · ', $footer );
		$this->assertStringNotContainsString( 'javascript', $footer );
	}

	public function test_live_sources_date_the_data_by_their_last_refresh(): void {
		// Unnamed on purpose: withholding the sheet URL must not cost the
		// footer, so the date segment still prints without a source_name.
		$this->seed(
			array(
				'source_type'       => 'gsheet',
				'source_url'        => 'https://docs.google.com/spreadsheets/d/abc/edit#gid=0',
				'retrieved_at'      => '2026-01-01',
				'last_refreshed_at' => '2026-09-23 23:30:00',
			)
		);

		$this->assertStringContainsString( ' · Data as of September 23, 2026 · ', $this->footer( vpress_render_figure( 1 ) ) );
	}

	public function test_no_date_segment_when_nothing_dates_the_data(): void {
		$this->seed( array( 'source_name' => 'INEGI', 'license' => 'CC0-1.0' ) );

		$footer = $this->footer( vpress_render_figure( 1 ) );

		$this->assertStringNotContainsString( 'Data as of', $footer );
		$this->assertStringContainsString( 'Source: INEGI · CC0-1.0 · <a class="vpress-figure__export"', $footer );
	}

	public function test_a_google_sheet_url_is_withheld_from_visitors_on_every_public_surface(): void {
		$sheet = 'https://docs.google.com/spreadsheets/d/SECRET_WORKBOOK_ID/edit#gid=0';
		$this->seed(
			array(
				'source_type' => 'gsheet',
				'source_name' => '',
				'source_url'  => $sheet,
			)
		);

		// A sheet shared as "anyone with the link" is protected by the link alone.
		$figure = vpress_render_figure( 1 );
		$this->assertStringNotContainsString( 'SECRET_WORKBOOK_ID', $figure, 'the figure footer must not print the sheet URL' );
		$this->assertStringNotContainsString( 'SECRET_WORKBOOK_ID', vpress_chart_json_ld( 1 ), 'isBasedOn must not print the sheet URL' );

		$export = vpress_chart_export_payload( 1 );
		$payload = is_array( $export ) ? $export : (array) $export;
		$this->assertStringNotContainsString( 'SECRET_WORKBOOK_ID', wp_json_encode( $payload ), 'export.json must not print the sheet URL' );
	}

	public function test_a_nameless_sheet_keeps_its_footer_and_its_data_download(): void {
		$this->seed(
			array(
				'source_type' => 'gsheet',
				'source_name' => '',
				'source_url'  => 'https://docs.google.com/spreadsheets/d/SECRET_WORKBOOK_ID/edit#gid=0',
				'license'     => 'CC-BY-4.0',
			)
		);

		$footer = $this->footer( vpress_render_figure( 1 ) );

		// Withholding the URL must cost the link, nothing else: the source
		// prints as plain text and the visitor still gets the data.
		$this->assertSame(
			'<footer class="vpress-figure__source">Source: Google Sheets · CC-BY-4.0 · <a class="vpress-figure__export" href="' . self::EXPORT_URL . '">Download data (JSON)</a></footer>',
			$footer
		);
		// Never the host: it would read as a link that is not there.
		$this->assertStringNotContainsString( 'docs.google.com', vpress_render_figure( 1 ) );
	}

	public function test_a_sheet_without_a_name_still_counts_as_provenance(): void {
		$dataset = (object) array(
			'source_type' => 'gsheet',
			'source_name' => '',
			'source_url'  => 'https://docs.google.com/spreadsheets/d/SECRET_WORKBOOK_ID/edit#gid=0',
		);

		// has_provenance decides whether a footer prints at all, so it reads
		// the URL's existence; the value stays withheld.
		$this->assertTrue( vpress_figure_has_provenance( $dataset ) );
		$this->assertTrue( vpress_provenance_has_url( $dataset ) );
		$this->assertSame( '', vpress_provenance_url( $dataset ) );
	}

	public function test_an_editor_still_sees_the_google_sheet_url(): void {
		$sheet = 'https://docs.google.com/spreadsheets/d/SECRET_WORKBOOK_ID/edit#gid=0';
		$this->seed( array( 'source_type' => 'gsheet', 'source_name' => 'Hoja viva', 'source_url' => $sheet ) );
		$GLOBALS['vpress_test_caps'] = array( 'edit_posts' );

		$this->assertStringContainsString( 'SECRET_WORKBOOK_ID', vpress_render_figure( 1 ) );
	}

	public function test_a_plain_url_source_keeps_its_link_for_visitors(): void {
		$this->seed(
			array(
				'source_type' => 'url',
				'source_name' => '',
				'source_url'  => 'https://datos.gob.mx/presupuesto.csv',
			)
		);

		// A CSV on an open endpoint is a citation, not a credential.
		$this->assertStringContainsString( 'datos.gob.mx/presupuesto.csv', vpress_render_figure( 1 ) );
	}

	public function test_logged_in_viewers_get_an_authenticated_download_link(): void {
		$this->seed( $this->full() );
		$GLOBALS['vpress_test_logged_in'] = true;

		$this->assertStringContainsString( 'href="' . self::EXPORT_URL . '?_wpnonce=nonce-wp_rest"', vpress_render_figure( 1 ) );
	}

	public function test_the_source_line_filter_can_replace_it(): void {
		$this->seed( $this->full() );
		$seen = array();
		$GLOBALS['vpress_test_filters']['vpress_figure_source_html'] = static function ( $html, $chart, $dataset ) use ( &$seen ) {
			$seen = array( (int) $chart->id, $dataset->source_name, str_starts_with( $html, '<footer' ) );
			return '<footer class="custom">X</footer>';
		};

		$html = vpress_render_figure( 1 );

		$this->assertSame( array( 1, 'Secretaría de Hacienda', true ), $seen );
		$this->assertStringContainsString( '</details><footer class="custom">X</footer><figcaption', $html );
	}

	public function test_the_dataset_row_is_read_once_per_request(): void {
		$this->seed( $this->full() );
		vpress_render_figure( 1 );
		vpress_render_figure( 1 );

		$reads = array_filter( $this->wpdb->queries, static fn( $q ) => str_starts_with( $q, 'SELECT * FROM wp_vpresscore_datasets' ) );
		$this->assertCount( 1, $reads );
	}

	// ---- export.json -------------------------------------------------

	public function test_export_of_a_private_chart_is_not_found_for_anonymous_visitors(): void {
		$this->seed( $this->full(), array( 'permissions' => 'private' ) );

		$result = vpress_export_chart( new FakeRestRequest( array( 'id' => '1' ) ) );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'vpress_chart_not_found', $result->get_error_code() );
		$this->assertSame( 404, $result->get_error_data()['status'], 'same answer as the figure and the chart page: no existence oracle' );
		$this->assertSame( '', vpress_render_figure( 1 ), 'the figure hides it too' );
	}

	public function test_export_of_a_private_chart_works_for_editors(): void {
		$this->seed( $this->full(), array( 'permissions' => 'private' ) );
		$GLOBALS['vpress_test_caps'] = array( 'edit_posts' );

		$this->assertInstanceOf( WP_REST_Response::class, vpress_export_chart( new FakeRestRequest( array( 'id' => '1' ) ) ) );
	}

	public function test_export_of_a_missing_chart_is_not_found(): void {
		$result = vpress_export_chart( new FakeRestRequest( array( 'id' => '99' ) ) );

		$this->assertSame( 404, $result->get_error_data()['status'] );
	}

	public function test_export_of_a_public_chart_carries_chart_dataset_rows_and_time(): void {
		$this->seed( $this->full() + array( 'source_notes' => 'Notas' ) );

		$response = vpress_export_chart( new FakeRestRequest( array( 'id' => '1' ) ) );

		$this->assertInstanceOf( WP_REST_Response::class, $response );
		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( 'inline; filename="vpress-chart-1.json"', $response->get_headers()['Content-Disposition'] );

		$data = $response->get_data();
		$this->assertSame( array( 'chart', 'dataset', 'rows', 'generated_at' ), array_keys( $data ) );
		$this->assertSame( array( 'id', 'title', 'description', 'value' ), array_keys( $data['chart'] ) );
		$this->assertSame( 1, $data['chart']['id'] );
		$this->assertSame( 'Presupuesto por estado', $data['chart']['title'] );
		$this->assertSame( 'Gasto aprobado 2026.', $data['chart']['description'] );
		$this->assertSame( 'bars', $data['chart']['value']['chart'], 'value is parsed, not a JSON string' );
		$this->assertSame(
			array(
				'name'              => 'Ventas 2026',
				'source_name'       => 'Secretaría de Hacienda',
				'source_url'        => 'https://datos.gob.mx/presupuesto.csv',
				'license'           => 'CC-BY-4.0',
				'retrieved_at'      => '2026-09-01',
				'last_refreshed_at' => null,
				'source_type'       => 'upload',
			),
			$data['dataset'],
			'provenance only: no slug, permissions or refresh diagnostics'
		);
		$this->assertCount( 24, $data['rows'] );
		$this->assertSame( array( 'estado', 'canal', 'ventas' ), array_keys( $data['rows'][0] ) );
		$this->assertMatchesRegularExpression( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $data['generated_at'] );
	}

	public function test_export_fails_closed_when_the_query_fails(): void {
		$this->wpdb->fail_on( '/^SELECT f1\./', 'Table is marked as crashed' );

		$result = vpress_export_chart( new FakeRestRequest( array( 'id' => '1' ) ) );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 500, $result->get_error_data()['status'] );
		$this->assertStringNotContainsString( 'crashed', $result->get_error_message() );
	}

	public function test_export_is_pretty_printed_only_in_debug_and_only_for_its_route(): void {
		$export = new FakeRestRequest( array(), array(), '/vpress/v1/chart/1/export.json' );
		$other  = new FakeRestRequest( array(), array(), '/vpress/v1/chart/get/1' );

		$this->assertSame( JSON_PRETTY_PRINT, vpress_export_json_flags( 0, $export, true ) & JSON_PRETTY_PRINT );
		$this->assertSame( 0, vpress_export_json_flags( JSON_PRETTY_PRINT, $export, false ) & JSON_PRETTY_PRINT );
		$this->assertSame( 0, vpress_export_json_flags( 0, $other, true ) );
		$this->assertSame( JSON_PRETTY_PRINT, vpress_export_json_encode_options( 0, $export ) & JSON_PRETTY_PRINT, 'WP_DEBUG is on in the test bootstrap' );
	}

	// ---- JSON-LD -------------------------------------------------

	private function json_ld( string $script ): array {
		$this->assertMatchesRegularExpression( '#^<script type="application/ld\+json">[^<]*</script>$#', $script );
		return json_decode( substr( $script, strlen( '<script type="application/ld+json">' ), -strlen( '</script>' ) ), true );
	}

	public function test_json_ld_describes_the_chart_as_a_schema_org_dataset(): void {
		$this->seed( $this->full() );

		$script = vpress_chart_json_ld( 1 );

		$this->assertStringContainsString( '"@type":"Dataset"', $script );
		$this->assertSame(
			array(
				'@context'     => 'https://schema.org',
				'@type'        => 'Dataset',
				'name'         => 'Ventas 2026',
				'description'  => 'Presupuesto por estado — Gasto aprobado 2026.',
				'url'          => 'http://example.test/chart/1/',
				'license'      => 'CC-BY-4.0',
				'dateModified' => '2026-09-20T08:30:00',
				'creator'      => array(
					'@type' => 'Organization',
					'name'  => 'Datos Abiertos MX',
					'url'   => 'http://example.test/',
				),
				'distribution' => array(
					array(
						'@type'          => 'DataDownload',
						'encodingFormat' => 'application/json',
						'contentUrl'     => self::EXPORT_URL,
					),
				),
				'isBasedOn'    => 'https://datos.gob.mx/presupuesto.csv',
			),
			$this->json_ld( $script )
		);
	}

	public function test_json_ld_uses_the_last_refresh_and_a_licence_url_when_there_is_one(): void {
		$this->seed(
			array(
				'source_type'       => 'url',
				'source_url'        => 'https://datos.gob.mx/p.csv',
				'license'           => 'https://creativecommons.org/licenses/by/4.0/',
				'last_refreshed_at' => '2026-09-23 23:30:00',
			)
		);

		$data = $this->json_ld( vpress_chart_json_ld( 1 ) );

		$this->assertSame( '2026-09-23T23:30:00Z', $data['dateModified'] );
		$this->assertSame( 'https://creativecommons.org/licenses/by/4.0/', $data['license'] );
	}

	public function test_json_ld_omits_what_is_unknown(): void {
		$data = $this->json_ld( vpress_chart_json_ld( 1 ) );

		$this->assertArrayNotHasKey( 'license', $data );
		$this->assertArrayNotHasKey( 'isBasedOn', $data );
	}

	public function test_json_ld_cannot_close_its_script_element(): void {
		$this->seed( array( 'name' => '</script><script>alert(1)</script>' ), array( 'description' => '<!-- x --> & "q"' ) );

		$script = vpress_chart_json_ld( 1 );

		$this->assertSame( 1, substr_count( $script, '</script>' ), 'only the element’s own closing tag' );
		$this->assertStringNotContainsString( '<!--', $script );
		$data = $this->json_ld( $script );
		$this->assertSame( '</script><script>alert(1)</script>', $data['name'], 'the value round-trips' );
	}

	public function test_json_ld_is_empty_for_a_chart_the_visitor_cannot_see(): void {
		$this->seed( $this->full(), array( 'permissions' => 'private' ) );

		$this->assertSame( '', vpress_chart_json_ld( 1 ) );
	}
}
