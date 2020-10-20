<?php

function get_dataset_data( $request ) {
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

function upload_dataset( $request ) {
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
      throw new PluginException( 'Error' );
    }
    // confirm file uploaded via POST
    if (! is_uploaded_file( $file['tmp_name'] ) ) {
      throw new PluginException( 'File upload check failed ');
    }
    // confirm no file errors
    if (! $file['error'] === UPLOAD_ERR_OK ) {
      throw new PluginException( 'Upload error: ' . $file['error'] );
    }
    // confirm extension meets requirements
    $ext = pathinfo( $file['name'], PATHINFO_EXTENSION );
    if ( $ext !== $permittedExtension ) {
      throw new PluginException( 'Invalid extension. ');
    }
    // check type
    $mimeType = mime_content_type($file['tmp_name']);
    if ( !in_array( $file['type'], $permittedTypes )
        || !in_array( $mimeType, $permittedTypes ) ) {
          throw new PluginException( 'Invalid mime type' );
    }
  } catch ( PluginException $pe ) {
    return $pe->restApiErrorResponse( '...' );
  }

  // we've passed our checks, now read and process the file
  $handle = fopen( $file['tmp_name'], 'r' );
  $headerFlag = true;
  $header = null;

  global $wpdb;
  $charset_collate = $wpdb->get_charset_collate();
  require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

  $file_name = explode('.', $file['name'])[0];
  $table_name = preg_replace('/[^A-Za-z0-9]/', '', $file_name);
  $table_name = "vpress_" . $table_name;

  while ( ( $data = fgetcsv( $handle, 1000, ',' ) ) !== FALSE ) {
    if ( $headerFlag ) {
      $header = $data;
      $headerFlag = false;
      $sql_create_dataset = "CREATE TABLE IF NOT EXISTS $table_name (";
      foreach ($data as $value) {
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
  
  $query = "LOAD DATA INFILE '" . $file . "' INTO TABLE " . $table_name . " FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\"' LINES TERMINATED BY '\n' IGNORE 1 LINES;";

  $sql = $wpdb->query($query);

  wp_delete_file( $file );

  $response = array(
    'data' => $file_name,
    'query' => $query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false
  );
  return $response;
}

function get_dataset( $request ) {
  global $wpdb;
  $id = (int)$request->get_param('id');
  $table_name = $wpdb->prefix.'vpresscore_datasets';

  $query = "SELECT * FROM $table_name WHERE id = $id";

  $data = $wpdb->get_row($query);

  $response = array(
    'data' => $data,
    'query' => $wpdb->last_query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function list_datasets( $request ) {
  global $wpdb;
  $page = (int)$request->get_param('page');
  $per_page = (int)$request->get_param('perPage');
  $q = $request->get_param('q');
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
  ON d.slug = SUBSTRING_INDEX(TABLE_NAME, '_', -1)
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

function create_dataset( $request ) {
  global $wpdb;
  $table_name = $wpdb->prefix.'vpresscore_datasets';
  $permissions = $request->get_param('permissions');
  $name = $request->get_param('name');
  $slug = $request->get_param('slug');
  $description = $request->get_param('description');
  $tag = $request->get_param('tag');
  $source = $request->get_param('source');
  $owner_id = (int)$request->get_param('owner_id');

  $data = $wpdb->insert( 
    $table_name, 
    array( 
      'permissions' => $permissions, 
      'name' => $name,
      'slug' => $slug,
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

  $response = array(
    'data' => $wpdb->insert_id,
    'query' => $wpdb->last_query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function update_dataset( $request ) {
  global $wpdb;
  $table_name = $wpdb->prefix.'vpresscore_datasets';

  $id = (int)$request->get_param('id');
  $permissions = $request->get_param('permissions');
  $name = $request->get_param('name');
  $description = $request->get_param('description');
  $tag = $request->get_param('tag');
  $source = $request->get_param('source');
  $owner_id = (int)$request->get_param('owner_id');

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

  $response = array(
    'data' => $data,
    'query' => $wpdb->last_query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function delete_dataset( $request ) {
  global $wpdb;
  $id = (int)$request->get_param('id');
  $table_name = $wpdb->prefix.'vpresscore_datasets';

  $table = $wpdb->get_row("SELECT slug FROM $table_name WHERE id = $id");
  $slug = "vpress_" . $table->slug;
  $data = $wpdb->delete( $table_name, array( 'id' => $id ), array( '%d' ) );
  $remove = $wpdb->query( "DROP TABLE IF EXISTS $slug" );

  $response = array(
    'data' => $data,
    'query' => $wpdb->last_query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function datasets_charts( $request ) {
  global $wpdb;
  $id = (int)$request->get_param('id');
  $table_name = $wpdb->prefix.'vpresscore_charts';

  $query = 
  "SELECT *
  FROM $table_name 
  WHERE dataset_id = $id";

  $data = $wpdb->get_results($query);

  $response = array(
    'data' => $data,
    'query' => $wpdb->last_query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function delete_column( $request ) {
  global $wpdb;
  $table_name = $request['dataset'];
  $column = $request->get_param('column');

  $query = "ALTER TABLE `vpress_$table_name` DROP COLUMN `$column`;";
  $sql = $wpdb->query($query);

  $response = array(
    'data' => $sql,
    'query' => $query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function rename_column( $request ) {
  global $wpdb;
  $table_name = $request['dataset'];
  $new = $request->get_param('new');
  $old = $request->get_param('old');

  $query_type = "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'vpress_$table_name' AND COLUMN_NAME = '$old';";
  $type = $wpdb->get_var($query_type);

  $query = "ALTER TABLE `vpress_$table_name` CHANGE `$old` `$new` $type;";
  $sql = $wpdb->query($query);

  $response = array(
    'data' => $sql,
    'query' => $query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}

function change_data_type_column( $request ) {
  global $wpdb;
  require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

  $table_name = $request['dataset'];
  $column = $request->get_param('column');
  $type = $request->get_param('type');

  $query = "ALTER TABLE `vpress_$table_name` CHANGE `$column` `$column` $type NULL DEFAULT NULL;";
  $sql = $wpdb->query($query);

  $response = array(
    'data' => $sql,
    'query' => $query,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
}
