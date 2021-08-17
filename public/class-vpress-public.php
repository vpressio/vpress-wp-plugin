<?php

/**
 * The public-facing functionality of the plugin.
 *
 * @link       data4.mx
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

	public function add_chart_rule () {
		add_rewrite_rule(
			'chart/(\d+)/?$',
			'index.php?chart=$matches[1]',
			'top'
		);
		flush_rewrite_rules();
	}
	
	public function add_style_attributes($html, $handle) {
		$tag = $html;
		switch ($handle) {
			case 'vpress_leaflet':
				$tag = str_replace(
					'/>',
					'integrity="sha512-xwE/Az9zrjBIphAcBb3F6JVqxf46+CDLwfLMHloNu6KEQCAWi6HcDUbeOfBIptF7tcCzusKFjFw2yuvEpDL9wQ==" crossorigin=""/>',
					$tag
				);
				break;
			default:
				$tag = $html;
				break;
		}
		return $tag;
	}

	public function add_script_attributes($tag, $handle, $src) {
		switch ( $handle ) {
			case $this->plugin_name . '_vpress':
				return '<script type="module" src="' . esc_url( $src ) . '"></script>';
				break;

			default:
				return $tag;
				break;
		}
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
		//if($chart) {

			wp_enqueue_script( 
				$this->plugin_name. '_vue',
				"https://cdn.jsdelivr.net/npm/vue@2/dist/vue.js",
				array(),
				$this->version,
				true
			);

			wp_enqueue_script( 
				$this->plugin_name. '_axios',
				"https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js",
				array(),
				$this->version,
				true
			);

			wp_enqueue_script( 
				$this->plugin_name . '_vpress',
				plugin_dir_url(dirname(__FILE__)). 'public/vpress.js',
				array(),
				$this->version,
				true
			);

			
			wp_localize_script( $this->plugin_name . '_vpress', 'wpApiSettings', array(
				'root' => esc_url_raw( rest_url() ),
				'nonce' => wp_create_nonce( 'wp_rest' )
			));
		//}
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
		//if($chart) {
			foreach( glob( 	$this->client['location']. '/css/*.css' ) as $file ) {
				$filename = substr($file, strrpos($file, '/') + 1);
				wp_enqueue_style(
					$this->plugin_name . '_' . $filename ,
					$this->client['location']. '/css/' .$filename,
					array(),
					null
				);
			} 
			wp_enqueue_style(
				$this->plugin_name . '_app',
				$this->client['location']. '/css/app.css',
				array(),
				null
			);
			wp_enqueue_style(
				$this->plugin_name . '_chunk-vendors' ,
				$this->client['location']. '/css/chunk-vendors.css',
				array(),
				null
			);
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
		//}
	}


}
