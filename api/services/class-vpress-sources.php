<?php
/**
 * Live data sources: datasets imported from a CSV URL or a Google Sheet and
 * refreshed on a schedule (WP-Cron, hourly sweep) or on demand.
 *
 * Fetching goes through wp_safe_remote_get(), which refuses non-http(s)
 * schemes and private/loopback hosts (also on redirects). Parsing reuses the
 * import pipeline; refreshes swap tables atomically
 * (vpress_dataset_replace_table()).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-vpress-query-guard.php';
require_once __DIR__ . '/dataset.php';
require_once __DIR__ . '/import.php';

/** Allowed refresh_interval values and their period in seconds (0 = manual). */
function vpress_source_intervals(): array {
	return array(
		'none'   => 0,
		'hourly' => HOUR_IN_SECONDS,
		'daily'  => DAY_IN_SECONDS,
		'weekly' => WEEK_IN_SECONDS,
	);
}

function vpress_source_bad_url(): WP_Error {
	return new WP_Error(
		'vpress_bad_source_url',
		__( 'Enter a public http(s) URL of a CSV file or a Google Sheet.', 'vpress' ),
		array( 'status' => 400 )
	);
}

/**
 * The gid of a Google Sheets URL, from the fragment (#gid=N) or the query.
 */
function vpress_source_gsheet_gid( array $parts ): string {
	foreach ( array( 'fragment', 'query' ) as $key ) {
		if ( isset( $parts[ $key ] ) ) {
			parse_str( $parts[ $key ], $args );
			if ( isset( $args['gid'] ) && preg_match( '/^\d+$/D', (string) $args['gid'] ) ) {
				return (string) $args['gid'];
			}
		}
	}
	return '0';
}

/**
 * Classifies a source URL and derives what to fetch and what to show.
 *
 * Google Sheets links (docs.google.com/spreadsheets/d/{ID}/…, gid in the
 * fragment or query) become the sheet's CSV export; published sheets
 * (/d/e/{ID}/pub…) their CSV output. Anything else must be an http(s) URL
 * wp_http_validate_url() accepts.
 *
 * @return array|WP_Error { type: url|gsheet, fetch_url, display_url }.
 */
function vpress_source_normalize( string $url ) {
	$url   = trim( $url );
	$parts = wp_parse_url( $url );
	if ( ! is_array( $parts ) || empty( $parts['host'] ) || ! in_array( strtolower( $parts['scheme'] ?? '' ), array( 'http', 'https' ), true ) ) {
		return vpress_source_bad_url();
	}

	if ( 'docs.google.com' === strtolower( $parts['host'] ) ) {
		$path = $parts['path'] ?? '';
		$gid  = vpress_source_gsheet_gid( $parts );
		if ( preg_match( '#^/spreadsheets/d/e/([A-Za-z0-9_-]+)(/|$)#', $path, $m ) ) {
			$base = 'https://docs.google.com/spreadsheets/d/e/' . $m[1];
			return array(
				'type'        => 'gsheet',
				'fetch_url'   => $base . '/pub?gid=' . $gid . '&single=true&output=csv',
				'display_url' => $base . '/pubhtml?gid=' . $gid,
			);
		}
		if ( preg_match( '#^/spreadsheets/d/([A-Za-z0-9_-]+)(/|$)#', $path, $m ) ) {
			$base = 'https://docs.google.com/spreadsheets/d/' . $m[1];
			return array(
				'type'        => 'gsheet',
				'fetch_url'   => $base . '/export?format=csv&gid=' . $gid,
				'display_url' => $base . '/edit#gid=' . $gid,
			);
		}
	}

	if ( false === wp_http_validate_url( $url ) ) {
		return vpress_source_bad_url();
	}
	return array(
		'type'        => 'url',
		'fetch_url'   => $url,
		'display_url' => $url,
	);
}

/**
 * Downloads $fetch_url into a temporary file under the import tmp dir,
 * capped at vpress_import_max_bytes(). The Content-Type is not trusted; the
 * CSV parser decides. A body that reaches the cap is refused rather than
 * imported truncated.
 *
 * @return string|WP_Error Path of the downloaded file (the caller deletes it).
 */
