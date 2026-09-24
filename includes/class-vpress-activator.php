<?php

/**
 * Fired during plugin activation
 *
 * @link       https://gitlab.com/vpress/vpress-wp-plugin
 * @since      0.1.0
 *
 * @package    Vpress
 * @subpackage Vpress/includes
 */

/**
 * Fired during plugin activation.
 *
 * This class defines all code necessary to run during the plugin's activation.
 *
 * @since      0.1.0
 * @package    Vpress
 * @subpackage Vpress/includes
 * @author     D4 <info@data4.mx>
 */
class Vpress_Activator {

	/**
	 * Short Description. (use period)
	 *
	 * Long Description.
	 *
	 * @since    0.1.0
	 */
	public static function create_tables() {
		global $wpdb;

		$table_datasets = $wpdb->prefix . 'vpresscore_datasets';
		$table_charts = $wpdb->prefix . 'vpresscore_charts';
		
		$charset_collate = $wpdb->get_charset_collate();

		$query_1 = $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table_datasets ) );
		$query_2 = $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table_charts ) );
		
		$sql_datasets = "CREATE TABLE $table_datasets (
			id MEDIUMINT(9) NOT NULL AUTO_INCREMENT,
			permissions TINYTEXT NOT NULL,
			name TINYTEXT NOT NULL,
			description TEXT NULL,
			slug TINYTEXT NOT NULL,
			tag TINYTEXT NULL,
			source TINYTEXT NULL,
			owner_id MEDIUMINT(9) NOT NULL,
			created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY (id)
		) $charset_collate;";

		$sql_charts = "CREATE TABLE $table_charts (
			id MEDIUMINT(9) NOT NULL AUTO_INCREMENT,
			dataset_id MEDIUMINT(9) NOT NULL,
			value TEXT NOT NULL,
			owner_id MEDIUMINT(9) NOT NULL,
			tags TEXT NULL,
			title TEXT NULL,
			description TEXT NULL,
			permissions TINYTEXT NOT NULL,
			img_url TINYTEXT NULL,
			created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY (id)
		) $charset_collate;";

		require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

		if ( 
			! $wpdb->get_var( $query_1 ) == $table_datasets && 
			! $wpdb->get_var( $query_2 ) == $table_charts
		) {
			dbDelta( [ $sql_datasets, $sql_charts ] );
		}

		add_option( 'vpress_db_version', '0.1.0' );

		// Opt-in switch read by uninstall.php; data is kept unless this is true.
		add_option( 'vpress_erase_data_on_uninstall', false );

		
	}

	/**
	 * Register the plugin's rewrite rules and flush them once.
	 *
	 * @since    0.3.0
	 */
	public static function flush_rewrite_rules() {
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'public/class-vpress-public.php';
		Vpress_Public::add_chart_rule();
		flush_rewrite_rules();
	}

	/**
	 * Short Description. (use period)
	 *
	 * Long Description.
	 *
	 * @since    0.1.0
	 */
	public static function create_uploads_folder() {
		$upload_dir = wp_upload_dir();
    $upload_dir = $upload_dir['basedir'];
		$datasets_dir = $upload_dir . '/vpress/datasets';
		$images_dir = $upload_dir . '/vpress/images';
    if ( ! is_dir( $datasets_dir ) ) {
      wp_mkdir_p( $datasets_dir );
		}
		if ( ! is_dir( $images_dir ) ) {
      wp_mkdir_p( $images_dir );
		} 
	}
}
