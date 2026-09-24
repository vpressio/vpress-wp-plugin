<?php
/**
 * Identifier and function-name guards for every SQL fragment that cannot
 * be bound as a value (table names, column names, aggregate functions).
 * Plain functions, no hooks.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * True only for a bare SQL identifier: 1-64 ASCII letters, digits or underscores.
 */
function vpress_guard_identifier( string $name ): bool {
	return 1 === preg_match( '/^[A-Za-z0-9_]{1,64}$/D', $name );
}

/**
 * Strips one pair of surrounding backticks (the admin quotes names with spaces).
 */
function vpress_guard_unquote( string $name ): string {
	$name = trim( $name );
	if ( strlen( $name ) >= 2 && '`' === $name[0] && '`' === substr( $name, -1 ) ) {
		return substr( $name, 1, -1 );
	}
	return $name;
}

/**
 * Resolves a dataset reference (registry slug, or physical `vpress_` + slug
 * table name) to its backtick-quoted physical table, provided a registry row
 * exists for the slug.
 *
 * @return string|WP_Error
 */
function vpress_guard_dataset_table( string $dataset ) {
	global $wpdb;
	$dataset    = vpress_guard_unquote( $dataset );
	$candidates = array( $dataset );
	if ( 0 === strpos( $dataset, 'vpress_' ) ) {
		$candidates[] = substr( $dataset, strlen( 'vpress_' ) );
	}

	foreach ( $candidates as $slug ) {
		$table = 'vpress_' . $slug;
		if ( ! vpress_guard_identifier( $slug ) || ! vpress_guard_identifier( $table ) ) {
			continue;
		}
		$exists = $wpdb->get_var(
			$wpdb->prepare( "SELECT 1 FROM {$wpdb->prefix}vpresscore_datasets WHERE slug = %s LIMIT 1", $slug )
		);
		if ( null !== $exists ) {
			return '`' . $table . '`';
		}
	}

	return new WP_Error(
		'vpress_unknown_dataset',
		__( 'Unknown dataset.', 'vpress' ),
		array( 'status' => 400 )
	);
}

/**
 * Real column names of a table (quoted or bare), cached for the request.
 *
 * @return string[]
 */
function vpress_guard_columns( string $table ): array {
	global $wpdb;
	static $cache = array();

	$table = vpress_guard_unquote( $table );
	if ( ! vpress_guard_identifier( $table ) ) {
		return array();
	}
	if ( ! isset( $cache[ $table ] ) ) {
		$cache[ $table ] = array_map( 'strval', (array) $wpdb->get_col( "SHOW COLUMNS FROM `$table`" ) );
	}
	return $cache[ $table ];
}

/**
 * Normalises an aggregate name (either case; the admin's `mean` means avg)
 * to one of '', sum, avg, min, max, count, total_count.
 *
 * @return string|WP_Error
 */
function vpress_guard_aggregate( string $func ) {
	$func = strtolower( trim( $func ) );
	if ( 'mean' === $func ) {
		$func = 'avg';
	}
	if ( in_array( $func, array( '', 'sum', 'avg', 'min', 'max', 'count', 'total_count' ), true ) ) {
		return $func;
	}
	return new WP_Error(
		'vpress_bad_aggregate',
		__( 'Unsupported aggregate function.', 'vpress' ),
		array( 'status' => 400 )
	);
}
