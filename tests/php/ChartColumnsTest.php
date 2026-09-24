<?php

use PHPUnit\Framework\TestCase;

/**
 * /chart/columns (edit_posts) selects raw columns of a dataset; every
 * identifier goes through the guards.
 */
final class ChartColumnsTest extends TestCase {

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		$this->wpdb      = new FakeWpdb();
		$GLOBALS['wpdb'] = $this->wpdb;
		$this->wpdb->on( "/vpresscore_datasets WHERE slug = 'vpress_test_ventas' LIMIT 1/", array( array( '1' => '1' ) ) );
		$this->wpdb->on( '/^SHOW COLUMNS FROM `vpress_vpress_test_ventas`$/', VpressFixtures::real_columns() );
		$this->wpdb->on( '/^SELECT `/', array( (object) array( 'estado' => 'Jalisco', 'ventas' => '10' ) ) );
	}

	private function request( array $body ): FakeRestRequest {
		return new FakeRestRequest( array(), array_merge( array( 'dataset' => 'vpress_vpress_test_ventas', 'column_1' => 'estado', 'column_2' => 'ventas', 'column_3' => '' ), $body ) );
	}

	private function assertWpError( string $code, $result ): void {
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( $code, $result->get_error_code() );
		$this->assertSame( array( 'status' => 400 ), $result->get_error_data() );
	}

	private function data_queries(): array {
		return array_values( preg_grep( '/^SELECT `/', $this->wpdb->queries ) );
	}

	public function test_selects_two_or_three_quoted_columns(): void {
		$response = vpress_get_chart_data( $this->request( array() ) );
		vpress_get_chart_data( $this->request( array( 'column_3' => 'canal' ) ) );

		$this->assertEquals( array( (object) array( 'estado' => 'Jalisco', 'ventas' => '10' ) ), $response['data'] );
		$this->assertSame(
			array(
				'SELECT `estado`, `ventas` FROM `vpress_vpress_test_ventas`',
				'SELECT `estado`, `ventas`, `canal` FROM `vpress_vpress_test_ventas`',
			),
			$this->data_queries()
		);
	}

	public function test_rejects_injection_in_a_column(): void {
		foreach ( array( 'column_1', 'column_2', 'column_3' ) as $key ) {
			$this->assertWpError( 'vpress_bad_column', vpress_get_chart_data( $this->request( array( $key => 'estado FROM wp_users -- ' ) ) ), $key );
		}
		$this->assertWpError( 'vpress_bad_column', vpress_get_chart_data( $this->request( array( 'column_2' => 'user_pass' ) ) ) );
		$this->assertSame( array(), $this->data_queries() );
	}

	public function test_rejects_injection_in_the_dataset(): void {
		$this->assertWpError( 'vpress_unknown_dataset', vpress_get_chart_data( $this->request( array( 'dataset' => 'wp_users; DROP TABLE wp_posts' ) ) ) );
		// Takes the physical table name, like /chart/query; a bare slug is not one.
		$this->assertWpError( 'vpress_unknown_dataset', vpress_get_chart_data( $this->request( array( 'dataset' => 'test_ventas' ) ) ) );
		$this->assertSame( array(), $this->wpdb->queries );
	}

	public function test_the_unreachable_test_columns_route_and_its_builder_are_gone(): void {
		$root = dirname( __DIR__, 2 );

		$this->assertFalse( function_exists( 'vpress_get_data' ) );
		$this->assertStringNotContainsString( 'test/columns', file_get_contents( "$root/api/routes.php" ) );
		$this->assertStringNotContainsString( 'VPRESS_API_GET_CHART_DATA_ROUTE_TEST', file_get_contents( "$root/api/controllers/chart.php" ) );
	}
}
