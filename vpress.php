<?php

/**
 * The plugin bootstrap file
 *
 * This file is read by WordPress to generate the plugin information in the plugin
 * admin area. This file also includes all of the dependencies used by the plugin,
 * registers the activation and deactivation functions, and defines a function
 * that starts the plugin.
 *
 * @link              https://gitlab.com/vpress/vpress-wp-plugin
 * @since             0.2.0
 * @package           Vpress
 *
 * @wordpress-plugin
 * Plugin Name:       Vpress
 * Plugin URI:        https://gitlab.com/vpress/vpress-wp-plugin
 * Description:       Turn data into stories. Import datasets, build interactive charts and maps, and publish them anywhere on your WordPress site.
 * Version:           0.3.0
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * Author:            Vpress contributors
 * Author URI:        https://gitlab.com/vpress
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       vpress
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Currently plugin version.
 * Start at version 0.1.0 and use SemVer - https://semver.org
 * Rename this for your plugin and update it as you release new versions.
 */
define( 'VPRESS_VERSION', '0.3.0' );

/**
 * Absolute path to the main plugin file (used for plugins_url()).
 */
define( 'VPRESS_PLUGIN_FILE', __FILE__ );

if ( ! defined( 'VPRESS_PLUGIN_FILE' ) ) {
	define( 'VPRESS_PLUGIN_FILE', __FILE__ );
}

/**
 * Absolute path to the plugin folder, with a trailing slash.
 */
if ( ! defined( 'VPRESS_PLUGIN_DIR' ) ) {
	define( 'VPRESS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
}

/**
 * The code that runs during plugin activation.
 * This action is documented in includes/class-vpress-activator.php
 */
function activate_vpress() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-vpress-activator.php';
	Vpress_Activator::create_tables();
	Vpress_Activator::create_uploads_folder();
	Vpress_Activator::flush_rewrite_rules();
}

/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/class-vpress-deactivator.php
 */
function deactivate_vpress() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-vpress-deactivator.php';
	Vpress_Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'activate_vpress' );
register_deactivation_hook( __FILE__, 'deactivate_vpress' );

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require plugin_dir_path( __FILE__ ) . 'includes/class-vpress.php';

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    0.1.0
 */
function run_vpress() {

	$plugin = new Vpress();
	$plugin->run();

}
run_vpress();
