<?php

use PHPUnit\Framework\TestCase;

/**
 * Pins the SQL the pre-hardening /chart/query builder emitted for chart #1.
 * The hardened builder must stay equal to this modulo whitespace and
 * identifier quoting (see ChartSqlBuilderTest).
 */
final class ChartSqlCharacterizationTest extends TestCase {

	const LEGACY_CHART_1_SQL = 'SELECT  f1.estado,f1.canal,SUM(ventas) AS ventas  FROM vpress_vpress_test_ventas as f1  GROUP BY f1.estado,f1.canal ORDER BY ventas ASC ';

	public function test_legacy_builder_sql_for_chart_1(): void {
		$GLOBALS['wpdb']            = new FakeWpdb();
		$GLOBALS['vpress_test_caps'] = array( 'edit_posts' );

		vpress_query_chart_data( new FakeRestRequest( array(), VpressFixtures::chart_1_flat_body() ) );

		$this->assertSame( self::LEGACY_CHART_1_SQL, $GLOBALS['wpdb']->queries[0] );
	}
}
