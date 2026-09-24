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



	/**
	 * Swap in the standalone chart page for `/chart/{id}`.
	 *
	 * The template reads the id itself via get_query_var( 'chart' ).
	 *
	 * @param string $template Template path WordPress would use.
	 * @return string
	 */
	public function include_html( $template ) {
		if ( (int) get_query_var( 'chart' ) > 0 ) {
			return plugin_dir_path( dirname( __FILE__ ) ) . 'public/index.php';
		}
		return $template;
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

	// The chart page no longer loads the admin bundle: vpress_render_figure()
	// enqueues the lightweight embed (script module + css/embed.css) itself.

}
