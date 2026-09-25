<?php
/**
 * Server render for the `vpress/story` block.
 *
 * Order is the reading order, and it is the whole no-JavaScript story:
 *
 *   1. the sticky figure — the existing public figure, with its chart slot,
 *      its screen-reader description, its data table and its provenance;
 *   2. a polite live region naming the active step (the first one at rest);
 *   3. every step's prose, in document order.
 *
 * With scripting off that is a chart, its data and the whole narrative, read
 * top to bottom. Scrollytelling is `admin/src/story.js` layered on top of it,
 * never the only route to the content.
 *
 * The figure comes from vpress_render_figure(), so its visibility gate is not
 * bypassed: a private chart renders nothing for a visitor, and the story goes
 * with it — a story about a chart nobody may see is not a story.
 *
 * Available from WordPress: $attributes (array), $content (string — the inner
 * steps, already rendered by blocks/story-step/render.php), $block (WP_Block).
 *
 * @package    Vpress
 * @subpackage Vpress/blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$vpress_chart_id = (int) ( $attributes['chartId'] ?? 0 );

$vpress_figure = vpress_render_figure(
	$vpress_chart_id,
	array(
		'show_caption' => $attributes['showCaption'] ?? true,
	)
);

// Unknown, deleted, private or unselected chart: tell editors, print nothing
// for visitors — the same contract as the chart block.
if ( '' === $vpress_figure ) {
	if ( current_user_can( 'edit_posts' ) ) {
		echo '<div class="vpress-figure vpress-figure--missing">';
		echo esc_html(
			$vpress_chart_id > 0
				/* translators: %d: chart id. */
				? sprintf( __( 'Vpress: chart #%d is not available. Choose another chart in the editor.', 'vpress' ), $vpress_chart_id )
				: __( 'Vpress: no chart selected for this story.', 'vpress' )
		);
		echo '</div>';
	}
	return;
}

$vpress_classes = array( 'vpress-story' );
$vpress_wrapper = vpress_parse_html_attributes( get_block_wrapper_attributes() );
if ( isset( $vpress_wrapper['class'] ) ) {
	// Block classes first (wp-block-vpress-story, alignwide, …), then ours.
	$vpress_classes = array_merge( preg_split( '/\s+/', $vpress_wrapper['class'], -1, PREG_SPLIT_NO_EMPTY ), $vpress_classes );
}
$vpress_classes = array_values( array_unique( $vpress_classes ) );

$vpress_html  = '<section class="' . esc_attr( implode( ' ', $vpress_classes ) ) . '"';
$vpress_html .= ' data-vpress-story=""';
foreach ( $vpress_wrapper as $vpress_name => $vpress_value ) {
	// class is merged above; the renderer owns data-vpress-*; no event handlers.
	if ( 'class' === $vpress_name || 0 === strpos( $vpress_name, 'data-vpress-' ) || 0 === strpos( $vpress_name, 'on' ) ) {
		continue;
	}
	$vpress_html .= ' ' . $vpress_name . '="' . esc_attr( $vpress_value ) . '"';
}
$vpress_html .= '>';

$vpress_html .= '<div class="vpress-story__figure">';
/*
 * The live region carries the active step's heading. It is server-rendered
 * with the FIRST step's, for two reasons: a live region that already has
 * content when the page loads announces nothing on load (only later changes),
 * and with JavaScript off it names the story's opening frame rather than
 * sitting empty. role="status" is the polite live region; aria-live is
 * spelled out beside it because not every AT infers one from the other.
 */
$vpress_html .= '<p class="vpress-story__now" data-vpress-story-status role="status" aria-live="polite">';
$vpress_html .= esc_html( vpress_story_first_heading( $block ?? null ) );
$vpress_html .= '</p>';
$vpress_html .= $vpress_figure;
$vpress_html .= '</div>';

$vpress_html .= '<div class="vpress-story__steps">';
// $content is the inner story-step blocks, each already escaped by
// blocks/story-step/render.php (heading esc_html, text wp_kses_post).
$vpress_html .= $content;
$vpress_html .= '</div>';

$vpress_html .= '</section>';

// Escaped piece by piece above and in vpress_render_figure().
echo $vpress_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
