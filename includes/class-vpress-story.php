<?php
/**
 * Scrollytelling stories: the server side of `vpress/story` and `vpress/story-step`.
 *
 * A story is ONE chart that stays put while the reader scrolls through steps
 * that change what it emphasises. The chart is the existing public figure
 * (vpress_render_figure()), so a story inherits its visibility gate, its text
 * alternative and its data table unchanged, and the steps are ordinary prose
 * in document order. Everything the scrollytelling adds is an enhancement on
 * top of markup that already reads correctly with JavaScript switched off.
 *
 * A step carries an `overrides` object — which of the CHART's annotations to
 * show, hide and emphasise, plus optional filters, title and chart type. It
 * is sanitised here and printed as that step's `data-vpress-step` attribute,
 * which is the whole contract `admin/src/story.js` reads.
 *
 * Annotations belong to the chart (see api/services/chart.php); a step only
 * ever references them by id, and an id the chart no longer has resolves to
 * a NO-OP, never an error — a chart can lose an annotation long after a story
 * started pointing at it.
 *
 * @package    Vpress
 * @subpackage Vpress/includes
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Chart types a story step may switch to.
 *
 * Deliberately NOT the seven types vpress_render_figure() knows. Two are
 * missing, for two different reasons, and both are about a step that cannot
 * draw rather than a step nobody wants:
 *
 * - `treemap` renders fine on a first draw, but `vpress-chart-container.vue`'s
 *   own `chartConfig` watcher THROWS on it, so switching to one would turn a
 *   story step into an uncaught exception.
 * - `map` passes that watcher and still draws nothing: it fetches
 *   `/topojsons/mx_edos.json`, which 404s on this install, and a Leaflet map
 *   builds no x/y scales that mean anything in data space anyway.
 *
 * An option that cannot work is worse than a missing one: the author picks
 * it, the step goes blank, and nothing says why.
 *
 * @return string[]
 */
function vpress_story_chart_types(): array {
	return array( 'bars', 'heatmap', 'spineplot', 'scatter', 'timeline' );
}

/**
 * Sanitise a list of annotation ids.
 *
 * Ids are stored lowercased by the annotation model, so they are lowercased
 * here and compared case-sensitively afterwards. Anything that is not a
 * usable id is dropped rather than repaired: a step referencing an id no
 * chart has is a no-op by design, so an unusable one costs nothing.
 *
 * @param mixed $raw Candidate list.
 * @return string[] Unique ids, in the order given.
 */
function vpress_story_annotation_ids( $raw ): array {
	if ( ! is_array( $raw ) ) {
		return array();
	}
	$ids = array();
	foreach ( $raw as $id ) {
		if ( ! is_string( $id ) && ! is_numeric( $id ) ) {
			continue;
		}
		$id = strtolower( trim( (string) $id ) );
		if ( ! preg_match( '/^[a-z0-9_-]{1,32}$/', $id ) ) {
			continue;
		}
		if ( ! in_array( $id, $ids, true ) ) {
			$ids[] = $id;
		}
	}
	return $ids;
}

/**
 * Sanitise a step's query filters.
 *
 * Same shape the chart config stores and `queryBody()` consumes:
 * `{ slug, type, value: [] }` — categories for an ordinal column, `[min, max]`
 * for a linear one. A clause missing a slug or a value is dropped.
 *
 * @param mixed $raw Candidate list.
 * @return array<int,array<string,mixed>>
 */
function vpress_story_filters( $raw ): array {
	if ( ! is_array( $raw ) ) {
		return array();
	}
	$filters = array();
	foreach ( $raw as $clause ) {
		if ( ! is_array( $clause ) ) {
			continue;
		}
		$slug = isset( $clause['slug'] ) && is_string( $clause['slug'] ) ? sanitize_text_field( $clause['slug'] ) : '';
		if ( '' === $slug ) {
			continue;
		}
		$type = isset( $clause['type'] ) && 'linear' === $clause['type'] ? 'linear' : 'ordinal';

		$values = array();
		foreach ( (array) ( $clause['value'] ?? array() ) as $value ) {
			if ( is_bool( $value ) || is_array( $value ) || is_object( $value ) || null === $value ) {
				continue;
			}
			$values[] = is_numeric( $value ) && ! is_string( $value )
				? $value + 0
				: sanitize_text_field( (string) $value );
		}
		if ( ! $values ) {
			continue;
		}

		$filters[] = array(
			'slug'  => $slug,
			'type'  => $type,
			'value' => $values,
		);
	}
	return $filters;
}

/**
 * Sanitise a step's `overrides` attribute into the object the front end reads.
 *
 * Key order is canonical (`show`, `emphasize`, `hide`, `filters`, `title`,
 * `chartType`) so the printed JSON is stable across renders.
 *
 * Present-versus-absent is load-bearing for `show`, and only for `show`:
 *
 * - `show` ABSENT  → every annotation the chart draws stays visible.
 * - `show` PRESENT → an allow-list. `[]` therefore means "none", which is how
 *   a step that reveals nothing yet is expressed, and is exactly what the
 *   editor's checkbox list produces when every box is cleared.
 *
 * `hide` always wins over `show`. `filters`, `title` and `chartType` are
 * omitted when empty, because an empty one cannot be told from "no override"
 * and blanking a title is not something a step should do by accident.
 *
 * @param mixed $raw The block attribute as saved.
 * @return array<string,mixed>
 */
