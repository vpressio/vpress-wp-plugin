<?php
/**
 * Provenance for chart figures: the source line under every figure, the
 * chart page's schema.org Dataset JSON-LD and the URLs both point at.
 *
 * Reads the dataset registry row the chart is built on (source_name,
 * source_url, license, retrieved_at and, for live sources, last_refreshed_at).
 *
 * @package    Vpress
 * @subpackage Vpress/includes
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The per-request dataset-row cache, by reference (keyed by dataset id).
 *
 * @return array
 */
function &vpress_figure_dataset_cache(): array {
	static $cache = array();
	return $cache;
}

/**
 * The registry row of the dataset a chart is built on. Cached per request.
 *
 * The caller has already decided the visitor may see the chart
 * (vpress_get_public_chart()); only provenance fields of this row are ever
 * printed.
 *
 * @param object $chart Chart row.
 * @return object|null
 */
function vpress_figure_dataset( object $chart ): ?object {
	global $wpdb;

	$dataset_id = (int) ( $chart->dataset_id ?? 0 );
	if ( $dataset_id <= 0 ) {
		return null;
	}
	$cache = &vpress_figure_dataset_cache();
	if ( ! array_key_exists( $dataset_id, $cache ) ) {
		$row                  = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}vpresscore_datasets WHERE id = %d", $dataset_id ) );
		$cache[ $dataset_id ] = is_object( $row ) ? $row : null;
	}
	return $cache[ $dataset_id ];
}

/**
 * A trimmed string field of a registry row ('' when missing).
 *
 * @param object|null $dataset Registry row.
 * @param string      $field   Column.
 * @return string
 */
function vpress_provenance_field( ?object $dataset, string $field ): string {
	if ( ! $dataset || ! isset( $dataset->$field ) || ! is_scalar( $dataset->$field ) ) {
		return '';
	}
	return trim( (string) $dataset->$field );
}

/**
 * Whether the dataset is a live (URL / Google Sheets) source.
 *
 * @param object|null $dataset Registry row.
 * @return bool
 */
function vpress_provenance_is_live( ?object $dataset ): bool {
	return in_array( vpress_provenance_field( $dataset, 'source_type' ), array( 'url', 'gsheet' ), true );
}

/**
 * The dataset's source URL when it is a usable http(s) link, else ''.
 *
 * Withheld from visitors who cannot `edit_posts` when the source is a Google
 * Sheet: a sheet shared as "anyone with the link" is protected by nothing but
 * that link's secrecy, so the URL is the credential, not a citation. Every
 * public reader of a source URL goes through here — the figure footer, the
 * chart page's JSON-LD and export.json — so the rule lives at this one point
 * rather than being repeated at each surface. `/dataset/get` and
 * `/dataset/list` apply the same rule to their own rows in
 * vpress_dataset_hide_private_fields().
 *
 * A plain `url` source keeps its link: a CSV on an open endpoint is a citation.
 *
 * @param object|null $dataset Registry row.
 * @return string
 */
function vpress_provenance_url( ?object $dataset ): string {
	$url = vpress_provenance_field( $dataset, 'source_url' );
	if ( ! preg_match( '#^https?://#i', $url ) ) {
		return '';
	}
	if ( 'gsheet' === vpress_provenance_field( $dataset, 'source_type' ) && ! current_user_can( 'edit_posts' ) ) {
		return '';
	}
	return $url;
}

/**
 * Whether there is provenance to print: a source name or a source URL.
 *
 * @param object|null $dataset Registry row.
 * @return bool
 */
function vpress_figure_has_provenance( ?object $dataset ): bool {
	return '' !== vpress_provenance_field( $dataset, 'source_name' ) || '' !== vpress_provenance_url( $dataset );
}

/**
 * The date the data is "as of", formatted with the site's date format:
 * the last successful refresh for live sources, else the editor-entered
 * retrieved_at; '' when neither is known.
 *
 * @param object|null $dataset Registry row.
 * @return string
 */
function vpress_provenance_date_label( ?object $dataset ): string {
	$format = (string) get_option( 'date_format', 'Y-m-d' );

	$refreshed = vpress_provenance_field( $dataset, 'last_refreshed_at' );
	if ( vpress_provenance_is_live( $dataset ) && '' !== $refreshed ) {
		// last_refreshed_at is UTC (current_time( 'mysql', true )); show it in the site's timezone.
		$timestamp = strtotime( $refreshed . ' UTC' );
		if ( false !== $timestamp ) {
			return wp_date( $format, $timestamp );
		}
	}

	$retrieved = vpress_provenance_field( $dataset, 'retrieved_at' );
	if ( '' !== $retrieved ) {
		// A calendar date, not an instant: format it in UTC so no timezone shifts the day.
		$timestamp = strtotime( $retrieved . ' 00:00:00 UTC' );
		if ( false !== $timestamp ) {
			return wp_date( $format, $timestamp, new DateTimeZone( 'UTC' ) );
		}
	}
	return '';
}

/**
 * The public JSON export of a chart.
 *
 * @param int $chart_id Chart id.
 * @return string
 */
function vpress_chart_export_url( int $chart_id ): string {
	return rest_url( 'vpress/v1/chart/' . $chart_id . '/export.json' );
}

/**
 * The standalone chart page, /chart/{id}/.
 *
 * @param int $chart_id Chart id.
 * @return string
 */
function vpress_chart_page_url( int $chart_id ): string {
	return home_url( '/chart/' . $chart_id . '/' );
}

/**
 * The source line printed under a figure:
 * "Source: {name|host} · {licence} · Data as of {date} · Download data (JSON)".
 *
 * @param object      $chart   Chart row (already visibility-checked).
 * @param object|null $dataset Its registry row.
 * @return string `<footer class="vpress-figure__source">…</footer>`, or '' without provenance.
 */
