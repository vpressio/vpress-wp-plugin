<?php
/** Real data captured read-only from the dev database on 2026-09-24. */

final class VpressFixtures {

	/** wp_vpresscore_charts.value for chart #1 (dataset_id 2, public). */
	const CHART_1_VALUE = '{"chart":"bars","xAxis":{"title":"estado","type":"ordinal","slug":"estado","func":"","showLabel":false},"yAxis":{"title":"ventas","type":"linear","slug":"ventas","func":"sum","showLabel":false},"groupBy":{"title":"canal","type":"ordinal","slug":"canal"},"collapseBy":{"title":"ventas","type":"linear","slug":"ventas","func":"sum"},"filters":[],"orderBy":{"order":"asc","slug":"ventas"},"unitsName":"","decimals":1,"preffix":"","suffix":"","stackedBars":false,"title":"","subtitle":"","opacity":1,"theme":"","labels":false,"colors":["#40348c","#842f8e","#ba2982","#e2346d","#fc5353","#ff7b33","#ffa600"]}';

	/** Registry slug of dataset #2 (physical table vpress_vpress_test_ventas). */
	const DATASET_SLUG = 'vpress_test_ventas';

	public static function chart_1_context(): array {
		return json_decode( self::CHART_1_VALUE, true );
	}

	/**
	 * The flat body admin/src/vpress/helpers/index.js queryBody() sends for
	 * chart #1 (dataset.source NULL), derived by hand from its
	 * ordinal-x / linear-y branch.
	 */
	public static function chart_1_flat_body(): array {
		return array(
			'dataset'            => 'vpress_vpress_test_ventas',
			'dataSource'         => 'wordpress',
			'chart_type'         => 'bars',
			'context'            => self::chart_1_context(),
			'column_head'        => 'estado',
			'aggregate_2'        => 'SUM',
			'aggregate_column_2' => 'ventas',
			'column_3'           => 'canal',
			'order_by'           => 'ventas ASC',
		);
	}

	/**
	 * Flat bodies the admin sends, with the SQL the pre-hardening builder
	 * emitted for each (captured by running it, 2026-09-24).
	 */
	public static function legacy_chart_sql_cases(): array {
		$t = 'vpress_vpress_test_ventas';
		return array(
			'chart #1 (ordinal x, summed linear y, grouped)' => array(
				self::chart_1_flat_body(),
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

	/** SHOW COLUMNS field list of vpress_vpress_test_ventas. */
	public static function real_columns(): array {
		return array( 'fecha', 'estado', 'codigo_estado', 'producto', 'canal', 'ventas', 'unidades', 'satisfaccion', 'created', 'updated' );
	}
}

/** Compares SQL modulo whitespace, backtick quoting and AS casing. */
function vpress_test_normalize_sql( string $sql ): string {
	$sql = str_replace( '`', '', $sql );
	$sql = preg_replace( '/\s+/', ' ', $sql );
	$sql = preg_replace( '/ as /i', ' AS ', $sql );
	return trim( $sql );
}
