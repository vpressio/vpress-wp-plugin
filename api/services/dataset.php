<?php
function get_datasets(){
  global $wpdb;
  $db_name =  $wpdb->dbname ;

  $queryDatasets = 
  "SELECT
    *
  FROM information_schema.tables
  WHERE TABLE_SCHEMA = %s
    AND TABLE_NAME LIKE '%vpress_%'
  ";


  $data =$wpdb->get_results($wpdb->prepare($queryDatasets, $db_name));
  
  $response = array(
    'request' => $request,
    'query' => $queryDatasets,
    'data' => $data,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}