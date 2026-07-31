<?php

/**
 * The admin-specific functionality of the plugin.
 *
 * @link       data4.mx
 * @since      0.1.0
 *
 * @package    Vpress
 * @subpackage Vpress/admin
 */

/**
 * The admin-specific functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the admin-specific stylesheet and JavaScript.
 *
 * @package    Vpress
 * @subpackage Vpress/admin
 * @author     D4 <info@data4.mx>
 */
class Vpress_Admin {

	/**
	 * The ID of this plugin.
	 *
	 * @since    0.1.0
	 * @access   private
	 * @var      string    $plugin_name    The ID of this plugin.
	 */
	private $plugin_name;

	/**
	 * The version of this plugin.
	 *
	 * @since    0.1.0
	 * @access   private
	 * @var      string    $version    The current version of this plugin.
	 */
	private $version;
	/**
	 * Node js client location.
	 *
	 * @since    0.1.0
	 * @access   private
	 * @var      string    $client    Node js client location..
	 */
	private $client;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    0.1.0
	 * @param      string    $plugin_name       The name of this plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $plugin_name, $version, $client ) {

		$this->plugin_name = $plugin_name;
		$this->version = $version;
		$this->client = $client;
	}

	public function vpress_html() {
		// check user capabilities
		if ( ! current_user_can( 'manage_options' ) ) {
				return;
		}
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'admin/index.php';
	}


	/**
	 * Register the stylesheets for the admin area.
	 *
	 * @since    0.1.0
	 */
	public function admin_menu_vpress() {
		add_menu_page(
				'Vpress',
				'Vpress',
				'read',
				'vpress',
				array( $this, 'vpress_html' ),
				'data:image/svg+xml;base64,' . base64_encode('<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18.64 20"><defs><style>.cls-1{fill:#fff;isolation:isolate;}</style></defs><g id="Navigation_Bar" data-name="Navigation Bar"><g id="Grupo_1" data-name="Grupo 1"><path id="Trazado_204" data-name="Trazado 204" class="cls-1" d="M11.85,13.54,5.93,7.09H0l5.91,6.44L0,20H5.93Z"/><path id="Trazado_205" data-name="Trazado 205" class="cls-1" d="M6.79,6.45,12.71,0h5.92l-5.9,6.44,5.91,6.45H12.71Z"/></g></g></svg>'),
				20
		);
	}


	/**
	 * Register the stylesheets for the admin area.
	 *
	 * @since    0.1.0
	 */
	public function enqueue_scripts($hook) {
		/**
		 * This function is provided for demonstration purposes only.
		 *
		 * An instance of this class should be passed to the run() function
		 * defined in Vpress_Loader as all of the hooks are defined
		 * in that particular class.
		 *
		 * The Vpress_Loader will then create the relationship
		 * between the defined hooks and the functions defined in this
		 * class.
		 */
		if ($hook != 'toplevel_page_vpress'){
			return;
		}
		if ( $this->client['env'] == 'prod' ) {
			// Vite ESM bundle: app.js imports chunk-vendors.js itself.
			wp_enqueue_script(
				$this->plugin_name . '_app',
				$this->client['location'] . '/js/app.js',
				array(),
				$this->version,
				true
			);
		} else {
			// Vite dev server (yarn dev).
			wp_enqueue_script(
				$this->plugin_name . '_vite_client',
				$this->client['location'] . '/@vite/client',
				array(),
				null,
				true
			);
			wp_enqueue_script(
				$this->plugin_name . '_app',
				$this->client['location'] . '/src/main.js',
				array(),
				null,
				true
			);
		}
		wp_enqueue_script(
			$this->plugin_name,
			plugin_dir_url( __DIR__ ) . 'js/vpress-admin.js',
			array(),
			$this->version,
			false
		);
		$dataToBePassed = array(
			'upload_max_filesize' => ini_get('upload_max_filesize'),
		);
		wp_localize_script( $this->plugin_name, 'php_vars', $dataToBePassed );
		wp_localize_script( $this->plugin_name, 'wpApiSettings', array(
			'root' => esc_url_raw( rest_url() ),
			'nonce' => wp_create_nonce( 'wp_rest' )
	) );
		wp_localize_script( $this->plugin_name, 'vpressImportConfig', array(
			'maxUploadBytes' => (int) apply_filters( 'vpress_max_upload_bytes', 20 * MB_IN_BYTES ),
		) );
	}

	/**
	 * Load the Vite bundle (and dev-server client) as ES modules.
	 *
	 * @since    0.2.0
	 */
	public function script_type_module($tag, $handle, $src) {
		$module_handles = array(
			$this->plugin_name . '_app',
			$this->plugin_name . '_vite_client',
		);
		if ( in_array( $handle, $module_handles, true ) ) {
			$tag = '<script type="module" src="' . esc_url( $src ) . '"></script>' . "\n";
		}
		return $tag;
	}

	/**
	 * Register the JavaScript for the admin area.
	 *
	 * @since    0.1.0
	 */
	public function enqueue_styles($hook) {

		/**
		 * This function is provided for demonstration purposes only.
		 *
		 * An instance of this class should be passed to the run() function
		 * defined in Vpress_Loader as all of the hooks are defined
		 * in that particular class.
		 *
		 * The Vpress_Loader will then create the relationship
		 * between the defined hooks and the functions defined in this
		 * class.
		 */
		if ($hook != 'toplevel_page_vpress'){
			return;
		}
		if($this->client['env'] == 'prod') {
			// Single stylesheet emitted by the Vite build (cssCodeSplit: false).
			// (The old glob() loop never matched: location is a URL, not a path.)
			wp_enqueue_style(
				$this->plugin_name . '_app',
				$this->client['location']. '/css/app.css',
				array(),
				null
			);
		}
		wp_enqueue_style(
			$this->plugin_name . '_leaflet',
			"https://unpkg.com/leaflet@1.6.0/dist/leaflet.css",
			array(),
			null
		);
		wp_enqueue_style(
			$this->plugin_name . '_roboto-font',
			"https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700,900",
			array(),
			null
		);
	}

}
