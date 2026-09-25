<?php

require_once __DIR__ . '/class-vpress-query-guard.php';
require_once __DIR__ . '/class-vpress-debug-output.php';
require_once __DIR__ . '/class-vpress-query-body.php';

/** Most annotations one chart may carry; the next one is a 400. */
const VPRESS_ANNOTATION_MAX = 20;

/** The annotation shapes the renderer knows. */
const VPRESS_ANNOTATION_TYPES = array( 'line', 'point', 'range', 'text' );

/** Axes a `line` or a `range` may be pinned to. */
const VPRESS_ANNOTATION_AXES = array( 'x', 'y' );

/**
 * Named colour tokens an annotation may ask for.
 *
 * Deliberately not a raw hex: the palette contrast work guarantees a legible
 * annotation against both chart backgrounds, and a hex from a chart author
 * would walk straight past it.
 */
const VPRESS_ANNOTATION_COLORS = array( 'signal', 'muted', 'series' );

/**
 * One data-space position: a number stays a number, a category string is
 * sanitised, anything else is unplaceable.
 *
 * Numeric-looking strings are NOT cast, because the server cannot tell a
 * linear value from an ordinal category whose label happens to be "2026";
 * the renderer coerces on a linear or time scale.
 *
 * @param mixed $value Raw value from the client.
 * @return int|float|string|null Null when the value cannot be placed.
 */
function vpress_sanitize_annotation_value( $value ) {
	if ( is_int( $value ) ) {
		return (int) $value;
	}
	if ( is_float( $value ) ) {
		return (float) $value;
	}
	if ( is_string( $value ) ) {
		$clean = sanitize_text_field( $value );
		return '' === $clean ? null : $clean;
	}
	return null;
}

/**
 * The position keys one annotation type needs, in the order they are stored.
 *
 * @param string $type Annotation type.
 * @return string[]
 */
function vpress_annotation_position_keys( string $type ): array {
	switch ( $type ) {
		case 'line':
			return array( 'value' );
		case 'range':
			return array( 'from', 'to' );
		default:
			return array( 'x', 'y' );
	}
}

/**
 * Sanitise one annotation, or null when it is malformed.
 *
 * Malformed means unplaceable or unidentifiable: no usable id, an unknown
 * type, a missing axis on a `line`/`range`, or a missing position. Such an
 * entry is dropped rather than failing the whole save, because an editor
 * must never lose a chart to one bad annotation.
 *
 * @param mixed $raw One entry of the annotations array.
 * @return array|null
 */
function vpress_sanitize_annotation( $raw ): ?array {
	if ( ! is_array( $raw ) ) {
		return null;
	}

	$id = isset( $raw['id'] ) && is_string( $raw['id'] ) ? strtolower( trim( $raw['id'] ) ) : '';
	if ( ! preg_match( '/^[a-z0-9_-]{1,32}$/D', $id ) ) {
		return null;
	}

	$type = isset( $raw['type'] ) && is_string( $raw['type'] ) ? strtolower( trim( $raw['type'] ) ) : '';
	if ( ! in_array( $type, VPRESS_ANNOTATION_TYPES, true ) ) {
		return null;
	}

	// Key order is part of the stored shape: id, type, axis, position, label, color.
	$clean = array(
		'id'   => $id,
		'type' => $type,
	);

	if ( 'line' === $type || 'range' === $type ) {
		$axis = isset( $raw['axis'] ) && is_string( $raw['axis'] ) ? strtolower( trim( $raw['axis'] ) ) : '';
		if ( ! in_array( $axis, VPRESS_ANNOTATION_AXES, true ) ) {
			return null;
		}
		$clean['axis'] = $axis;
	}

	foreach ( vpress_annotation_position_keys( $type ) as $key ) {
		$value = vpress_sanitize_annotation_value( $raw[ $key ] ?? null );
		if ( null === $value ) {
			return null;
		}
		$clean[ $key ] = $value;
	}

	$label = isset( $raw['label'] ) ? sanitize_text_field( (string) $raw['label'] ) : '';
	if ( '' !== $label ) {
		$clean['label'] = $label;
	}

	$color = isset( $raw['color'] ) && is_string( $raw['color'] ) ? strtolower( trim( $raw['color'] ) ) : '';
	if ( in_array( $color, VPRESS_ANNOTATION_COLORS, true ) ) {
		$clean['color'] = $color;
	}

	return $clean;
}

