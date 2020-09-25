<?php

function query_chart_data($request) {
  $body = $request->get_json_params();
  if ( empty($body['dataset']) ) {
    return new WP_Error( 'missing_field', 'Missing field', array( 'status' => 404 ) );
  } else if (
    ( !empty($body['aggregate']) && empty($body['aggregate_column']) ) || 
    ( empty($body['aggregate']) && !empty($body['aggregate_column']) )
  ) {
    return new WP_Error( 'missing_field', 'Missing field', array( 'status' => 404 ) );
  }

  $dataset = $body['dataset'];
  $column_head = $body['column_head'];
  $column_2 = $body['column_2'];
  $column_3 = $body['column_3'];
  $aggregate_head = $body['aggregate_head'];
  $aggregate_column_head = $body['aggregate_column_head'];
  $aggregate_2 = $body['aggregate_2'];
  $aggregate_column_2 = $body['aggregate_column_2'];
  $aggregate_3 = $body['aggregate_3'];
  $aggregate_column_3 = $body['aggregate_column_3'];
  $linear_column_head = $body['linear_column_head'];
  $linear_column_2 = $body['linear_column_2'];
  $linear_column_3 = $body['linear_column_3'];
  $linear_column_4 = $body['linear_column_4'];
  $function_operation_head = $body['function_operation_head'];
  $function_alias_head = $body['function_alias_head'];
  $function_operation_2 = $body['function_operation_2'];
  $function_alias_2 = $body['function_alias_2'];

  $where = $body['where'];
  $order_by = $body['order_by'];
  $limit = $body['limit'];


  
  $query_select = "SELECT ";
  $query_from = " FROM " . trim($dataset) . " as f1";
  $query_where = "";
  $query_group_by = "";
  $query_order_by = (empty($order_by) ? "" : "ORDER BY ". $order_by);
  $query_limit = (empty($limit) ? "" : "LIMIT ".$limit);

  if (!empty($column_head)) {
    $query_select .= "f1.$column_head";
    $query_group_by .= "GROUP BY f1.$column_head";
  }
  if (!empty($column_2)) {
    $query_select .= ", f1.$column_2";
    $query_group_by .= ", f1.$column_2";
  }
  if (!empty($column_3)) {
    $query_select .= ", f1.$column_3";
    $query_group_by .= ", f1.$column_3";
  }


  if (!empty($aggregate_head) && !empty($aggregate_column_head)) {
    $query_select .= " $aggregate_head($aggregate_column_head) AS $aggregate_column_head";
  }
  if (!empty($aggregate_2) && !empty($aggregate_column_2)) {
    $query_select .= ", $aggregate_2($aggregate_column_2) AS $aggregate_column_2";
  }
  if (!empty($aggregate_3) && !empty($aggregate_column_3)) {
    $query_select .= ", $aggregate_3($aggregate_column_3) as $aggregate_column_3";
  }
  if (!empty($aggregate_4) && !empty($aggregate_column_4)) {
    $query_select .= ", $aggregate_4($aggregate_column_4) as $aggregate_column_4";
  }
  
  if (!empty($linear_column_head)) {
    $query_select .= "f1.$linear_column_head";
  }
  if (!empty($linear_column_2)) {
    $query_select .= ", f1.$linear_column_2";
  }
  if (!empty($linear_column_3)) {
    $query_select .= ", f1.$linear_column_3";
  }
  if (!empty($linear_column_4)) {
    $query_select .= ", f1.$linear_column_4";
  }

  if (!empty($function_operation_head) && !empty($function_alias_head)) {
    $query_select .= "($function_operation_head) AS $function_alias_head";
  }
  if (!empty($function_operation_2) && !empty($function_alias_2)) {
    $query_select .= " ,($function_operation_2) AS $function_alias_2";
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
  }

  $query = sprintf("%s %s %s %s %s %s", $query_select, $query_from, $query_where, $query_group_by, $query_order_by, $query_limit);

  global $wpdb;
  $data =$wpdb->get_results($wpdb->prepare($query));
  $response = array(
    'query' => $wpdb->last_query,
    'data' => $data,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;

}


function get_data( $request ) {
  $body = $request->get_json_params();
  if ( empty($body['dataset']) || empty($body['chart_type']) ) {
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
  $response = array(
    'query' => $wpdb->last_query,
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
  $table_name = $wpdb->prefix.'vpresscore_charts';

  $query = "SELECT * FROM $table_name WHERE id = $id";

  $data = $wpdb->get_row($query);

  $response = array(
    'data' => $data,
    'query' => $wpdb->last_query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function list_charts( $request ) {
  global $wpdb;
  $page = (int)$request->get_param('page');
  $per_page = (int)$request->get_param('perPage');
  $start_at = $per_page * ($page - 1);
  $table_name = $wpdb->prefix.'vpresscore_charts';

  $query_total = "SELECT COUNT(*) AS total FROM $table_name";
  $query = 
  "SELECT
    created,
    dataset_id,
    description,
    id,
    img_url,
    owner_id,
    permissions,
    updated,
    value
  FROM $table_name
  LIMIT $start_at, $per_page";

  $data = $wpdb->get_results($query);
  $total = $wpdb->get_var($query_total);

  $response = array(
    'data' => $data,
    'query' => $wpdb->last_query,
    'total' => (int)$total,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function create_chart( $request ) {
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

  $response = array(
    'data' => $wpdb->insert_id,
    'query' => $wpdb->last_query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function update_chart( $request ) {
  global $wpdb;
  $table_name = $wpdb->prefix.'vpresscore_charts';
  $id = (int)$request->get_param('id');
  $value = $request->get_param('value');
  $img_url = $request->get_param('img_url');
  $description = $request->get_param('description');
  $permissions = $request->get_param('permissions');

  $query = "UPDATE $table_name SET value = $value, description = $description, permissions = $permissions, img_url = $img_url";

  $data = $wpdb->update( 
    $table_name, 
    array( 
      'value' => $value,
      'img_url' => $img_url,
      'description' => $description,
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

  $response = array(
    'data' => $data,
    'query' => $wpdb->last_query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function delete_chart( $request ) {
  global $wpdb;
  $id = (int)$request->get_param('id');
  $table_name = $wpdb->prefix.'vpresscore_charts';

  $query = "DELETE FROM $table_name WHERE id = $id";

  $data = $wpdb->delete( $table_name, array( 'id' => $id ), array( '%d' ) );

  $response = array(
    'data' => $data,
    'query' => $wpdb->last_query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function image_chart( $request ) {
  $upload_dir = wp_upload_dir();
  $string = $request->get_param('string');
  $filename = $request->get_param('name');
  // $string = str_replace('data:image/svg+xml;base64,', '', $string);
  // $string = str_replace(' ', '+', $string);
  $data = base64_decode($string);
  // $file = $upload_dir['basedir'].'/vpress/datasets/'.$_FILES['file']['name'];
  $fileurl = $upload_dir['baseurl'].'/vpress/datasets/'. $filename . '.png';
  $file = $upload_dir['basedir'].'/vpress/images/'. $filename . '.png';
  $success = file_put_contents($file, file_get_contents($string));
  // $source_img = imagecreatefromstring($data);
  // $rotated_img = imagerotate($source_img, 90, 0); 
  // $file = $upload_dir['basedir'].'/vpress/images/'.rand() . '.png';
  // $imageSave = imagejpeg($rotated_img, $file, 10);
  // imagedestroy($source_img);
  return $fileurl;
}
