<?php
/**
 * Dependencies of the hand-written (unbuilt) editor script, read by
 * register_block_type_from_metadata() for `editorScript: file:./index.js`.
 *
 * `vpress-block-embed-loader` is the shared canvas-iframe embed loader and
 * `vpress-block-chart-picker` the shared REST-backed chart list
 * (blocks/shared/), both registered by Vpress_Blocks::register().
 *
 * @package Vpress
 */

return array(
	'dependencies' => array( 'vpress-block-chart-picker', 'vpress-block-embed-loader', 'wp-api-fetch', 'wp-block-editor', 'wp-blocks', 'wp-components', 'wp-element', 'wp-i18n' ),
	'version'      => (string) filemtime( __DIR__ . '/index.js' ),
);
