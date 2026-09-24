<?php

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Live data sources: URL normalisation, fetching, refresh scheduling and
 * the REST entry points that refuse what they must.
 */
final class SourcesTest extends TestCase {

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		vpress_guard_columns_reset();
		$this->wpdb                           = new FakeWpdb();
		$GLOBALS['wpdb']                      = $this->wpdb;
		$GLOBALS['vpress_test_rejected_urls'] = array();
		$GLOBALS['vpress_test_transients']    = array();
		$GLOBALS['vpress_test_http_calls']    = array();
		$GLOBALS['vpress_test_filters']       = array();
		$GLOBALS['vpress_test_caps']          = array();
		$GLOBALS['vpress_test_now']           = '2026-09-24 12:00:00';
		$GLOBALS['vpress_test_http']          = function () {
			return array( 'response' => array( 'code' => 200 ) );
		};
	}

	protected function tearDown(): void {
		// Other suites assume the anonymous default.
		$GLOBALS['vpress_test_caps'] = array();
	}

	private function assertWpError( string $code, int $status, $result ): void {
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( $code, $result->get_error_code() );
		$this->assertSame( $status, $result->get_error_data()['status'] );
	}

	public static function gsheet_urls(): array {
		$id = '1AbC-dEf_123';
		return array(
			'edit link, no gid'       => array( "https://docs.google.com/spreadsheets/d/$id/edit", $id, '0' ),
			'gid in the fragment'     => array( "https://docs.google.com/spreadsheets/d/$id/edit#gid=1234", $id, '1234' ),
			'gid in the query'        => array( "https://docs.google.com/spreadsheets/d/$id/edit?usp=sharing&gid=55", $id, '55' ),
			'bare id, http, no slash' => array( "http://docs.google.com/spreadsheets/d/$id", $id, '0' ),
			'existing export link'    => array( "https://docs.google.com/spreadsheets/d/$id/export?format=csv&gid=9", $id, '9' ),
		);
	}

	#[DataProvider( 'gsheet_urls' )]
	public function test_google_sheets_urls_become_csv_export_urls( string $url, string $id, string $gid ): void {
		$source = vpress_source_normalize( $url );

		$this->assertSame( 'gsheet', $source['type'] );
		$this->assertSame( "https://docs.google.com/spreadsheets/d/$id/export?format=csv&gid=$gid", $source['fetch_url'] );
		$this->assertSame( "https://docs.google.com/spreadsheets/d/$id/edit#gid=$gid", $source['display_url'] );
	}

	public function test_a_normalised_display_url_round_trips_to_the_same_fetch_url(): void {
		$first  = vpress_source_normalize( 'https://docs.google.com/spreadsheets/d/XYZ/edit?gid=3#gid=3' );
		$second = vpress_source_normalize( $first['display_url'] );

		$this->assertSame( $first, $second );
	}

	public function test_published_sheets_use_the_pub_csv_output(): void {
		$source = vpress_source_normalize( 'https://docs.google.com/spreadsheets/d/e/2PACX-1vAbc/pubhtml?gid=7' );

		$this->assertSame( 'gsheet', $source['type'] );
		$this->assertSame( 'https://docs.google.com/spreadsheets/d/e/2PACX-1vAbc/pub?gid=7&single=true&output=csv', $source['fetch_url'] );
	}

	public function test_a_plain_http_url_is_accepted_as_is(): void {
		$source = vpress_source_normalize( '  http://example.com/data/ventas.csv?v=2  ' );

		$this->assertSame(
			array(
				'type'        => 'url',
				'fetch_url'   => 'http://example.com/data/ventas.csv?v=2',
				'display_url' => 'http://example.com/data/ventas.csv?v=2',
			),
			$source
		);
	}

	public static function bad_urls(): array {
		return array(
			'ftp'          => array( 'ftp://example.com/data.csv' ),
			'javascript'   => array( 'javascript:alert(1)' ),
			'no scheme'    => array( 'example.com/data.csv' ),
			'empty'        => array( '' ),
			'sheet on ftp' => array( 'ftp://docs.google.com/spreadsheets/d/abc/edit' ),
		);
	}

	#[DataProvider( 'bad_urls' )]
	public function test_non_http_urls_are_rejected( string $url ): void {
		$this->assertWpError( 'vpress_bad_source_url', 400, vpress_source_normalize( $url ) );
	}

	public function test_a_url_the_validator_rejects_is_refused(): void {
		$GLOBALS['vpress_test_rejected_urls'] = array( 'http://192.168.1.10/data.csv' );

		$this->assertWpError( 'vpress_bad_source_url', 400, vpress_source_normalize( 'http://192.168.1.10/data.csv' ) );
	}

	public function test_fetch_streams_into_the_tmp_dir_with_the_size_cap(): void {
		$GLOBALS['vpress_test_http'] = function ( $url, $args ) {
			file_put_contents( $args['filename'], "a,b\n1,2\n" );
			return array( 'response' => array( 'code' => 200 ) );
		};

		$path = vpress_source_fetch( 'https://example.com/x.csv' );

		list( $url, $args ) = $GLOBALS['vpress_test_http_calls'][0];
		$this->assertSame( 'https://example.com/x.csv', $url );
		$this->assertSame( 30, $args['timeout'] );
		$this->assertTrue( $args['stream'] );
		$this->assertSame( 20 * MB_IN_BYTES, $args['limit_response_size'] );
		$this->assertSame( $path, $args['filename'] );
		$this->assertStringStartsWith( vpress_import_tmp_dir() . '/', $path );
		$this->assertSame( "a,b\n1,2\n", file_get_contents( $path ) );
		unlink( $path );
	}

	public function test_fetch_turns_a_non_2xx_into_a_502_and_removes_the_tmp_file(): void {
		$GLOBALS['vpress_test_http'] = function ( $url, $args ) {
			file_put_contents( $args['filename'], 'Not found' );
			return array( 'response' => array( 'code' => 404 ) );
		};

		$result = vpress_source_fetch( 'https://example.com/x.csv' );

		$this->assertWpError( 'vpress_fetch_failed', 502, $result );
		$this->assertSame( 404, $result->get_error_data()['upstream_status'] );
		$this->assertFileDoesNotExist( $GLOBALS['vpress_test_http_calls'][0][1]['filename'] );
	}

	public function test_fetch_turns_a_transport_error_into_a_502(): void {
		$GLOBALS['vpress_test_http'] = function () {
			return new WP_Error( 'http_request_failed', 'cURL error 28: timed out' );
		};

		$this->assertWpError( 'vpress_fetch_failed', 502, vpress_source_fetch( 'https://example.com/x.csv' ) );
	}

	public function test_fetch_refuses_a_body_that_hit_the_size_cap(): void {
		$GLOBALS['vpress_test_filters']['vpress_max_upload_bytes'] = function () {
			return 8;
		};
		$GLOBALS['vpress_test_http'] = function ( $url, $args ) {
			file_put_contents( $args['filename'], substr( "a,b\n1,2\n3,4\n", 0, $args['limit_response_size'] ) );
			return array( 'response' => array( 'code' => 200 ) );
		};

		$this->assertWpError( 'vpress_source_too_large', 413, vpress_source_fetch( 'https://example.com/x.csv' ) );
		$this->assertFileDoesNotExist( $GLOBALS['vpress_test_http_calls'][0][1]['filename'] );
	}

	public static function due_cases(): array {
		return array(
			'none is never due'            => array( 'none', null, false ),
			'hourly, never refreshed'      => array( 'hourly', null, true ),
			'hourly, 59 minutes ago'       => array( 'hourly', '2026-09-24 11:01:00', false ),
			'hourly, exactly 1 hour ago'   => array( 'hourly', '2026-09-24 11:00:00', true ),
			'daily, never refreshed'       => array( 'daily', null, true ),
			'daily, 23 hours ago'          => array( 'daily', '2026-09-23 13:00:00', false ),
			'daily, 25 hours ago'          => array( 'daily', '2026-09-23 11:00:00', true ),
			'weekly, never refreshed'      => array( 'weekly', null, true ),
			'weekly, 6 days ago'           => array( 'weekly', '2026-09-18 12:00:00', false ),
			'weekly, 7 days ago'           => array( 'weekly', '2026-09-17 12:00:00', true ),
			'unknown interval is not due'  => array( 'monthly', null, false ),
		);
	}

	#[DataProvider( 'due_cases' )]
	public function test_due_computation( string $interval, ?string $last, bool $due ): void {
		$this->assertSame( $due, vpress_source_is_due( $interval, $last, strtotime( '2026-09-24 12:00:00 UTC' ) ) );
	}

	private function dataset( int $id, array $fields = array() ): object {
		return (object) array_merge(
			array(
				'id'                => (string) $id,
				'slug'              => "live$id",
				'source_type'       => 'url',
				'source_url'        => "https://example.com/$id.csv",
				'refresh_interval'  => 'hourly',
				'last_refreshed_at' => null,
			),
			$fields
		);
	}

	public function test_refresh_of_an_upload_dataset_is_a_400(): void {
		$this->wpdb->on( '/FROM wp_vpresscore_datasets WHERE id = 5/', $this->dataset( 5, array( 'source_type' => 'upload', 'source_url' => null ) ) );
		$GLOBALS['vpress_test_http'] = function () {
			throw new LogicException( 'must not fetch' );
		};

		$this->assertWpError( 'vpress_not_refreshable', 400, vpress_dataset_refresh( new FakeRestRequest( array(), array( 'id' => 5 ) ) ) );
		$this->assertSame( array(), $GLOBALS['vpress_test_http_calls'] );
	}

	public function test_refresh_of_an_unknown_dataset_is_a_404(): void {
		$this->assertWpError( 'vpress_unknown_dataset', 404, vpress_dataset_refresh( new FakeRestRequest( array(), array( 'id' => 99 ) ) ) );
	}

	public function test_refresh_while_locked_is_a_409(): void {
		$this->wpdb->on( '/FROM wp_vpresscore_datasets WHERE id = 5/', $this->dataset( 5 ) );
		$GLOBALS['vpress_test_transients']['vpress_refresh_5'] = 1;

		$this->assertWpError( 'vpress_refresh_running', 409, vpress_dataset_refresh( new FakeRestRequest( array(), array( 'id' => 5 ) ) ) );
		$this->assertSame( array(), $GLOBALS['vpress_test_http_calls'] );
	}

	public function test_from_url_rejects_a_bad_interval_and_a_bad_url_before_fetching(): void {
		$this->assertWpError( 'vpress_bad_interval', 400, vpress_dataset_from_url( new FakeRestRequest( array(), array( 'name' => 'Ventas', 'url' => 'https://example.com/v.csv', 'refresh_interval' => 'yearly' ) ) ) );
		$this->assertWpError( 'vpress_bad_source_url', 400, vpress_dataset_from_url( new FakeRestRequest( array(), array( 'name' => 'Ventas', 'url' => 'ftp://example.com/v.csv', 'refresh_interval' => 'none' ) ) ) );
		$this->assertSame( array(), $GLOBALS['vpress_test_http_calls'] );
	}

	public function test_from_url_rejects_a_duplicate_slug_with_409(): void {
		$this->wpdb->on( "/vpresscore_datasets WHERE slug = 'ventas'/", '1' );

		$this->assertWpError( 'vpress_duplicate_dataset', 409, vpress_dataset_from_url( new FakeRestRequest( array(), array( 'name' => 'Ventas', 'url' => 'https://example.com/v.csv', 'refresh_interval' => 'daily' ) ) ) );
		$this->assertSame( array(), $GLOBALS['vpress_test_http_calls'] );
		$this->assertSame( array(), $this->wpdb->writes );
	}

	public function test_from_url_imports_then_registers_the_dataset(): void {
		$this->wpdb->on( '/FROM wp_vpresscore_datasets WHERE id = 1$/', (object) array( 'id' => '1', 'slug' => 'ventas' ) );
		$GLOBALS['vpress_test_http'] = function ( $url, $args ) {
			file_put_contents( $args['filename'], "estado,ventas\nNL,10\nJal,20\n" );
			return array( 'response' => array( 'code' => 200 ) );
		};

		$result = vpress_dataset_from_url( new FakeRestRequest( array(), array( 'name' => 'Ventas', 'url' => 'https://docs.google.com/spreadsheets/d/ABC/edit#gid=4', 'refresh_interval' => 'daily' ) ) );

		$this->assertSame( 'https://docs.google.com/spreadsheets/d/ABC/export?format=csv&gid=4', $GLOBALS['vpress_test_http_calls'][0][0] );
		$this->assertContains( "INSERT INTO `vpress_ventas` (`estado`, `ventas`) VALUES ('NL', '10'), ('Jal', '20')", $this->wpdb->queries );
		list( $op, $table, $row ) = $this->wpdb->writes[0];
		$this->assertSame( array( 'insert', 'wp_vpresscore_datasets' ), array( $op, $table ) );
		$this->assertSame(
			array(
				'permissions'       => 'public',
				'name'              => 'Ventas',
				'slug'              => 'ventas',
				'owner_id'          => 7,
				'source_type'       => 'gsheet',
				'source_url'        => 'https://docs.google.com/spreadsheets/d/ABC/edit#gid=4',
				'refresh_interval'  => 'daily',
				'last_refreshed_at' => '2026-09-24 12:00:00',
			),
			$row
		);
		$this->assertSame( 'ventas', $result['data']->slug );
		$this->assertArrayNotHasKey( 'vpress_import_ventas', $GLOBALS['vpress_test_transients'] );
	}

	public function test_from_url_drops_the_half_built_table_when_the_import_fails(): void {
		$GLOBALS['vpress_test_http'] = function ( $url, $args ) {
			file_put_contents( $args['filename'], "<!DOCTYPE html><html><body>Sign in</body></html>" );
			return array( 'response' => array( 'code' => 200 ) );
		};

		$result = vpress_dataset_from_url( new FakeRestRequest( array(), array( 'name' => 'Ventas', 'url' => 'https://example.com/v.csv', 'refresh_interval' => 'none' ) ) );

		$this->assertWpError( 'vpress_source_not_csv', 422, $result );
		$this->assertContains( 'DROP TABLE IF EXISTS `vpress_ventas`', $this->wpdb->queries );
		$this->assertSame( array(), $this->wpdb->writes );
	}

	public function test_cron_skips_locked_datasets_and_runs_the_rest(): void {
		$this->wpdb->on( "/source_type IN \\('url','gsheet'\\)/", array( $this->dataset( 1 ), $this->dataset( 2 ), $this->dataset( 3, array( 'last_refreshed_at' => '2026-09-24 11:30:00' ) ) ) );
		$GLOBALS['vpress_test_transients']['vpress_refresh_1'] = 1;
		$GLOBALS['vpress_test_http'] = function () {
			return array( 'response' => array( 'code' => 500 ) );
		};

		$summary = vpress_refresh_due_sources();

		$this->assertSame( array( 1 ), $summary['skipped'] );
		$this->assertSame( array( 2 ), $summary['failed'] );
		$this->assertSame( array(), $summary['refreshed'] );
		$this->assertSame( array( 'https://example.com/2.csv' ), array_column( $GLOBALS['vpress_test_http_calls'], 0 ) );
		// Dataset 1's lock belongs to someone else and survives; dataset 2's is released.
		$this->assertSame( 1, $GLOBALS['vpress_test_transients']['vpress_refresh_1'] );
		$this->assertArrayNotHasKey( 'vpress_refresh_2', $GLOBALS['vpress_test_transients'] );
	}

	public function test_cron_records_the_error_on_the_dataset(): void {
		$this->wpdb->on( "/source_type IN \\('url','gsheet'\\)/", array( $this->dataset( 2 ) ) );
		$GLOBALS['vpress_test_http'] = function () {
			return array( 'response' => array( 'code' => 500 ) );
		};

		vpress_refresh_due_sources();

		$this->assertSame(
			array( 'update', 'wp_vpresscore_datasets', array( 'last_refresh_error' => 'The source responded with HTTP 500.' ), array( 'slug' => 'live2' ) ),
			$this->wpdb->writes[0]
		);
	}

	public function test_cron_caps_the_batch(): void {
		$rows = array();
		for ( $i = 1; $i <= 12; $i++ ) {
			$rows[] = $this->dataset( $i );
		}
		$this->wpdb->on( "/source_type IN \\('url','gsheet'\\)/", $rows );
		$GLOBALS['vpress_test_http'] = function () {
			return array( 'response' => array( 'code' => 500 ) );
		};

		$this->assertCount( 10, vpress_refresh_due_sources()['failed'] );

		$GLOBALS['vpress_test_http_calls']                        = array();
		$GLOBALS['vpress_test_filters']['vpress_refresh_batch_size'] = function () {
			return 3;
		};
		$this->assertSame( array( 1, 2, 3 ), vpress_refresh_due_sources()['failed'] );
	}

	private function registry_row(): object {
		return (object) array(
			'id'                 => '3',
			'slug'               => 'live3',
			'permissions'        => 'public',
			'source_type'        => 'url',
			'source_url'         => 'https://example.com/3.csv',
			'refresh_interval'   => 'daily',
			'last_refreshed_at'  => '2026-09-24 10:00:00',
			'last_refresh_error' => 'Could not download the source: cURL error 6: Could not resolve host: intranet',
		);
	}

	public function test_anonymous_get_omits_last_refresh_error(): void {
		$GLOBALS['vpress_test_caps'] = array();
		$this->wpdb->on( '/FROM wp_vpresscore_datasets WHERE id = 3$/', $this->registry_row() );

		$row = vpress_get_dataset( new FakeRestRequest( array( 'id' => '3' ) ) )['data'];

		$this->assertObjectNotHasProperty( 'last_refresh_error', $row );
		$this->assertSame( 'https://example.com/3.csv', $row->source_url );
		$this->assertSame( '2026-09-24 10:00:00', $row->last_refreshed_at );
	}

	public function test_editor_get_keeps_last_refresh_error(): void {
		$GLOBALS['vpress_test_caps'] = array( 'edit_posts' );
		$this->wpdb->on( '/FROM wp_vpresscore_datasets WHERE id = 3$/', $this->registry_row() );

		$row = vpress_get_dataset( new FakeRestRequest( array( 'id' => '3' ) ) )['data'];

		$this->assertStringContainsString( 'cURL error 6', $row->last_refresh_error );
	}

	public function test_anonymous_list_omits_last_refresh_error_on_every_row(): void {
		$GLOBALS['vpress_test_caps'] = array();
		$this->wpdb->on( '/d\.\*/', array( $this->registry_row(), $this->registry_row() ) );

		$rows = vpress_list_datasets( new FakeRestRequest( array( 'page' => '1', 'perPage' => '6' ) ) )['data'];

		$this->assertCount( 2, $rows );
		foreach ( $rows as $row ) {
			$this->assertObjectNotHasProperty( 'last_refresh_error', $row );
			$this->assertSame( 'daily', $row->refresh_interval );
		}
	}

	public function test_editor_list_keeps_last_refresh_error(): void {
		$GLOBALS['vpress_test_caps'] = array( 'edit_posts' );
		$this->wpdb->on( '/d\.\*/', array( $this->registry_row() ) );

		$rows = vpress_list_datasets( new FakeRestRequest( array( 'page' => '1', 'perPage' => '6' ) ) )['data'];

		$this->assertObjectHasProperty( 'last_refresh_error', $rows[0] );
	}
}
