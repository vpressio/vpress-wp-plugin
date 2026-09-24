<?php
/**
 * Dependencies of the hand-written (unbuilt) editor script, read by
 * register_block_type_from_metadata() for `editorScript: file:./index.js`.
 *
 * @package Vpress
 */

return array(
	'dependencies' => array( 'wp-api-fetch', 'wp-block-editor', 'wp-blocks', 'wp-components', 'wp-element', 'wp-i18n' ),
	'version'      => (string) filemtime( __DIR__ . '/index.js' ),
);
