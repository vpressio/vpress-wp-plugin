<?php

use PHPUnit\Framework\TestCase;

final class QueryGuardTest extends TestCase {

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		$this->wpdb       = new FakeWpdb();
		$GLOBALS['wpdb'] = $this->wpdb;
		$this->wpdb->on( "/vpresscore_datasets WHERE slug = 'vpress_test_ventas' LIMIT 1/", array( array( '1' => '1' ) ) );
	}

	public function test_identifier_accepts_word_characters_up_to_64(): void {
		$this->assertTrue( vpress_guard_identifier( 'ventas' ) );
		$this->assertTrue( vpress_guard_identifier( 'codigo_estado2' ) );
		$this->assertTrue( vpress_guard_identifier( str_repeat( 'a', 64 ) ) );
	}

	public function test_identifier_rejects_everything_else(): void {
		foreach ( array( '', str_repeat( 'a', 65 ), 'a b', 'a`b', 'a;b', "a'b", 'f1.x', 'SLEEP(5)', "ventas\n" ) as $bad ) {
			$this->assertFalse( vpress_guard_identifier( $bad ), var_export( $bad, true ) );
		}
	}

	public function test_dataset_table_accepts_registry_slug(): void {
		$this->assertSame( '`vpress_vpress_test_ventas`', vpress_guard_dataset_table( 'vpress_test_ventas' ) );
		$this->assertSame(
			"SELECT 1 FROM wp_vpresscore_datasets WHERE slug = 'vpress_test_ventas' LIMIT 1",
			$this->wpdb->queries[0]
		);
	}

	public function test_dataset_table_accepts_physical_name(): void {
		$this->assertSame( '`vpress_vpress_test_ventas`', vpress_guard_dataset_table( 'vpress_vpress_test_ventas' ) );
	}

	public function test_dataset_table_rejects_injection_without_querying(): void {
		$result = vpress_guard_dataset_table( 'vpress_test_ventas; DROP TABLE wp_users' );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'vpress_unknown_dataset', $result->get_error_code() );
		$this->assertSame( array( 'status' => 400 ), $result->get_error_data() );
		$this->assertSame( array(), $this->wpdb->queries );
	}

	public function test_dataset_table_rejects_unknown_slug(): void {
		$result = vpress_guard_dataset_table( 'nope' );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'vpress_unknown_dataset', $result->get_error_code() );
	}

	public function test_columns_reads_show_columns_once_per_table(): void {
		$this->wpdb->on( '/^SHOW COLUMNS FROM `vpress_guard_cols_probe`$/', array( 'a', 'b' ) );

		$this->assertSame( array( 'a', 'b' ), vpress_guard_columns( '`vpress_guard_cols_probe`' ) );
		$this->assertSame( array( 'a', 'b' ), vpress_guard_columns( 'vpress_guard_cols_probe' ) );
		$this->assertCount( 1, $this->wpdb->queries );
	}

	public function test_columns_of_a_non_identifier_is_empty_without_querying(): void {
		$this->assertSame( array(), vpress_guard_columns( 'x`; DROP TABLE y' ) );
		$this->assertSame( array(), $this->wpdb->queries );
	}

	public function test_aggregate_whitelist_normalises(): void {
		$expected = array(
			''            => '',
			'sum'         => 'sum',
			'SUM'         => 'sum',
			'avg'         => 'avg',
			'AVG'         => 'avg',
			'mean'        => 'avg',
			'min'         => 'min',
			'MAX'         => 'max',
			'count'       => 'count',
			'total_count' => 'total_count',
		);
		foreach ( $expected as $in => $out ) {
			$this->assertSame( $out, vpress_guard_aggregate( $in ), $in );
		}
	}

	public function test_aggregate_rejects_sleep(): void {
		foreach ( array( 'SLEEP(5)', 'distinct', 'sum(x)', 'benchmark' ) as $bad ) {
			$result = vpress_guard_aggregate( $bad );
			$this->assertInstanceOf( WP_Error::class, $result, $bad );
			$this->assertSame( 'vpress_bad_aggregate', $result->get_error_code() );
			$this->assertSame( array( 'status' => 400 ), $result->get_error_data() );
		}
	}
}
