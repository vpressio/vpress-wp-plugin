<?php
/**
 * Server-rendered public chart figure.
 *
 * One `<figure>` is the public contract for a chart: the shortcode, the
 * `/chart/{id}` page and the block all print it, and the lightweight embed
 * bundle (`admin/dist/js/embed.js`) mounts the interactive chart into its
 * `.vpress-figure__chart` slot.
 *
 * @package    Vpress
 * @subpackage Vpress/includes
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Fetch a chart row if the current visitor may see it.
 *
 * @param int $chart_id Chart id.
 * @return object|null Row from `{prefix}vpresscore_charts`, or null when the
 *                     chart is missing, or private and the visitor cannot edit posts.
 */
function vpress_get_public_chart( int $chart_id ): ?object {
	global $wpdb;

	if ( $chart_id <= 0 ) {
		return null;
	}

	$table = $wpdb->prefix . 'vpresscore_charts';
	$chart = $wpdb->get_row(
		// Table name is built from $wpdb->prefix, not user input.
		$wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $chart_id ) // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	);

	if ( ! $chart ) {
		return null;
	}

	if ( 'public' !== $chart->permissions && ! current_user_can( 'edit_posts' ) ) {
		return null;
	}

	return $chart;
}

/**
 * Render the public figure for a chart.
 *
 * @param int   $chart_id Chart id.
 * @param array $args     {
 *     Optional.
 *     @type string $align              One of 'wide', 'full', 'center', 'none'.
 *     @type bool   $show_caption       Print the `<figcaption>`. Default true.
 *     @type string $wrapper_attributes Attribute string from get_block_wrapper_attributes();
 *                                      its classes are merged into the figure's, its id
 *                                      (block anchor) replaces the generated one and other
 *                                      attributes (e.g. style) are copied, except
 *                                      `data-vpress-*` and event handlers.
 * }
 * @return string Figure markup, or '' when the chart is not viewable.
 */
