<?php

require_once __DIR__ . '/class-vpress-query-guard.php';
require_once __DIR__ . '/class-vpress-debug-output.php';

function vpress_clean_string($string) {
  $string = str_replace(' ', '', $string);
  //Replace not allowed characters with _ 
  $string = preg_replace('/[^A-Za-z0-9_]/', '_', $string);
  if(!$string) $string = 'empty';
  return strtolower($string);
}

/**
 * True when every registry row for the dataset behind $table is public
 * (duplicate slugs share one physical table, so one private row wins).
 *
 * Stricter than vpress_anonymous_can_read_dataset() on purpose: /dataset/data
 * returns the raw rows, so a public chart on a dataset (which only exposes
 * the chart's own aggregate query) does not make its rows readable.
 */
function vpress_dataset_is_public( string $table ): bool {
	global $wpdb;
	$slug    = substr( vpress_guard_unquote( $table ), strlen( 'vpress_' ) );
	$private = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT COUNT(*) FROM {$wpdb->prefix}vpresscore_datasets WHERE slug = %s AND (permissions IS NULL OR permissions <> 'public')",
			$slug
		)
	);
	return 0 === (int) $private;
}

function vpress_get_dataset_data( $request ) {
	global $wpdb;

	$external = apply_filters( 'vpress_external_dataset_data', null, $request );
	if ( null !== $external ) {
		return $external;
	}
	if ( 'wordpress' !== $request->get_param( 'dataSource' ) ) {
		return new WP_Error( 'vpress_unsupported_source', __( 'Unsupported data source.', 'vpress' ), array( 'status' => 400 ) );
	}

	$table = vpress_guard_dataset_slug( (string) $request['dataset'] );
	if ( is_wp_error( $table ) ) {
		return $table;
	}
	if ( ! current_user_can( 'edit_posts' ) && ! vpress_dataset_is_public( $table ) ) {
		return new WP_Error( 'vpress_forbidden', __( 'This dataset is private.', 'vpress' ), array( 'status' => 403 ) );
	}

	$page     = max( 1, (int) $request->get_param( 'page' ) );
	$per_page = min( 500, max( 1, (int) $request->get_param( 'perPage' ) ) );
	$query    = $wpdb->prepare( "SELECT * FROM $table LIMIT %d, %d", ( $page - 1 ) * $per_page, $per_page );
	$data     = $wpdb->get_results( $query );
	$total    = $wpdb->get_var( "SELECT COUNT(*) AS total FROM $table" );

	if ( $wpdb->last_error ) {
		return vpress_db_error( $wpdb->last_error );
	}
	return array(
		'data'  => $data,
		'query' => vpress_debug_sql( $query ),
		'total' => (int) $total,
	);
}

/**
 * Build (or extend) a dataset table from a CSV header row and return the
 * cleaned, deduplicated column list. Shared by the legacy one-shot upload
 * and the chunked import pipeline (finish-upload).
 */
function vpress_prepare_dataset_table( $table_name, $header_row ) {
  global $wpdb;
  $charset_collate = $wpdb->get_charset_collate();
  require_once ABSPATH . 'wp-admin/includes/upgrade.php';

  $sql_create_dataset = "CREATE TABLE IF NOT EXISTS $table_name (";
  $data = array_map( 'vpress_clean_string', $header_row );
  foreach ( $data as $value ) {
    $duplicates = array_keys( $data, $value );
    if ( count( $duplicates ) > 1 ) {
      foreach ( $duplicates as $k => $v ) {
        $i = $k + 1;
        $data[ $v ] .= "_{$i}";
      }
    }
  }
  foreach ( array_filter( $data ) as $value ) {
    $sql_create_dataset .= "`$value` TEXT NULL, ";
  }
  $sql_create_dataset .= "created TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ";
  $sql_create_dataset .= "updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP";
  $sql_create_dataset = rtrim( $sql_create_dataset, ", " );
  $sql_create_dataset .= ") $charset_collate;";
  dbDelta( $sql_create_dataset );

  return array_values( array_filter( $data ) );
}

/**
 * Portable bulk insert used by the CSV upload.
 *
 * Replaces LOAD DATA LOCAL INFILE, which requires `local_infile` on the
 * MySQL server AND `mysqli.allow_local_infile` in PHP — flags shared
 * hostings do not grant. Batched multi-row INSERTs run anywhere WP runs.
 */
