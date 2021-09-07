<?php


function vpress_sql_groupBy_column($body, $key){
  $col = false;
  $column = $body['context'][$key] ? $body['context'][$key]['slug'] : ''; 
  $aggregate = $body['context'][$key] ? $body['context'][$key]['func'] : ''; 

  if($column !== 'total_count' && !$aggregate){
    $col = "f1.$column";
  }
  return $col;
}

function vpress_sql_groupBy($body){
    $groupBy_columns = [];
    $groupBy = "groupBy";

    $xAxis = vpress_sql_groupBy_column($body, 'xAxis');
    $xAxis ? array_push($groupBy_columns, $xAxis): false; 

    $yAxis = vpress_sql_groupBy_column($body, 'yAxis');
    $yAxis ? array_push($groupBy_columns, $yAxis): false; 

    $groupBy = vpress_sql_groupBy_column($body, 'groupBy');
    $groupBy ? array_push($groupBy_columns, $groupBy): false;
    
    //@TODO SEPARATE LOGIC
    $getFilters = vpress_sql_groupBy_column($body, 'getFilters');
    $getFilters ? array_push($groupBy_columns, $getFilters): false;
  
    $groupBy .= ' ' . implode(",", $groupBy_columns); 
    return $groupBy;
}

function vpress_sql_where($body){
  $where = ''; 
  $where_array = [];

  if ( !empty($body['context']['filters']) ) {
    
    foreach ($body['context']['filters'] as $value) {

      if( $value['type'] !== 'ordinal' & count($value['value']) == 2){
        array_push($where_array, $value['slug'] . " BETWEEN '" . $value["value"][0] . "' AND '" . $value["value"][1] . "'");
      }else{
        array_push($where_array, $value["slug"] . " IN (" . "'" . implode ( "', '", $value["value"] ) . "'" . ")");
      }
    }
    $where = "WHERE " . implode(" AND ", $where_array);
  }

  return $where;
}


function vpress_sql_from($body){
  return " FROM " . trim($body['dataset']) . " as f1";
}

function vpress_sql_select_column($body, $key){
  $col = false;
  $column = $body['context'][$key] ? $body['context'][$key]['slug'] : ''; 
  $aggregate = $body['context'][$key] ? $body['context'][$key]['func'] : ''; 

  if($column){
    if($column == 'total_count'){
      $col = "COUNT(*) as total_count";
    } else if($aggregate){
      $col = "$aggregate(f1.$column) as $column";
    } else{
      $col = "f1.$column";
    }
  }
  return $col;
}

function vpress_sql_select($body){
    $select_columns = [];
    $select = "SELECT";

    $xAxis = vpress_sql_select_column($body, 'xAxis');
    $xAxis ? array_push($select_columns, $xAxis): false; 

    $yAxis = vpress_sql_select_column($body, 'yAxis');
    $yAxis ? array_push($select_columns, $yAxis): false; 

    $groupBy = vpress_sql_select_column($body, 'groupBy');
    $groupBy ? array_push($select_columns, $groupBy): false;
    
    //@TODO SEPARATE LOGIC
    $getFilters = vpress_sql_select_column($body, 'getFilters');
    $getFilters ? array_push($select_columns, $getFilters): false;
  
    $select .= ' ' . implode(",", $select_columns); 
    return $select;
}


function vpress_sql($body){
  $select = vpress_sql_select($body);
  $from = vpress_sql_from($body); 
  $where = vpress_sql_where($body); 
  $groupBy = vpress_sql_groupBy($body); 

  return "$select $from $where $groupBy";
}

