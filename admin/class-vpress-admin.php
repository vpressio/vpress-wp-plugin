<?php

/**
 * The admin-specific functionality of the plugin.
 *
 * @link       data4.mx
 * @since      1.0.0
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
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $plugin_name    The ID of this plugin.
	 */
	private $plugin_name;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $version    The current version of this plugin.
	 */
	private $version;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    1.0.0
	 * @param      string    $plugin_name       The name of this plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $plugin_name, $version ) {

		$this->plugin_name = $plugin_name;
		$this->version = $version;

	}

	private function is_develop_serve()
	{
		$connection = @fsockopen('localhost', '8080');

		if ( $connection ) {
				return true;
		}

		return false;
	}


	public function vpress_html() {
		// check user capabilities
		if ( ! current_user_can( 'manage_options' ) ) {
				return;
		}
		if ( $this->is_develop_serve() ) {
			require_once plugin_dir_path( dirname( __FILE__ ) ) . 'admin/public/index.html';
		} else { 
			echo '<div class="wrap">';
			echo '<div id="app"></div>';
			echo '</div>';
		}
	}


	/**
	 * Register the stylesheets for the admin area.
	 *
	 * @since    1.0.0
	 */
	public function admin_menu_vpress() {
		add_menu_page(
				'Vpress',
				'Vpress',
				'manage_options',
				'vpress',
				array( $this, 'vpress_html' ),
				'data:image/svg+xml;base64,' . base64_encode('<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18.64 20"><defs><style>.cls-1{fill:#fff;isolation:isolate;}</style></defs><g id="Navigation_Bar" data-name="Navigation Bar"><g id="Grupo_1" data-name="Grupo 1"><path id="Trazado_204" data-name="Trazado 204" class="cls-1" d="M11.85,13.54,5.93,7.09H0l5.91,6.44L0,20H5.93Z"/><path id="Trazado_205" data-name="Trazado 205" class="cls-1" d="M6.79,6.45,12.71,0h5.92l-5.9,6.44,5.91,6.45H12.71Z"/></g></g></svg>'),
				20
		);
	}


	/**
	 * Register the stylesheets for the admin area.
	 *
	 * @since    1.0.0
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

		//wp_enqueue_script( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'js/vpress-admin.js', array( 'jquery' ), $this->version, false );
		if ( $this->is_develop_serve() ) {
			wp_enqueue_script( $this->plugin_name  . '_dev', 'http://localhost:8080/js/app.js', array( 'wp-api' ), $this->version, false );
			wp_enqueue_script( $this->plugin_name  . '_chunks', 'http://localhost:8080/js/chunk-vendors.js', array( 'wp-api' ), $this->version, false );
		} else {
			wp_enqueue_script( $this->plugin_name . '_chunks', plugin_dir_url( __DIR__ ) . 'admin/dist/js/chunk-vendors.js', [], $this->version, false );
			wp_enqueue_script( $this->plugin_name, plugin_dir_url( __DIR__ ) . 'admin/dist/js/app.js', array( 'wp-api' ), $this->version, false );
		}
	}

	/**
	 * Register the JavaScript for the admin area.
	 *
	 * @since    1.0.0
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
		
		// wp_enqueue_style( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'css/vpress-admin.css', array(), $this->version, 'all' );
		if ( $this->is_develop_serve() ) {
			wp_enqueue_style( $this->plugin_name . '_dev', 'http://localhost:8080/css/app.css', [], $this->version, 'all' );
		} else {		
			foreach( glob( plugin_dir_path( __FILE__). '../admin/dist/css/*.css' ) as $file ) {
				$filename = substr($file, strrpos($file, '/') + 1);
				wp_enqueue_style( $filename, plugin_dir_url( __DIR__ ).'admin/dist/css/'.$filename);
			} 

			//wp_enqueue_style( $this->plugin_name, plugin_dir_url( __DIR__ ) . 'admin/dist/css/chunk-vendors.css', [], $this->version, 'all' );
		}
	}

}
