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

	/** SHOW COLUMNS field list of vpress_vpress_test_ventas. */
	public static function real_columns(): array {
		return array( 'fecha', 'estado', 'codigo_estado', 'producto', 'canal', 'ventas', 'unidades', 'satisfaccion', 'created', 'updated' );
	}
}
