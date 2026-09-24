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
 *     @type string $align One of 'wide', 'full', 'center', 'none'.
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

	/* translators: %d: chart id. */
	$label = '' !== $title ? $title : sprintf( __( 'Gráfica %d', 'vpress' ), $chart_id );

	vpress_enqueue_embed_assets();

	$id = (int) $chart->id;

	// The first render of a chart in a request keeps the plain id; repeats
	// (the same chart twice on one page) get -2, -3, … so ids stay unique.
	static $renders = array();
	$renders[ $id ] = isset( $renders[ $id ] ) ? $renders[ $id ] + 1 : 1;
	$dom_id         = 'vpress-figure-' . $id . ( $renders[ $id ] > 1 ? '-' . $renders[ $id ] : '' );

	$html  = '<figure class="' . esc_attr( implode( ' ', $classes ) ) . '"';
	$html .= ' id="' . esc_attr( $dom_id ) . '"';
	$html .= ' data-vpress-chart="' . esc_attr( (string) $id ) . '"';
	$html .= ' data-vpress-rest="' . esc_url( rest_url( 'vpress/v1/' ) ) . '"';
	// Logged-in viewers (e.g. editors seeing a private chart) authenticate the
	// embed's REST calls with a nonce; anonymous markup stays nonce-free and cacheable.
	if ( is_user_logged_in() ) {
		$html .= ' data-vpress-nonce="' . esc_attr( wp_create_nonce( 'wp_rest' ) ) . '"';
	}
	$html .= '>';
	$html .= '<div class="vpress-figure__chart" role="img" aria-label="' . esc_attr( $label ) . '" aria-busy="true"></div>';
	$html .= '<figcaption class="vpress-figure__caption">';
	$html .= '<span class="vpress-figure__title">' . esc_html( $title ) . '</span>';
	if ( '' !== $subtitle ) {
		$html .= '<span class="vpress-figure__subtitle">' . esc_html( $subtitle ) . '</span>';
	}
	$html .= '</figcaption>';
	$html .= '</figure>';

	return $html;
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
