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
 * from VPRESS_DB_VERSION, then records the new one.
 *
 * The comparison is against the schema counter, never the release version:
 * keying it on VPRESS_VERSION meant a schema change shipped inside an
 * already-released version could never reach an install that had stamped
 * that same version, and the columns were simply never created.
 *
 * Any stored value that is not the current counter upgrades — whether it is
 * a counter, an old release version such as '0.3.0', or nothing at all —
 * because dbDelta only adds what is missing.
 *
 * @return bool Whether an upgrade ran.
 */
function vpress_maybe_upgrade_db(): bool {
	// Cast: options come back as strings, but a value stamped as an int by
	// older code must not read as "different" and re-run dbDelta every request.
	if ( (string) get_option( 'vpress_db_version' ) === VPRESS_DB_VERSION ) {
		return false;
	}
	Vpress_Activator::install_schema();
	update_option( 'vpress_db_version', VPRESS_DB_VERSION );
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
