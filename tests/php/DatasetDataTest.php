<?php

use PHPUnit\Framework\TestCase;

final class DatasetDataTest extends TestCase {

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		vpress_guard_columns_reset();
		$this->wpdb      = new FakeWpdb();
		$GLOBALS['wpdb'] = $this->wpdb;
		$this->wpdb->on( "/vpresscore_datasets WHERE slug = 'vpress_test_ventas' LIMIT 1/", array( array( '1' => '1' ) ) );
		$this->wpdb->on( "/vpresscore_datasets WHERE slug = 'privado' LIMIT 1/", array( array( '1' => '1' ) ) );
		$this->wpdb->on( "/COUNT\\(\\*\\) FROM wp_vpresscore_datasets WHERE slug = 'vpress_test_ventas' AND/", '0' );
		$this->wpdb->on( "/COUNT\\(\\*\\) FROM wp_vpresscore_datasets WHERE slug = 'privado' AND/", '1' );
		$this->wpdb->on( '/^SELECT COUNT\(\*\) AS total FROM `vpress_/', '480' );
		$this->wpdb->on( '/^SELECT \* FROM `vpress_/', array( (object) array( 'estado' => 'Jalisco' ) ) );
	}

	protected function tearDown(): void {
		$GLOBALS['vpress_test_caps']    = array();
		$GLOBALS['vpress_test_filters'] = array();
	}

	private function request( string $dataset, array $params = array() ): FakeRestRequest {
		return new FakeRestRequest( array_merge( array( 'dataset' => $dataset, 'page' => '1', 'perPage' => '10', 'dataSource' => 'wordpress' ), $params ) );
	}

	private function assertWpError( string $code, int $status, $result ): void {
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( $code, $result->get_error_code() );
		$this->assertSame( array( 'status' => $status ), $result->get_error_data() );
	}

	private function data_queries(): array {
		return array_values( preg_grep( '/^SELECT \* FROM/', $this->wpdb->queries ) );
	}

	public function test_public_dataset_is_served_to_anonymous_callers_from_the_quoted_table(): void {
		$response = vpress_get_dataset_data( $this->request( 'vpress_test_ventas' ) );

		$this->assertIsArray( $response );
		$this->assertEquals( array( (object) array( 'estado' => 'Jalisco' ) ), $response['data'] );
		$this->assertSame( 480, $response['total'] );
		$this->assertSame( array( 'SELECT * FROM `vpress_vpress_test_ventas` LIMIT 0, 10' ), $this->data_queries() );
	}

	public function test_injection_in_the_dataset_is_rejected_before_any_data_query(): void {
		$result = vpress_get_dataset_data( $this->request( "test_ventas` LIMIT 1; DROP TABLE wp_users; -- " ) );

		$this->assertWpError( 'vpress_unknown_dataset', 400, $result );
		$this->assertSame( array(), $this->data_queries() );
	}

	public function test_private_dataset_is_forbidden_to_anonymous_callers(): void {
		$this->assertWpError( 'vpress_forbidden', 403, vpress_get_dataset_data( $this->request( 'privado' ) ) );
		$this->assertSame( array(), $this->data_queries() );
	}

	public function test_private_dataset_is_served_to_editors(): void {
		$GLOBALS['vpress_test_caps'] = array( 'edit_posts' );

		$this->assertIsArray( vpress_get_dataset_data( $this->request( 'privado' ) ) );
		$this->assertSame( array( 'SELECT * FROM `vpress_privado` LIMIT 0, 10' ), $this->data_queries() );
	}

	public function test_paging_is_cast_and_clamped(): void {
		$cases = array(
			array( array( 'page' => '3', 'perPage' => '10' ), 'LIMIT 20, 10' ),
			array( array( 'page' => '-5', 'perPage' => '9999' ), 'LIMIT 0, 500' ),
			array( array( 'page' => '0', 'perPage' => '0' ), 'LIMIT 0, 1' ),
			array( array( 'page' => '2; DROP TABLE x', 'perPage' => '5 OR 1=1' ), 'LIMIT 5, 5' ),
			array( array( 'page' => null, 'perPage' => null ), 'LIMIT 0, 1' ),
		);
		foreach ( $cases as list( $params, $limit ) ) {
			$this->wpdb->queries = array();
			vpress_get_dataset_data( $this->request( 'vpress_test_ventas', $params ) );
			$this->assertSame( array( "SELECT * FROM `vpress_vpress_test_ventas` $limit" ), $this->data_queries(), $limit );
		}
	}

	public function test_non_wordpress_source_is_unsupported_and_never_leaves_the_server(): void {
		$this->assertWpError( 'vpress_unsupported_source', 400, vpress_get_dataset_data( $this->request( 'vpress_test_ventas', array( 'dataSource' => 'hue' ) ) ) );
		$this->assertFalse( function_exists( 'callAPI' ) );
		$this->assertSame( array(), $this->wpdb->queries );
	}

	public function test_external_source_filter_short_circuits(): void {
		$GLOBALS['vpress_test_filters']['vpress_external_dataset_data'] = function ( $value, $request ) {
			return 'hue' === $request->get_param( 'dataSource' ) ? array( 'data' => array( 'from' => 'addon' ) ) : $value;
		};

		$this->assertSame( array( 'data' => array( 'from' => 'addon' ) ), vpress_get_dataset_data( $this->request( 'anything', array( 'dataSource' => 'hue' ) ) ) );
		$this->assertSame( array(), $this->wpdb->queries );
	}
}
