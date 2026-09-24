<?php
/**
 * Bootstrap for BlocksTest: the figure shims plus just enough of the block
 * API to register `vpress/chart` and include blocks/chart/render.php.
 *
 * Usage: php bin/phpunit.phar --bootstrap tests/php/bootstrap-blocks.php tests/php/BlocksTest.php
 *
 * @package Vpress
 */

require __DIR__ . '/bootstrap-figure.php';

define( 'VPRESS_PLUGIN_DIR', dirname( __DIR__, 2 ) . '/' );

/** What get_block_wrapper_attributes() returns for the block being rendered. */
$GLOBALS['vpress_test_wrapper'] = 'class="wp-block-vpress-chart"';

/** Editor script handles register_block_type_from_metadata() reports. */
$GLOBALS['vpress_test_editor_handles'] = array( 'vpress-chart-editor-script' );

function get_block_wrapper_attributes( $extra_attributes = array() ) {
	return $GLOBALS['vpress_test_wrapper'];
}

function register_block_type_from_metadata( $file_or_folder, $args = array() ) {
	vpress_test_record( __FUNCTION__, func_get_args() );
	$block                        = new stdClass();
	$block->name                  = 'vpress/chart';
	$block->editor_script_handles = $GLOBALS['vpress_test_editor_handles'];
	return $block;
}

function wp_add_inline_script( $handle, $data, $position = 'after' ) {
	vpress_test_record( __FUNCTION__, func_get_args() );
	return true;
}

function wp_json_encode( $data, $options = 0, $depth = 512 ) {
	return json_encode( $data, $options, $depth );
}

function admin_url( $path = '' ) {
	return 'http://example.test/wp-admin/' . ltrim( $path, '/' );
}

require_once dirname( __DIR__, 2 ) . '/includes/class-vpress-blocks.php';
