<?php

/**
 * The public-facing functionality of the plugin.
 *
 * @link       https://gitlab.com/vpress/vpress-wp-plugin
 * @since      0.1.0
 *
 * @package    Vpress
 * @subpackage Vpress/public
 */

/**
 * The public-facing functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the public-facing stylesheet and JavaScript.
 *
 * @package    Vpress
 * @subpackage Vpress/public
 * @author     D4 <info@data4.mx>
 */
class Vpress_Public {

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
	 * @var      string    Node js client location.
	 */
	private $client;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    0.1.0
	 * @param      string    $plugin_name       The name of the plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $plugin_name, $version, $client ) {

		$this->plugin_name = $plugin_name;
		$this->version = $version;
		$this->client = $client;
	}



	public function include_html($template) {
		global $gdata;
		$gdata = get_query_var('chart');
		if($gdata) {
			return plugin_dir_path( dirname( __FILE__ ) ) . 'public/index.php';
		} else {
			return $template;
		}
	}

	public function add_chart_query ( $vars ) {
		$vars[] = 'chart';
    return $vars;
	}

	/**
	 * Register the /chart/{id} rewrite rule.
	 *
	 * Runs on every `init`. Static so the activator can register the rule
	 * before flushing; the flush itself happens only on activation and
	 * deactivation, never per request.
	 *
	 * @since    0.1.0
	 */
	public static function add_chart_rule() {
		add_rewrite_rule(
			'chart/(\d+)/?$',
			'index.php?chart=$matches[1]',
			'top'
		);
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
	 * Register the JavaScript for the public-facing side of the site.
	 *
	 * @since    0.1.0
	 */
	public function enqueue_scripts() {
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
		$chart = get_query_var('chart');
		if($chart) {
			if ( $this->client['env'] == 'prod' ) {
				// Vite ESM bundle: app.js imports chunk-vendors.js itself.
				wp_enqueue_script(
					$this->plugin_name . '_app',
					$this->client['location'] . '/js/app.js',
					array(),
					$this->version,
					false
				);
			} else {
				// Vite dev server (yarn dev).
				wp_enqueue_script(
					$this->plugin_name . '_vite_client',
					$this->client['location'] . '/@vite/client',
					array(),
					null,
					false
				);
				wp_enqueue_script(
					$this->plugin_name . '_app',
					$this->client['location'] . '/src/main.js',
					array(),
					null,
					false
				);
			}
			wp_localize_script( $this->plugin_name . '_app', 'wpApiSettings', array(
				'root' => esc_url_raw( rest_url() ),
				'nonce' => wp_create_nonce( 'wp_rest' )
			));
		}
	}	

		/**
	 * Register the stylesheets for the public-facing side of the site.
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
		$chart = get_query_var('chart');
		if($chart) {
			// Single stylesheet emitted by the Vite build (cssCodeSplit: false).
			// (The old glob() loop never matched: location is a URL, not a path.)
			wp_enqueue_style(
				$this->plugin_name . '_app',
				$this->client['location']. '/css/app.css',
				array(),
				null
			);
			wp_enqueue_style(
				$this->plugin_name . '_leaflet',
				plugins_url( 'assets/vendor/leaflet/leaflet.css', VPRESS_PLUGIN_FILE ),
				array(),
				'1.6.0'
			);
			wp_enqueue_style(
				$this->plugin_name . '_roboto-font',
				"https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700,900",
				array(),
				null
			);
		}
	}


}