/**
 * Sanitise the `annotations` array of a chart config.
 *
 * Every annotation carries a stable `id` that a story step references, so a
 * malformed entry is dropped (never renumbered, never silently re-keyed) and
 * a duplicate id keeps the first occurrence. Going over the cap is the one
 * hard failure: silently truncating would drop editorial content the author
 * believes they saved.
 *
 * @param mixed $raw Raw `annotations` value from the client.
 * @return array|WP_Error Sanitised list, or a 400 over the cap.
 */
function vpress_sanitize_annotations( $raw ) {
	if ( ! is_array( $raw ) ) {
		return array();
	}
	if ( count( $raw ) > VPRESS_ANNOTATION_MAX ) {
		return new WP_Error(
			'vpress_too_many_annotations',
			sprintf(
				/* translators: %s: maximum number of annotations per chart. */
				__( 'A chart may carry at most %s annotations.', 'vpress' ),
				number_format_i18n( VPRESS_ANNOTATION_MAX )
			),
			array( 'status' => 400 )
		);
	}

	$clean = array();
	$seen  = array();
	foreach ( $raw as $entry ) {
		$annotation = vpress_sanitize_annotation( $entry );
		if ( null === $annotation || isset( $seen[ $annotation['id'] ] ) ) {
			continue;
		}
		$seen[ $annotation['id'] ] = true;
		$clean[]                   = $annotation;
	}
	return $clean;
}

/** Config key holding the highest annotation id number ever issued. */
const VPRESS_ANNOTATION_SEQ = 'annotationSeq';

/**
 * The chart's annotation counter: the highest `a{n}` id ever issued.
 *
 * Two properties make it worth storing rather than deriving on the fly:
 *
 * - It is **never decremented.** Deleting an annotation leaves it alone, so
 *   the next one added cannot take the deleted id. A story step still holding
 *   that id would otherwise rebind to different content with no error
 *   anywhere — the exact failure a stable id exists to prevent.
 * - It is **never trusted below the truth.** A config hand-edited in the
 *   database, tampered with over REST, or saved before this key existed is
 *   floored up to the highest id actually present, so it heals upward instead
 *   of handing out an id that is already in use.
 *
 * @param array $annotations Sanitised annotations.
 * @param mixed $raw         The counter as the client sent it, if any.
 * @return int
 */
function vpress_annotation_seq( array $annotations, $raw ): int {
	$highest = 0;
	foreach ( $annotations as $annotation ) {
		if ( preg_match( '/^a(\d+)$/D', (string) ( $annotation['id'] ?? '' ), $matches ) ) {
			$highest = max( $highest, (int) $matches[1] );
		}
	}
	$declared = is_numeric( $raw ) ? (int) $raw : 0;
	return max( $highest, $declared );
}

/**
 * The annotation counter a stored chart `value` implies.
 *
 * The server cannot see what the client deleted, so on an update it floors the
 * incoming counter against the row already on disk. Without this, a client
 * that is not the editor — a direct REST call, or a chart saved before the
 * counter existed — could delete the highest annotation and have the next add
 * reissue its id.
 *
 * @param mixed $value A stored chart config as JSON, or anything else.
 * @return int 0 when there is nothing to read.
 */
function vpress_annotation_seq_from_value( $value ): int {
	$config = is_string( $value ) ? json_decode( $value, true ) : null;
	if ( ! is_array( $config ) ) {
		return 0;
	}
	$annotations = is_array( $config['annotations'] ?? null ) ? $config['annotations'] : array();
	return vpress_annotation_seq( $annotations, $config[ VPRESS_ANNOTATION_SEQ ] ?? null );
}

/**
 * The chart `value` a write route should store: unchanged unless it carries
 * an `annotations` key, in which case that key is sanitised in place.
 *
 * A chart without annotations is stored byte-for-byte as the client sent it,
 * so this can never reformat a config it does not understand.
 *
 * @param mixed $value Raw `value` param (the config as a JSON string).
 * @param int   $seq_floor Lowest the annotation counter may be — on an update,
 *                         what the row on disk already implies.
 * @return mixed|WP_Error The value to store.
 */
