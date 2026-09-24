<?php
/**
 * Fired when the plugin is uninstalled.
 *
 * Runs without the plugin loaded, so everything it needs is defined here.
 *
 * By default only the plugin's options are removed and every dataset, chart
 * and import stays in the database, so a reinstall picks up where it left off.
 * Data is erased only when the site opts in, either with the option
 * `vpress_erase_data_on_uninstall` or the filter of the same name.
 *
 * @link       https://gitlab.com/vpress/vpress-wp-plugin
 * @since      0.1.0
 *
 * @package    Vpress
 */

// If uninstall not called from WordPress, then exit.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/**
 * Remove Vpress data for the current site (blog).
 *
 * @since 0.3.0
 */
function vpress_uninstall_site() {
	global $wpdb;

	$erase = (bool) get_option( 'vpress_erase_data_on_uninstall', false ) || (bool) apply_filters( 'vpress_erase_data_on_uninstall', false );

	if ( $erase ) {
		$registry = $wpdb->prefix . 'vpresscore_datasets';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$exists = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $registry ) ) );

		if ( $exists === $registry ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name built from $wpdb->prefix.
			$slugs = $wpdb->get_col( "SELECT slug FROM `{$registry}`" );

			foreach ( (array) $slugs as $slug ) {
				// Only identifiers we could have created; anything else is skipped, never interpolated.
				if ( ! is_string( $slug ) || ! preg_match( '/^[A-Za-z0-9_]{1,64}$/', $slug ) ) {
					continue;
				}
				$dataset_table = 'vpress_' . $slug;
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- identifier validated above.
				$wpdb->query( "DROP TABLE IF EXISTS `{$dataset_table}`" );
			}
		}

		foreach ( array( 'vpresscore_datasets', 'vpresscore_charts', 'vpresscore_imports' ) as $core_table ) {
			$table = $wpdb->prefix . $core_table;
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name built from $wpdb->prefix.
			$wpdb->query( "DROP TABLE IF EXISTS `{$table}`" );
		}

		// Matches `_transient_vpress_%` and `_transient_timeout_vpress_%`; esc_like() keeps the underscores literal.
		foreach ( array( '_transient_vpress_', '_transient_timeout_vpress_' ) as $prefix ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $wpdb->esc_like( $prefix ) . '%' ) );
		}
	}

	delete_option( 'vpress_db_version' );
	delete_option( 'vpress_erase_data_on_uninstall' );
}

if ( is_multisite() ) {
	foreach ( get_sites( array( 'fields' => 'ids', 'number' => 0 ) ) as $vpress_site_id ) {
		switch_to_blog( $vpress_site_id );
		vpress_uninstall_site();
		restore_current_blog();
	}
} else {
	vpress_uninstall_site();
}
