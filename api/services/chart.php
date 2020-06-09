<?php
function get_data($request) {
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
  $group_by = $body['group_by'];
  $order_by = $body['order_by'];
  $limit = $body['limit'];
  
  $select = "SELECT f1." . trim($column_1);
  $from = " FROM " . trim($dataset) . " as f1";
  $where = "";
  $group_by = (empty($group_by) ? "" : "GROUP BY ". $group_by);
  $order_by = "";
  $limit = (empty($limit) ? "" : "LIMIT ".$limit);

  if ( !empty($column_2) && empty($subquery_aggregate)) {
    $select .= ", f1.$column_2";
  }

  if ( !empty($aggregate) && !empty($aggregate_column) ) {
    $select .= ", $aggregate($aggregate_column) AS total_count";
    $group_by = (!empty($group_by) ? "" : "GROUP BY f1.$column_1");
    if ( !empty($column_2) ) {
      $group_by .= ", f1.$column_2";
    }
  }

  if ( !empty($subquery_aggregate) && !empty($subquery_column) ) {
    $from .= ", (SELECT $column_1 AS union_column, $subquery_aggregate(*) AS '$subquery_column' FROM $dataset GROUP BY $subquery_column) AS f2";
    $where .= "WHERE f1.$column_1 = f2.union_column";
    $select .= ", f2.$subquery_column";
  }

  if ( 
    empty($aggregate) &&
    empty($aggregate_column) &&
    empty($subquery_aggregate) &&
    empty($subquery_column) &&
    empty($column_2) &&
    empty($group_by)
  ) {
    // Todo: Validate if both axis are selected
    $limit = " LIMIT 10";
  }

  $query = sprintf("%s %s %s %s %s %s", $select, $from, $where, $group_by, $order_by, $limit);

  global $wpdb;
  $data =$wpdb->get_results($wpdb->prepare($query));
  $response = array(
    'query' => $query,
    'data' => $data,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function get_chart_data($request){
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
};
