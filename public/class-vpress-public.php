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

	/**
	 * Allows you to indicate that a script should be treated as a module or
	 * importmap by adding the correct type attribute to the script tag that
	 * WordPress will output. When using wp_enqueue_script() you should add
	 * a type parameter to the source indicating what type this file should
	 * be treated as:
	 *
	 * Type module      =>  your-file.js?type=module
	 * Type import map  =>  your-file.json?type=importmap
	 *
	 * @author Christopher Keers (Caboodle Tech)
	 * @link https://gist.github.com/blizzardengle/3e4d5c789f1a13ff8ab86e83738a46c4 Original Source
	 *
	 * @param string $tag    The current HTML script tag WordPress is about to output.
	 * @param string $handle The handle (id) used for this script tag.
	 * @param string $src    The source of the JavaScript file.
	 *
	 * @return string The original HTML from $tag or a modified version with type added to the script tag.
	 */
	function ct_set_script_type( $tag, $handle, $src ) {
		$url = wp_parse_url( $src, PHP_URL_QUERY );
		if ( $url === false ) {
				return $tag;
		}
		parse_str( $url, $query );
		if ( array_key_exists( 'type', $query ) ) {
				$type = 'module';
				if ( str_contains( $query['type'], 'map' ) ) {
						$type = 'importmap';
				}
				if ( str_contains( $tag, 'type="' ) ) {
						$tag = preg_replace( '/type=".*?"/', 'type="' . $type . '"', $tag );
				} else {
						$tag = str_replace( 'src=', 'type="' . $type . '" src=', $tag );
				}
				return $tag;
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
		$dummy = true; //get_query_var('dummy');
		if($dummy) {
			wp_enqueue_script( 
				$this->plugin_name. '_d3',
				"https://d3js.org/d3.v6.min.js",
				array(),
				$this->version,
				false
			);
			wp_enqueue_script( 
				$this->plugin_name. '_vue',
				"https://unpkg.com/vue@3/dist/vue.global.js",
				array(),
				$this->version,
				false
			);
			wp_enqueue_script( 
				$this->plugin_name. '_lodash',
				plugin_dir_url(dirname(__FILE__)) . 'public/utils/lodash/remove.js?type=module',
				array(),
				$this->version,
				false
			);
			wp_enqueue_script( 
				$this->plugin_name. '_dbox',
				plugin_dir_url(dirname(__FILE__)) . 'public/dboxjs/dbox.esm.js?type=module',
				array(),
				$this->version,
				false
			);
			wp_enqueue_script( 
				$this->plugin_name. '_error',
				plugin_dir_url(dirname(__FILE__)) . 'public/vpress/helpers/vpressError.js?type=module',
				array(),
				$this->version,
				false
			);
			wp_enqueue_script( 
				$this->plugin_name. '_helpers',
				plugin_dir_url(dirname(__FILE__)) . 'public/helpers/index.js?type=module',
				array(),
				$this->version,
				false
			);
			wp_enqueue_script( 
				$this->plugin_name. '_axios',
				plugin_dir_url(dirname(__FILE__)) . 'public/utils/axios.js?type=module',
				array(),
				$this->version,
				false
			);
			wp_enqueue_script( 
				$this->plugin_name. '_index',
				plugin_dir_url(dirname(__FILE__)) . 'public/vpress/index.js?type=module',
				array($this->plugin_name. '_helpers'),
				$this->version,
				false
			);
			wp_enqueue_script( 
				$this->plugin_name. '_chart',
				plugin_dir_url(dirname(__FILE__)) . 'public/components/Chart.js?type=module',
				array($this->plugin_name. '_index'),
				$this->version,
				false
			);
			wp_enqueue_script( 
				$this->plugin_name. '_chart_container',
				plugin_dir_url(dirname(__FILE__)) . 'public/components/VpressChartContainer.js?type=module',
				array(),
				$this->version,
				false
			);
			wp_enqueue_script( 
				$this->plugin_name. '_js',
				plugin_dir_url(dirname(__FILE__)) . 'public/vpress.js?type=module',
				array(),
				$this->version,
				false
			);
			wp_localize_script( $this->plugin_name . '_js', 'wpApiSettings', array(
				'root' => esc_url_raw( rest_url() ),
				'nonce' => wp_create_nonce( 'wp_rest' )
			));
		}
		 
		$chart = get_query_var('chart');
		if($chart) {
			wp_enqueue_script( 
				$this->plugin_name. '_chunks',
				$this->client['location']. '/js/chunk-vendors.js',
				array(),
				$this->version,
				false
			);
			wp_enqueue_script( 
				$this->plugin_name . '_app',
				$this->client['location']. '/js/app.js',
				array(),
				$this->version,
				false
			);
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
		}
	}


}