function vpress_sanitize_chart_value( $value, int $seq_floor = 0 ) {
	if ( ! is_string( $value ) ) {
		return $value;
	}
	$config = json_decode( $value, true );
	$carries = is_array( $config )
		&& ( array_key_exists( 'annotations', $config ) || array_key_exists( VPRESS_ANNOTATION_SEQ, $config ) );
	if ( ! $carries ) {
		return $value;
	}

	$annotations = vpress_sanitize_annotations( $config['annotations'] ?? array() );
	if ( is_wp_error( $annotations ) ) {
		return $annotations;
	}
	$config['annotations'] = $annotations;
	// The counter is part of the model, not a client hint: it is stored so that
	// a later session issues ids above every one ever used, rather than above
	// the ones that happen to have survived.
	$config[ VPRESS_ANNOTATION_SEQ ] = max(
		$seq_floor,
		vpress_annotation_seq( $annotations, $config[ VPRESS_ANNOTATION_SEQ ] ?? null )
	);

	// Match what the admin's JSON.stringify() produces, so re-encoding an
	// annotated config does not silently rewrite the whole row: escaped
	// unicode would still decode correctly, but `lower(value) LIKE` in
	// /chart/list searches these bytes, so "México" would stop matching.
	$encoded = wp_json_encode( $config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
	return false === $encoded ? $value : $encoded;
}

/**
 * Single error shape for rejected chart query input.
 */
function vpress_chart_sql_error( string $code, string $message ): WP_Error {
	return new WP_Error( $code, $message, array( 'status' => 400 ) );
}

/**
 * A column reference the admin sent (optionally backtick-quoted), accepted
 * only when it is a real column of the dataset table.
 *
 * @return string|WP_Error Backtick-quoted column.
 */
function vpress_chart_sql_column( $name, array $allowed_columns ) {
	if ( is_string( $name ) ) {
		$bare = vpress_guard_unquote( $name );
		if ( vpress_guard_identifier( $bare ) && in_array( $bare, $allowed_columns, true ) ) {
			return '`' . $bare . '`';
		}
	}
	return vpress_chart_sql_error( 'vpress_bad_column', __( 'Unknown column.', 'vpress' ) );
}

/**
 * A function_operation_* expression: COUNT(*) or MIN/MAX/AVG/SUM of one column.
 *
 * @return string|WP_Error
 */
function vpress_chart_sql_function( $operation, array $allowed_columns ) {
	$operation = is_string( $operation ) ? trim( $operation ) : '';
	if ( preg_match( '/^COUNT\(\s*\*\s*\)$/iD', $operation ) ) {
		return 'COUNT(*)';
	}
	if ( preg_match( '/^(MIN|MAX|AVG|SUM)\(\s*([^()]+?)\s*\)$/iD', $operation, $m ) ) {
		$column = vpress_chart_sql_column( $m[2], $allowed_columns );
		if ( is_wp_error( $column ) ) {
			return $column;
		}
		return strtoupper( $m[1] ) . "($column)";
	}
	return vpress_chart_sql_error( 'vpress_bad_function', __( 'Unsupported function operation.', 'vpress' ) );
}

/**
 * One where[] clause as SQL with %s placeholders; values go to $args.
 *
 * @return string|WP_Error
 */
function vpress_chart_sql_filter( $clause, array $allowed_columns, array &$args ) {
	$bad = vpress_chart_sql_error( 'vpress_bad_filter', __( 'Invalid filter.', 'vpress' ) );
	if ( ! is_array( $clause ) || ! is_string( $clause['op'] ?? null ) ) {
		return $bad;
	}
	$column = vpress_chart_sql_column( $clause['column'] ?? null, $allowed_columns );
	if ( is_wp_error( $column ) ) {
		return $column;
	}
	$value = $clause['value'] ?? null;
	$op    = strtoupper( $clause['op'] );

	if ( 'EQ' === $op ) {
		if ( ! is_scalar( $value ) ) {
			return $bad;
		}
		$args[] = (string) $value;
		return "$column = %s";
	}
	if ( ! is_array( $value ) || count( $value ) !== count( array_filter( $value, 'is_scalar' ) ) ) {
		return $bad;
	}
	$value = array_map( 'strval', array_values( $value ) );
	if ( 'BETWEEN' === $op ) {
		if ( 2 !== count( $value ) ) {
			return $bad;
		}
		array_push( $args, $value[0], $value[1] );
		return "$column BETWEEN %s AND %s";
	}
	if ( 'IN' === $op ) {
		// The legacy builder rendered an empty list as IN ('').
		$value = $value ? $value : array( '' );
		array_push( $args, ...$value );
		return "$column IN (" . implode( ', ', array_fill( 0, count( $value ), '%s' ) ) . ')';
	}
	return $bad;
}

/**
 * Builds the /chart/query SQL from the flat query body the admin's
 * queryBody() sends (column_*, aggregate_*, linear_column_*,
 * function_operation_*, where[], order_by, limit). Same query shape as the
 * pre-hardening builder, but every identifier must be a real column (or a
 * select alias, for ORDER BY), every function is whitelisted, and every
 * filter value is bound through $wpdb->prepare().
 *
 * @param array $body            Flat query body; 'dataset' is the physical table.
 * @param array $allowed_columns Real column names of that table.
 * @param wpdb  $wpdb            Used only for prepare().
 * @return string|WP_Error
 */
function vpress_build_chart_sql( array $body, array $allowed_columns, $wpdb ) {
	$table = vpress_guard_unquote( is_string( $body['dataset'] ?? null ) ? $body['dataset'] : '' );
	if ( ! vpress_guard_identifier( $table ) ) {
		return vpress_chart_sql_error( 'vpress_unknown_dataset', __( 'Unknown dataset.', 'vpress' ) );
	}

	$select   = array();
	$group_by = array();
	$aliases  = array();

	foreach ( array( 'column_head', 'column_2', 'column_3', 'column_4' ) as $key ) {
		if ( empty( $body[ $key ] ) ) {
			continue;
		}
		$column = vpress_chart_sql_column( $body[ $key ], $allowed_columns );
		if ( is_wp_error( $column ) ) {
			return $column;
		}
		$select[]   = "f1.$column";
		$group_by[] = "f1.$column";
	}

	foreach ( array( 'head', '2', '3' ) as $n ) {
		if ( empty( $body[ "aggregate_$n" ] ) || empty( $body[ "aggregate_column_$n" ] ) ) {
			continue;
		}
		$func = vpress_guard_aggregate( is_string( $body[ "aggregate_$n" ] ) ? $body[ "aggregate_$n" ] : 'invalid' );
		if ( is_wp_error( $func ) ) {
			return $func;
		}
		$column = vpress_chart_sql_column( $body[ "aggregate_column_$n" ], $allowed_columns );
		if ( is_wp_error( $column ) ) {
			return $column;
		}
		$aliases[] = vpress_guard_unquote( $column );
		$select[]  = ( 'total_count' === $func ? 'COUNT(*)' : strtoupper( $func ) . "($column)" ) . " AS $column";
	}

	foreach ( array( 'head', '2', '3', '4' ) as $n ) {
		if ( empty( $body[ "linear_column_$n" ] ) ) {
			continue;
		}
		$column = vpress_chart_sql_column( $body[ "linear_column_$n" ], $allowed_columns );
		if ( is_wp_error( $column ) ) {
			return $column;
		}
		$select[] = "f1.$column";
	}

	foreach ( array( 'head', '2' ) as $n ) {
		if ( empty( $body[ "function_operation_$n" ] ) || empty( $body[ "function_alias_$n" ] ) ) {
			continue;
		}
		$alias = $body[ "function_alias_$n" ];
		if ( ! is_string( $alias ) || ! vpress_guard_identifier( $alias ) ) {
			return vpress_chart_sql_error( 'vpress_bad_alias', __( 'Invalid column alias.', 'vpress' ) );
		}
		$function = vpress_chart_sql_function( $body[ "function_operation_$n" ], $allowed_columns );
		if ( is_wp_error( $function ) ) {
			return $function;
		}
		$aliases[] = $alias;
		$select[]  = "($function) AS `$alias`";
	}

	if ( empty( $select ) ) {
		return vpress_chart_sql_error( 'vpress_empty_query', __( 'Nothing to select.', 'vpress' ) );
	}

	$args  = array();
	$where = array();
	if ( ! empty( $body['where'] ) ) {
		if ( ! is_array( $body['where'] ) ) {
			return vpress_chart_sql_error( 'vpress_bad_filter', __( 'Invalid filter.', 'vpress' ) );
		}
		foreach ( $body['where'] as $clause ) {
			$filter = vpress_chart_sql_filter( $clause, $allowed_columns, $args );
			if ( is_wp_error( $filter ) ) {
				return $filter;
			}
			$where[] = $filter;
		}
	}

	$order_by = '';
	if ( ! empty( $body['order_by'] ) ) {
		if ( ! is_string( $body['order_by'] ) || ! preg_match( '/^\s*(`?)([A-Za-z0-9_]{1,64})\1\s+(ASC|DESC)\s*$/iD', $body['order_by'], $m ) ) {
			return vpress_chart_sql_error( 'vpress_bad_order', __( 'Invalid sort order.', 'vpress' ) );
		}
		$order_column = vpress_chart_sql_column( $m[2], array_merge( $allowed_columns, $aliases ) );
		if ( is_wp_error( $order_column ) ) {
			return $order_column;
		}
		$order_by = "$order_column " . strtoupper( $m[3] );
	}

	$limit = null;
	if ( ! empty( $body['limit'] ) ) {
		if ( ! is_scalar( $body['limit'] ) ) {
			return vpress_chart_sql_error( 'vpress_bad_limit', __( 'Invalid limit.', 'vpress' ) );
		}
		$limit = max( 1, min( 5000, (int) $body['limit'] ) );
	}

	$sql = 'SELECT ' . implode( ',', $select ) . " FROM `$table` as f1";
	if ( $where ) {
		$sql .= ' WHERE ' . implode( ' AND ', $where );
	}
	if ( $group_by ) {
		$sql .= ' GROUP BY ' . implode( ',', $group_by );
	}
	if ( '' !== $order_by ) {
		$sql .= " ORDER BY $order_by";
	}
	if ( null !== $limit ) {
		$sql .= " LIMIT $limit";
	}

	return $args ? $wpdb->prepare( $sql, $args ) : $sql;
}

/**
 * Decides which flat query body /chart/query runs. Editors (edit_posts) send
 * it themselves. Anyone else must name a public chart by integer `chart_id`;
 * its SAVED config is used and any client-supplied dataset/context ignored.
 * Either way the dataset is resolved through the registry guard.
 *
 * @return array|WP_Error Flat body whose 'dataset' is the quoted physical table.
 */
function vpress_resolve_chart_query( array $body, bool $can_edit ) {
	global $wpdb;

	if ( ! $can_edit ) {
		$chart_id = $body['chart_id'] ?? null;
		if ( ! ( is_int( $chart_id ) || ( is_string( $chart_id ) && ctype_digit( $chart_id ) ) ) || (int) $chart_id < 1 ) {
			return new WP_Error( 'vpress_missing_chart_id', __( 'A chart_id is required.', 'vpress' ), array( 'status' => 400 ) );
		}
		$chart = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}vpresscore_charts WHERE id = %d", (int) $chart_id ) );
		if ( ! $chart ) {
			return new WP_Error( 'vpress_chart_not_found', __( 'Chart not found.', 'vpress' ), array( 'status' => 404 ) );
		}
		if ( 'public' !== $chart->permissions ) {
			return new WP_Error( 'vpress_forbidden', __( 'This chart is private.', 'vpress' ), array( 'status' => 403 ) );
		}
		$dataset = $wpdb->get_row( $wpdb->prepare( "SELECT slug, source FROM {$wpdb->prefix}vpresscore_datasets WHERE id = %d", (int) $chart->dataset_id ) );
		if ( ! $dataset ) {
			return new WP_Error( 'vpress_dataset_not_found', __( 'Dataset not found.', 'vpress' ), array( 'status' => 404 ) );
		}
		$context = json_decode( (string) $chart->value, true );
		if ( ! is_array( $context ) ) {
			return new WP_Error( 'vpress_invalid_chart', __( 'Invalid chart configuration.', 'vpress' ), array( 'status' => 400 ) );
		}
		// The table comes from the loaded dataset row itself, never from a
		// name round-tripped through the body.
		$table = vpress_guard_slug_table( (string) $dataset->slug );
		if ( null === $table ) {
			return vpress_guard_unknown_dataset();
		}
		$body = vpress_query_body_from_context( $context, (string) $dataset->slug, $dataset->source );
		if ( is_wp_error( $body ) ) {
			return $body;
		}
		$body['dataset'] = $table;
		return $body;
	}

	// Editors send the physical table name, as queryBody() builds it.
	$table = vpress_guard_dataset_table( is_string( $body['dataset'] ?? null ) ? $body['dataset'] : '' );
	if ( is_wp_error( $table ) ) {
		return $table;
	}
	$body['dataset'] = $table;
	return $body;
}