function vpress_insert_rows( $table_name, $columns, $rows ) {
  global $wpdb;
  if ( empty( $columns ) || empty( $rows ) ) {
    return 0;
  }
  $cols_sql = '`' . implode( '`, `', $columns ) . '`';
  $row_placeholders = '(' . implode( ', ', array_fill( 0, count( $columns ), '%s' ) ) . ')';
  $all_placeholders = implode( ', ', array_fill( 0, count( $rows ), $row_placeholders ) );
  $values = array();
  foreach ( $rows as $row ) {
    foreach ( $row as $value ) {
      $values[] = (string) $value;
    }
  }
  $sql = $wpdb->prepare( "INSERT INTO `$table_name` ($cols_sql) VALUES $all_placeholders", $values );
  $result = $wpdb->query( $sql );
  return $result === false ? 0 : $result;
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

    $columns = array();
    $pending_rows = array();
    $inserted = 0;
    $batch_size = 500;

    while ( ( $data = fgetcsv( $handle, 0, ',' ) ) !== FALSE ) {
      if ( $headerFlag ) {
        $header = $data;
       
        $headerFlag = false;
        $columns = vpress_prepare_dataset_table( $table_name, $data );
        continue;
      }

      // Skip blank lines (fgetcsv yields array(null) for them).
      if ( $data === array( null ) ) {
        continue;
      }

      // Normalize row width to the header, then queue for batched insert.
      $pending_rows[] = array_slice( array_pad( $data, count( $columns ), '' ), 0, count( $columns ) );

      if ( count( $pending_rows ) >= $batch_size ) {
        $inserted += vpress_insert_rows( $table_name, $columns, $pending_rows );
        $pending_rows = array();
      }
    }
    if ( count( $pending_rows ) > 0 ) {
      $inserted += vpress_insert_rows( $table_name, $columns, $pending_rows );
    }

    fclose( $handle );

    if($wpdb->last_error ) {
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $file_name,
      'upload_max_filesize' => ini_get('upload_max_filesize'),
      'query' => "batched INSERT: {$inserted} rows"
    );
    return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }


}

/**
 * Whether a caller without edit_posts may read dataset $id: it is public,
 * or a public chart is built on it (its viewers need the dataset row).
 *
 * Covers the registry row only (get and dataset-charts). The raw rows behind
 * /dataset/data use the stricter vpress_dataset_is_public(), which a public
 * chart does not satisfy.
 */
function vpress_anonymous_can_read_dataset( int $id, $permissions ): bool {
  global $wpdb;
  if ( 'public' === $permissions ) {
    return true;
  }
  return '1' === (string) $wpdb->get_var( $wpdb->prepare(
    "SELECT EXISTS (SELECT 1 FROM {$wpdb->prefix}vpresscore_charts WHERE dataset_id = %d AND permissions = 'public')",
    $id
  ) );
}

function vpress_get_dataset( $request ) {
  try {
    global $wpdb;
    $id = (int)$request->get_param('id');
    $table_name = $wpdb->prefix.'vpresscore_datasets';

    $data = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table_name WHERE id = %d", $id ) );
    if ($wpdb->last_error) {
      throw new Exception($wpdb->last_error);
    }
    if ( $data && ! current_user_can( 'edit_posts' ) && ! vpress_anonymous_can_read_dataset( $id, $data->permissions ) ) {
      return new WP_Error( 'vpress_forbidden', __( 'This dataset is private.', 'vpress' ), array( 'status' => 403 ) );
    }
    $response = array(
      'data' => $data,
      'query' => vpress_debug_sql( $wpdb->last_query ),
    );
    return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}

function vpress_list_datasets( $request ) {
  try {
    global $wpdb;
    $page = (int)$request->get_param('page');
    $per_page = (int)$request->get_param('perPage');
    $q = strtolower((string)$request->get_param('q'));
    $start_at = $per_page * ($page - 1);
    $table_name = $wpdb->prefix.'vpresscore_datasets';
  
    $query_total = "SELECT COUNT(*) AS total FROM $table_name as d";
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
      TABLE_ROWS AS `rows`
    FROM $table_name as d
    LEFT JOIN information_schema.tables as i
    ON d.slug = SUBSTRING_INDEX(TABLE_NAME, '_', -1)";
  
    $conditions = array();
    $args = array();
    if ( ! current_user_can( 'edit_posts' ) ) {
      $conditions[] = "d.permissions = 'public'";
    }
    if ($q) {
      $like = '%' . $wpdb->esc_like( $q ) . '%';
      $conditions[] = '(lower(d.slug) LIKE %s OR lower(d.name) LIKE %s OR lower(d.description) LIKE %s OR lower(d.tag) LIKE %s)';
      array_push( $args, $like, $like, $like, $like );
    }
    $where = $conditions ? ' WHERE ' . implode( ' AND ', $conditions ) : '';
    $query_total .= $where;
    $query = $wpdb->prepare(
      $query . $where . ' ORDER BY updated DESC LIMIT %d, %d',
      array_merge( $args, array( $start_at, $per_page ) )
    );

    $total = $wpdb->get_var( $args ? $wpdb->prepare( $query_total, $args ) : $query_total );
    $data = $wpdb->get_results($query);
    if ($wpdb->last_error) {
      throw new Exception($wpdb->last_error );
    }
    $response = array(
      'data' => $data,
      'total' => (int)$total,
      'query' => vpress_debug_sql( $wpdb->last_query ),
    );
    return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
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
      TABLE_ROWS AS `rows`
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
      'query' => vpress_debug_sql( $wpdb->last_query )
    );
    return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
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
      'query' => vpress_debug_sql( $wpdb->last_query ),
    );
    return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}

