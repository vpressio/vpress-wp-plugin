<?php

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * The editor path of /chart/query, end to end: for every flat body the admin
 * sends, the SQL actually run equals what the pre-hardening builder ran
 * (pinned in VpressFixtures) modulo whitespace, identifier quoting and AS
 * casing.
 */
final class ChartSqlCharacterizationTest extends TestCase {

	protected function setUp(): void {
		vpress_guard_columns_reset();
	}

	protected function tearDown(): void {
		$GLOBALS['vpress_test_caps'] = array();
	}

	public static function legacy_cases(): array {
		return VpressFixtures::legacy_chart_sql_cases();
	}

	#[DataProvider( 'legacy_cases' )]
	public function test_editor_query_runs_the_legacy_sql( array $body, string $legacy ): void {
		$wpdb            = new FakeWpdb();
		$GLOBALS['wpdb'] = $wpdb;
		$GLOBALS['vpress_test_caps'] = array( 'edit_posts' );
		$wpdb->on( "/vpresscore_datasets WHERE slug = 'vpress_test_ventas'/", array( array( '1' => '1' ) ) );
		$wpdb->on( '/^SHOW COLUMNS FROM `vpress_vpress_test_ventas`$/', VpressFixtures::real_columns() );
		$wpdb->on( '/^SELECT .* FROM `vpress_vpress_test_ventas` as f1/', array( (object) array( 'estado' => 'Nuevo León' ) ) );

		$response = vpress_query_chart_data( new FakeRestRequest( array(), $body ) );

		$this->assertIsArray( $response );
		$this->assertEquals( array( (object) array( 'estado' => 'Nuevo León' ) ), $response['data'] );
		$this->assertSame( vpress_test_normalize_sql( $legacy ), vpress_test_normalize_sql( $wpdb->last_query ) );
	}
}