function vpress_figure_source_footer( object $chart, ?object $dataset ): string {
	if ( ! vpress_figure_has_provenance( $dataset ) ) {
		return '';
	}

	$name = vpress_provenance_field( $dataset, 'source_name' );
	$url  = vpress_provenance_url( $dataset );
	if ( '' === $name && '' !== $url ) {
		$name = (string) wp_parse_url( $url, PHP_URL_HOST );
	}

	$source = esc_html( $name );
	if ( '' !== $url && '' !== esc_url( $url ) ) {
		$source = '<a href="' . esc_url( $url ) . '" rel="noopener">' . $source . '</a>';
	}
	$parts = array( esc_html__( 'Source:', 'vpress' ) . ' ' . $source );

	$license = vpress_provenance_field( $dataset, 'license' );
	if ( '' !== $license ) {
		$parts[] = esc_html( $license );
	}

	$date = vpress_provenance_date_label( $dataset );
	if ( '' !== $date ) {
		/* translators: %s: date the data was retrieved or last refreshed. */
		$parts[] = esc_html( sprintf( __( 'Data as of %s', 'vpress' ), $date ) );
	}

	$export = vpress_chart_export_url( (int) $chart->id );
	// Editors seeing a private chart follow the link with their cookie; the
	// REST API only honours it with a nonce. Anonymous markup stays nonce-free.
	if ( is_user_logged_in() ) {
		$export = add_query_arg( '_wpnonce', wp_create_nonce( 'wp_rest' ), $export );
	}
	$parts[] = '<a class="vpress-figure__export" href="' . esc_url( $export ) . '">' . esc_html__( 'Download data (JSON)', 'vpress' ) . '</a>';

	$html = '<footer class="vpress-figure__source">' . implode( ' · ', $parts ) . '</footer>';

	/**
	 * Filters the source line printed under a chart figure.
	 *
	 * @param string $html    Footer markup (escaped).
	 * @param object $chart   Chart row.
	 * @param object $dataset Dataset registry row.
	 */
	return (string) apply_filters( 'vpress_figure_source_html', $html, $chart, $dataset );
}

/**
 * The schema.org Dataset describing a chart, as an array.
 *
 * @param object      $chart   Chart row (already visibility-checked).
 * @param object|null $dataset Its registry row.
 * @return array
 */
function vpress_chart_json_ld_data( object $chart, ?object $dataset ): array {
	$chart_id = (int) $chart->id;
	$title    = function_exists( 'vpress_figure_title' ) ? vpress_figure_title( $chart ) : trim( (string) ( $chart->title ?? '' ) );
	/* translators: %d: chart id. */
	$fallback = '' !== $title ? $title : sprintf( __( 'Chart %d', 'vpress' ), $chart_id );

	$name = vpress_provenance_field( $dataset, 'name' );
	$text = array_filter( array( $title, trim( (string) ( $chart->description ?? '' ) ) ), 'strlen' );

	$data = array(
		'@context'    => 'https://schema.org',
		'@type'       => 'Dataset',
		'name'        => '' !== $name ? $name : $fallback,
		'description' => $text ? implode( ' — ', $text ) : $fallback,
		'url'         => vpress_chart_page_url( $chart_id ),
	);

	$license = vpress_provenance_field( $dataset, 'license' );
	if ( '' !== $license ) {
		$data['license'] = $license;
	}

	$refreshed = vpress_provenance_field( $dataset, 'last_refreshed_at' );
	$updated   = vpress_provenance_field( $dataset, 'updated' );
	if ( '' !== $refreshed ) {
		// Stored in UTC.
		$data['dateModified'] = str_replace( ' ', 'T', $refreshed ) . 'Z';
	} elseif ( '' !== $updated ) {
		// A MySQL TIMESTAMP in the server's session timezone: no offset is claimed.
		$data['dateModified'] = str_replace( ' ', 'T', $updated );
	}

	$data['creator']      = array(
		'@type' => 'Organization',
		'name'  => get_bloginfo( 'name' ),
		'url'   => home_url(),
	);
	$data['distribution'] = array(
		array(
			'@type'          => 'DataDownload',
			'encodingFormat' => 'application/json',
			'contentUrl'     => vpress_chart_export_url( $chart_id ),
		),
	);

	$source_url = vpress_provenance_url( $dataset );
	if ( '' !== $source_url ) {
		$data['isBasedOn'] = $source_url;
	}

	/**
	 * Filters the schema.org Dataset printed on the chart page.
	 *
	 * @param array       $data    JSON-LD object.
	 * @param object      $chart   Chart row.
	 * @param object|null $dataset Dataset registry row.
	 */
	return (array) apply_filters( 'vpress_chart_json_ld', $data, $chart, $dataset );
}

/**
 * The chart page's `<script type="application/ld+json">` element.
 *
 * JSON_HEX_TAG / JSON_HEX_AMP encode `<`, `>` and `&`, so no value can close
 * the script element or open an HTML comment inside it.
 *
 * @param int $chart_id Chart id.
 * @return string The element, or '' when the visitor cannot see the chart.
 */
function vpress_chart_json_ld( int $chart_id ): string {
	$chart = vpress_get_public_chart( $chart_id );
	if ( ! $chart ) {
		return '';
	}
	$json = wp_json_encode(
		vpress_chart_json_ld_data( $chart, vpress_figure_dataset( $chart ) ),
		JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP
	);
	if ( ! is_string( $json ) ) {
		return '';
	}
	return '<script type="application/ld+json">' . $json . '</script>';
}