function vpress_source_fetch( string $fetch_url ) {
	$cap  = vpress_import_max_bytes();
	$path = vpress_import_tmp_dir() . '/' . wp_generate_password( 20, false ) . '.csv';

	$response = wp_safe_remote_get(
		$fetch_url,
		array(
			'timeout'             => 30,
			'stream'              => true,
			'filename'            => $path,
			'limit_response_size' => $cap,
		)
	);

	if ( is_wp_error( $response ) ) {
		wp_delete_file( $path );
		return new WP_Error(
			'vpress_fetch_failed',
			/* translators: %s: transport error message. */
			sprintf( __( 'Could not download the source: %s', 'vpress' ), $response->get_error_message() ),
			array( 'status' => 502 )
		);
	}
	$code = (int) wp_remote_retrieve_response_code( $response );
	if ( $code < 200 || $code > 299 ) {
		wp_delete_file( $path );
		return new WP_Error(
			'vpress_fetch_failed',
			/* translators: %d: HTTP status code returned by the source. */
			sprintf( __( 'The source responded with HTTP %d.', 'vpress' ), $code ),
			array(
				'status'          => 502,
				'upstream_status' => $code,
			)
		);
	}
	clearstatcache( true, $path );
	if ( ! file_exists( $path ) ) {
		return new WP_Error( 'vpress_fetch_failed', __( 'The source returned no data.', 'vpress' ), array( 'status' => 502 ) );
	}
	if ( filesize( $path ) >= $cap ) {
		wp_delete_file( $path );
		return new WP_Error(
			'vpress_source_too_large',
			__( 'The source exceeds the maximum allowed size.', 'vpress' ),
			array(
				'status'    => 413,
				'max_bytes' => $cap,
			)
		);
	}
	return $path;
}

/**
 * Whether a source refreshed every $interval is due at $now (Unix time).
 * $last_refreshed_at is UTC 'Y-m-d H:i:s' or null (never refreshed: due).
 */
function vpress_source_is_due( string $interval, ?string $last_refreshed_at, int $now ): bool {
	$period = vpress_source_intervals()[ $interval ] ?? 0;
	if ( $period <= 0 ) {
		return false;
	}
	if ( null === $last_refreshed_at || '' === $last_refreshed_at ) {
		return true;
	}
	$last = strtotime( $last_refreshed_at . ' UTC' );
	return false === $last || $now - $last >= $period;
}

function vpress_source_lock_key( int $id ): string {
	return 'vpress_refresh_' . $id;
}

/**
 * Takes the per-dataset refresh lock; false when someone else holds it.
 */
function vpress_source_lock( int $id ): bool {
	if ( get_transient( vpress_source_lock_key( $id ) ) ) {
		return false;
	}
	set_transient( vpress_source_lock_key( $id ), 1, 15 * MINUTE_IN_SECONDS );
	return true;
}

function vpress_source_unlock( int $id ): void {
	delete_transient( vpress_source_lock_key( $id ) );
}

/**
 * The one refresh routine (REST and cron): re-derive the fetch URL from the
 * stored source_url, download, swap the table. Every outcome is recorded on
 * the registry row; errors are returned.
 *
 * @param object $dataset Registry row.
 * @return true|WP_Error
 */
function vpress_source_refresh( $dataset ) {
	$source = vpress_source_normalize( (string) $dataset->source_url );
	$path   = is_wp_error( $source ) ? $source : vpress_source_fetch( $source['fetch_url'] );
	if ( is_wp_error( $path ) ) {
		vpress_dataset_record_refresh( (string) $dataset->slug, $path );
		return $path;
	}
	return vpress_dataset_replace_table( (string) $dataset->slug, $path );
}

function vpress_source_get_dataset( int $id ) {
	global $wpdb;
	return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}vpresscore_datasets WHERE id = %d", $id ) );
}

/**
 * The /dataset/get response shape for registry row $id.
 */
function vpress_source_dataset_response( int $id ): array {
	global $wpdb;
	return array(
		'data'  => vpress_source_get_dataset( $id ),
		'query' => vpress_debug_sql( $wpdb->last_query ),
	);
}

/**
 * POST /dataset/from-url { name, url, refresh_interval, permissions }: import
 * a live source and register it.
 *
 * `permissions` defaults to `private`: a live source is imported from a link
 * the operator holds, and for a Google Sheet that link is the access itself,
 * so the row must not become world-readable unless it is asked for.
 *
 * @return array|WP_Error
 */
