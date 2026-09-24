<?php

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * vpress_query_body_from_context() is the PHP port of queryBody() in
 * admin/src/vpress/helpers/index.js. Expected bodies are derived by hand
 * from that function, branch by branch.
 */
final class QueryBodyTest extends TestCase {

	private static function axis( string $slug, string $type, ?string $func = null ): array {
		$axis = array( 'title' => $slug, 'type' => $type, 'slug' => $slug );
		if ( null !== $func ) {
			$axis['func'] = $func;
		}
		return $axis;
	}

	private static function context( array $overrides ): array {
		return array_merge(
			array(
				'chart'      => 'bars',
				'xAxis'      => self::axis( '', '' ),
				'yAxis'      => self::axis( '', '' ),
				'groupBy'    => self::axis( '', '' ),
				'collapseBy' => self::axis( '', '' ),
				'filters'    => array(),
				'orderBy'    => array( 'order' => 'asc', 'slug' => '' ),
			),
			$overrides
		);
	}

	private static function expected( array $context, array $computed ): array {
		return array_merge(
			array(
				'dataset'    => 'vpress_vpress_test_ventas',
				'dataSource' => 'wordpress',
				'chart_type' => $context['chart'],
				'context'    => $context,
			),
			$computed,
			array( 'order_by' => $computed['order_by'] ?? null )
		);
	}

	public function test_chart_1_matches_the_real_js_output_key_by_key(): void {
		$expected = VpressFixtures::chart_1_flat_body();
		$actual   = vpress_query_body_from_context( VpressFixtures::chart_1_context(), VpressFixtures::DATASET_SLUG, null );

		$this->assertIsArray( $actual );
		$this->assertSame( array_keys( $expected ), array_keys( $actual ) );
		foreach ( $expected as $key => $value ) {
			$this->assertSame( $value, $actual[ $key ], $key );
		}
	}

	public function test_generated_fixture_agrees_with_the_hand_derivation_and_the_saved_config(): void {
		$this->assertSame( VpressFixtures::chart_1_flat_body_hand_derived(), VpressFixtures::chart_1_flat_body() );
		$this->assertSame( VpressFixtures::CHART_1_VALUE, trim( file_get_contents( __DIR__ . '/fixtures/chart-1-value.json' ) ) );
	}

