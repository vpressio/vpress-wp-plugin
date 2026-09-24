<?php

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Pins the SQL the pre-hardening /chart/query builder emitted for the flat
 * bodies admin/src/vpress/helpers/index.js sends. The hardened builder must
 * stay equal to these modulo whitespace, identifier quoting and AS casing.
 */
final class ChartSqlCharacterizationTest extends TestCase {

	const T = 'vpress_vpress_test_ventas';

	public static function legacy_cases(): array {
		$t = self::T;
		return array(
			'chart #1 (ordinal x, summed linear y, grouped)' => array(
				VpressFixtures::chart_1_flat_body(),
				'SELECT  f1.estado,f1.canal,SUM(ventas) AS ventas  FROM vpress_vpress_test_ventas as f1  GROUP BY f1.estado,f1.canal ORDER BY ventas ASC ',
			),
			'filter lookup, linear column' => array(
				array( 'dataset' => $t, 'context' => array( 'getFilters' => array( 'slug' => 'ventas', 'func' => 'distinct' ) ), 'function_operation_head' => 'MIN(ventas)', 'function_alias_head' => 'min', 'function_operation_2' => 'MAX(ventas)', 'function_alias_2' => 'max' ),
				'SELECT  (MIN(ventas)) AS min,(MAX(ventas)) AS max  FROM vpress_vpress_test_ventas as f1    ',
			),
			'filter lookup, ordinal column' => array(
				array( 'dataset' => $t, 'context' => array( 'getFilters' => array( 'slug' => 'estado', 'func' => 'distinct' ) ), 'order_by' => 'estado ASC', 'column_head' => 'estado' ),
				'SELECT  f1.estado  FROM vpress_vpress_test_ventas as f1  GROUP BY f1.estado ORDER BY estado ASC ',
			),
			'linear x linear with total_count, ordered by alias, limited' => array(
				array( 'dataset' => $t, 'dataSource' => 'wordpress', 'function_operation_2' => 'COUNT(*)', 'function_alias_2' => 'total_count', 'aggregate_column_head' => 'ventas', 'aggregate_head' => 'AVG', 'linear_column_4' => 'canal', 'order_by' => 'total_count DESC', 'limit' => '10' ),
				'SELECT  AVG(ventas) AS ventas,f1.canal,(COUNT(*)) AS total_count  FROM vpress_vpress_test_ventas as f1   ORDER BY total_count DESC LIMIT 10',
			),
			'plain linear columns' => array(
				array( 'dataset' => $t, 'linear_column_head' => 'ventas', 'linear_column_2' => 'unidades', 'linear_column_3' => 'satisfaccion' ),
				'SELECT  f1.ventas,f1.unidades,f1.satisfaccion  FROM vpress_vpress_test_ventas as f1    ',
			),
			'IN / BETWEEN / EQ filters with aggregates' => array(
				array( 'dataset' => $t, 'column_head' => 'estado', 'column_2' => 'canal', 'aggregate_2' => 'MAX', 'aggregate_column_2' => 'ventas', 'aggregate_3' => 'MIN', 'aggregate_column_3' => 'unidades', 'where' => array( array( 'op' => 'IN', 'column' => 'canal', 'value' => array( 'a', 'b' ) ), array( 'op' => 'BETWEEN', 'column' => 'ventas', 'value' => array( '1', '5' ) ), array( 'op' => 'EQ', 'column' => 'producto', 'value' => 'p' ) ) ),
				"SELECT  f1.estado,f1.canal,MAX(ventas) AS ventas,MIN(unidades) as unidades  FROM vpress_vpress_test_ventas as f1 WHERE canal IN ('a', 'b') AND ventas BETWEEN '1' AND '5' AND producto = 'p' GROUP BY f1.estado,f1.canal  ",
			),
		);
	}

	#[DataProvider( 'legacy_cases' )]
	public function test_legacy_builder_sql( array $body, string $expected ): void {
		$GLOBALS['wpdb'] = new FakeWpdb();

		vpress_query_chart_data( new FakeRestRequest( array(), $body ) );

		$this->assertSame( $expected, $GLOBALS['wpdb']->queries[0] );
	}
}
