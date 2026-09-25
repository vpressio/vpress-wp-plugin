<?php
/**
 * Server render for the `vpress/story-step` block.
 *
 * Prints only its own step markup, so the child is valid standalone: the
 * parent story concatenates these (WordPress renders inner blocks first and
 * hands the result to blocks/story/render.php as $content), and the editor
 * can select and preview one on its own.
 *
 * The step's state lives in `data-vpress-step`, a JSON object escaped into
 * the attribute; `admin/src/story.js` is the only thing that reads it.
 *
 * Available from WordPress: $attributes (array), $content (string), $block (WP_Block).
 *
 * @package    Vpress
 * @subpackage Vpress/blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Markup is escaped inside vpress_story_step_html() (heading esc_html, text
// wp_kses_post, overrides esc_attr).
echo vpress_story_step_html( (array) $attributes, get_block_wrapper_attributes() ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
