<?php

use PHPUnit\Framework\TestCase;

final class QueryGuardTest extends TestCase {

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		vpress_guard_columns_reset();
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

	private function assertUnknownDataset( $result ): void {
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'vpress_unknown_dataset', $result->get_error_code() );
		$this->assertSame( array( 'status' => 400 ), $result->get_error_data() );
	}

	public function test_dataset_slug_resolves_a_registry_slug(): void {
		$this->assertSame( '`vpress_vpress_test_ventas`', vpress_guard_dataset_slug( 'vpress_test_ventas' ) );
		$this->assertSame(
			array( "SELECT 1 FROM wp_vpresscore_datasets WHERE slug = 'vpress_test_ventas' LIMIT 1" ),
			$this->wpdb->queries
		);
	}

	public function test_dataset_slug_rejects_injection_without_querying(): void {
		$this->assertUnknownDataset( vpress_guard_dataset_slug( 'vpress_test_ventas; DROP TABLE wp_users' ) );
		$this->assertUnknownDataset( vpress_guard_dataset_slug( str_repeat( 'a', 58 ) ) );
		$this->assertSame( array(), $this->wpdb->queries );
	}

	public function test_dataset_slug_rejects_an_unknown_slug(): void {
		$this->assertUnknownDataset( vpress_guard_dataset_slug( 'nope' ) );
	}

	public function test_dataset_table_strips_the_prefix_exactly_once(): void {
		$this->assertSame( '`vpress_vpress_test_ventas`', vpress_guard_dataset_table( 'vpress_vpress_test_ventas' ) );
		$this->assertSame( '`vpress_vpress_test_ventas`', vpress_guard_dataset_table( '`vpress_vpress_test_ventas`' ) );
		$this->assertSame(
			array_fill( 0, 2, "SELECT 1 FROM wp_vpresscore_datasets WHERE slug = 'vpress_test_ventas' LIMIT 1" ),
			$this->wpdb->queries
		);
	}

	public function test_dataset_table_rejects_names_without_the_prefix_and_injection(): void {
		$this->assertUnknownDataset( vpress_guard_dataset_table( 'test_ventas' ) );
		$this->assertUnknownDataset( vpress_guard_dataset_table( 'wp_users' ) );
		$this->assertUnknownDataset( vpress_guard_dataset_table( 'vpress_' ) );
		$this->assertUnknownDataset( vpress_guard_dataset_table( 'vpress_test_ventas; DROP TABLE wp_users' ) );
		$this->assertSame( array(), $this->wpdb->queries );
	}

	public function test_slug_and_physical_name_never_cross_datasets(): void {
		$this->wpdb = new FakeWpdb();
		$GLOBALS['wpdb'] = $this->wpdb;
		$this->wpdb->on( "/WHERE slug = 'test_ventas' LIMIT 1/", array( array( '1' => '1' ) ) );
		$this->wpdb->on( "/WHERE slug = 'vpress_test_ventas' LIMIT 1/", array( array( '1' => '1' ) ) );

		$this->assertSame( '`vpress_test_ventas`', vpress_guard_dataset_table( 'vpress_test_ventas' ) );
		$this->assertSame( array( "SELECT 1 FROM wp_vpresscore_datasets WHERE slug = 'test_ventas' LIMIT 1" ), $this->wpdb->queries );
		$this->assertSame( '`vpress_vpress_test_ventas`', vpress_guard_dataset_slug( 'vpress_test_ventas' ) );
	}

	public function test_columns_reads_show_columns_once_per_table(): void {
		$this->wpdb->on( '/^SHOW COLUMNS FROM `vpress_guard_cols_probe`$/', array( 'a', 'b' ) );

		$this->assertSame( array( 'a', 'b' ), vpress_guard_columns( '`vpress_guard_cols_probe`' ) );
		$this->assertSame( array( 'a', 'b' ), vpress_guard_columns( 'vpress_guard_cols_probe' ) );
		$this->assertCount( 1, $this->wpdb->queries );
	}

	public function test_columns_cache_reset_forces_a_fresh_show_columns(): void {
		$this->wpdb->on( '/^SHOW COLUMNS FROM `vpress_guard_cols_reset`$/', array( 'a' ) );
		vpress_guard_columns( 'vpress_guard_cols_reset' );

		vpress_guard_columns_reset();
		$other           = new FakeWpdb();
		$GLOBALS['wpdb'] = $other;
		$other->on( '/^SHOW COLUMNS FROM `vpress_guard_cols_reset`$/', array( 'a', 'b' ) );

		$this->assertSame( array( 'a', 'b' ), vpress_guard_columns( 'vpress_guard_cols_reset' ) );
		$this->assertCount( 1, $other->queries );
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
