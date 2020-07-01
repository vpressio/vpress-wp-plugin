<?php

/**
 * Fired during plugin activation
 *
 * @link       data4.mx
 * @since      1.0.0
 *
 * @package    Vpress
 * @subpackage Vpress/includes
 */

/**
 * Fired during plugin activation.
 *
 * This class defines all code necessary to run during the plugin's activation.
 *
 * @since      1.0.0
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
	 * @since    1.0.0
	 */
	public static function activate() {
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
			description TEXT NOT NULL,
			tag TINYTEXT NOT NULL,
			source TINYTEXT NOT NULL,
			owner_id MEDIUMINT(9) NOT NULL,
			created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY (id)
		) $charset_collate;";

		$sql_charts = "CREATE TABLE $table_charts (
			id MEDIUMINT(9) NOT NULL AUTO_INCREMENT,
			dataset_id MEDIUMINT(9) NOT NULL,
			value JSON NOT NULL,
			owner_id MEDIUMINT(9) NOT NULL,
			tags TEXT NOT NULL,
			title TEXT NOT NULL,
			description TEXT NOT NULL,
			permissions TINYTEXT NOT NULL,
			img_url TINYTEXT NOT NULL,
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

		add_option( 'vpress_db_version', '1.0.0' );
	}

}