function vpress_delete_dataset( $request ) {
  try {
    global $wpdb;
    $id = (int)$request->get_param('id');
    $table_name = $wpdb->prefix.'vpresscore_datasets';
  
    $table = $wpdb->get_row("SELECT slug FROM $table_name WHERE id = $id");
    $slug = $table ? 'vpress_' . $table->slug : '';
    if ( ! vpress_guard_identifier( $slug ) ) {
      return new WP_Error( 'vpress_unknown_dataset', __( 'Unknown dataset.', 'vpress' ), array( 'status' => 400 ) );
    }
    $data = $wpdb->delete( $table_name, array( 'id' => $id ), array( '%d' ) );
    $charts = $wpdb->delete( $wpdb->prefix.'vpresscore_charts', array( 'dataset_id' => $id ), array( '%d' ) );
    $remove = $wpdb->query( "DROP TABLE IF EXISTS `$slug`" );
  
    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $data,
      'query' => vpress_debug_sql( $wpdb->last_query )
    );
    return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}

function vpress_datasets_charts( $request ) {
  try {
    global $wpdb;
    $id = (int)$request->get_param('id');
    $table_name = $wpdb->prefix.'vpresscore_charts';
  
    $visibility = '';
    if ( ! current_user_can( 'edit_posts' ) ) {
      $dataset = $wpdb->get_row( $wpdb->prepare( "SELECT permissions FROM {$wpdb->prefix}vpresscore_datasets WHERE id = %d", $id ) );
      if ( $dataset && ! vpress_anonymous_can_read_dataset( $id, $dataset->permissions ) ) {
        return new WP_Error( 'vpress_forbidden', __( 'This dataset is private.', 'vpress' ), array( 'status' => 403 ) );
      }
      $visibility = " AND permissions = 'public'";
    }

    $query_total = "SELECT COUNT(*) AS total FROM $table_name WHERE dataset_id = $id$visibility";
    $query = "SELECT * FROM $table_name WHERE dataset_id = $id$visibility";
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
      'query' => vpress_debug_sql( $wpdb->last_query )
    );
    return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}

/**
 * Resolves a column-op target: the guarded dataset table plus one of its
 * real columns.
 *
 * @return array|WP_Error array( quoted table, bare table, bare column ).
 */
function vpress_dataset_column_target( $dataset, $column ) {
  $table = vpress_guard_dataset_slug( (string) $dataset );
  if ( is_wp_error( $table ) ) {
    return $table;
  }
  if ( ! is_string( $column ) || ! in_array( $column, vpress_guard_columns( $table ), true ) ) {
    return vpress_dataset_bad_column();
  }
  return array( $table, vpress_guard_unquote( $table ), $column );
}

function vpress_dataset_bad_column(): WP_Error {
  return new WP_Error( 'vpress_bad_column', __( 'Unknown column.', 'vpress' ), array( 'status' => 400 ) );
}

function vpress_delete_column( $request ) {
  try {
    global $wpdb;
    $target = vpress_dataset_column_target( $request['dataset'], $request->get_param('column') );
    if ( is_wp_error( $target ) ) {
      return $target;
    }
    list( $table, , $column ) = $target;

    $query = "ALTER TABLE $table DROP COLUMN `$column`;";
    $sql = $wpdb->query($query);

    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $sql,
      'query' => vpress_debug_sql( $query )
    );
    return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}

