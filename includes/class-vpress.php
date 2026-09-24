<?php

/**
 * The file that defines the core plugin class
 *
 * A class definition that includes attributes and functions used across both the
 * public-facing side of the site and the admin area.
 *
 * @link       https://gitlab.com/vpress/vpress-wp-plugin
 * @since      0.1.0
 *
 * @package    Vpress
 * @subpackage Vpress/includes
 */

/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Also maintains the unique identifier of this plugin as well as the current
 * version of the plugin.
 *
 * @since      0.1.0
 * @package    Vpress
 * @subpackage Vpress/includes
 * @author     D4 <info@data4.mx>
 */
class Vpress {

	/**
	 * The loader that's responsible for maintaining and registering all hooks that power
	 * the plugin.
	 *
	 * @since    0.1.0
	 * @access   protected
	 * @var      Vpress_Loader    $loader    Maintains and registers all hooks for the plugin.
	 */
	protected $loader;

	/**
	 * The unique identifier of this plugin.
	 *
	 * @since    0.1.0
	 * @access   protected
	 * @var      string    $plugin_name    The string used to uniquely identify this plugin.
	 */
	protected $plugin_name;

	/**
	 * The current version of the plugin.
	 *
	 * @since    0.1.0
	 * @access   protected
	 * @var      string    $version    The current version of the plugin.
	 */
	protected $version;
	
	/**
	 * Node js client location.
	 *
	 * @since    0.1.0
	 * @access   protected
	 * @var      string    $client    Node js client location.
	 */
	protected $client;

	/**
	 * Define the core functionality of the plugin.
	 *
	 * Set the plugin name and the plugin version that can be used throughout the plugin.
	 * Load the dependencies, define the locale, and set the hooks for the admin area and
	 * the public-facing side of the site.
	 *
	 * @since    0.1.0
	 */
	public function __construct() {
		if ( defined( 'VPRESS_VERSION' ) ) {
			$this->version = VPRESS_VERSION;
		} else {
			$this->version = '0.2.0';
		}
		$this->plugin_name = 'vpress';
		$this->client = $this->is_develop_serve('5180');
		// Share the dev/prod decision with procedural code (e.g. the public
		// figure renderer) without repeating the port probe.
		add_filter( 'vpress_client', array( $this, 'get_client' ) );
		$this->load_dependencies();
		$this->set_locale();
		$this->define_admin_hooks();
		$this->define_public_hooks();
		$this->define_block_hooks();

	}

	/**
	 * Load the required dependencies for this plugin.
	 *
	 * Include the following files that make up the plugin:
	 *
	 * - Vpress_Loader. Orchestrates the hooks of the plugin.
	 * - Vpress_i18n. Defines internationalization functionality.
	 * - Vpress_Admin. Defines all hooks for the admin area.
	 * - Vpress_Public. Defines all hooks for the public side of the site.
	 *
	 * Create an instance of the loader which will be used to register the hooks
	 * with WordPress.
	 *
	 * @since    0.1.0
	 * @access   private
	 */
	private function load_dependencies() {

		/**
		 * The class responsible for orchestrating the actions and filters of the
		 * core plugin.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-vpress-loader.php';

		/**
		 * The class responsible for defining internationalization functionality
		 * of the plugin.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-vpress-i18n.php';

		/**
		 * The class responsible for defining all actions that occur in the admin area.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'admin/class-vpress-admin.php';

		/**
		 * The class responsible for defining all actions that occur in the public-facing
		 * side of the site.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'public/class-vpress-public.php';

		/**
		 * Vpress Shortcode
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-vpress-figure.php';
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-vpress-figure-text.php';
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/vpress-shortcode.php';

		/**
		 * Vpress blocks (vpress/chart)
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-vpress-blocks.php';

		/**
		 * Vpress API
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'api/index.php';

		$this->loader = new Vpress_Loader();

	}

	/**
	 * Define the locale for this plugin for internationalization.
	 *
	 * Uses the Vpress_i18n class in order to set the domain and to register the hook
	 * with WordPress.
	 *
	 * @since    0.1.0
	 * @access   private
	 */
	private function set_locale() {

		$plugin_i18n = new Vpress_i18n();

		$this->loader->add_action( 'plugins_loaded', $plugin_i18n, 'load_plugin_textdomain' );

	}

	/**
	 * Register all of the hooks related to the admin area functionality
	 * of the plugin.
	 *
	 * @since    0.1.0
	 * @access   private
	 */
	private function define_admin_hooks() {

		$plugin_admin = new Vpress_Admin( $this->get_plugin_name(), $this->get_version(), $this->client );

		$this->loader->add_action( 'admin_menu', $plugin_admin, 'admin_menu_vpress' );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_styles' );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts' );
		$this->loader->add_filter( 'script_loader_tag', $plugin_admin, 'script_type_module', 10, 3 );
		
	}
	
	/**
	 * Register all of the hooks related to the public-facing functionality
	 * of the plugin.
	 *
	 * @since    0.1.0
	 * @access   private
	 */
	private function define_public_hooks() {
		
		$plugin_public = new Vpress_Public( $this->get_plugin_name(), $this->get_version(), $this->client );
		
		$this->loader->add_filter( 'query_vars', $plugin_public, 'add_chart_query');
		$this->loader->add_filter( 'template_include', $plugin_public, 'include_html');
		$this->loader->add_action('init', $plugin_public, 'add_chart_rule');
	}

	/**
	 * Register the block editor blocks.
	 *
	 * @since    0.3.0
	 * @access   private
	 */
	private function define_block_hooks() {
		$this->loader->add_action( 'init', 'Vpress_Blocks', 'register' );
	}

	private function is_develop_serve($PORT) {
		$location;
		$env;
		$connection = @fsockopen('localhost', $PORT);
		if ( $connection ) {
			$env = 'dev';
			$location =  'http://localhost:' . $PORT;
		} else {
			$env = 'prod';
			$location = plugin_dir_url(dirname(__FILE__)) . 'admin/dist/';
		}
		return array(
			'env' => $env,
			'location' => $location
		);
	}

	/**
	 * The dev/prod client decision made once at boot by is_develop_serve().
	 *
	 * Exposed through the `vpress_client` filter.
	 *
	 * @return    array    { env: 'dev'|'prod', location: string }.
	 */
	public function get_client() {
		return $this->client;
	}

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 *
	 * @since    0.1.0
	 */
	public function run() {
		$this->loader->run();
	}

	/**
	 * The name of the plugin used to uniquely identify it within the context of
	 * WordPress and to define internationalization functionality.
	 *
	 * @since     0.1.0
	 * @return    string    The name of the plugin.
	 */
	public function get_plugin_name() {
		return $this->plugin_name;
	}

	/**
	 * The reference to the class that orchestrates the hooks with the plugin.
	 *
	 * @since     0.1.0
	 * @return    Vpress_Loader    Orchestrates the hooks of the plugin.
	 */
	public function get_loader() {
		return $this->loader;
	}

	/**
	 * Retrieve the version number of the plugin.
	 *
	 * @since     0.1.0
	 * @return    string    The version number of the plugin.
	 */
	public function get_version() {
		return $this->version;
	}

}
