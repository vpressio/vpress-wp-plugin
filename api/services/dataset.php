<?php

function vpress_clean_string($string) {
  $string = str_replace(' ', '', $string);
  //Replace not allowed characters with _ 
  $string = preg_replace('/[^A-Za-z0-9_]/', '_', $string);
  if(!$string) $string = 'empty';
  return strtolower($string);
}

function callAPI($method, $url, $data){
  $curl = curl_init();
  switch ($method){
     case "POST":
        curl_setopt($curl, CURLOPT_POST, 1);
        if ($data)
           curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
        break;
     case "PUT":
        curl_setopt($curl, CURLOPT_CUSTOMREQUEST, "PUT");
        if ($data)
           curl_setopt($curl, CURLOPT_POSTFIELDS, $data);			 					
        break;
     default:
        if ($data)
           $url = sprintf("%s?%s", $url, http_build_query($data));
  }
  // OPTIONS:
  curl_setopt($curl, CURLOPT_URL, $url);
  curl_setopt($curl, CURLOPT_HTTPHEADER, array(
     // 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVjYjY0ZWZhZGJmNmM4MDAxN2QzYzYyNCIsInJvbGUiOiJBRE1JTiIsImdvb2dsZSI6IiIsImV4cCI6MTYyNTE3NDE2NSwiaWF0IjoxNjI1MDg3NzY1fQ.TAGrUgZJJm6WZwrDeCdzRuzo3IgqBhlpULfC8Bk7bLA',
     'Content-Type: application/json',
  ));
  curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
  curl_setopt($curl, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
  // EXECUTE:
  $result = curl_exec($curl);
  if(!$result){die("Connection Failure");}
  curl_close($curl);
  return $result;
}

function vpress_get_dataset_data( $request ) {
  try {
    global $wpdb;
    $page = (int)$request->get_param('page');
    $per_page = (int)$request->get_param('perPage');
    // $data_source = $request->get_param('dataSource');
    $query_url = $request->get_param('queryUrl');
    $start_at = $per_page * ($page - 1);
    $query_total = "SELECT COUNT(*) AS total FROM %s";
    $query = "SELECT * FROM %s LIMIT  %d ,  %d ";

    if (!$query_url) {
      $table_name =  "vpress_{$request['dataset']}";
      $sql = str_replace("'", '`',$wpdb->prepare($query, array($table_name, $start_at, $per_page)));
      $data = $wpdb->get_results($sql);
      $sql = str_replace("'", '`', $wpdb->prepare($query_total, $table_name));
      $total = $wpdb->get_results($sql);
    } else {
      $table_name = $request['dataset'];
      $sql = str_replace("'", '`',$wpdb->prepare($query, array($table_name, $start_at, $per_page)));
      $data_array =  array(
        "query" => $sql,
      );
      $get_data = callAPI('POST', $query_url, json_encode($data_array));
      $data = json_decode($get_data, true);
      $errors = $response['response']['errors'];
      
      $sql = str_replace("'", '`', $wpdb->prepare($query_total, $table_name));
      $data_array =  array(
        "query" => $sql,
      );
      $get_data = callAPI('POST', $query_url, json_encode($data_array));
      $response_total = json_decode($get_data, true);
      $errors = $response_total['response']['errors'];
      $total = $response_total[0].total;
    }

    if ($wpdb->last_error) {
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $data,
      'query' => $query,
      'total' => $query_url ? $total : (int)$total[0]->total,
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

function vpress_upload_dataset( $request ) {
  $permittedExtension = 'csv';
  $permittedTypes = ['text/csv', 'text/plain'];

  $files = $request->get_file_params();
  $headers = $request->get_headers();
  if ( !empty( $files ) && !empty( $files['file'] ) ) {
    $file = $files['file'];
  }
  try {
     // smoke/sanity check
    if (! $file ) {
      throw new Exception( 'Error' );
    }
    // confirm file uploaded via POST
    if (! is_uploaded_file( $file['tmp_name'] ) ) {
      throw new Exception( 'File upload check failed ');
    }
    // confirm no file errors
    if (! $file['error'] === UPLOAD_ERR_OK ) {
      throw new Exception( 'Upload error: ' . $file['error'] );
    }
    // confirm extension meets requirements
    $ext = pathinfo( $file['name'], PATHINFO_EXTENSION );
    if ( $ext !== $permittedExtension ) {
      throw new Exception( 'Invalid extension. ');
    }
    // check type
    $mimeType = mime_content_type($file['tmp_name']);
    if ( !in_array( $file['type'], $permittedTypes )
        || !in_array( $mimeType, $permittedTypes ) ) {
          throw new Exception( 'Invalid mime type' );
    }
    // we've passed our checks, now read and process the file
    $handle = fopen( $file['tmp_name'], 'r' );
    $headerFlag = true;
    $header = null;
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();
    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

    $file_name = explode('.', $file['name'])[0];
    $table_name = "vpress_" . vpress_clean_string($file_name);

    while ( ( $data = fgetcsv( $handle, 1000, ',' ) ) !== FALSE ) {
      if ( $headerFlag ) {
        $header = $data;
       
        $headerFlag = false;
        $sql_create_dataset = "CREATE TABLE IF NOT EXISTS $table_name (";

        //clean column names
        $data = array_map('vpress_clean_string',$data);

        foreach ( $data as $value) {
          //Handle duplicate names in columns by adding an extra number at the end
          $duplicates = array_keys($data, $value);
          if(count($duplicates)>1){
            foreach($duplicates as $k => $v){
              $i = $k+1;
              $data[$v] .= "_{$i}"; // Update columns array 
            }
          }
        }

        foreach (array_filter($data) as $value) {
          $sql_create_dataset .= "`$value` TEXT NULL, ";
        }
        $sql_create_dataset .= "created TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ";
        $sql_create_dataset .= "updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP";
        $sql_create_dataset = rtrim($sql_create_dataset, ", ");
        $sql_create_dataset .= ") $charset_collate;";
        dbDelta( $sql_create_dataset );
        continue;
      }
    }

    fclose( $handle );

    $upload_dir = wp_upload_dir();
    $datafile = $_FILES['file']['tmp_name'];
    $file = $upload_dir['basedir'].'/vpress/datasets/'.$_FILES['file']['name'];
    $fileurl = $upload_dir['baseurl'].'/vpress/datasets/'.$_FILES['file']['name'];

    if ( !move_uploaded_file( $_FILES['file']['tmp_name'], $file) ) {
      print_r('Failed to move uploaded file.');
    }
    
    $query = "LOAD DATA LOCAL INFILE '" . $file . "' INTO TABLE " . $table_name . " CHARACTER SET utf8 FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\"' LINES TERMINATED BY '\n' IGNORE 1 LINES;";

    $sql = $wpdb->query($query);

    wp_delete_file( $file );
    if($wpdb->last_error ) {
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $file_name,
      'upload_max_filesize' => ini_get('upload_max_filesize'),
      'query' => $query
    );
    return $response;
  } catch (Exception $e) {
    return new WP_Error(
      'db_error',
      $wpdb->last_error,
      array( 'status' => 400 )
    );
  }


}

function vpress_get_dataset( $request ) {
  try {
    global $wpdb;
    $id = (int)$request->get_param('id');
    $table_name = $wpdb->prefix.'vpresscore_datasets';
  
    $query = "SELECT * FROM $table_name WHERE id = $id";
  
    $data = $wpdb->get_row($query);
    if ($wpdb->last_error) {
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $data,
      'query' => $wpdb->last_query,
    );
    return $response;
  } catch (Exception $e) {
    return new WP_Error(
      'db_error',
      $wpdb->last_error,
      array( 'status' => 400 )
    );
  }
}

function vpress_list_datasets( $request ) {
  try {
    global $wpdb;
    $page = (int)$request->get_param('page');
    $per_page = (int)$request->get_param('perPage');
    $q = strtolower($request->get_param('q'));
    $start_at = $per_page * ($page - 1);
    $table_name = $wpdb->prefix.'vpresscore_datasets';
  
    $query_total = "SELECT COUNT(*) AS total FROM $table_name";
    $query = 
    "SELECT
      d.*,
      CASE 
        WHEN (DATA_LENGTH + INDEX_LENGTH) >= 1048576
          THEN  CONCAT(TRUNCATE((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 1),' ' , 'MB')
        WHEN (DATA_LENGTH + INDEX_LENGTH) < 1048576 AND (DATA_LENGTH + INDEX_LENGTH) >= 1024
          THEN CONCAT(TRUNCATE((DATA_LENGTH + INDEX_LENGTH) / 1024, 1),' ' , 'KB')
        WHEN (DATA_LENGTH + INDEX_LENGTH) < 1024 AND (DATA_LENGTH + INDEX_LENGTH) >= 1024
          THEN CONCAT((DATA_LENGTH + INDEX_LENGTH),' ' , 'Bytes')
      END AS size,
      TABLE_ROWS AS rows
    FROM $table_name as d
    LEFT JOIN information_schema.tables as i
    ON d.slug = SUBSTRING_INDEX(TABLE_NAME, '_', -1)";
  
    if ($q) {
      $where .= " WHERE lower(slug) like '%$q%' OR lower(name) like '%$q%' OR lower(description) like '%$q%' OR lower(tag) like '%$q%'";
      $query_total .= $where;
      $query .= $where;
    }
    $query .= " ORDER BY updated DESC";
    $query .= " LIMIT $start_at, $per_page";
  
    $total = $wpdb->get_var($query_total);
    $data = $wpdb->get_results($query);
    if ($wpdb->last_error) {
      throw new Exception($wpdb->last_error );
    }
    $response = array(
      'data' => $data,
      'total' => (int)$total,
      'query' => $wpdb->last_query,
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

function vpress_create_dataset( $request ) {
  try {
    global $wpdb;
    $table_name = $wpdb->prefix.'vpresscore_datasets';
    $permissions = $request->get_param('permissions');
    $name = $request->get_param('name');
    $slug = $request->get_param('slug');
    $description = $request->get_param('description');
    $tag = $request->get_param('tag');
    $source = $request->get_param('source');
    $owner_id = (int)$request->get_param('owner_id');
    $query_url = $request->get_param('query_url');
  
    $data = $wpdb->insert( 
      $table_name, 
      array( 
        'permissions' => $permissions, 
        'name' => $name,
        'slug' => vpress_clean_string($slug),
        'description' => $description,
        'tag' => $tag,
        'source' => $source,
        'owner_id' => $owner_id,
      ), 
      array( 
        '%s',
        '%s',
        '%s',
        '%s',
        '%s',
        '%s',
        '%d'
      )
    );
  
    $query = "SELECT
      d.*,
      CASE 
        WHEN (DATA_LENGTH + INDEX_LENGTH) >= 1048576
          THEN  CONCAT(TRUNCATE((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 1),' ' , 'MB')
        WHEN (DATA_LENGTH + INDEX_LENGTH) < 1048576 AND (DATA_LENGTH + INDEX_LENGTH) >= 1024
          THEN CONCAT(TRUNCATE((DATA_LENGTH + INDEX_LENGTH) / 1024, 1),' ' , 'KB')
        WHEN (DATA_LENGTH + INDEX_LENGTH) < 1024 AND (DATA_LENGTH + INDEX_LENGTH) >= 1024
          THEN CONCAT((DATA_LENGTH + INDEX_LENGTH),' ' , 'Bytes')
      END AS size,
      TABLE_ROWS AS rows
    FROM $table_name as d
    LEFT JOIN information_schema.tables as i
    ON d.slug = SUBSTRING_INDEX(TABLE_NAME, '_', -1)
    WHERE id = $wpdb->insert_id";
  
    $data = $wpdb->get_results($query);
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

function vpress_update_dataset( $request ) {
  try {
    global $wpdb;
    $table_name = $wpdb->prefix.'vpresscore_datasets';

    $id = (int)$request->get_param('id');
    $permissions = $request->get_param('permissions');
    $name = $request->get_param('name');
    $description = $request->get_param('description');
    $tag = $request->get_param('tag');
    $source = $request->get_param('source');
    $owner_id = (int)$request->get_param('owner_id');
    $query_url = $request->get_param('query_url');

    $data = $wpdb->update( 
      $table_name, 
      array( 
        'permissions' => $permissions,
        'name' => $name,
        'description' => $description,
        'tag' => $tag,
        'source' => $source,
        'owner_id' => $owner_id
      ), 
      array( 'id' => $id ),
      array( 
        '%s',
        '%s',
        '%s',
        '%s',
        '%s',
        '%d',
      ), 
      array( '%d' )
    );
    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $data,
      'query' => $wpdb->last_query,
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

function vpress_delete_dataset( $request ) {
  try {
    global $wpdb;
    $id = (int)$request->get_param('id');
    $table_name = $wpdb->prefix.'vpresscore_datasets';
  
    $table = $wpdb->get_row("SELECT slug FROM $table_name WHERE id = $id");
    $slug = "vpress_" . $table->slug;
    $data = $wpdb->delete( $table_name, array( 'id' => $id ), array( '%d' ) );
    $charts = $wpdb->delete( $wpdb->prefix.'vpresscore_charts', array( 'dataset_id' => $id ), array( '%d' ) );
    $remove = $wpdb->query( "DROP TABLE IF EXISTS $slug" );
  
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

function vpress_datasets_charts( $request ) {
  try {
    global $wpdb;
    $id = (int)$request->get_param('id');
    $table_name = $wpdb->prefix.'vpresscore_charts';
  
    $query_total = "SELECT COUNT(*) AS total FROM $table_name WHERE dataset_id = $id";
    $query = "SELECT * FROM $table_name WHERE dataset_id = $id";
    $query .= " ORDER BY updated DESC";
    $query .= " LIMIT 10";
    $total = $wpdb->get_var($query_total);
    $data = $wpdb->get_results($query);
  
    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $data,
      'total' => (int)$total,
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

function vpress_delete_column( $request ) {
  try {
    global $wpdb;
    $table_name = $request['dataset'];
    $column = $request->get_param('column');
  
    $query = "ALTER TABLE `vpress_$table_name` DROP COLUMN `$column`;";
    $sql = $wpdb->query($query);
  
    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $sql,
      'query' => $query
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

function vpress_rename_column( $request ) {
  try {
    global $wpdb;
    $table_name = $request['dataset'];
    $new = $request->get_param('new');
    $old = $request->get_param('old');
  
    $query_type = "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'vpress_$table_name' AND COLUMN_NAME = '$old';";
    $type = $wpdb->get_var($query_type);
  
    $query = "ALTER TABLE `vpress_$table_name` CHANGE `$old` `$new` $type;";
    $sql = $wpdb->query($query);
  
    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $sql,
      'query' => $query,
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

function vpress_change_data_type_column( $request ) {
  try {
    global $wpdb;
    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
  
    $table_name = $request['dataset'];
    $column = $request->get_param('column');
    $type = $request->get_param('type');
  
    $query = "ALTER TABLE `vpress_$table_name` CHANGE `$column` `$column` $type NULL DEFAULT NULL;";
    $sql = $wpdb->query($query);
    
    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $sql,
      'query' => $query,
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