function vpress_dataset_from_url( $request ) {
	global $wpdb;
	$registry    = $wpdb->prefix . 'vpresscore_datasets';
	$name        = sanitize_text_field( (string) $request->get_param( 'name' ) );
	$interval    = (string) ( $request->get_param( 'refresh_interval' ) ?? 'none' );
	$permissions = (string) ( $request->get_param( 'permissions' ) ?? 'private' );

	if ( '' === $name ) {
		return new WP_Error( 'vpress_missing_name', __( 'The dataset needs a name.', 'vpress' ), array( 'status' => 400 ) );
	}
	if ( ! array_key_exists( $interval, vpress_source_intervals() ) ) {
		return new WP_Error( 'vpress_bad_interval', __( 'Unsupported refresh interval.', 'vpress' ), array( 'status' => 400 ) );
	}
	if ( ! in_array( $permissions, vpress_dataset_permission_values(), true ) ) {
		return new WP_Error( 'vpress_bad_permissions', __( 'Unsupported dataset visibility.', 'vpress' ), array( 'status' => 400 ) );
	}
	$source = vpress_source_normalize( (string) $request->get_param( 'url' ) );
	if ( is_wp_error( $source ) ) {
		return $source;
	}
	$slug  = vpress_clean_string( $name );
	$table = 'vpress_' . $slug;
	if ( ! vpress_guard_identifier( $table ) || ! vpress_guard_identifier( $table . '__new' ) ) {
		return new WP_Error( 'vpress_bad_name', __( 'The dataset name is too long.', 'vpress' ), array( 'status' => 400 ) );
	}

	$duplicate = new WP_Error( 'vpress_duplicate_dataset', __( 'A dataset with this name already exists.', 'vpress' ), array( 'status' => 409 ) );
	if ( null !== $wpdb->get_var( $wpdb->prepare( "SELECT 1 FROM $registry WHERE slug = %s LIMIT 1", $slug ) )
		|| $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) === $table ) {
		return $duplicate;
	}
	// Two concurrent requests for one name would otherwise import into one table.
	$lock = 'vpress_import_' . $slug;
	if ( get_transient( $lock ) ) {
		return $duplicate;
	}
	set_transient( $lock, 1, 15 * MINUTE_IN_SECONDS );

	try {
		$path = vpress_source_fetch( $source['fetch_url'] );
		if ( is_wp_error( $path ) ) {
			return $path;
		}
		$imported = vpress_import_from_file( $path, $table );
		if ( is_wp_error( $imported ) ) {
			$wpdb->query( "DROP TABLE IF EXISTS `$table`" );
			return $imported;
		}
		$wpdb->insert(
			$registry,
			array(
				'permissions'       => $permissions,
				'name'              => $name,
				'slug'              => $slug,
				'owner_id'          => get_current_user_id(),
				'source_type'       => $source['type'],
				'source_url'        => $source['display_url'],
				'refresh_interval'  => $interval,
				'last_refreshed_at' => current_time( 'mysql', true ),
			),
			array( '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%s' )
		);
		if ( $wpdb->last_error ) {
			$error = vpress_db_error( $wpdb->last_error, 500 );
			$wpdb->query( "DROP TABLE IF EXISTS `$table`" );
			return $error;
		}
		return vpress_source_dataset_response( (int) $wpdb->insert_id );
	} finally {
		delete_transient( $lock );
	}
}

/**
 * POST /dataset/refresh { id }: refresh a live source now.
 *
 * @return array|WP_Error
 */
function vpress_dataset_refresh( $request ) {
	$id      = (int) $request->get_param( 'id' );
	$dataset = vpress_source_get_dataset( $id );
	if ( ! $dataset ) {
		return new WP_Error( 'vpress_unknown_dataset', __( 'Unknown dataset.', 'vpress' ), array( 'status' => 404 ) );
	}
	if ( ! in_array( $dataset->source_type ?? 'upload', array( 'url', 'gsheet' ), true ) ) {
		return new WP_Error( 'vpress_not_refreshable', __( 'Only datasets imported from a URL can be refreshed.', 'vpress' ), array( 'status' => 400 ) );
	}
	if ( ! vpress_source_lock( $id ) ) {
		return new WP_Error( 'vpress_refresh_running', __( 'This dataset is already being refreshed.', 'vpress' ), array( 'status' => 409 ) );
	}
	try {
		$result = vpress_source_refresh( $dataset );
	} finally {
		vpress_source_unlock( $id );
	}
	if ( is_wp_error( $result ) ) {
		return $result;
	}
	return vpress_source_dataset_response( $id );
}

/**
 * WP-Cron handler for `vpress_refresh_sources` (hourly): refreshes up to
 * `vpress_refresh_batch_size` (10) due live sources, oldest first, skipping
 * any whose lock is held. Errors are recorded per dataset.
 *
 * @return array { refreshed: int[], failed: int[], skipped: int[] } (ids).
 */
function vpress_refresh_due_sources(): array {
	global $wpdb;
	$batch   = max( 1, (int) apply_filters( 'vpress_refresh_batch_size', 10 ) );
	$now     = strtotime( current_time( 'mysql', true ) . ' UTC' );
	$summary = array(
		'refreshed' => array(),
		'failed'    => array(),
		'skipped'   => array(),
	);

	$candidates = $wpdb->get_results(
		"SELECT * FROM {$wpdb->prefix}vpresscore_datasets WHERE source_type IN ('url','gsheet') AND refresh_interval <> 'none' ORDER BY last_refreshed_at ASC"
	);
	foreach ( (array) $candidates as $dataset ) {
		if ( count( $summary['refreshed'] ) + count( $summary['failed'] ) >= $batch ) {
			break;
		}
		if ( ! vpress_source_is_due( (string) $dataset->refresh_interval, $dataset->last_refreshed_at, $now ) ) {
			continue;
		}
		$id = (int) $dataset->id;
		if ( ! vpress_source_lock( $id ) ) {
			$summary['skipped'][] = $id;
			continue;
		}
		try {
			$result = vpress_source_refresh( $dataset );
		} finally {
			vpress_source_unlock( $id );
		}
		$summary[ is_wp_error( $result ) ? 'failed' : 'refreshed' ][] = $id;
	}
	return $summary;
}
