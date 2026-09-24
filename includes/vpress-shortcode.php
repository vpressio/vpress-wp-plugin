<?php
/**
 * `[vpress id="N" align="wide|full|center|none"]` — renders the chart inline.
 *
 * The legacy `url` attribute (from the old iframe embed) is accepted and ignored.
 *
 * @package    Vpress
 * @subpackage Vpress/includes
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Shortcode callback.
 *
 * @param array|string $atts Shortcode attributes.
 * @return string Figure markup, or '' when the id is invalid or the chart is not viewable.
 */
function vpress_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'id'    => '',
			'align' => 'none',
		),
		$atts,
		'vpress'
	);

	$id = trim( (string) $atts['id'] );
	if ( '' === $id || ! ctype_digit( $id ) ) {
		return '';
	}

	return vpress_render_figure( (int) $id, array( 'align' => (string) $atts['align'] ) );
}

add_shortcode( 'vpress', 'vpress_shortcode' );
