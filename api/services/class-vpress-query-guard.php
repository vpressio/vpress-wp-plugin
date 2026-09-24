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
 * The backtick-quoted physical table (`vpress_` + slug) of a registry slug.
 */
function vpress_guard_slug_table( string $slug ): ?string {
	$table = 'vpress_' . $slug;
	return ( vpress_guard_identifier( $slug ) && vpress_guard_identifier( $table ) ) ? '`' . $table . '`' : null;
}

function vpress_guard_unknown_dataset(): WP_Error {
	return new WP_Error(
		'vpress_unknown_dataset',
		__( 'Unknown dataset.', 'vpress' ),
		array( 'status' => 400 )
	);
}

/**
 * Resolves a registry slug (what /dataset/data and the column ops receive)
 * to its backtick-quoted physical table, provided a registry row exists.
 *
 * @return string|WP_Error
 */
function vpress_guard_dataset_slug( string $slug ) {
	global $wpdb;
	$table = vpress_guard_slug_table( $slug );
	if ( null === $table ) {
		return vpress_guard_unknown_dataset();
	}
	$exists = $wpdb->get_var(
		$wpdb->prepare( "SELECT 1 FROM {$wpdb->prefix}vpresscore_datasets WHERE slug = %s LIMIT 1", $slug )
	);
	return null === $exists ? vpress_guard_unknown_dataset() : $table;
}

/**
 * Resolves a physical table name (what the admin's queryBody() sends as
 * `dataset`): it must start with `vpress_`; that prefix is stripped exactly
 * once and the remaining slug must be in the registry.
 *
 * @return string|WP_Error
 */
function vpress_guard_dataset_table( string $table ) {
	$table = vpress_guard_unquote( $table );
	if ( 0 !== strpos( $table, 'vpress_' ) ) {
		return vpress_guard_unknown_dataset();
	}
	return vpress_guard_dataset_slug( substr( $table, strlen( 'vpress_' ) ) );
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