function vpress_render_figure( int $chart_id, array $args = array() ): string {
	$chart = vpress_get_public_chart( $chart_id );
	if ( ! $chart ) {
		return '';
	}

	$values = json_decode( (string) $chart->value, true );
	if ( ! is_array( $values ) ) {
		$values = array();
	}

	$title = '';
	if ( isset( $chart->title ) && '' !== trim( (string) $chart->title ) ) {
		$title = (string) $chart->title;
	} elseif ( isset( $values['title'] ) && is_string( $values['title'] ) ) {
		$title = $values['title'];
	}
	$subtitle = isset( $values['subtitle'] ) && is_string( $values['subtitle'] ) ? $values['subtitle'] : '';

	$types = array( 'bars', 'scatter', 'heatmap', 'timeline', 'map', 'spineplot', 'treemap' );
	$type  = isset( $values['chart'] ) && in_array( $values['chart'], $types, true ) ? $values['chart'] : 'bars';
	$theme = isset( $values['theme'] ) && 'dark' === $values['theme'] ? 'dark' : 'light';

	$align_classes = array(
		'wide'   => 'alignwide',
		'full'   => 'alignfull',
		'center' => 'aligncenter',
	);
	$align = isset( $args['align'] ) ? (string) $args['align'] : '';

	$classes = array(
		'vpress-figure',
		'vpress-figure--' . $type,
		'vpress-figure--' . $theme,
	);
	if ( isset( $align_classes[ $align ] ) ) {
		$classes[] = $align_classes[ $align ];
	}

	$wrapper = vpress_parse_html_attributes( isset( $args['wrapper_attributes'] ) ? (string) $args['wrapper_attributes'] : '' );
	if ( isset( $wrapper['class'] ) ) {
		// Block classes first (wp-block-vpress-chart, alignwide, …), then ours.
		$classes = array_merge( preg_split( '/\s+/', $wrapper['class'], -1, PREG_SPLIT_NO_EMPTY ), $classes );
	}
	$classes = array_values( array_unique( $classes ) );

	$show_caption = ! array_key_exists( 'show_caption', $args ) || (bool) $args['show_caption'];

	/* translators: %d: chart id. */
	$label = '' !== $title ? $title : sprintf( __( 'Gráfica %d', 'vpress' ), $chart_id );

	vpress_enqueue_embed_assets();

	$id = (int) $chart->id;

	// The first render of a chart in a request keeps the plain id; repeats
	// (the same chart twice on one page) get -2, -3, … so ids stay unique.
	static $renders = array();
	$renders[ $id ] = isset( $renders[ $id ] ) ? $renders[ $id ] + 1 : 1;
	$dom_id         = 'vpress-figure-' . $id . ( $renders[ $id ] > 1 ? '-' . $renders[ $id ] : '' );
	// A block anchor is the author's chosen id; it wins over the generated one.
	if ( isset( $wrapper['id'] ) && '' !== trim( $wrapper['id'] ) ) {
		$dom_id = trim( $wrapper['id'] );
	}

	$html  = '<figure class="' . esc_attr( implode( ' ', $classes ) ) . '"';
	$html .= ' id="' . esc_attr( $dom_id ) . '"';
	$html .= ' data-vpress-chart="' . esc_attr( (string) $id ) . '"';
	$html .= ' data-vpress-rest="' . esc_url( rest_url( 'vpress/v1/' ) ) . '"';
	// Logged-in viewers (e.g. editors seeing a private chart) authenticate the
	// embed's REST calls with a nonce; anonymous markup stays nonce-free and cacheable.
	if ( is_user_logged_in() ) {
		$html .= ' data-vpress-nonce="' . esc_attr( wp_create_nonce( 'wp_rest' ) ) . '"';
	}
	foreach ( $wrapper as $name => $value ) {
		// class/id are merged above; the renderer owns data-vpress-*; no event handlers.
		if ( 'class' === $name || 'id' === $name || 0 === strpos( $name, 'data-vpress-' ) || 0 === strpos( $name, 'on' ) ) {
			continue;
		}
		$html .= ' ' . $name . '="' . esc_attr( $value ) . '"';
	}
	$html .= '>';

	// Text alternative + data table (includes/class-vpress-figure-text.php).
	// A failed query never breaks the page: the figure just goes without them.
	$desc_id  = $dom_id . '-desc';
	$alt_text = null;
	$table    = '';
	$rows     = function_exists( 'vpress_figure_rows' ) ? vpress_figure_rows( $chart ) : null;
	if ( is_array( $rows ) ) {
		$alt_text = (string) apply_filters( 'vpress_figure_alt_text', vpress_figure_alt_text( $chart, $rows ), $chart, $rows );
		$table    = vpress_figure_data_table( $chart, $rows );
	} elseif ( is_wp_error( $rows ) && defined( 'WP_DEBUG' ) && WP_DEBUG ) {
		error_log( sprintf( '[vpress] chart %d text alternative unavailable: %s', $id, $rows->get_error_code() ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
	}

	$html .= '<div class="vpress-figure__chart" role="img" aria-label="' . esc_attr( $label ) . '"';
	if ( null !== $alt_text ) {
		$html .= ' aria-describedby="' . esc_attr( $desc_id ) . '"';
	}
	$html .= ' aria-busy="true"></div>';
	if ( null !== $alt_text ) {
		$html .= '<p class="vpress-figure__alt screen-reader-text" id="' . esc_attr( $desc_id ) . '">' . esc_html( $alt_text ) . '</p>';
	}
	if ( $show_caption ) {
		$html .= '<figcaption class="vpress-figure__caption">';
		$html .= '<span class="vpress-figure__title">' . esc_html( $title ) . '</span>';
		if ( '' !== $subtitle ) {
			$html .= '<span class="vpress-figure__subtitle">' . esc_html( $subtitle ) . '</span>';
		}
		$html .= '</figcaption>';
	}
	// The data table is the fallback for the chart itself, so it stays even
	// when the block hides the caption.
	$html .= $table;
	$html .= '</figure>';

	return $html;
}

/**
 * Parse an HTML attribute string such as get_block_wrapper_attributes() returns.
 *
 * Only double-quoted `name="value"` pairs are read (the form core prints);
 * names are lower-cased and restricted to a safe charset, values are
 * entity-decoded so they can be escaped once on output.
 *
 * @param string $attributes Attribute string, e.g. `class="a b" style="margin:0"`.
 * @return array<string,string> name => raw value.
 */
function vpress_parse_html_attributes( string $attributes ): array {
	$parsed = array();
	if ( '' === trim( $attributes ) ) {
		return $parsed;
	}
	if ( preg_match_all( '/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/', $attributes, $matches, PREG_SET_ORDER ) ) {
		foreach ( $matches as $match ) {
			$parsed[ strtolower( $match[1] ) ] = html_entity_decode( $match[2], ENT_QUOTES, 'UTF-8' );
		}
	}
	return $parsed;
}

/**
 * Enqueue the lightweight embed bundle (script module + stylesheet). Idempotent.
 *
 * Uses the dev/prod decision the plugin makes at boot (`vpress_client`
 * filter): in dev the Vite server on :5180 serves `src/embed.js` (which
 * injects its own CSS); in prod the built `admin/dist` files are used.
 *
 * @return void
 */
function vpress_enqueue_embed_assets() {
	static $done = false;
	if ( $done ) {
		return;
	}
	$done = true;

	$client = apply_filters(
		'vpress_client',
		array(
			'env'      => 'prod',
			'location' => '',
		)
	);

	if ( is_array( $client ) && isset( $client['env'], $client['location'] ) && 'dev' === $client['env'] ) {
		$dev = rtrim( (string) $client['location'], '/' );
		wp_register_script_module( 'vpress-vite-client', $dev . '/@vite/client', array(), null );
		wp_register_script_module( 'vpress-embed', $dev . '/src/embed.js', array( 'vpress-vite-client' ), null );
		wp_enqueue_script_module( 'vpress-vite-client' );
		wp_enqueue_script_module( 'vpress-embed' );
		return;
	}

	wp_register_script_module(
		'vpress-embed',
		plugins_url( 'admin/dist/js/embed.js', VPRESS_PLUGIN_FILE ),
		array(),
		VPRESS_VERSION
	);
	wp_enqueue_script_module( 'vpress-embed' );
	wp_enqueue_style(
		'vpress-embed',
		plugins_url( 'admin/dist/css/embed.css', VPRESS_PLUGIN_FILE ),
		array(),
		VPRESS_VERSION
	);
}
