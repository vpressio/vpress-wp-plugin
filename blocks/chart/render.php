<?php
/**
 * Server render for the `vpress/chart` block.
 *
 * The block prints the same `<figure>` as the shortcode and the `/chart/{id}`
 * page. Front-end assets need no `viewScriptModule` in block.json:
 * vpress_render_figure() enqueues the embed script module and stylesheet
 * itself (vpress_enqueue_embed_assets()), and only when a figure is printed.
 *
 * Available from WordPress: $attributes (array), $content (string), $block (WP_Block).
 *
 * @package    Vpress
 * @subpackage Vpress/blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$vpress_chart_id = (int) ( $attributes['chartId'] ?? 0 );

$vpress_html = vpress_render_figure(
	$vpress_chart_id,
	array(
		'align'              => $attributes['align'] ?? '',
		'show_caption'       => $attributes['showCaption'] ?? true,
		'wrapper_attributes' => get_block_wrapper_attributes(),
	)
);

// Unknown, deleted or unselected chart: tell editors, print nothing for visitors.
if ( '' === $vpress_html && current_user_can( 'edit_posts' ) ) {
	$vpress_html  = '<div class="vpress-figure vpress-figure--missing">';
	$vpress_html .= esc_html(
		$vpress_chart_id > 0
			/* translators: %d: chart id. */
			? sprintf( __( 'Vpress: chart #%d is not available. Choose another chart in the editor.', 'vpress' ), $vpress_chart_id )
			: __( 'Vpress: no chart selected for this block.', 'vpress' )
	);
	$vpress_html .= '</div>';
}

// Markup is escaped piece by piece in vpress_render_figure() and above.
echo $vpress_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
