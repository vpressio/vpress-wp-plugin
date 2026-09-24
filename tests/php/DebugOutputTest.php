<?php

use PHPUnit\Framework\TestCase;

/**
 * SQL text and raw DB errors reach only edit_posts users on WP_DEBUG sites
 * (the bootstrap defines WP_DEBUG true); everyone else gets neither.
 */
final class DebugOutputTest extends TestCase {

	const DB_ERROR = "Unknown column 'secret_col' in 'field list'";

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		vpress_guard_columns_reset();
		$this->wpdb      = new FakeWpdb();
		$GLOBALS['wpdb'] = $this->wpdb;
		$this->wpdb->on( '/vpresscore_charts WHERE id = 1$/', (object) array( 'id' => '1', 'dataset_id' => '2', 'permissions' => 'public', 'value' => VpressFixtures::CHART_1_VALUE ) );
		$this->wpdb->on( '/vpresscore_datasets WHERE id = 2$/', (object) array( 'slug' => VpressFixtures::DATASET_SLUG, 'source' => null, 'permissions' => 'public' ) );
		$this->wpdb->on( "/vpresscore_datasets WHERE slug = 'vpress_test_ventas' LIMIT 1/", array( array( '1' => '1' ) ) );
		$this->wpdb->on( "/COUNT\\(\\*\\) FROM wp_vpresscore_datasets WHERE slug = 'vpress_test_ventas' AND/", '0' );
		$this->wpdb->on( '/^SHOW COLUMNS FROM `vpress_vpress_test_ventas`$/', VpressFixtures::real_columns() );
	}

	protected function tearDown(): void {
		$GLOBALS['vpress_test_caps'] = array();
	}

	private function chart_query(): array {
		return array( 'chart_id' => 1 ) + VpressFixtures::chart_1_flat_body();
	}

	private function assertGeneric( $result ): void {
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'db_error', $result->get_error_code() );
		$this->assertSame( 'A database error occurred.', $result->get_error_message() );
	}

	public function test_anonymous_chart_query_response_carries_no_sql(): void {
		$response = vpress_query_chart_data( new FakeRestRequest( array(), $this->chart_query() ) );

		$this->assertIsArray( $response );
		$this->assertNull( $response['query'] );
	}

	public function test_anonymous_chart_query_db_error_is_generic(): void {
		$this->wpdb->fail_on( '/FROM `vpress_vpress_test_ventas` as f1/', self::DB_ERROR );

		$this->assertGeneric( vpress_query_chart_data( new FakeRestRequest( array(), $this->chart_query() ) ) );
	}

	public function test_editor_on_a_debug_site_sees_sql_and_db_errors(): void {
		$GLOBALS['vpress_test_caps'] = array( 'edit_posts' );

		$response = vpress_query_chart_data( new FakeRestRequest( array(), $this->chart_query() ) );
		$this->assertStringStartsWith( 'SELECT f1.`estado`', $response['query'] );

		$this->wpdb->fail_on( '/FROM `vpress_vpress_test_ventas` as f1/', self::DB_ERROR );
		$this->assertSame( self::DB_ERROR, vpress_query_chart_data( new FakeRestRequest( array(), $this->chart_query() ) )->get_error_message() );
	}

	public function test_anonymous_dataset_data_response_carries_no_sql(): void {
		$response = vpress_get_dataset_data( new FakeRestRequest( array( 'dataset' => 'vpress_test_ventas', 'page' => '1', 'perPage' => '10', 'dataSource' => 'wordpress' ) ) );

		$this->assertNull( $response['query'] );
	}

	public function test_anonymous_read_endpoints_carry_no_sql(): void {
		$this->assertNull( vpress_get_chart( new FakeRestRequest( array( 'id' => '1' ) ) )['query'] );
		$this->assertNull( vpress_list_charts( new FakeRestRequest( array( 'page' => '1', 'perPage' => '6' ) ) )['query'] );
		$this->assertNull( vpress_list_datasets( new FakeRestRequest( array( 'page' => '1', 'perPage' => '6' ) ) )['query'] );
		$this->assertNull( vpress_datasets_charts( new FakeRestRequest( array( 'id' => '2' ) ) )['query'] );
	}

	public function test_anonymous_db_errors_in_read_endpoints_are_generic(): void {
		$this->wpdb->fail_on( '/wp_vpresscore_charts/', self::DB_ERROR );

		$this->assertGeneric( vpress_get_chart( new FakeRestRequest( array( 'id' => '3' ) ) ) );
		$this->assertGeneric( vpress_list_charts( new FakeRestRequest( array( 'page' => '1', 'perPage' => '6' ) ) ) );
	}
}
