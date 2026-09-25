<?php
/**
 * Block registration: `vpress/chart`, `vpress/story` and `vpress/story-step`.
 *
 * All three are dynamic (their render.php prints the markup). Their editor
 * scripts are plain, unbuilt JavaScript; they share one canvas-iframe embed
 * loader (`blocks/shared/embed-loader.js`) and one config object,
 * `window.vpressBlock`, which tells them where the embed module lives so the
 * editor canvas can mount a live chart.
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
	 * Script handle of the shared canvas-iframe embed loader. Declared as a
	 * dependency by each block's index.asset.php, so it always runs first.
	 */
	const EMBED_LOADER_HANDLE = 'vpress-block-embed-loader';

	/**
	 * Script handle of the shared REST-backed chart list and its combobox.
	 * One list request per editor load serves every Vpress block.
	 */
	const CHART_PICKER_HANDLE = 'vpress-block-chart-picker';

	/**
	 * Shared editor scripts, as handle => file under blocks/shared/, with the
	 * `wp-*` packages each needs. They are registered (not enqueued): a block
	 * declaring one in its index.asset.php is what pulls it in.
	 *
	 * @return array<string,array{0:string,1:string[]}>
	 */
	public static function shared_scripts(): array {
		return array(
			self::EMBED_LOADER_HANDLE => array( 'blocks/shared/embed-loader.js', array() ),
			self::CHART_PICKER_HANDLE => array(
				'blocks/shared/chart-picker.js',
				array( 'wp-api-fetch', 'wp-components', 'wp-element', 'wp-i18n' ),
			),
		);
	}

	/**
	 * Block folders under blocks/, in registration order. The parent story
	 * block is registered before its child so `parent` resolves on first load.
	 *
	 * @return string[]
	 */
	public static function block_folders(): array {
		return array( 'chart', 'story', 'story-step' );
	}

	/**
	 * Register every block and hand the editor scripts their config.
	 * Hooked on `init`.
	 *
	 * @return void
	 */
	public static function register() {
		foreach ( self::shared_scripts() as $handle => $script ) {
			list( $path, $deps ) = $script;
			$file                = VPRESS_PLUGIN_DIR . $path;
			wp_register_script(
				$handle,
				plugins_url( $path, VPRESS_PLUGIN_FILE ),
				$deps,
				(string) ( file_exists( $file ) ? filemtime( $file ) : VPRESS_VERSION ),
				true
			);
		}

		// One assignment is enough: the value is identical for every block and
		// they are printed in the same editor.
		$config_printed = false;

		foreach ( self::block_folders() as $folder ) {
			$block = register_block_type_from_metadata( VPRESS_PLUGIN_DIR . 'blocks/' . $folder );
			if ( ! $block ) {
				continue;
			}

			$name = 'vpress/' . $folder;
			if ( empty( $block->editor_script_handles ) && class_exists( 'WP_Block_Type_Registry' ) ) {
				$registered = WP_Block_Type_Registry::get_instance()->get_registered( $name );
				$block      = $registered ? $registered : $block;
			}
			if ( $config_printed || empty( $block->editor_script_handles[0] ) ) {
				continue;
			}

			wp_add_inline_script(
				$block->editor_script_handles[0],
				'window.vpressBlock = ' . wp_json_encode( self::editor_config() ) . ';',
				'before'
			);
			$config_printed = true;
		}
	}

	/**
	 * Config for the editor scripts.
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
