<?php

/**
 * Fired during plugin activation
 *
 * @link       data4.mx
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
		$table_apis = $wpdb->prefix . 'vpresscore_apis';
		
		$charset_collate = $wpdb->get_charset_collate();

		$query_1 = $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table_datasets ) );
		$query_2 = $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table_charts ) );
		$query_3 = $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table_apis ) );
		
		$sql_datasets = "CREATE TABLE $table_datasets (
			id MEDIUMINT(9) NOT NULL AUTO_INCREMENT,
			permissions TINYTEXT NOT NULL,
			name TINYTEXT NOT NULL,
			description TEXT NULL,
			slug TINYTEXT NOT NULL,
			tag TINYTEXT NULL,
			source TINYTEXT NULL,
			owner_id MEDIUMINT(9) NOT NULL,
			query_url TINYTEXT NULL,
			api_id MEDIUMINT(9) NULL,
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

		$sql_apis = "CREATE TABLE $table_apis (
			id MEDIUMINT(9) NOT NULL AUTO_INCREMENT,
			name TEXT NOT NULL,
			api_key TEXT NULL,
			api_prefix TEXT NOT NULL,
			created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY (id)
		) $charset_collate;";

		require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

		if ( 
			! $wpdb->get_var( $query_1 ) == $table_datasets && 
			! $wpdb->get_var( $query_2 ) == $table_charts &&
			! $wpdb->get_var( $query_3 ) == $table_apis
		) {
			dbDelta( [ $sql_datasets, $sql_charts, $sql_apis ] );
		}

		add_option( 'vpress_db_version', '0.1.0' );

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
