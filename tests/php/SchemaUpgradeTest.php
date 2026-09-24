<?php

use PHPUnit\Framework\TestCase;

/**
 * The datasets schema upgrade runs once per plugin version and the refresh
 * cron event is scheduled exactly once.
 */
final class SchemaUpgradeTest extends TestCase {

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		$this->wpdb                      = new FakeWpdb();
		$GLOBALS['wpdb']                 = $this->wpdb;
		$GLOBALS['vpress_test_options']  = array();
		$GLOBALS['vpress_test_cron']     = array();
	}

	private function creates(): array {
		return array_values( preg_grep( '/^CREATE TABLE/', $this->wpdb->queries ) );
	}

	public function test_upgrade_from_an_older_version_runs_the_schema_and_stamps_the_option(): void {
		$GLOBALS['vpress_test_options']['vpress_db_version'] = '0.1.0';

		$this->assertTrue( vpress_maybe_upgrade_db() );

		$datasets = preg_grep( '/^CREATE TABLE wp_vpresscore_datasets /', $this->creates() );
		$this->assertCount( 1, $datasets );
		$sql = reset( $datasets );
		$this->assertStringContainsString( "source_type VARCHAR(16) NOT NULL DEFAULT 'upload',", $sql );
		$this->assertStringContainsString( 'source_url TEXT NULL,', $sql );
		$this->assertStringContainsString( "refresh_interval VARCHAR(16) NOT NULL DEFAULT 'none',", $sql );
		$this->assertStringContainsString( 'last_refreshed_at DATETIME NULL,', $sql );
		$this->assertStringContainsString( 'last_refresh_error TEXT NULL,', $sql );
		// dbDelta needs two spaces after PRIMARY KEY or it re-adds the key on every run.
		$this->assertStringContainsString( 'PRIMARY KEY  (id)', $sql );
		$this->assertSame( VPRESS_VERSION, $GLOBALS['vpress_test_options']['vpress_db_version'] );
	}

	public function test_upgrade_is_a_no_op_when_the_version_matches(): void {
		$GLOBALS['vpress_test_options']['vpress_db_version'] = VPRESS_VERSION;

		$this->assertFalse( vpress_maybe_upgrade_db() );
		$this->assertSame( array(), $this->wpdb->queries );
	}

	public function test_a_second_run_after_upgrading_does_nothing(): void {
		$GLOBALS['vpress_test_options']['vpress_db_version'] = '0.1.0';
		vpress_maybe_upgrade_db();
		$count = count( $this->wpdb->queries );

		$this->assertFalse( vpress_maybe_upgrade_db() );
		$this->assertCount( $count, $this->wpdb->queries );
	}

	public function test_schedule_refresh_registers_one_hourly_event(): void {
		vpress_schedule_refresh();
		$first = $GLOBALS['vpress_test_cron']['vpress_refresh_sources'];
		$GLOBALS['vpress_test_cron']['vpress_refresh_sources']['timestamp'] = 42;
		vpress_schedule_refresh();

		$this->assertSame( 'hourly', $first['recurrence'] );
		$this->assertSame( 42, $GLOBALS['vpress_test_cron']['vpress_refresh_sources']['timestamp'] );
	}

	public function test_unschedule_refresh_clears_the_event(): void {
		vpress_schedule_refresh();
		vpress_unschedule_refresh();

		$this->assertFalse( wp_next_scheduled( 'vpress_refresh_sources' ) );
	}
}
