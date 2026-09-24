<?php

use PHPUnit\Framework\Attributes\RunInSeparateProcess;
use PHPUnit\Framework\TestCase;

/**
 * uninstall.php runs on include, so each case gets its own process.
 */
final class UninstallTest extends TestCase {

	private function uninstall( array $slugs ): FakeWpdb {
		define( 'WP_UNINSTALL_PLUGIN', 'vpress/vpress.php' );
		$wpdb            = new FakeWpdb();
		$GLOBALS['wpdb'] = $wpdb;
		$GLOBALS['vpress_test_options']['vpress_erase_data_on_uninstall'] = true;
		$wpdb->on( "/^SHOW TABLES LIKE 'wp\\\\\\\\_vpresscore\\\\\\\\_datasets'$/", 'wp_vpresscore_datasets' );
		$wpdb->on( '/^SELECT slug FROM `wp_vpresscore_datasets`$/', $slugs );
		require dirname( __DIR__, 2 ) . '/uninstall.php';
		return $wpdb;
	}

	private function drops( FakeWpdb $wpdb ): array {
		return array_values( preg_grep( '/^DROP TABLE/', $wpdb->queries ) );
	}

	#[RunInSeparateProcess]
	public function test_erase_drops_each_dataset_table_and_its_swap_leftovers(): void {
		$drops = $this->drops( $this->uninstall( array( 'ventas' ) ) );

		$this->assertSame(
			array(
				'DROP TABLE IF EXISTS `vpress_ventas`',
				'DROP TABLE IF EXISTS `vpress_ventas__new`',
				'DROP TABLE IF EXISTS `vpress_ventas__old`',
				'DROP TABLE IF EXISTS `wp_vpresscore_datasets`',
				'DROP TABLE IF EXISTS `wp_vpresscore_charts`',
				'DROP TABLE IF EXISTS `wp_vpresscore_imports`',
			),
			$drops
		);
	}

	#[RunInSeparateProcess]
	public function test_hostile_or_overlong_slugs_are_never_interpolated(): void {
		// 55 chars: the live table fits in 64, the __new/__old names do not.
		$long  = str_repeat( 's', 55 );
		$drops = $this->drops( $this->uninstall( array( 'x`; DROP TABLE wp_users; --', $long ) ) );

		$this->assertSame(
			array(
				"DROP TABLE IF EXISTS `vpress_$long`",
				'DROP TABLE IF EXISTS `wp_vpresscore_datasets`',
				'DROP TABLE IF EXISTS `wp_vpresscore_charts`',
				'DROP TABLE IF EXISTS `wp_vpresscore_imports`',
			),
			$drops
		);
	}
}
