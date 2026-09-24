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
		// The rule was already registered on this request's `init`; forget it
		// first so the flush stores the rules without /chart/{id}.
		if ( isset( $wp_rewrite->extra_rules_top['chart/(\d+)/?$'] ) ) {
			unset( $wp_rewrite->extra_rules_top['chart/(\d+)/?$'] );
		}
		flush_rewrite_rules();
	}

}
