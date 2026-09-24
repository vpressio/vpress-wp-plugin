<?php
/**
 * Block registration: `vpress/chart`.
 *
 * The block is dynamic (blocks/chart/render.php prints vpress_render_figure()).
 * Its editor script is plain, unbuilt JavaScript; it receives `window.vpressBlock`
 * — where the embed module lives, so the editor canvas can mount a live chart.
 *
 * @package    Vpress
 * @subpackage Vpress/includes
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the plugin's blocks.
 */
class Vpress_Blocks {

	/**
	 * Register `vpress/chart` and hand its editor script the embed config. Hooked on `init`.
	 *
	 * @return void
	 */
	public static function register() {
		$block = register_block_type_from_metadata( VPRESS_PLUGIN_DIR . 'blocks/chart' );
		if ( ! $block ) {
			return;
		}

		if ( empty( $block->editor_script_handles ) && class_exists( 'WP_Block_Type_Registry' ) ) {
			$registered = WP_Block_Type_Registry::get_instance()->get_registered( 'vpress/chart' );
			$block      = $registered ? $registered : $block;
		}
		if ( empty( $block->editor_script_handles[0] ) ) {
			return;
		}

		wp_add_inline_script(
			$block->editor_script_handles[0],
			'window.vpressBlock = ' . wp_json_encode( self::editor_config() ) . ';',
			'before'
		);
	}

	/**
	 * Config for the editor script.
	 *
	 * Uses the plugin's dev/prod decision (`vpress_client` filter, set by
	 * Vpress::is_develop_serve()): in dev the Vite server serves the embed
	 * sources, in prod the built `admin/dist` files are used.
	 *
	 * @return array{embedUrl:string,embedCss:string,restRoot:string,adminUrl:string,nonce:string}
	 */
	public static function editor_config(): array {
		$client = apply_filters(
			'vpress_client',
			array(
				'env'      => 'prod',
				'location' => '',
			)
		);

		if ( is_array( $client ) && isset( $client['env'], $client['location'] ) && 'dev' === $client['env'] ) {
			$dev       = rtrim( (string) $client['location'], '/' );
			$embed_url = $dev . '/src/embed.js';
			// Vite answers a stylesheet request for a .css source with plain CSS.
			$embed_css = $dev . '/src/embed/embed.css';
		} else {
			$version   = '?ver=' . rawurlencode( VPRESS_VERSION );
			$embed_url = plugins_url( 'admin/dist/js/embed.js', VPRESS_PLUGIN_FILE ) . $version;
			$embed_css = plugins_url( 'admin/dist/css/embed.css', VPRESS_PLUGIN_FILE ) . $version;
		}

		return array(
			'embedUrl' => $embed_url,
			'embedCss' => $embed_css,
			'restRoot' => rest_url( 'vpress/v1/' ),
			'adminUrl' => admin_url( 'admin.php?page=vpress' ),
			// The preview's embed fetches with this so private charts render for editors.
			'nonce'    => wp_create_nonce( 'wp_rest' ),
		);
	}
}
