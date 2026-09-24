<?php

/**
 * Fired during plugin deactivation
 *
 * @link       https://gitlab.com/vpress/vpress-wp-plugin
 * @since      0.1.0
 *
 * @package    Vpress
 * @subpackage Vpress/includes
 */

/**
 * Fired during plugin deactivation.
 *
 * This class defines all code necessary to run during the plugin's deactivation.
 *
 * @since      0.1.0
 * @package    Vpress
 * @subpackage Vpress/includes
 * @author     D4 <info@data4.mx>
 */
class Vpress_Deactivator {

	/**
	 * Short Description. (use period)
	 *
	 * Long Description.
	 *
	 * @since    0.1.0
	 */
	public static function deactivate() {
		global $wp_rewrite;
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'public/class-vpress-public.php';
		// The rule was already registered on this request's `init`; forget it
		// first so the flush stores the rules without /chart/{id}.
		unset( $wp_rewrite->extra_rules_top[ Vpress_Public::CHART_RULE ] );
		flush_rewrite_rules();

		require_once __DIR__ . '/class-vpress-upgrader.php';
		vpress_unschedule_refresh();
	}

}
