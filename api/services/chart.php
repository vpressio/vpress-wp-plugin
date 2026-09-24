<?php

require_once __DIR__ . '/class-vpress-query-guard.php';
require_once __DIR__ . '/class-vpress-debug-output.php';
require_once __DIR__ . '/class-vpress-query-body.php';

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

function vpress_image_chart( $request ) {
  try {
    $upload_dir = wp_upload_dir();
    $base64_img = $request->get_param('string');
    $filename = $request->get_param('name') . '.png';
    $file = $upload_dir['basedir'].'/vpress/images/'. $filename;
    $fileurl = $upload_dir['baseurl'].'/vpress/images/'. $filename;
    $decoded = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $base64_img), true);
    $upload_file = file_put_contents($file, $decoded);
    return $fileurl;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}