function vpress_rename_column( $request ) {
  try {
    global $wpdb;
    $new = $request->get_param('new');
    $target = vpress_dataset_column_target( $request['dataset'], $request->get_param('old') );
    if ( is_wp_error( $target ) ) {
      return $target;
    }
    if ( ! is_string( $new ) || ! vpress_guard_identifier( $new ) ) {
      return vpress_dataset_bad_column();
    }
    list( $table, $bare_table, $old ) = $target;

    $type = $wpdb->get_var( $wpdb->prepare(
      'SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = %s AND COLUMN_NAME = %s;',
      $bare_table,
      $old
    ) );
    if ( ! is_string( $type ) || ! preg_match( '/^[a-z]+$/D', $type ) ) {
      return new WP_Error( 'vpress_bad_type', __( 'Unsupported column type.', 'vpress' ), array( 'status' => 400 ) );
    }

    $query = "ALTER TABLE $table CHANGE `$old` `$new` $type;";
    $sql = $wpdb->query($query);

    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $sql,
      'query' => vpress_debug_sql( $query ),
    );
    return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}

function vpress_change_data_type_column( $request ) {
  try {
    global $wpdb;
    $type = $request->get_param('type');
    $target = vpress_dataset_column_target( $request['dataset'], $request->get_param('column') );
    if ( is_wp_error( $target ) ) {
      return $target;
    }
    // The column types the admin data table offers.
    if ( ! in_array( $type, array( 'text', 'int', 'date', 'boolean' ), true ) ) {
      return new WP_Error( 'vpress_bad_type', __( 'Unsupported column type.', 'vpress' ), array( 'status' => 400 ) );
    }
    list( $table, , $column ) = $target;

    $query = "ALTER TABLE $table CHANGE `$column` `$column` $type NULL DEFAULT NULL;";
    $sql = $wpdb->query($query);

    if($wpdb->last_error){
      throw new Exception($wpdb->last_error);
    }
    $response = array(
      'data' => $sql,
      'query' => vpress_debug_sql( $query ),
    );
    return $response;
  } catch (Exception $e) {
    return vpress_db_error( $e->getMessage() );
  }
}

/**
 * Stamps the outcome of a live-source refresh on every registry row of
 * $slug (duplicate slugs share one physical table): success sets
 * last_refreshed_at and clears the error, failure stores the message and
 * leaves last_refreshed_at alone.
 */
function vpress_dataset_record_refresh( string $slug, ?WP_Error $error = null ): void {
	global $wpdb;
	$fields = null === $error
		? array(
			'last_refreshed_at'  => current_time( 'mysql', true ),
			'last_refresh_error' => null,
		)
		: array( 'last_refresh_error' => $error->get_error_message() );
	$wpdb->update( $wpdb->prefix . 'vpresscore_datasets', $fields, array( 'slug' => $slug ) );
}

/**
 * Replaces the rows of dataset $slug with the CSV at $tmp_csv_path without
 * a window where readers see a partial table: import into
 * vpress_<slug>__new, swap both names in one RENAME TABLE (atomic in MySQL),
 * then drop the old copy. Any failure drops __new only; the live table is
 * never touched. The outcome is recorded on the registry row; errors are
 * returned, never thrown. The CSV is deleted either way.
 *
 * @return true|WP_Error
 */
function vpress_dataset_replace_table( string $slug, string $tmp_csv_path ) {
	global $wpdb;
	$live = 'vpress_' . $slug;
	$new  = $live . '__new';
	$old  = $live . '__old';

	if ( ! vpress_guard_identifier( $slug ) || ! vpress_guard_identifier( $new ) || ! vpress_guard_identifier( $old ) ) {
		wp_delete_file( $tmp_csv_path );
		$error = vpress_guard_unknown_dataset();
		vpress_dataset_record_refresh( $slug, $error );
		return $error;
	}

	// Leftovers of an interrupted refresh: a stale __new would be appended
	// to (CREATE TABLE IF NOT EXISTS), a stale __old would block the RENAME.
	$wpdb->query( "DROP TABLE IF EXISTS `$new`" );
	$wpdb->query( "DROP TABLE IF EXISTS `$old`" );

	$error = vpress_import_from_file( $tmp_csv_path, $new );
	if ( true === $error ) {
		$error       = null;
		$live_exists = ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $live ) ) === $live );
		$wpdb->query(
			$live_exists
				? "RENAME TABLE `$live` TO `$old`, `$new` TO `$live`"
				: "RENAME TABLE `$new` TO `$live`"
		);
		if ( $wpdb->last_error ) {
			$error = vpress_db_error( $wpdb->last_error, 500, 'vpress_swap_failed' );
		} elseif ( $live_exists ) {
			$wpdb->query( "DROP TABLE IF EXISTS `$old`" );
		}
	}

	if ( null !== $error ) {
		$wpdb->query( "DROP TABLE IF EXISTS `$new`" );
		vpress_dataset_record_refresh( $slug, $error );
		return $error;
	}
	vpress_dataset_record_refresh( $slug );
	return true;
}
