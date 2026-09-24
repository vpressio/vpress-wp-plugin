<?php

use PHPUnit\Framework\TestCase;

/**
 * Server-side import (live sources) and the chunked REST tick share one
 * header reader and one slice parser; the refresh swaps tables atomically.
 */
final class ImportFromFileTest extends TestCase {

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		vpress_guard_columns_reset();
		$this->wpdb                     = new FakeWpdb();
		$GLOBALS['wpdb']                = $this->wpdb;
		$GLOBALS['vpress_test_filters'] = array();
		$GLOBALS['vpress_test_now']     = '2026-09-24 12:00:00';
	}

	private function inserts(): array {
		return array_values( preg_grep( '/^INSERT INTO `/', $this->wpdb->queries ) );
	}

	private function ddl(): array {
		return array_values( preg_grep( '/^(CREATE|RENAME|DROP)/', $this->wpdb->queries ) );
	}

	public function test_import_from_file_creates_the_table_inserts_every_slice_and_unlinks(): void {
		$GLOBALS['vpress_test_filters']['vpress_import_rows_per_tick'] = function () {
			return 2;
		};
		$path = vpress_test_csv( "\xEF\xBB\xBFestado,ventas\nNL,10\n\nJal,20,extra\nCDMX\n" );

		$this->assertTrue( vpress_import_from_file( $path, 'vpress_ventas' ) );

		$this->assertSame(
			array( 'CREATE TABLE IF NOT EXISTS vpress_ventas (`estado` TEXT NULL, `ventas` TEXT NULL, created TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) DEFAULT CHARSET=utf8mb4;' ),
			$this->ddl()
		);
		$this->assertSame(
			array(
				"INSERT INTO `vpress_ventas` (`estado`, `ventas`) VALUES ('NL', '10'), ('Jal', '20')",
				"INSERT INTO `vpress_ventas` (`estado`, `ventas`) VALUES ('CDMX', '')",
			),
			$this->inserts()
		);
		$this->assertFileDoesNotExist( $path );
	}

	public function test_import_from_file_transcodes_cp1252(): void {
		$path = vpress_test_csv( "municipio\n" . "Garc\xEDa\n" );

		vpress_import_from_file( $path, 'vpress_mun' );

		$this->assertSame( array( "INSERT INTO `vpress_mun` (`municipio`) VALUES ('García')" ), $this->inserts() );
	}

	public function test_import_from_file_refuses_an_html_page(): void {
		$path = vpress_test_csv( "  <!doctype html>\n<html><body>Inicia sesión</body></html>" );

		$result = vpress_import_from_file( $path, 'vpress_x' );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'vpress_source_not_csv', $result->get_error_code() );
		$this->assertSame( array(), $this->ddl() );
		$this->assertFileDoesNotExist( $path );
	}

	public function test_import_from_file_reports_a_failed_insert_and_still_unlinks(): void {
		$this->wpdb->fail_on( '/^INSERT INTO/', 'Disk full' );
		$path = vpress_test_csv( "a\n1\n" );

		$result = vpress_import_from_file( $path, 'vpress_x' );

		$this->assertSame( 'insert_failed', $result->get_error_code() );
		$this->assertFileDoesNotExist( $path );
	}

	public function test_import_from_file_refuses_a_hostile_table_name(): void {
		$path = vpress_test_csv( "a\n1\n" );

		$result = vpress_import_from_file( $path, 'vpress_x`; DROP TABLE wp_users; --' );

		$this->assertSame( 'vpress_unknown_dataset', $result->get_error_code() );
		$this->assertSame( array(), $this->wpdb->queries );
	}

	public function test_the_rest_tick_still_parses_a_slice_and_finishes(): void {
		$GLOBALS['vpress_test_filters']['vpress_import_rows_per_tick'] = function () {
			return 5000;
		};
		$path   = vpress_test_csv( "estado,ventas\nNL,10\nJal\n" );
		$offset = strlen( "estado,ventas\n" );
		$size   = filesize( $path );
		$this->wpdb->on( '/^INSERT INTO `vpress_ventas`/', 2 );
		$this->wpdb->on( "/^SHOW TABLES LIKE 'wp_vpresscore_imports'$/", 'wp_vpresscore_imports' );
		$this->wpdb->on(
			'/FROM wp_vpresscore_imports WHERE id = 3$/',
			(object) array(
				'id'            => '3',
				'status'        => 'importing',
				'columns_json'  => '["estado","ventas"]',
				'tmp_path'      => $path,
				'byte_offset'   => (string) $offset,
				'encoding'      => 'UTF-8',
				'rows_inserted' => '0',
				'total_bytes'   => (string) filesize( $path ),
				'table_name'    => 'vpress_ventas',
			)
		);

		$result = vpress_import_tick( new FakeRestRequest( array( 'session_id' => 3 ) ) );

		$this->assertSame(
			array(
				'status'        => 'done',
				'rows_inserted' => 2,
				'bytes_done'    => $size,
				'total_bytes'   => $size,
				'dataset_name'  => 'ventas',
			),
			$result
		);
		$this->assertSame( array( "INSERT INTO `vpress_ventas` (`estado`, `ventas`) VALUES ('NL', '10'), ('Jal', '')" ), $this->inserts() );
		$this->assertFileDoesNotExist( $path );
	}

	private function live_table_exists(): void {
		$this->wpdb->on( "/^SHOW TABLES LIKE 'vpress_live'$/", 'vpress_live' );
	}

	public function test_replace_builds_new_renames_both_in_one_statement_then_drops_old(): void {
		$this->live_table_exists();
		$path = vpress_test_csv( "a\n1\n" );

		$this->assertTrue( vpress_dataset_replace_table( 'live', $path ) );

		$ddl = $this->ddl();
		$this->assertSame( 'DROP TABLE IF EXISTS `vpress_live__new`', $ddl[0] );
		$this->assertSame( 'DROP TABLE IF EXISTS `vpress_live__old`', $ddl[1] );
		$this->assertStringStartsWith( 'CREATE TABLE IF NOT EXISTS vpress_live__new (', $ddl[2] );
		$this->assertSame( 'RENAME TABLE `vpress_live` TO `vpress_live__old`, `vpress_live__new` TO `vpress_live`', $ddl[3] );
		$this->assertSame( 'DROP TABLE IF EXISTS `vpress_live__old`', $ddl[4] );
		$this->assertCount( 5, $ddl );
		$this->assertSame( array( "INSERT INTO `vpress_live__new` (`a`) VALUES ('1')" ), $this->inserts() );
		$this->assertSame(
			array( 'update', 'wp_vpresscore_datasets', array( 'last_refreshed_at' => '2026-09-24 12:00:00', 'last_refresh_error' => null ), array( 'slug' => 'live' ) ),
			end( $this->wpdb->writes )
		);
		$this->assertFileDoesNotExist( $path );
	}

	/** Every statement from the CREATE of __new on, when the swap fails. */
	private function ddl_after_create(): array {
		$ddl = $this->ddl();
		return array_slice( $ddl, 2 );
	}

	public function test_a_failed_import_drops_only_new_and_leaves_live_untouched(): void {
		$this->live_table_exists();
		$this->wpdb->fail_on( '/^INSERT INTO `vpress_live__new`/', 'Data too long' );

		$result = vpress_dataset_replace_table( 'live', vpress_test_csv( "a\n1\n" ) );

		$this->assertInstanceOf( WP_Error::class, $result );
		$after = $this->ddl_after_create();
		$this->assertStringStartsWith( 'CREATE TABLE IF NOT EXISTS vpress_live__new', $after[0] );
		$this->assertSame( array( 'DROP TABLE IF EXISTS `vpress_live__new`' ), array_slice( $after, 1 ) );
		$this->assertSame( array( 'last_refresh_error' => $result->get_error_message() ), end( $this->wpdb->writes )[2] );
	}

	public function test_a_failed_rename_drops_only_new(): void {
		$this->live_table_exists();
		$this->wpdb->fail_on( '/^RENAME TABLE/', 'Lock wait timeout' );

		$result = vpress_dataset_replace_table( 'live', vpress_test_csv( "a\n1\n" ) );

		$this->assertInstanceOf( WP_Error::class, $result );
		$after = $this->ddl_after_create();
		$this->assertSame( 'RENAME TABLE `vpress_live` TO `vpress_live__old`, `vpress_live__new` TO `vpress_live`', $after[1] );
		$this->assertSame( array( 'DROP TABLE IF EXISTS `vpress_live__new`' ), array_slice( $after, 2 ) );
		$this->assertArrayHasKey( 'last_refresh_error', end( $this->wpdb->writes )[2] );
	}

	public function test_a_missing_live_table_is_filled_by_a_single_rename(): void {
		$this->assertTrue( vpress_dataset_replace_table( 'live', vpress_test_csv( "a\n1\n" ) ) );

		$this->assertContains( 'RENAME TABLE `vpress_live__new` TO `vpress_live`', $this->ddl() );
		$this->assertNotContains( 'DROP TABLE IF EXISTS `vpress_live__old`', array_slice( $this->ddl(), 2 ) );
	}

	public function test_replace_refuses_a_slug_whose_work_tables_would_not_be_identifiers(): void {
		$path   = vpress_test_csv( "a\n1\n" );
		$result = vpress_dataset_replace_table( str_repeat( 's', 55 ), $path );

		$this->assertSame( 'vpress_unknown_dataset', $result->get_error_code() );
		$this->assertSame( array(), $this->ddl() );
		$this->assertFileDoesNotExist( $path );
	}
}