function vpress_query_chart_data( $request ) {
	global $wpdb;
	$body = $request->get_json_params();

	$body = vpress_resolve_chart_query( is_array( $body ) ? $body : array(), current_user_can( 'edit_posts' ) );
	if ( is_wp_error( $body ) ) {
		return $body;
	}

	$sql = vpress_build_chart_sql( $body, vpress_guard_columns( $body['dataset'] ), $wpdb );
	if ( is_wp_error( $sql ) ) {
		return $sql;
	}

	$data = $wpdb->get_results( $sql );
	if ( $wpdb->last_error ) {
		return vpress_db_error( $wpdb->last_error );
	}
	return array(
		'query' => vpress_debug_sql( $wpdb->last_query ),
		'data'  => $data,
	);
}

/**
 * The public JSON export of a chart: its saved config, the dataset's
 * provenance and the rows it plots (the same rows as the figure's table).
 *
 * @param int $chart_id Chart id.
 * @return array|WP_Error 404 when the visitor may not see the chart (same
 *                        rule and answer as the figure and the chart page).
 */
function vpress_chart_export_payload( int $chart_id ) {
	$chart = vpress_get_public_chart( $chart_id );
	if ( ! $chart ) {
		return new WP_Error( 'vpress_chart_not_found', __( 'Chart not found.', 'vpress' ), array( 'status' => 404 ) );
	}

	$rows = vpress_figure_rows( $chart );
	if ( is_wp_error( $rows ) ) {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log( sprintf( '[vpress] chart %d export unavailable: %s', $chart_id, $rows->get_error_code() ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		}
		return new WP_Error( 'vpress_export_unavailable', __( 'The chart data could not be exported.', 'vpress' ), array( 'status' => 500 ) );
	}

	$dataset  = vpress_figure_dataset( $chart );
	$field    = static function ( string $name ) use ( $dataset ) {
		$value = vpress_provenance_field( $dataset, $name );
		return '' === $value ? null : $value;
	};

	return array(
		'chart'        => array(
			'id'          => (int) $chart->id,
			'title'       => vpress_figure_title( $chart ),
			'description' => (string) ( $chart->description ?? '' ),
			'value'       => vpress_figure_config( $chart ),
		),
		'dataset'      => array(
			'name'              => $field( 'name' ),
			'source_name'       => $field( 'source_name' ),
			'source_url'        => '' === vpress_provenance_url( $dataset ) ? null : vpress_provenance_url( $dataset ),
			'license'           => $field( 'license' ),
			'retrieved_at'      => $field( 'retrieved_at' ),
			'last_refreshed_at' => $field( 'last_refreshed_at' ),
			'source_type'       => $field( 'source_type' ),
		),
		'rows'         => array_values( $rows ),
		'generated_at' => gmdate( 'Y-m-d\TH:i:s\Z' ),
	);
}

/**
 * GET /chart/{id}/export.json.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function vpress_export_chart( $request ) {
	$chart_id = (int) $request->get_param( 'id' );
	$payload  = vpress_chart_export_payload( $chart_id );
	if ( is_wp_error( $payload ) ) {
		return $payload;
	}
	$response = new WP_REST_Response( $payload, 200 );
	$response->header( 'Content-Disposition', 'inline; filename="vpress-chart-' . $chart_id . '.json"' );
	return $response;
}

/**
 * JSON flags for a REST response: pretty-printed for export.json when
 * $debug, never otherwise; other routes are untouched.
 *
 * @param int    $options JSON flags.
 * @param object $request REST request.
 * @param bool   $debug   Whether WP_DEBUG is on.
 * @return int
 */
function vpress_export_json_flags( int $options, $request, bool $debug ): int {
	$route = is_object( $request ) && method_exists( $request, 'get_route' ) ? (string) $request->get_route() : '';
	if ( ! preg_match( '#^/vpress/v1/chart/\d+/export\.json$#D', $route ) ) {
		return $options;
	}
	return $debug ? ( $options | JSON_PRETTY_PRINT ) : ( $options & ~JSON_PRETTY_PRINT );
}

/**
 * `rest_json_encode_options` filter.
 *
 * @param int             $options JSON flags.
 * @param WP_REST_Request $request Request being served.
 * @return int
 */
function vpress_export_json_encode_options( $options, $request ) {
	return vpress_export_json_flags( (int) $options, $request, defined( 'WP_DEBUG' ) && WP_DEBUG );
}

function vpress_get_chart_data( $request ) {
  try {
    global $wpdb;
    $body = $request->get_json_params();
    $body = is_array( $body ) ? $body : array();

    $table = vpress_guard_dataset_table( is_string( $body['dataset'] ?? null ) ? $body['dataset'] : '' );
    if ( is_wp_error( $table ) ) {
      return $table;
    }
    $allowed = vpress_guard_columns( $table );
    $columns = array();
    foreach ( array( 'column_1', 'column_2', 'column_3' ) as $key ) {
      if ( 'column_3' === $key && empty( $body[ $key ] ) ) {
        continue;
      }
      $column = vpress_chart_sql_column( $body[ $key ] ?? null, $allowed );
      if ( is_wp_error( $column ) ) {
        return $column;
      }
      $columns[] = $column;
    }

    $data = $wpdb->get_results( 'SELECT ' . implode( ', ', $columns ) . " FROM $table" );

    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $data,
    );

   return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}

function vpress_get_chart( $request ) {
  try {
    global $wpdb;
    $id = (int)$request->get_param('id');
    $table_name = $wpdb->prefix.'vpresscore_charts';

    $data = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table_name WHERE id = %d", $id ) );

    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    if ( $data && 'public' !== $data->permissions && ! current_user_can( 'edit_posts' ) ) {
      return new WP_Error( 'vpress_forbidden', __( 'This chart is private.', 'vpress' ), array( 'status' => 403 ) );
    }
    $response = array(
      'data' => $data,
      'query' => vpress_debug_sql( $wpdb->last_query )
    );
    return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}

function vpress_list_charts( $request ) {
  try {
    global $wpdb;
    $q = strtolower((string)$request->get_param('q'));
    $page = (int)$request->get_param('page');
    $per_page = (int)$request->get_param('perPage');
    $start_at = $per_page * ($page - 1);
    $table_name = $wpdb->prefix.'vpresscore_charts';

    $conditions = array();
    $args = array();
    if ( ! current_user_can( 'edit_posts' ) ) {
      $conditions[] = "permissions = 'public'";
    }
    if ($q) {
      $like = '%' . $wpdb->esc_like( $q ) . '%';
      $conditions[] = '(lower(value) LIKE %s OR lower(description) LIKE %s OR lower(tags) LIKE %s)';
      array_push( $args, $like, $like, $like );
    }
    $where = $conditions ? ' WHERE ' . implode( ' AND ', $conditions ) : '';

    $query_total = "SELECT COUNT(*) AS total FROM $table_name$where";
    $query = $wpdb->prepare(
      "SELECT * FROM $table_name$where ORDER BY updated DESC LIMIT %d, %d",
      array_merge( $args, array( $start_at, $per_page ) )
    );
    $total = $wpdb->get_var( $args ? $wpdb->prepare( $query_total, $args ) : $query_total );
    $data = $wpdb->get_results($query);

    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $data,
      'query' => vpress_debug_sql( $wpdb->last_query ),
      'total' => (int)$total
    );
    return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}

function vpress_create_chart( $request ) {
  try {
    global $wpdb;
    $table_name = $wpdb->prefix.'vpresscore_charts';
    $dataset_id = (int)$request->get_param('dataset_id');
    $value = $request->get_param('value');
    // Editorial annotations ride inside the config JSON; sanitise them
    // before the row is written, and refuse a config over the cap.
    $value = vpress_sanitize_chart_value( $value );
    if ( is_wp_error( $value ) ) {
      return $value;
    }
    $owner_id = (int)$request->get_param('owner_id');
    $description = $request->get_param('description');
    $permissions = $request->get_param('permissions');
    $img_url = $request->get_param('img_url');
  
    $query = "INSERT INTO $table_name (dataset_id, value, owner_id, description, permissions, img_url) VALUES($dataset_id, $value, $owner_id, $description, $permissions, $img_url)";
  
    $data = $wpdb->insert( 
      $table_name, 
      array( 
        'dataset_id' => $dataset_id, 
        'value' => $value,
        'owner_id' => $owner_id,
        'description' => $description,
        'permissions' => $permissions,
        'img_url' => $img_url
      ), 
      array( 
        '%s',
        '%s',
        '%s',
        '%s',
        '%s',
        '%s'
      )
    );
  
    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $wpdb->insert_id,
      'query' => vpress_debug_sql( $wpdb->last_query )
    );
    return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}

function vpress_update_chart( $request ) {
  try {
    global $wpdb;
    $table_name = $wpdb->prefix.'vpresscore_charts';
    $id = (int)$request->get_param('id');
    $value = $request->get_param('value');
    // Editorial annotations ride inside the config JSON; sanitise them
    // before the row is written, and refuse a config over the cap. The
    // annotation counter is floored against the row already on disk, so no
    // client can lower it by deleting the annotation that carried it.
    $stored = $wpdb->get_var( $wpdb->prepare( "SELECT value FROM $table_name WHERE id = %d", $id ) );
    $value = vpress_sanitize_chart_value( $value, vpress_annotation_seq_from_value( $stored ) );
    if ( is_wp_error( $value ) ) {
      return $value;
    }
    $tags = $request->get_param('tags');
    $description = $request->get_param('description');
    $permissions = $request->get_param('permissions');
  
    $data = $wpdb->update(
      $table_name, 
      array( 
        'value' => $value,
        'description' => $description,
        'tags' => $tags,
        'permissions' => $permissions
      ), 
      array( 'id' => $id ),
      array( 
        '%s',
        '%s',
        '%s',
        '%s',
      ), 
      array( '%d' )
    );
  
    if($wpdb->last_error){
    return $response;
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $data,
      'query' => vpress_debug_sql( $wpdb->last_query )
    );
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}

function vpress_update_image_url_chart( $request ) {
  try {
    global $wpdb;
    $table_name = $wpdb->prefix.'vpresscore_charts';
    $id = (int)$request->get_param('id');
    $image_url = $request->get_param('image_url');
  
    $data = $wpdb->update( 
      $table_name, 
      array( 
        'img_url' => $image_url
      ), 
      array( 'id' => $id ),
      array( 
        '%s',
      ), 
      array( '%d' )
    );
  
    $response = array(
      'data' => $data,
      'query' => vpress_debug_sql( $wpdb->last_query ),
      'error' => $wpdb->last_error ? vpress_debug_text( $wpdb->last_error ) : false,
    );
    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}

function vpress_delete_chart( $request ) {
  try {
    global $wpdb;
    $id = (int)$request->get_param('id');
    $table_name = $wpdb->prefix.'vpresscore_charts';
  
    $query = "DELETE FROM $table_name WHERE id = $id";
  
    $data = $wpdb->delete( $table_name, array( 'id' => $id ), array( '%d' ) );
  
    $upload_dir = wp_upload_dir();
    $file = $upload_dir['basedir'].'/vpress/images/' . $id . '.png';
    wp_delete_file( $file );
  
    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $data,
      'query' => vpress_debug_sql( $wpdb->last_query ),
      'error' => $wpdb->last_error ? vpress_debug_text( $wpdb->last_error ) : false,
    );
    return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}

/**
 * POST /chart/image: stores the chart's PNG preview as "{chart id}.png".
 *
 * `name` IS the chart id — vpress_delete_chart() removes "{id}.png" — so it
 * is required to be digits only. Unsanitised it was a path segment written
 * into the uploads directory, which let any Author write attacker-controlled
 * bytes anywhere the web user can write.
 */
function vpress_image_chart( $request ) {
  try {
    $upload_dir = wp_upload_dir();
    $base64_img = $request->get_param('string');
    $name = (string) $request->get_param('name');
    if ( ! ctype_digit( $name ) ) {
      return new WP_Error(
        'vpress_bad_image_name',
        __( 'The image name must be a chart id.', 'vpress' ),
        array( 'status' => 400 )
      );
    }
    $filename = $name . '.png';
    $file = $upload_dir['basedir'].'/vpress/images/'. $filename;
    $fileurl = $upload_dir['baseurl'].'/vpress/images/'. $filename;
    $decoded = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $base64_img), true);
    $upload_file = file_put_contents($file, $decoded);
    return $fileurl;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}