function vpress_query_chart_data($request) {
  try {
    $body = $request->get_json_params();

    # $query = vpress_sql($body);
    
    if (empty($body['dataset'])) {
      throw new Exception( 'missing_field', 'Missing field');
    } else if (
      ( !empty($body['aggregate']) && empty($body['aggregate_column']) ) || 
      ( empty($body['aggregate']) && !empty($body['aggregate_column']) )
    ) {
      throw new Exception( 'missing_field', 'Missing field');
    }
    $dataset = $body['dataset'] ?? '';
    $column_head = $body['column_head'] ?? '';
    $column_2 = $body['column_2'] ?? '';
    $column_3 = $body['column_3'] ?? '';
    $column_4 = $body['column_4'] ?? '';
    $aggregate_head = $body['aggregate_head'] ?? '';
    $aggregate_column_head = $body['aggregate_column_head'] ?? '';
    $aggregate_2 = $body['aggregate_2'] ?? '';
    $aggregate_column_2 = $body['aggregate_column_2'] ?? '';
    $aggregate_3 = $body['aggregate_3'] ?? '';
    $aggregate_column_3 = $body['aggregate_column_3'] ?? '';
    $linear_column_head = $body['linear_column_head'] ?? '';
    $linear_column_2 = $body['linear_column_2'] ?? '';
    $linear_column_3 = $body['linear_column_3'] ?? '';
    $linear_column_4 = $body['linear_column_4'] ?? '';
    $function_operation_head = $body['function_operation_head'] ?? '';
    $function_alias_head = $body['function_alias_head'] ?? '';
    $function_operation_2 = $body['function_operation_2'] ?? '';
    $function_alias_2 = $body['function_alias_2'] ?? '';
  
    $where = $body['where'] ?? '';
    $order_by = $body['order_by'] ?? '';
    $limit = $body['limit'] ?? '';
  
  
    
    $query_select = "SELECT ";
    $query_select_columns = [];
    $query_from = " FROM " . trim($dataset) . " as f1";
    $query_where = "";
    $query_group_by = "";
    $query_group_by_columns = [];
    $query_order_by = (empty($order_by) ? "" : "ORDER BY ". $order_by);
    $query_limit = (empty($limit) ? "" : "LIMIT ".$limit);
  
    if (!empty($column_head)) {
      array_push($query_select_columns, "f1.$column_head");
      array_push($query_group_by_columns, "f1.$column_head");
    }
    if (!empty($column_2)) {
      array_push($query_select_columns, "f1.$column_2");
      array_push($query_group_by_columns, "f1.$column_2");
    }
    if (!empty($column_3)) {
      array_push($query_select_columns, "f1.$column_3");
      array_push($query_group_by_columns, "f1.$column_3");
    }
    if (!empty($column_4)) {
      array_push($query_select_columns, "f1.$column_4");
      array_push($query_group_by_columns, "f1.$column_4");
    }
  

    if (!empty($aggregate_head) && !empty($aggregate_column_head)) {
      array_push($query_select_columns,"$aggregate_head($aggregate_column_head) AS $aggregate_column_head");
    }
    if (!empty($aggregate_2) && !empty($aggregate_column_2)) {
      array_push($query_select_columns,"$aggregate_2($aggregate_column_2) AS $aggregate_column_2");
    }
    if (!empty($aggregate_3) && !empty($aggregate_column_3)) {
      array_push($query_select_columns,"$aggregate_3($aggregate_column_3) as $aggregate_column_3");
    }
    if (!empty($aggregate_4) && !empty($aggregate_column_4)) {
      array_push($query_select_columns,"$aggregate_4($aggregate_column_4) as $aggregate_column_4");
    }
    
    if (!empty($linear_column_head)) {
      array_push($query_select_columns,"f1.$linear_column_head");
    }
    if (!empty($linear_column_2)) {
      array_push($query_select_columns,"f1.$linear_column_2");
    }
    if (!empty($linear_column_3)) {
      array_push($query_select_columns,"f1.$linear_column_3");
    }
    if (!empty($linear_column_4)) {
      array_push($query_select_columns,"f1.$linear_column_4");
    }
  
    if (!empty($function_operation_head) && !empty($function_alias_head)) {
      array_push($query_select_columns,"($function_operation_head) AS $function_alias_head");
    }
    if (!empty($function_operation_2) && !empty($function_alias_2)) {
      array_push($query_select_columns,"($function_operation_2) AS $function_alias_2");
    }
    
    $query_select .= ' ' . implode(",", $query_select_columns); 
    $group_by = implode(",", $query_group_by_columns);
    $query_group_by = !empty($group_by) ? 'GROUP BY ' . implode(",", $query_group_by_columns) : '';
  
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
  
    // global $wpdb;
    // $data =$wpdb->get_results($wpdb->prepare($query));

    if (!$body['queryUrl']) {
      global $wpdb;
      $data =$wpdb->get_results($wpdb->prepare($query));
    } else { 
      $data_array =  array(
        "query" => $query,
      );
      $get_data = vpress_call_external_api('POST', $body['queryUrl'], json_encode($data_array));
      $data = json_decode($get_data, true);
      $errors = $response['response']['errors'];
    }

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
      array( 'status' => 400 ,
            'query' => $wpdb->last_query )
    );
  }


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
