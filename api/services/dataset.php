<?php
function get_demo_datasets(){
  global $wpdb;
  $db_name =  $wpdb->dbname;

  $queryDatasets = 
  "SELECT
    SUBSTRING_INDEX(TABLE_NAME, '_', -1) AS name,
    CASE 
      WHEN (DATA_LENGTH + INDEX_LENGTH) >= 1048576
        THEN  CONCAT(TRUNCATE((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 1),' ' , 'MB')
      WHEN (DATA_LENGTH + INDEX_LENGTH) < 1048576 AND (DATA_LENGTH + INDEX_LENGTH) >= 1024
        THEN CONCAT(TRUNCATE((DATA_LENGTH + INDEX_LENGTH) / 1024, 1),' ' , 'KB')
      WHEN (DATA_LENGTH + INDEX_LENGTH) < 1024 AND (DATA_LENGTH + INDEX_LENGTH) >= 1024
        THEN CONCAT((DATA_LENGTH + INDEX_LENGTH),' ' , 'Bytes')
    END AS size,
    TABLE_ROWS AS rows,
    CREATE_TIME AS created,
    UPDATE_TIME AS updated
  FROM information_schema.tables
  WHERE TABLE_SCHEMA = %s
    AND TABLE_NAME LIKE '%vpress_%'
  LIMIT 4";
  $data =$wpdb->get_results($wpdb->prepare($queryDatasets, $db_name));
  
  $response = array(
    'data' => $data,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function get_dataset_data($request) {
  global $wpdb;
  $table_name = $request['dataset'];
  $query = 
  "SELECT * 
  FROM vpress_$table_name
  LIMIT 1000";

  $data =$wpdb->get_results($wpdb->prepare($query));

  $response = array(
    'data' => $data,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}