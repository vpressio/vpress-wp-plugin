<?php
function get_data( $request ) {
  $body = $request->get_json_params();
  if ( empty($body['dataset']) || empty($body['chart_type']) || empty($body['column_1']) ) {
    return new WP_Error( 'missing_field', 'Missing field', array( 'status' => 404 ) );
  } else if (
    ( !empty($body['aggregate']) && empty($body['aggregate_column']) ) || 
    ( empty($body['aggregate']) && !empty($body['aggregate_column']) )
  ) {
    return new WP_Error( 'missing_field', 'Missing field', array( 'status' => 404 ) );
  } else if (
    ( !empty($body['subquery_column']) && empty($body['subquery_aggregate']) ) || 
    ( empty($body['subquery_column']) && !empty($body['subquery_aggregate']) )
  ) {
    return new WP_Error( 'missing_field', 'Missing field', array( 'status' => 404 ) );
  }

  $dataset = $body['dataset'];
  $chart_type = $body['chart_type'];
  $column_1 = $body['column_1'];
  $column_2 = $body['column_2'];
  $aggregate = $body['aggregate'];
  $aggregate_column = $body['aggregate_column'];
  $subquery_aggregate = $body['subquery_aggregate'];
  $subquery_column = $body['subquery_column'];
  $where = $body['where'];
  $group_by = $body['group_by'];
  $order_by = $body['order_by'];
  $limit = $body['limit'];
  
  $query_select = "SELECT f1." . trim($column_1);
  $query_from = " FROM " . trim($dataset) . " as f1";
  $query_where = "";
  $query_group_by = (empty($group_by) ? "" : "GROUP BY ". $group_by);
  $query_order_by = (empty($order_by) ? "" : "GROUP BY ". $order_by);
  $query_limit = (empty($limit) ? "" : "LIMIT ".$limit);

  if ( !empty($column_2) && empty($subquery_aggregate) ) {
    $query_select .= ", f1.$column_2";
  }

  if ( !empty($aggregate) && !empty($aggregate_column) ) {
    $query_select .= ", $aggregate($aggregate_column) AS total_count";
    $query_group_by = (!empty($query_group_by) ? "" : "GROUP BY f1.$column_1");
    if ( !empty($column_2) ) {
      $query_group_by .= ", f1.$column_2";
    }
  }

  if ( !empty($subquery_aggregate) && !empty($subquery_column) && empty($where) ) {
    $query_from .= ", (SELECT $column_1 AS union_column, $subquery_aggregate(*) AS '$subquery_column' FROM $dataset GROUP BY $subquery_column) AS f2";
    $query_where .= "WHERE f1.$column_1 = f2.union_column";
    $query_select .= ", f2.$subquery_column";
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
  $response = array(
    'query' => $query,
    'data' => $data,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function get_chart_data( $request ) {
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
  
  $response = array(
    'data' => $data,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );

 return $response;
}

function get_chart( $request ) {
  global $wpdb;
  $id = (int)$request->get_param('id');
  $query = "SELECT * FROM vpresscore_chart WHERE id = $id";

  $data = $wpdb->get_results($wpdb->prepare($query));

  $response = array(
    'data' => $data,
    'query' => $query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function list_charts( $request ) {
  global $wpdb;
  $page = (int)$request->get_param('page');
  $per_page = (int)$request->get_param('perPage');
  $start_at = $per_page * ($page - 1);
  $query_total = "SELECT COUNT(*) AS total FROM vpresscore_chart";
  $query = "SELECT * FROM vpresscore_chart LIMIT $start_at, $per_page";

  $data = $wpdb->get_results($wpdb->prepare($query));
  $total = $wpdb->get_results($wpdb->prepare($query_total));

  $response = array(
    'data' => $data,
    'query' => $query,
    'total' => (int)$total[0]->total,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function create_chart( $request ) {
  global $wpdb;
  $table_name = $wpdb->prefix.'vpresscore_charts';
  $dataset_id = (int)$request->get_param('dataset_id');
  $value = "\"" . $request->get_param('value') . "\"";
  $owner_id = (int)$request->get_param('owner_id');
  $description = "\"" . $request->get_param('description') . "\"";
  $permissions = "\"" . $request->get_param('permissions') . "\"";
  $img_url = "\"" . $request->get_param('img_url') . "\"";
  $query = "INSERT INTO $table_name (dataset_id, value, owner_id, description, permissions, img_url) VALUES($dataset_id, $value, $owner_id, $description, $permissions, $img_url)";
  $data = $wpdb->get_results($wpdb->prepare($query));

  $response = array(
    'data' => $data,
    'query' => $query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function update_chart( $request ) {
  global $wpdb;
  $value = $request->get_param('value');
  $description = $request->get_param('description');
  $permissions = $request->get_param('permissions');
  $img_url = $request->get_param('img_url');
  $query = "UPDATE vpresscore_chart SET \
  value = $value, description = $description, permissions = $permissions, img_url = $img_url";

  $data = $wpdb->get_results($wpdb->prepare($query));

  $response = array(
    'data' => $data,
    'query' => $query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function delete_chart( $request ) {
  global $wpdb;
  $id = (int)$request->get_param('id');
  $query = "DELETE FROM vpresscore_chart WHERE id = $id";

  $data = $wpdb->get_results($wpdb->prepare($query));

  $response = array(
    'data' => $data,
    'query' => $query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}