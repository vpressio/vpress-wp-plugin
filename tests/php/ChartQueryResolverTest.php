<?php

use PHPUnit\Framework\TestCase;

/**
 * Who decides what /chart/query runs: editors send the query body, anonymous
 * callers name a public chart and the server uses its saved config.
 */
final class ChartQueryResolverTest extends TestCase {

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		$this->wpdb      = new FakeWpdb();
		$GLOBALS['wpdb'] = $this->wpdb;
		$this->wpdb->on( '/vpresscore_charts WHERE id = 1$/', (object) array( 'id' => '1', 'dataset_id' => '2', 'permissions' => 'public', 'value' => VpressFixtures::CHART_1_VALUE ) );
		$this->wpdb->on( '/vpresscore_charts WHERE id = 7$/', (object) array( 'id' => '7', 'dataset_id' => '2', 'permissions' => 'private', 'value' => VpressFixtures::CHART_1_VALUE ) );
		$this->wpdb->on( '/vpresscore_datasets WHERE id = 2$/', (object) array( 'slug' => VpressFixtures::DATASET_SLUG, 'source' => null ) );
		$this->wpdb->on( "/vpresscore_datasets WHERE slug = 'vpress_test_ventas' LIMIT 1/", array( array( '1' => '1' ) ) );
		$this->wpdb->on( '/^SHOW COLUMNS FROM `vpress_vpress_test_ventas`$/', VpressFixtures::real_columns() );
	}

	protected function tearDown(): void {
		$GLOBALS['vpress_test_caps'] = array();
	}

	private function assertWpError( string $code, int $status, $result ): void {
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( $code, $result->get_error_code() );
		$this->assertSame( array( 'status' => $status ), $result->get_error_data() );
	}

	private static function hostile_client_body( array $extra = array() ): array {
		return array_merge(
			array(
				'dataset'     => 'wp_users',
				'column_head' => 'user_pass',
				'context'     => array( 'xAxis' => array( 'slug' => 'user_pass', 'type' => 'ordinal' ) ),
			),
			$extra
		);
	}

	public function test_anonymous_without_chart_id_is_rejected(): void {
		foreach ( array( null, 'abc', 1.5, 0, -1, true, '1 OR 1=1', array( 1 ) ) as $chart_id ) {
			$body = null === $chart_id ? self::hostile_client_body() : self::hostile_client_body( array( 'chart_id' => $chart_id ) );
			$this->assertWpError( 'vpress_missing_chart_id', 400, vpress_resolve_chart_query( $body, false ) );
		}
		$this->assertSame( array(), $this->wpdb->queries );
	}

	public function test_anonymous_unknown_chart_is_not_found(): void {
		$this->assertWpError( 'vpress_chart_not_found', 404, vpress_resolve_chart_query( array( 'chart_id' => 99 ), false ) );
	}

	public function test_anonymous_private_chart_is_forbidden(): void {
		$this->assertWpError( 'vpress_forbidden', 403, vpress_resolve_chart_query( array( 'chart_id' => 7 ), false ) );
		$this->assertCount( 1, $this->wpdb->queries );
	}

	public function test_anonymous_public_chart_uses_the_saved_config_not_the_client_body(): void {
		$resolved = vpress_resolve_chart_query( self::hostile_client_body( array( 'chart_id' => 1 ) ), false );

		$expected            = VpressFixtures::chart_1_flat_body();
		$expected['dataset'] = '`vpress_vpress_test_ventas`';
		$this->assertSame( $expected, $resolved );
	}

	public function test_anonymous_accepts_a_numeric_string_chart_id(): void {
		$this->assertIsArray( vpress_resolve_chart_query( array( 'chart_id' => '1' ), false ) );
	}

	public function test_anonymous_chart_with_corrupt_config_is_rejected(): void {
		$this->wpdb->on( '/vpresscore_charts WHERE id = 8$/', (object) array( 'id' => '8', 'dataset_id' => '2', 'permissions' => 'public', 'value' => '{not json' ) );

		$this->assertWpError( 'vpress_invalid_chart', 400, vpress_resolve_chart_query( array( 'chart_id' => 8 ), false ) );
	}

	public function test_editor_body_is_the_query_source_with_a_guarded_dataset(): void {
		$body     = VpressFixtures::chart_1_flat_body() + array( 'chart_id' => 7 );
		$resolved = vpress_resolve_chart_query( $body, true );

		$this->assertSame( '`vpress_vpress_test_ventas`', $resolved['dataset'] );
		$this->assertSame( 'estado', $resolved['column_head'] );
	}

	public function test_editor_unknown_dataset_is_rejected(): void {
		$this->assertWpError( 'vpress_unknown_dataset', 400, vpress_resolve_chart_query( self::hostile_client_body(), true ) );
	}

	public function test_anonymous_request_runs_the_saved_chart_sql(): void {
		$response = vpress_query_chart_data( new FakeRestRequest( array(), self::hostile_client_body( array( 'chart_id' => 1 ) ) ) );

		$this->assertIsArray( $response );
		$this->assertSame(
			'SELECT f1.`estado`,f1.`canal`,SUM(`ventas`) AS `ventas` FROM `vpress_vpress_test_ventas` as f1 GROUP BY f1.`estado`,f1.`canal` ORDER BY `ventas` ASC',
			$this->wpdb->last_query
		);
	}

	public function test_anonymous_request_to_a_private_chart_returns_403(): void {
		$response = vpress_query_chart_data( new FakeRestRequest( array(), array( 'chart_id' => 7 ) ) );

		$this->assertWpError( 'vpress_forbidden', 403, $response );
	}
}
