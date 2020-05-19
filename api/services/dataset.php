<?php
function get_datasets(){
  global $wpdb;
  $db_name =  $wpdb->dbname ;

  $queryDatasets = 
  "SELECT
    TABLE_NAME AS name,
    TABLE_ROWS AS rows,
    DATA_LENGTH AS bytes,
    CREATE_TIME AS created,
    UPDATE_TIME AS updated
  FROM information_schema.tables
  WHERE TABLE_SCHEMA = %s
    AND TABLE_NAME LIKE '%vpress_%'
  ";


  $data =$wpdb->get_results($wpdb->prepare($queryDatasets, $db_name));
  
  $response = array(
    'data' => $data,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}