<?php
function get_demo_datasets(){
  global $wpdb;
  $db_name = $wpdb->dbname;

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
    AND TABLE_NAME LIKE '%vpress\_%'
  LIMIT 8";
  $query = $wpdb->prepare($queryDatasets, $db_name);
  $data = $wpdb->get_results($query);
  
  $response = array(
    'data' => $data,
    'query' => $query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function get_dataset_data($request) {
  global $wpdb;
  $table_name = $request['dataset'];
  $page = (int)$request->get_param('page');
  $per_page = (int)$request->get_param('perPage');
  $start_at = $per_page * ($page - 1);
  $query_total = "SELECT COUNT(*) AS total FROM vpress_$table_name";
  $query = "SELECT * FROM vpress_$table_name LIMIT $start_at, $per_page";

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

function get_dataset_info( $request ) {
  global $wpdb;
  $dataset_slug = $request['dataset'];
  $table_name = $wpdb->prefix.'vpresscore_datasets';
  $query = "SELECT * FROM $table_name WHERE slug = %s";

  $datasets = $wpdb->get_results($wpdb->prepare($query, $dataset_slug ));
  $response = array(
    'datasets' => $datasets,
    'query' => $query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false
  );

  return $response;
}