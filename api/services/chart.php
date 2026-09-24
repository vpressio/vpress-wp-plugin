<?php

require_once __DIR__ . '/class-vpress-query-guard.php';
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

function vpress_query_chart_data( $request ) {
	global $wpdb;
	$body = $request->get_json_params();
	$body = is_array( $body ) ? $body : array();

	$table = vpress_guard_dataset_table( is_string( $body['dataset'] ?? null ) ? $body['dataset'] : '' );
	if ( is_wp_error( $table ) ) {
		return $table;
	}
	$body['dataset'] = $table;

	$sql = vpress_build_chart_sql( $body, vpress_guard_columns( $table ), $wpdb );
	if ( is_wp_error( $sql ) ) {
		return $sql;
	}

	$data = $wpdb->get_results( $sql );
	if ( $wpdb->last_error ) {
		return new WP_Error( 'db_error', $wpdb->last_error, array( 'status' => 400 ) );
	}
	return array(
		'query' => $wpdb->last_query,
		'data'  => $data,
	);
}

function vpress_get_data( $request ) {
  try {
    $body = $request->get_json_params();
    if ( empty($body['dataset']) || empty($body['chart_type']) ) {
      throw new Exception( 'missing_field', 'Missing field' );
    } else if (
      ( !empty($body['aggregate']) && empty($body['aggregate_column']) ) || 
      ( empty($body['aggregate']) && !empty($body['aggregate_column']) )
    ) {
      throw new Exception( 'missing_field', 'Missing field' );
    } else if (
      ( !empty($body['subquery_column']) && empty($body['subquery_aggregate']) ) || 
      ( empty($body['subquery_column']) && !empty($body['subquery_aggregate']) )
    ) {
      throw new Exception( 'missing_field', 'Missing field' );
    }
  
    $dataset = $body['dataset'];
    $chart_type = $body['chart_type'];
    $column_1 = $body['column_1'];
    $column_2 = $body['column_2'];
    $aggregate = $body['aggregate'];
    $aggregate_column = $body['aggregate_column'];
    $subquery_aggregate = $body['subquery_aggregate'];
    $subquery_column = $body['subquery_column'];
    $subquery_column = $body['subquery_column'];
    $subquery_column_alias = $body['subquery_column_alias'];
    $subquery_aggregate_2 = $body['subquery_aggregate_2'];
    $subquery_column_2 = $body['subquery_column_2'];
    $subquery_column_alias_2 = $body['subquery_column_alias_2'];
    $where = $body['where'];
    $group_by = $body['group_by'];
    $order_by = $body['order_by'];
    $limit = $body['limit'];
    
    $query_select = "SELECT f1." . trim($column_1);
    $query_from = " FROM " . trim($dataset) . " as f1";
    $query_where = "";
    $query_group_by = (empty($group_by) ? "" : "GROUP BY ". $group_by);
    $query_order_by = (empty($order_by) ? "" : "ORDER BY ". $order_by);
    $query_limit = (empty($limit) ? "" : "LIMIT ".$limit);
  
    if (!empty($column_2)) {
      $query_select .= ", f1.$column_2";
    }
  
    if ( !empty($aggregate) && !empty($aggregate_column) ) {
      $columnAlias = ($aggregate_column == '*' ? 'total_count' : $aggregate_column);
      $query_select .= ", $aggregate($aggregate_column) AS $columnAlias";
      $query_group_by = (empty($query_group_by) ? "" : "GROUP BY f1.$column_1");
      if ( !empty($column_2) ) {
        $query_group_by .= ", f1.$column_2";
      }
    }
  
    if ( !empty($subquery_aggregate) && !empty($subquery_column) ) {
      $union_column = (empty($column_2) ? $column_1 : $column_2);
      $query_from .= ", (SELECT $union_column AS union_column, $subquery_aggregate($subquery_column) AS $subquery_column FROM $dataset GROUP BY union_column) AS f2";
      $query_where .= "WHERE f1.$union_column = f2.union_column";
      $query_select .= ", f2.$subquery_column";
    }
  
    if(!empty($subquery_aggregate_2) && !empty($subquery_column_2) ) {
      if(!empty($column_1)) {
        $query_select = "SELECT f1.$column_1 ,f2.$subquery_column, f3.$subquery_column_2";
        $query_from = "FROM $dataset AS f1,
        (SELECT
          $column_1,
          $subquery_aggregate($subquery_column) AS $subquery_column
        FROM $dataset
        GROUP BY $column_1) AS f2, 
        (SELECT
          $column_1,
          $subquery_aggregate_2($subquery_column_2) AS $subquery_column_2
        FROM $dataset
        GROUP BY $column_1) AS f3";
        $query_where = "WHERE f1.$column_1 = f2.$column_1 AND f1.$column_1 = f3.$column_1";
      } else {
        $alias = "";
        $alias_2 = "";
        if(!empty($subquery_column_alias) && !empty($subquery_column_alias_2)) {
          $alias = "AS $subquery_column_alias";
          $alias_2 = "AS $subquery_column_alias_2";
        }
        $query_select = "SELECT f1.$subquery_column $alias, f2.$subquery_column_2 $alias_2";
        $query_from = "FROM
        (SELECT
          $subquery_aggregate($subquery_column) AS $subquery_column
        FROM $dataset) AS f1, 
        (SELECT
          $subquery_aggregate_2($subquery_column_2) AS $subquery_column_2
        FROM $dataset) AS f2";
        $query_where = null;
      }
    }
    
    if ( !empty($where) ) {
      $where_array = [];
      foreach ($where as &$value) {
        if ( $value['op'] == 'IN' ) {
          array_push($where_array, $value["column"] . " IN (" . "'" . implode ( "', '", $value["value"] ) . "'" . ")");
        } elseif ( $value['op'] == 'EQ' ) {
          array_push($where_array, $value['column'] . " = '" . $value["value"] . "'");
        } elseif ( $value['op'] == 'BETWEEN' ) {
          array_push($where_array, $value['column'] . " BETWEEN '" . $value["value"][0] . "' AND '" . $value["value"][1] . "'");
        }
      }
      $query_where = "WHERE " . implode(" AND ", $where_array);
    }
  
    if ( 
      empty($aggregate) &&
      empty($aggregate_column) &&
      empty($subquery_aggregate) &&
      empty($subquery_column) &&
      empty($column_2) &&
      empty($query_group_by)
    ) {
      // Todo: Validate if both axis are selected
      $query_limit = " LIMIT 10";
    }
  
    $query = sprintf("%s %s %s %s %s %s", $query_select, $query_from, $query_where, $query_group_by, $query_order_by, $query_limit);
  
    global $wpdb;
    $data =$wpdb->get_results($wpdb->prepare($query));
    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'query' => $wpdb->last_query,
      'data' => $data
    );
    return $response;
  } catch (Exception $e) {
    return new WP_Error(
      'db_error',
      $e,
      array( 'status' => 400 )
    );
  }
}

