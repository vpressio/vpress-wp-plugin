<?php

/**
 * The public-facing functionality of the plugin.
 *
 * @link       data4.mx
 * @since      1.0.0
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
	 * @param      string    $plugin_name       The name of the plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $plugin_name, $version ) {

		$this->plugin_name = $plugin_name;
		$this->version = $version;

	}

	/**
	 * Register the stylesheets for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */

	private function is_develop_serve()
	{
		$connection = @fsockopen('localhost', '8080');

		if ( $connection ) {
				return true;
		}

		return false;
	}


	public function include_html() {
		global $gdata;

		$gdata = get_query_var('chart');
		if($gdata)
    {

			require_once plugin_dir_path( dirname( __FILE__ ) ) . 'public/partials/chart.php';
			exit();
		}
		return;
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

		wp_enqueue_style( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'css/vpress-public.css', array(), $this->version, 'all' );
	}

	/**
	 * Register the JavaScript for the public-facing side of the site.
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
		
		wp_enqueue_script( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'js/vpress-public.js', array( 'jquery' ), $this->version, false );
		}	

}
