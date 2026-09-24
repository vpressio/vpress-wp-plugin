<?php
/**
 * Schema upgrades between plugin versions and the live-sources cron event.
 *
 * Plain functions, hooked from class-vpress.php (plugins_loaded, init) and
 * called from the activator/deactivator.
 *
 * @since      0.3.0
 * @package    Vpress
 * @subpackage Vpress/includes
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-vpress-activator.php';

/**
 * Re-runs the (idempotent) schema when the stored schema version differs
 * from the plugin's, then records the new version.
 *
 * @return bool Whether an upgrade ran.
 */
function vpress_maybe_upgrade_db(): bool {
	if ( get_option( 'vpress_db_version' ) === VPRESS_VERSION ) {
		return false;
	}
	Vpress_Activator::install_schema();
	update_option( 'vpress_db_version', VPRESS_VERSION );
	return true;
}

/**
 * Schedules the hourly live-sources sweep unless it already is. Called on
 * activation and on every `init` so a lost event heals itself.
 */
function vpress_schedule_refresh(): void {
	if ( ! wp_next_scheduled( 'vpress_refresh_sources' ) ) {
		wp_schedule_event( time(), 'hourly', 'vpress_refresh_sources' );
	}
}

/**
 * Removes the live-sources sweep (deactivation).
 */
function vpress_unschedule_refresh(): void {
	wp_clear_scheduled_hook( 'vpress_refresh_sources' );
}