function vpress_get_chart_data( $request ) {
  try {
    $body = $request->get_json_params();
    $column_1 = $body['column_1'];
    $column_2 = $body['column_2'];
    $column_3 = $body['column_3'];
    $dataset = $body['dataset'];
    
    $query3col = 
    "SELECT $column_1 , $column_2 , $column_3 FROM vpress_$dataset";
  
    $query2col =
    "SELECT $column_1 , $column_2 FROM $dataset ";
  
    if($column_3 != '') {
      $query = $query3col;
    } else {
      $query = $query2col;
    }
    global $wpdb;
    
    $data =$wpdb->get_results($wpdb->prepare($query));
    
    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $data,
    );
  
   return $response;
  } catch (Exception $e) {
    return new WP_Error(
      'db_error',
      $e,
      array( 'status' => 400 )
    );
  }
}

function vpress_get_chart( $request ) {
  try {
    global $wpdb;
    $id = (int)$request->get_param('id');
    $table_name = $wpdb->prefix.'vpresscore_charts';
  
    $query = "SELECT * FROM $table_name WHERE id = $id";
  
    $data = $wpdb->get_row($query);
    
    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $data,
      'query' => $wpdb->last_query
    );
    return $response;
  } catch (Exception $e) {
    return new WP_Error(
      'db_error',
      $e,
      array( 'status' => 400 )
    );
  }
}

function vpress_list_charts( $request ) {
  try {
    global $wpdb;
    $q = strtolower($request->get_param('q'));
    $page = (int)$request->get_param('page');
    $per_page = (int)$request->get_param('perPage');
    $start_at = $per_page * ($page - 1);
    $table_name = $wpdb->prefix.'vpresscore_charts';
  
    $query_total = "SELECT COUNT(*) AS total FROM $table_name";
    $query = "SELECT * FROM $table_name";
    
    if ($q) {
      $where .= " WHERE lower(value) like '%$q%' OR lower(description) like '%$q%' OR lower(tags) like '%$q%'";
      $query_total .= $where;
      $query .= $where;
    }
    $query .= " ORDER BY updated DESC";
    $query .= " LIMIT $start_at, $per_page";
    $total = $wpdb->get_var($query_total);
    $data = $wpdb->get_results($query);
  
    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $data,
      'query' => $wpdb->last_query,
      'total' => (int)$total
    );
    return $response;
  } catch (Exception $e) {
    return new WP_Error(
      'db_error',
      $e,
      array( 'status' => 400 )
    );
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
      'query' => $wpdb->last_query
    );
    return $response;
  } catch (Exception $e) {
    return new WP_Error(
      'db_error',
      $e,
      array( 'status' => 400 )
    );
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
      'query' => $wpdb->last_query
    );
  } catch (Exception $e) {
    return new WP_Error(
      'db_error',
      $e,
      array( 'status' => 400 )
    );
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
      'query' => $wpdb->last_query,
      'error' => $wpdb->last_error ? $wpdb->last_error : false,
    );
    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
  } catch (Exception $e) {
    return new WP_Error(
      'db_error',
      $e,
      array( 'status' => 400 )
    );
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
      'query' => $wpdb->last_query,
      'error' => $wpdb->last_error ? $wpdb->last_error : false,
    );
    return $response;
  } catch (Exception $e) {
    return new WP_Error(
      'db_error',
      $e,
      array( 'status' => 400 )
    );
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
    return new WP_Error(
      'db_error',
      $e,
      array( 'status' => 400 )
    );
  }
}
