<?php

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ChartSqlBuilderTest extends TestCase {

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		$this->wpdb = new FakeWpdb();
	}

	private function build( array $overrides, array $base = array() ) {
		$body = array_merge( array( 'dataset' => '`vpress_vpress_test_ventas`' ), $base, $overrides );
		return vpress_build_chart_sql( $body, VpressFixtures::real_columns(), $this->wpdb );
	}

	private function assertWpError( string $code, $result ): void {
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( $code, $result->get_error_code() );
		$this->assertSame( array( 'status' => 400 ), $result->get_error_data() );
	}

	public static function legacy_cases(): array {
		return VpressFixtures::legacy_chart_sql_cases();
	}

	#[DataProvider( 'legacy_cases' )]
	public function test_matches_legacy_sql_for_valid_input( array $body, string $legacy ): void {
		$sql = $this->build( array( 'dataset' => '`vpress_vpress_test_ventas`' ), $body );

		$this->assertIsString( $sql );
		$this->assertSame( vpress_test_normalize_sql( $legacy ), vpress_test_normalize_sql( $sql ) );
	}

	public function test_chart_1_selects_from_the_quoted_physical_table(): void {
		$sql = $this->build( array(), VpressFixtures::chart_1_flat_body() );

		$this->assertSame(
			'SELECT f1.`estado`,f1.`canal`,SUM(`ventas`) AS `ventas` FROM `vpress_vpress_test_ventas` as f1 GROUP BY f1.`estado`,f1.`canal` ORDER BY `ventas` ASC',
			$sql
		);
	}

	public function test_accepts_backtick_quoted_columns_from_the_admin(): void {
		$sql = $this->build( array( 'column_head' => '`estado`', 'order_by' => '`estado` DESC' ) );

		$this->assertSame( 'SELECT f1.`estado` FROM `vpress_vpress_test_ventas` as f1 GROUP BY f1.`estado` ORDER BY `estado` DESC', $sql );
	}

	public static function unknown_column_bodies(): array {
		return array(
			'column_head'           => array( array( 'column_head' => 'password' ) ),
			'column_2 injection'    => array( array( 'column_head' => 'estado', 'column_2' => 'estado FROM wp_users --' ) ),
			'aggregate_column_2'    => array( array( 'aggregate_2' => 'SUM', 'aggregate_column_2' => 'user_pass' ) ),
			'linear_column_3'       => array( array( 'linear_column_3' => 'nope' ) ),
			'function_operation'    => array( array( 'function_operation_head' => 'MIN(user_pass)', 'function_alias_head' => 'min' ) ),
			'where column'          => array( array( 'column_head' => 'estado', 'where' => array( array( 'op' => 'IN', 'column' => '1=1 OR canal', 'value' => array( 'a' ) ) ) ) ),
			'order_by column'       => array( array( 'column_head' => 'estado', 'order_by' => 'nope ASC' ) ),
		);
	}

	#[DataProvider( 'unknown_column_bodies' )]
	public function test_rejects_columns_not_in_the_table( array $body ): void {
		$this->assertWpError( 'vpress_bad_column', $this->build( $body ) );
	}

	public function test_filter_value_is_bound_and_cannot_break_out(): void {
		$sql = $this->build(
			array(
				'column_head' => 'estado',
				'where'       => array(
					array( 'op' => 'IN', 'column' => 'canal', 'value' => array( "x' OR 1=1 --" ) ),
					array( 'op' => 'EQ', 'column' => 'producto', 'value' => "y' OR '1'='1" ),
					array( 'op' => 'BETWEEN', 'column' => 'ventas', 'value' => array( "0' OR 1=1 --", '5' ) ),
				),
			)
		);

		$this->assertStringContainsString( "WHERE `canal` IN ('x\\' OR 1=1 --')", $sql );
		$this->assertStringContainsString( "AND `producto` = 'y\\' OR \\'1\\'=\\'1'", $sql );
		$this->assertStringContainsString( "AND `ventas` BETWEEN '0\\' OR 1=1 --' AND '5'", $sql );
		$outside_literals = preg_replace( "/'(?:\\\\.|[^'\\\\])*'/", "''", $sql );
		$this->assertStringNotContainsString( 'OR', $outside_literals );
	}

	public function test_literal_percent_in_a_value_survives(): void {
		$sql = $this->build( array( 'column_head' => 'estado', 'where' => array( array( 'op' => 'EQ', 'column' => 'producto', 'value' => '100%' ) ) ) );

		$this->assertStringContainsString( "`producto` = '100%'", $sql );
	}

	public function test_rejects_bad_filters(): void {
		$base = array( 'column_head' => 'estado' );
		foreach ( array(
			array( 'op' => 'LIKE', 'column' => 'canal', 'value' => array( 'a' ) ),
			array( 'op' => 'BETWEEN', 'column' => 'ventas', 'value' => array( '1' ) ),
			array( 'op' => 'EQ', 'column' => 'canal', 'value' => array( 'a' ) ),
			array( 'op' => 'IN', 'column' => 'canal', 'value' => array( array( 'nested' ) ) ),
			'not-a-clause',
		) as $clause ) {
			$this->assertWpError( 'vpress_bad_filter', $this->build( array( 'where' => array( $clause ) ), $base ) );
		}
	}

	public function test_rejects_aggregate_outside_whitelist(): void {
		$this->assertWpError( 'vpress_bad_aggregate', $this->build( array( 'aggregate_2' => 'SLEEP(5)', 'aggregate_column_2' => 'ventas' ) ) );
	}

	public function test_function_operations_allow_only_count_star_and_single_column_aggregates(): void {
		foreach ( array( 'COUNT(*)' => '(COUNT(*))', 'min(ventas)' => '(MIN(`ventas`))', 'MAX(`ventas`)' => '(MAX(`ventas`))', 'AVG(ventas)' => '(AVG(`ventas`))', 'SUM( ventas )' => '(SUM(`ventas`))' ) as $op => $rendered ) {
			$sql = $this->build( array( 'function_operation_head' => $op, 'function_alias_head' => 'm' ) );
			$this->assertSame( "SELECT $rendered AS `m` FROM `vpress_vpress_test_ventas` as f1", $sql, $op );
		}
		foreach ( array( 'SLEEP(5)', 'COUNT(ventas)', 'MIN(ventas) + 1', '(SELECT 1)', 'MIN(ventas), user()' ) as $bad ) {
			$this->assertWpError( 'vpress_bad_function', $this->build( array( 'function_operation_head' => $bad, 'function_alias_head' => 'm' ) ) );
		}
	}

	public function test_rejects_bad_alias(): void {
		$this->assertWpError( 'vpress_bad_alias', $this->build( array( 'function_operation_head' => 'COUNT(*)', 'function_alias_head' => 'x FROM wp_users --' ) ) );
	}

	public function test_order_by_accepts_select_aliases_and_rejects_anything_else(): void {
		$sql = $this->build( array( 'column_head' => 'estado', 'function_operation_2' => 'COUNT(*)', 'function_alias_2' => 'total_count', 'order_by' => 'total_count desc' ) );
		$this->assertStringEndsWith( 'ORDER BY `total_count` DESC', $sql );

		foreach ( array( 'estado', 'estado ASC, (SELECT 1)', 'estado ASC; DROP TABLE x', 'SLEEP(5) ASC' ) as $bad ) {
			$this->assertWpError( 'vpress_bad_order', $this->build( array( 'column_head' => 'estado', 'order_by' => $bad ) ), $bad );
		}
	}

	public function test_limit_is_cast_and_clamped(): void {
		foreach ( array( '10; DROP TABLE x' => 10, 99999 => 5000, -3 => 1, 250 => 250 ) as $in => $out ) {
			$sql = $this->build( array( 'column_head' => 'estado', 'limit' => $in ) );
			$this->assertStringEndsWith( "LIMIT $out", $sql, (string) $in );
		}
		// Like the legacy builder, an empty limit means no LIMIT clause.
		$this->assertStringNotContainsString( 'LIMIT', $this->build( array( 'column_head' => 'estado', 'limit' => '0' ) ) );
		$this->assertWpError( 'vpress_bad_limit', $this->build( array( 'column_head' => 'estado', 'limit' => array( 1 ) ) ) );
	}

	public function test_rejects_an_unquotable_dataset(): void {
		$this->assertWpError( 'vpress_unknown_dataset', $this->build( array( 'dataset' => 'x; DROP TABLE y', 'column_head' => 'estado' ) ) );
	}

	public function test_rejects_a_query_with_nothing_selected(): void {
		$this->assertWpError( 'vpress_empty_query', $this->build( array() ) );
	}
}
