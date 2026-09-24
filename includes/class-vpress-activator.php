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
	 * Create the registry tables and record the schema version.
	 *
	 * @since    0.1.0
	 */
	public static function create_tables() {
		self::install_schema();
		update_option( 'vpress_db_version', defined( 'VPRESS_VERSION' ) ? VPRESS_VERSION : '0.1.0' );

		// Opt-in switch read by uninstall.php; data is kept unless this is true.
		add_option( 'vpress_erase_data_on_uninstall', false );
	}

	/**
	 * The CREATE TABLE statements for the registry, in dbDelta's dialect
	 * (one column per line, two spaces after PRIMARY KEY) so re-running them
	 * on an existing install only adds what is missing.
	 *
	 * @since    0.3.0
	 * @return   string[]
	 */
	public static function schema_sql() {
		global $wpdb;

		$table_datasets  = $wpdb->prefix . 'vpresscore_datasets';
		$table_charts    = $wpdb->prefix . 'vpresscore_charts';
		$charset_collate = $wpdb->get_charset_collate();

		// source is legacy free text (null = WordPress-hosted); source_type
		// is what the live-sources refresh reads.
		$sql_datasets = "CREATE TABLE $table_datasets (
			id MEDIUMINT(9) NOT NULL AUTO_INCREMENT,
			permissions TINYTEXT NOT NULL,
			name TINYTEXT NOT NULL,
			description TEXT NULL,
			slug TINYTEXT NOT NULL,
			tag TINYTEXT NULL,
			source TINYTEXT NULL,
			source_type VARCHAR(16) NOT NULL DEFAULT 'upload',
			source_url TEXT NULL,
			refresh_interval VARCHAR(16) NOT NULL DEFAULT 'none',
			last_refreshed_at DATETIME NULL,
			last_refresh_error TEXT NULL,
			owner_id MEDIUMINT(9) NOT NULL,
			created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id)
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
			PRIMARY KEY  (id)
		) $charset_collate;";

		return array( $sql_datasets, $sql_charts );
	}

	/**
	 * Create or upgrade the registry tables. Idempotent: dbDelta only adds
	 * missing tables and columns, existing rows keep their values and the
	 * new columns take their defaults.
	 *
	 * @since    0.3.0
	 */
	public static function install_schema() {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( self::schema_sql() );
	}

	/**
	 * Schedule the live-sources refresh event.
	 *
	 * @since    0.3.0
	 */
	public static function schedule_refresh() {
		require_once __DIR__ . '/class-vpress-upgrader.php';
		vpress_schedule_refresh();
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
