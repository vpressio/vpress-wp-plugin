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
		// Provenance (M1): who published the data, under which licence, as of when.
		$this->assertStringContainsString( 'source_name TINYTEXT NULL,', $sql );
		$this->assertStringContainsString( 'license VARCHAR(64) NULL,', $sql );
		$this->assertStringContainsString( 'retrieved_at DATE NULL,', $sql );
		$this->assertStringContainsString( 'source_notes TEXT NULL,', $sql );
		// dbDelta needs two spaces after PRIMARY KEY or it re-adds the key on every run.
		$this->assertStringContainsString( 'PRIMARY KEY  (id)', $sql );
		$this->assertSame( VPRESS_DB_VERSION, $GLOBALS['vpress_test_options']['vpress_db_version'] );
	}

	public function test_upgrade_is_a_no_op_when_the_schema_version_matches(): void {
		$GLOBALS['vpress_test_options']['vpress_db_version'] = VPRESS_DB_VERSION;

		$this->assertFalse( vpress_maybe_upgrade_db() );
		$this->assertSame( array(), $this->wpdb->queries );
	}

	/**
	 * The regression this constant exists for. An install that last stamped a
	 * RELEASE version (what the option held before the schema counter) must
	 * still upgrade, even when that release version is the one now running:
	 * keyed on VPRESS_VERSION, such an install silently never got the columns.
	 */
	public function test_an_install_stamped_with_a_release_version_still_upgrades(): void {
		foreach ( array( '0.3.0', '0.1.0', VPRESS_VERSION, '', '1', 1 ) as $stamped ) {
			$this->setUp();
			$GLOBALS['vpress_test_options']['vpress_db_version'] = $stamped;

			$this->assertTrue( vpress_maybe_upgrade_db(), "stamped '$stamped' must upgrade" );
			$this->assertFalse( vpress_maybe_upgrade_db(), "stamped '$stamped' must settle after one upgrade" );

			$datasets = preg_grep( '/^CREATE TABLE wp_vpresscore_datasets /', $this->creates() );
			$sql      = (string) reset( $datasets );
			// One run at the current counter creates whatever is missing,
			// M3's live-source columns and M1's provenance columns alike.
			$this->assertStringContainsString( 'last_refresh_error TEXT NULL,', $sql );
			$this->assertStringContainsString( 'source_name TINYTEXT NULL,', $sql );
			$this->assertSame( VPRESS_DB_VERSION, $GLOBALS['vpress_test_options']['vpress_db_version'] );
		}
	}

	/** Options can come back as ints; the counter must still read as current. */
	public function test_a_counter_stamped_as_an_integer_is_recognised(): void {
		$GLOBALS['vpress_test_options']['vpress_db_version'] = (int) VPRESS_DB_VERSION;

		$this->assertFalse( vpress_maybe_upgrade_db() );
		$this->assertSame( array(), $this->wpdb->queries );
	}

	public function test_the_schema_version_is_independent_of_the_release_version(): void {
		$this->assertNotSame( VPRESS_VERSION, VPRESS_DB_VERSION, 'the schema counter must not track the release version' );
	}

	public function test_a_fresh_install_runs_the_schema_once_and_stamps_the_counter(): void {
		$this->assertSame( array(), $GLOBALS['vpress_test_options'] );

		$this->assertTrue( vpress_maybe_upgrade_db() );
		$this->assertCount( 1, preg_grep( '/^CREATE TABLE wp_vpresscore_datasets /', $this->creates() ) );
		$this->assertSame( VPRESS_DB_VERSION, $GLOBALS['vpress_test_options']['vpress_db_version'] );

		$this->assertFalse( vpress_maybe_upgrade_db(), 'the next request is a no-op' );
	}

	public function test_activation_stamps_the_schema_counter(): void {
		Vpress_Activator::create_tables();

		$this->assertSame( VPRESS_DB_VERSION, $GLOBALS['vpress_test_options']['vpress_db_version'] );
		$this->assertFalse( vpress_maybe_upgrade_db(), 'a freshly activated install needs no upgrade' );
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
