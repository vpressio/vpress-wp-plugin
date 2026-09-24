<?php

use PHPUnit\Framework\TestCase;

/**
 * Schema-changing endpoints (column delete/rename/type, dataset delete)
 * only ever interpolate guarded identifiers.
 */
final class ColumnOpsTest extends TestCase {

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		vpress_guard_columns_reset();
		$this->wpdb      = new FakeWpdb();
		$GLOBALS['wpdb'] = $this->wpdb;
		$this->wpdb->on( "/vpresscore_datasets WHERE slug = 'colops' LIMIT 1/", array( array( '1' => '1' ) ) );
		$this->wpdb->on( '/^SHOW COLUMNS FROM `vpress_colops`$/', array( 'estado', 'ventas' ) );
		$this->wpdb->on( '/^SELECT DATA_TYPE/', 'text' );
		$this->wpdb->on( '/^ALTER TABLE/', true );
	}

	private function assertWpError( string $code, $result ): void {
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( $code, $result->get_error_code() );
		$this->assertSame( array( 'status' => 400 ), $result->get_error_data() );
	}

	private function alters(): array {
		return array_values( preg_grep( '/^(ALTER|DROP|DELETE)/', $this->wpdb->queries ) );
	}

	public function test_delete_column_quotes_a_real_column(): void {
		vpress_delete_column( new FakeRestRequest( array( 'dataset' => 'colops', 'column' => 'ventas' ) ) );

		$this->assertSame( array( 'ALTER TABLE `vpress_colops` DROP COLUMN `ventas`;' ), $this->alters() );
	}

	public function test_delete_column_rejects_unknown_dataset_and_column(): void {
		$this->assertWpError( 'vpress_unknown_dataset', vpress_delete_column( new FakeRestRequest( array( 'dataset' => 'colops`; DROP TABLE wp_users; --', 'column' => 'ventas' ) ) ) );
		$this->assertWpError( 'vpress_bad_column', vpress_delete_column( new FakeRestRequest( array( 'dataset' => 'colops', 'column' => 'ventas`; DROP TABLE wp_users; --' ) ) ) );
		$this->assertSame( array(), $this->alters() );
	}

	public function test_rename_column_binds_the_type_lookup_and_quotes_both_names(): void {
		vpress_rename_column( new FakeRestRequest( array( 'dataset' => 'colops', 'old' => 'ventas', 'new' => 'ventas_mxn' ) ) );

		$this->assertContains( "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'vpress_colops' AND COLUMN_NAME = 'ventas';", $this->wpdb->queries );
		$this->assertSame( array( 'ALTER TABLE `vpress_colops` CHANGE `ventas` `ventas_mxn` text;' ), $this->alters() );
	}

	public function test_rename_column_rejects_bad_names(): void {
		$this->assertWpError( 'vpress_bad_column', vpress_rename_column( new FakeRestRequest( array( 'dataset' => 'colops', 'old' => 'nope', 'new' => 'x' ) ) ) );
		$this->assertWpError( 'vpress_bad_column', vpress_rename_column( new FakeRestRequest( array( 'dataset' => 'colops', 'old' => 'ventas', 'new' => 'x` TEXT, DROP COLUMN `estado' ) ) ) );
		$this->assertSame( array(), $this->alters() );
	}

	public function test_change_data_type_allows_only_the_admin_types(): void {
		vpress_change_data_type_column( new FakeRestRequest( array( 'dataset' => 'colops', 'column' => 'ventas', 'type' => 'int' ) ) );
		$this->assertSame( array( 'ALTER TABLE `vpress_colops` CHANGE `ventas` `ventas` int NULL DEFAULT NULL;' ), $this->alters() );

		$this->assertWpError( 'vpress_bad_type', vpress_change_data_type_column( new FakeRestRequest( array( 'dataset' => 'colops', 'column' => 'ventas', 'type' => 'int; DROP TABLE wp_users' ) ) ) );
		$this->assertWpError( 'vpress_bad_column', vpress_change_data_type_column( new FakeRestRequest( array( 'dataset' => 'colops', 'column' => 'nope', 'type' => 'int' ) ) ) );
		$this->assertCount( 1, $this->alters() );
	}

	public function test_delete_dataset_drops_only_a_guarded_table(): void {
		$this->wpdb->on( '/SELECT slug FROM wp_vpresscore_datasets WHERE id = 3$/', (object) array( 'slug' => 'colops' ) );

		vpress_delete_dataset( new FakeRestRequest( array( 'id' => '3' ) ) );

		$this->assertSame( 'DROP TABLE IF EXISTS `vpress_colops`', end( $this->wpdb->queries ) );
	}

	public function test_delete_dataset_with_a_hostile_slug_deletes_nothing(): void {
		$this->wpdb->on( '/SELECT slug FROM wp_vpresscore_datasets WHERE id = 4$/', (object) array( 'slug' => 'x, wp_users' ) );

		$this->assertWpError( 'vpress_unknown_dataset', vpress_delete_dataset( new FakeRestRequest( array( 'id' => '4' ) ) ) );
		$this->assertSame( array(), $this->alters() );
	}
}