function vpress_story_overrides( $raw ): array {
	if ( is_string( $raw ) ) {
		$decoded = json_decode( $raw, true );
		$raw     = is_array( $decoded ) ? $decoded : array();
	}
	if ( ! is_array( $raw ) ) {
		return array();
	}

	$overrides = array();

	foreach ( array( 'show', 'emphasize', 'hide' ) as $key ) {
		if ( isset( $raw[ $key ] ) && is_array( $raw[ $key ] ) ) {
			$overrides[ $key ] = vpress_story_annotation_ids( $raw[ $key ] );
		}
	}

	$filters = vpress_story_filters( $raw['filters'] ?? null );
	if ( $filters ) {
		$overrides['filters'] = $filters;
	}

	$title = isset( $raw['title'] ) && is_string( $raw['title'] ) ? sanitize_text_field( $raw['title'] ) : '';
	if ( '' !== $title ) {
		$overrides['title'] = $title;
	}

	$chart_type = isset( $raw['chartType'] ) && is_string( $raw['chartType'] ) ? $raw['chartType'] : '';
	if ( in_array( $chart_type, vpress_story_chart_types(), true ) ) {
		$overrides['chartType'] = $chart_type;
	}

	return $overrides;
}

/**
 * Encode a step's overrides for its `data-vpress-step` attribute.
 *
 * NOT escaped here — the caller escapes once, on output, with esc_attr().
 *
 * @param array $overrides Sanitised overrides.
 * @return string Compact JSON object, always at least `{}`.
 */
function vpress_story_overrides_json( array $overrides ): string {
	$json = wp_json_encode( (object) $overrides, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
	return is_string( $json ) ? $json : '{}';
}

/**
 * Render one step.
 *
 * Kept whole so `blocks/story-step/render.php` prints exactly what the parent
 * prints: the child is valid on its own (it is just prose that carries a
 * state), which is what makes it selectable and previewable in the editor.
 *
 * @param array  $attributes {
 *     @type string $heading   Plain text.
 *     @type string $text      Rich text (RichText output).
 *     @type array  $overrides Step state; see vpress_story_overrides().
 * }
 * @param string $wrapper_attributes Attribute string from get_block_wrapper_attributes().
 * @return string
 */
function vpress_story_step_html( array $attributes, string $wrapper_attributes = '' ): string {
	$heading   = isset( $attributes['heading'] ) && is_string( $attributes['heading'] ) ? $attributes['heading'] : '';
	$text      = isset( $attributes['text'] ) && is_string( $attributes['text'] ) ? $attributes['text'] : '';
	$overrides = vpress_story_overrides( $attributes['overrides'] ?? array() );

	$classes = array( 'vpress-story__step' );
	$wrapper = vpress_parse_html_attributes( $wrapper_attributes );
	if ( isset( $wrapper['class'] ) ) {
		$classes = array_merge( preg_split( '/\s+/', $wrapper['class'], -1, PREG_SPLIT_NO_EMPTY ), $classes );
	}
	$classes = array_values( array_unique( $classes ) );

	$html  = '<div class="' . esc_attr( implode( ' ', $classes ) ) . '"';
	$html .= ' data-vpress-step="' . esc_attr( vpress_story_overrides_json( $overrides ) ) . '"';
	foreach ( $wrapper as $name => $value ) {
		// class is merged above; the renderer owns data-vpress-*; no event handlers.
		if ( 'class' === $name || 0 === strpos( $name, 'data-vpress-' ) || 0 === strpos( $name, 'on' ) ) {
			continue;
		}
		$html .= ' ' . $name . '="' . esc_attr( $value ) . '"';
	}
	$html .= '>';

	if ( '' !== trim( $heading ) ) {
		$html .= '<h3 class="vpress-story__heading">' . esc_html( $heading ) . '</h3>';
	}
	if ( '' !== trim( $text ) ) {
		// Rich text: wp_kses_post() is the escaping, not esc_html() — the
		// author's <strong>/<em>/<a> are the point of a rich field, and
		// esc_html() would print the tags instead of applying them.
		$html .= '<div class="vpress-story__text">' . wp_kses_post( $text ) . '</div>';
	}

	$html .= '</div>';
	return $html;
}

/**
 * The first step's heading, read from the parent block's parsed inner blocks.
 *
 * The story prints it into its live region so the region is never empty at
 * rest — and so a reader with no JavaScript still sees the story's opening
 * frame named above the chart.
 *
 * @param mixed $block The WP_Block for the story, when WordPress passed one.
 * @return string Plain text, possibly ''.
 */
function vpress_story_first_heading( $block ): string {
	$inner = is_object( $block ) && isset( $block->parsed_block['innerBlocks'] ) ? $block->parsed_block['innerBlocks'] : null;
	if ( ! is_array( $inner ) ) {
		return '';
	}
	foreach ( $inner as $child ) {
		$heading = $child['attrs']['heading'] ?? '';
		if ( is_string( $heading ) && '' !== trim( $heading ) ) {
			// Trimmed, because the controller compares the text it reads out
			// of this region against its own trimmed heading before deciding
			// whether anything changed. Returning "  El pico  " here while the
			// client holds "El pico" makes them unequal, so the live region is
			// rewritten at boot with a string it already showed — the exact
			// mutation that comparison exists to prevent. Reachable: the step
			// editor stores the raw field value without trimming.
			return trim( $heading );
		}
	}
	return '';
}
