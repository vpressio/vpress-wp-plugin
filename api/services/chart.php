<?php
function get_chart_data($request){
  $body = $request->get_json_params();
  $column_1 = $body['column_1'];
  $column_2 = $body['column_2'];
  $column_3 = $body['column_3'];
  $dataset = $body['dataset'];
  $query3col = 
  "SELECT $column_1 , $column_2 , $column_3 FROM $dataset ";

  $query2col ="SELECT $column_1 , $column_2 FROM $dataset ";
  if($body['column3'] != '') {
    $query = $query3col;
  } else {
    $query = $query2col;
  }
  global $wpdb;
  
  $data =$wpdb->get_results($wpdb->prepare($query));
  
  $response = array(
    'data' => $data,
    'query' => $query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );

 return $response;
};