	public static function branches(): array {
		$cases = array();

		$c = self::context( array( 'xAxis' => self::axis( 'total_count', 'linear', '' ), 'yAxis' => self::axis( 'ventas', 'linear', '' ), 'groupBy' => self::axis( 'canal', 'ordinal' ) ) );
		$cases['linear x linear, one side total_count'] = array( $c, self::expected( $c, array( 'function_operation_2' => 'COUNT(*)', 'function_alias_2' => 'total_count', 'aggregate_column_head' => 'ventas', 'aggregate_head' => 'AVG', 'linear_column_4' => 'canal' ) ) );

		$c = self::context( array( 'xAxis' => self::axis( 'total_count', 'linear', '' ), 'yAxis' => self::axis( 'ventas', 'linear', 'max' ), 'collapseBy' => self::axis( 'unidades', 'linear', 'sum' ) ) );
		$cases['linear x linear, total_count with aggregated partner'] = array( $c, self::expected( $c, array( 'function_operation_2' => 'COUNT(*)', 'function_alias_2' => 'total_count', 'column_head' => 'ventas', 'aggregate_column_3' => 'unidades', 'aggregate_3' => 'SUM' ) ) );

		$c = self::context( array( 'xAxis' => self::axis( 'unidades', 'linear', 'mean' ), 'yAxis' => self::axis( 'ventas', 'linear', '' ), 'collapseBy' => self::axis( 'satisfaccion', 'linear', 'max' ), 'orderBy' => array( 'order' => 'desc', 'slug' => 'ventas' ) ) );
		// JS quirk kept: aggregate_3 uses xAxis.func, not collapseBy.func.
		$cases['linear x linear with aggregates'] = array( $c, self::expected( $c, array( 'aggregate_column_head' => 'unidades', 'aggregate_head' => 'AVG', 'column_2' => 'ventas', 'aggregate_column_3' => 'satisfaccion', 'aggregate_3' => 'AVG', 'order_by' => 'ventas DESC' ) ) );

		$c = self::context( array( 'xAxis' => self::axis( 'ventas', 'linear', '' ), 'yAxis' => self::axis( 'unidades', 'linear', '' ), 'collapseBy' => self::axis( 'satisfaccion', 'linear', '' ), 'groupBy' => self::axis( 'canal', 'ordinal' ) ) );
		$cases['linear x linear, plain'] = array( $c, self::expected( $c, array( 'linear_column_head' => 'ventas', 'linear_column_2' => 'unidades', 'linear_column_3' => 'satisfaccion', 'linear_column_4' => 'canal' ) ) );

		$c = self::context( array( 'xAxis' => self::axis( 'estado', 'ordinal' ), 'yAxis' => self::axis( 'fecha', 'date' ), 'collapseBy' => self::axis( 'total_count', 'linear' ) ) );
		$cases['ordinal x date, counted'] = array( $c, self::expected( $c, array( 'column_head' => 'estado', 'column_2' => 'fecha', 'function_operation_2' => 'COUNT(*)', 'function_alias_2' => 'total_count' ) ) );

		$c = self::context( array( 'xAxis' => self::axis( 'estado', 'ordinal' ), 'yAxis' => self::axis( 'producto', 'ordinal' ), 'collapseBy' => self::axis( 'ventas', 'linear', 'min' ) ) );
		$cases['ordinal x ordinal, aggregated'] = array( $c, self::expected( $c, array( 'column_head' => 'estado', 'column_2' => 'producto', 'aggregate_column_2' => 'ventas', 'aggregate_2' => 'MIN' ) ) );

		$c = self::context( array( 'xAxis' => self::axis( 'total_count', 'linear' ), 'yAxis' => self::axis( 'estado', 'ordinal' ), 'collapseBy' => self::axis( 'ventas', 'linear', 'max' ), 'groupBy' => self::axis( 'canal', 'ordinal' ) ) );
		$cases['linear total_count x ordinal'] = array( $c, self::expected( $c, array( 'column_head' => 'estado', 'function_operation_2' => 'COUNT(*)', 'function_alias_2' => 'total_count', 'aggregate_column_3' => 'ventas', 'aggregate_3' => 'MAX', 'column_3' => 'canal' ) ) );

		$c = self::context( array( 'xAxis' => self::axis( 'ventas', 'linear', 'sum' ), 'groupBy' => self::axis( 'canal', 'ordinal' ), 'collapseBy' => self::axis( 'unidades', 'linear', 'min' ) ) );
		$cases['single linear axis'] = array( $c, self::expected( $c, array( 'aggregate_column_head' => 'ventas', 'aggregate_head' => 'AVG', 'aggregate_column_2' => 'unidades', 'aggregate_2' => 'MIN', 'column_2' => 'canal' ) ) );

		$c = self::context( array( 'yAxis' => self::axis( 'producto', 'ordinal' ), 'collapseBy' => self::axis( 'ventas', 'linear', 'sum' ), 'groupBy' => self::axis( 'canal', 'ordinal' ) ) );
		$cases['single ordinal axis'] = array( $c, self::expected( $c, array( 'column_2' => 'producto', 'function_operation_head' => 'COUNT(*)', 'function_alias_head' => 'total_count', 'aggregate_column_3' => 'ventas', 'aggregate_3' => 'SUM', 'column_3' => 'canal' ) ) );

		$c = self::context(
			array(
				'xAxis'   => self::axis( 'mi estado', 'ordinal' ),
				'yAxis'   => self::axis( 'ventas', 'linear', 'sum' ),
				'filters' => array(
					array( 'slug' => 'canal', 'type' => 'ordinal', 'value' => array( 'a', 'b' ) ),
					array( 'slug' => 'ventas', 'type' => 'linear', 'value' => array( 1, 5 ) ),
					array( 'slug' => 'fecha', 'type' => 'date', 'value' => array( '2020' ) ),
				),
			)
		);
		$cases['filters and space-quoting'] = array(
			$c,
			self::expected(
				$c,
				array(
					'column_head'        => '`mi estado`',
					'aggregate_2'        => 'SUM',
					'aggregate_column_2' => 'ventas',
					'where'              => array(
						array( 'op' => 'IN', 'column' => 'canal', 'value' => array( 'a', 'b' ) ),
						array( 'op' => 'BETWEEN', 'column' => 'ventas', 'value' => array( 1, 5 ) ),
						array( 'op' => 'IN', 'column' => 'fecha', 'value' => array( '2020' ) ),
					),
				)
			),
		);

		return $cases;
	}

	#[DataProvider( 'branches' )]
	public function test_ports_each_query_body_branch( array $context, array $expected ): void {
		$actual = vpress_query_body_from_context( $context, VpressFixtures::DATASET_SLUG, null );

		$this->assertIsArray( $actual );
		ksort( $expected );
		ksort( $actual );
		$this->assertSame( $expected, $actual );
	}

	public function test_external_source_keeps_the_bare_table_name(): void {
		$actual = vpress_query_body_from_context( VpressFixtures::chart_1_context(), 'ventas_hue', 'hue' );

		$this->assertSame( 'ventas_hue', $actual['dataset'] );
		$this->assertSame( 'hue', $actual['dataSource'] );
	}

	public static function invalid_contexts(): array {
		return array(
			'both axes total_count' => array( self::context( array( 'xAxis' => self::axis( 'total_count', 'linear' ), 'yAxis' => self::axis( 'total_count', 'linear' ) ) ) ),
			'unknown axis types'    => array( self::context( array( 'xAxis' => self::axis( 'estado', 'geo' ), 'yAxis' => self::axis( 'ventas', 'geo' ) ) ) ),
			'no axes'               => array( self::context( array() ) ),
			'axis not an object'    => array( self::context( array( 'xAxis' => 'estado' ) ) ),
		);
	}

	#[DataProvider( 'invalid_contexts' )]
	public function test_invalid_chart_contexts_are_rejected( array $context ): void {
		$result = vpress_query_body_from_context( $context, VpressFixtures::DATASET_SLUG, null );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'vpress_invalid_chart', $result->get_error_code() );
		$this->assertSame( array( 'status' => 400 ), $result->get_error_data() );
	}
}
