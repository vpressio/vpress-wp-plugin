<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

require_once __DIR__ . '/class-vpress-debug-output.php';

/**
 * Route D′ import pipeline: chunked upload → server-side parse → client-driven
 * ticks. No LOAD DATA, no WP-Cron — works on any shared hosting.
 * Spec: docs/superpowers/specs/2026-07-31-csv-import-pipeline-design.md
 */

function vpress_import_sessions_table() {
  global $wpdb;
  $table = $wpdb->prefix . 'vpresscore_imports';
  if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) {
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset = $wpdb->get_charset_collate();
    dbDelta( "CREATE TABLE $table (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      file_name VARCHAR(255) NOT NULL,
      table_name VARCHAR(255) NOT NULL,
      tmp_path VARCHAR(1024) NOT NULL,
      total_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
      bytes_received BIGINT UNSIGNED NOT NULL DEFAULT 0,
      chunks_received INT UNSIGNED NOT NULL DEFAULT 0,
      byte_offset BIGINT UNSIGNED NOT NULL DEFAULT 0,
      rows_inserted BIGINT UNSIGNED NOT NULL DEFAULT 0,
      columns_json TEXT NULL,
      encoding VARCHAR(16) NOT NULL DEFAULT 'UTF-8',
      table_created TINYINT(1) NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL DEFAULT 'uploading',
      error TEXT NULL,
      created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY  (id)
    ) $charset;" );
  }
  return $table;
}

function vpress_import_get_session( $id ) {
  global $wpdb;
  $table = vpress_import_sessions_table();
  return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE id = %d", $id ) );
}

function vpress_import_update_session( $id, $fields ) {
  global $wpdb;
  $wpdb->update( vpress_import_sessions_table(), $fields, array( 'id' => $id ) );
}

function vpress_import_tmp_dir() {
  $upload_dir = wp_upload_dir();
  $dir = $upload_dir['basedir'] . '/vpress/tmp';
  if ( ! file_exists( $dir ) ) {
    wp_mkdir_p( $dir );
  }
  return $dir;
}

function vpress_import_sweep_orphans() {
  global $wpdb;
  $table = vpress_import_sessions_table();
  $stale = $wpdb->get_results(
    "SELECT id, tmp_path FROM $table
     WHERE status IN ('uploading','importing','error')
       AND updated < (NOW() - INTERVAL 24 HOUR)"
  );
  foreach ( $stale as $row ) {
    if ( $row->tmp_path && file_exists( $row->tmp_path ) ) {
      wp_delete_file( $row->tmp_path );
    }
    vpress_import_update_session( $row->id, array( 'status' => 'aborted', 'tmp_path' => '' ) );
  }
}

function vpress_import_chunk_bytes() {
  $post_max   = wp_convert_hr_to_bytes( ini_get( 'post_max_size' ) );
  $upload_max = wp_convert_hr_to_bytes( ini_get( 'upload_max_filesize' ) );
  $limit = min( array_filter( array( $post_max, $upload_max ) ) );
  return (int) min( max( floor( $limit * 0.75 ), 256 * KB_IN_BYTES ), 4 * MB_IN_BYTES );
}

function vpress_import_start( $request ) {
  global $wpdb;
  $filename    = sanitize_file_name( (string) $request->get_param( 'filename' ) );
  $total_bytes = (int) $request->get_param( 'total_bytes' );
  $cap         = (int) apply_filters( 'vpress_max_upload_bytes', 20 * MB_IN_BYTES );

  if ( strtolower( pathinfo( $filename, PATHINFO_EXTENSION ) ) !== 'csv' ) {
    return new WP_Error( 'invalid_extension', 'Solo se permiten archivos CSV.', array( 'status' => 400 ) );
  }
  if ( $total_bytes <= 0 || $total_bytes > $cap ) {
    return new WP_Error( 'file_too_large', 'El archivo excede el tamaño máximo permitido.', array( 'status' => 413, 'max_bytes' => $cap ) );
  }

  vpress_import_sweep_orphans();

  $table_name = 'vpress_' . vpress_clean_string( explode( '.', $filename )[0] );
  $sessions   = vpress_import_sessions_table();
  $active = $wpdb->get_var( $wpdb->prepare(
    "SELECT COUNT(*) FROM $sessions WHERE table_name = %s AND status IN ('uploading','importing')",
    $table_name
  ) );
  if ( (int) $active > 0 ) {
    return new WP_Error( 'import_in_progress', 'Ya hay una importación en curso para este dataset.', array( 'status' => 409 ) );
  }

  $tmp_path = vpress_import_tmp_dir() . '/' . wp_generate_password( 20, false ) . '.csv';
  if ( file_put_contents( $tmp_path, '' ) === false ) {
    return new WP_Error( 'tmp_write_failed', 'No se pudo crear el archivo temporal.', array( 'status' => 500 ) );
  }

  $wpdb->insert( $sessions, array(
    'file_name'   => $filename,
    'table_name'  => $table_name,
    'tmp_path'    => $tmp_path,
    'total_bytes' => $total_bytes,
    'status'      => 'uploading',
  ) );

  return array(
    'session_id'  => (int) $wpdb->insert_id,
    'chunk_bytes' => vpress_import_chunk_bytes(),
    'table_name'  => $table_name,
    'engine'      => apply_filters( 'vpress_import_engine', 'ticks' ),
  );
}

function vpress_import_chunk( $request ) {
  $session = vpress_import_get_session( (int) $request->get_param( 'session_id' ) );
  if ( ! $session || $session->status !== 'uploading' ) {
    return new WP_Error( 'invalid_session', 'Sesión de importación inválida.', array( 'status' => 404 ) );
  }
  $index = (int) $request->get_param( 'index' );
  $files = $request->get_file_params();
  if ( empty( $files['blob'] ) || ! is_uploaded_file( $files['blob']['tmp_name'] ) ) {
    return new WP_Error( 'missing_chunk', 'Falta el fragmento del archivo.', array( 'status' => 400 ) );
  }
  // Idempotent retry: a re-sent, already-applied chunk is acknowledged, not appended.
  if ( $index < (int) $session->chunks_received ) {
    return array( 'chunks_received' => (int) $session->chunks_received, 'bytes_received' => (int) $session->bytes_received );
  }
  if ( $index !== (int) $session->chunks_received ) {
    return new WP_Error( 'out_of_order', 'Fragmento fuera de orden.', array( 'status' => 409 ) );
  }
  $bytes = file_get_contents( $files['blob']['tmp_name'] );
  $new_total = (int) $session->bytes_received + strlen( $bytes );
  if ( $new_total > (int) $session->total_bytes ) {
    return new WP_Error( 'overflow', 'Se recibieron más bytes de los declarados.', array( 'status' => 400 ) );
  }
  if ( file_put_contents( $session->tmp_path, $bytes, FILE_APPEND ) === false ) {
    return new WP_Error( 'tmp_write_failed', 'No se pudo escribir el fragmento.', array( 'status' => 500 ) );
  }
  vpress_import_update_session( $session->id, array(
    'chunks_received' => (int) $session->chunks_received + 1,
    'bytes_received'  => $new_total,
  ) );
  return array( 'chunks_received' => (int) $session->chunks_received + 1, 'bytes_received' => $new_total );
}

function vpress_import_detect_encoding( $sample ) {
  if ( substr( $sample, 0, 3 ) === "\xEF\xBB\xBF" ) {
    return 'UTF-8'; // BOM stripped at read time
  }
  return mb_check_encoding( $sample, 'UTF-8' ) ? 'UTF-8' : 'Windows-1252';
}

function vpress_import_finish_upload( $request ) {
  $session = vpress_import_get_session( (int) $request->get_param( 'session_id' ) );
  if ( ! $session || $session->status !== 'uploading' ) {
    return new WP_Error( 'invalid_session', 'Sesión de importación inválida.', array( 'status' => 404 ) );
  }
  if ( (int) $session->bytes_received !== (int) $session->total_bytes ) {
    return new WP_Error( 'incomplete_upload', 'La carga está incompleta.', array( 'status' => 400 ) );
  }
  $mime = mime_content_type( $session->tmp_path );
  if ( ! in_array( $mime, array( 'text/csv', 'text/plain', 'application/csv' ), true ) ) {
    return new WP_Error( 'invalid_mime', 'El archivo no es un CSV válido.', array( 'status' => 400 ) );
  }

  $handle = fopen( $session->tmp_path, 'r' );
  $sample = fread( $handle, 64 * KB_IN_BYTES );
  $encoding = vpress_import_detect_encoding( $sample );
  rewind( $handle );
  // Strip BOM if present so the first header cell is clean.
  $bom = fread( $handle, 3 );
  if ( $bom !== "\xEF\xBB\xBF" ) {
    rewind( $handle );
  }
  $header = fgetcsv( $handle, 0, ',' );
  if ( ! $header || count( array_filter( $header ) ) === 0 ) {
    fclose( $handle );
    return new WP_Error( 'invalid_header', 'No se pudo leer el encabezado del CSV.', array( 'status' => 400 ) );
  }
  if ( $encoding !== 'UTF-8' ) {
    $header = array_map( function ( $v ) use ( $encoding ) {
      return iconv( $encoding, 'UTF-8//TRANSLIT', (string) $v );
    }, $header );
  }
  $data_offset = ftell( $handle );
  fclose( $handle );

  global $wpdb;
  $table_existed = ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $session->table_name ) ) === $session->table_name );
  $columns = vpress_prepare_dataset_table( $session->table_name, $header );

  vpress_import_update_session( $session->id, array(
    'columns_json'  => wp_json_encode( $columns ),
    'encoding'      => $encoding,
    'byte_offset'   => $data_offset,
    'table_created' => $table_existed ? 0 : 1,
    'status'        => 'importing',
  ) );
  return array( 'status' => 'importing', 'columns' => $columns, 'encoding' => $encoding );
}

function vpress_import_tick( $request ) {
  global $wpdb;
  $session = vpress_import_get_session( (int) $request->get_param( 'session_id' ) );
  if ( ! $session || $session->status !== 'importing' ) {
    return new WP_Error( 'invalid_session', 'Sesión de importación inválida.', array( 'status' => 404 ) );
  }
  $columns = json_decode( (string) $session->columns_json, true );
  if ( empty( $columns ) ) {
    return new WP_Error( 'invalid_session', 'Sesión sin columnas.', array( 'status' => 500 ) );
  }
  $rows_per_tick = (int) apply_filters( 'vpress_import_rows_per_tick', 5000 );

  $handle = fopen( $session->tmp_path, 'r' );
  if ( ! $handle ) {
    return new WP_Error( 'tmp_read_failed', 'No se pudo leer el archivo temporal.', array( 'status' => 500 ) );
  }
  fseek( $handle, (int) $session->byte_offset );

  $rows = array();
  $eof  = false;
  while ( count( $rows ) < $rows_per_tick ) {
    $data = fgetcsv( $handle, 0, ',' );
    if ( $data === false ) {
      $eof = true;
      break;
    }
    if ( $data === array( null ) ) {
      continue;
    }
    if ( $session->encoding !== 'UTF-8' ) {
      $data = array_map( function ( $v ) use ( $session ) {
        return iconv( $session->encoding, 'UTF-8//TRANSLIT', (string) $v );
      }, $data );
    }
    $rows[] = array_slice( array_pad( $data, count( $columns ), '' ), 0, count( $columns ) );
  }
  $new_offset = ftell( $handle );
  fclose( $handle );

  $inserted = 0;
  if ( count( $rows ) > 0 ) {
    $inserted = vpress_insert_rows( $session->table_name, $columns, $rows );
    if ( $wpdb->last_error ) {
      vpress_import_update_session( $session->id, array( 'status' => 'error', 'error' => $wpdb->last_error ) );
      return vpress_db_error( $wpdb->last_error, 500, 'insert_failed' );
    }
  }

  $fields = array(
    'byte_offset'   => $new_offset,
    'rows_inserted' => (int) $session->rows_inserted + $inserted,
  );
  if ( $eof ) {
    $fields['status'] = 'done';
    if ( $session->tmp_path && file_exists( $session->tmp_path ) ) {
      wp_delete_file( $session->tmp_path );
    }
    $fields['tmp_path'] = '';
  }
  vpress_import_update_session( $session->id, $fields );

  return array(
    'status'        => $eof ? 'done' : 'importing',
    'rows_inserted' => (int) $session->rows_inserted + $inserted,
    'bytes_done'    => (int) $new_offset,
    'total_bytes'   => (int) $session->total_bytes,
    'dataset_name'  => preg_replace( '/^vpress_/', '', $session->table_name ),
  );
}

function vpress_import_abort( $request ) {
  global $wpdb;
  $session = vpress_import_get_session( (int) $request->get_param( 'session_id' ) );
  if ( ! $session ) {
    return new WP_Error( 'invalid_session', 'Sesión de importación inválida.', array( 'status' => 404 ) );
  }
  if ( $session->tmp_path && file_exists( $session->tmp_path ) ) {
    wp_delete_file( $session->tmp_path );
  }
  if ( (int) $session->table_created === 1 ) {
    $wpdb->query( "DROP TABLE IF EXISTS `{$session->table_name}`" );
  }
  vpress_import_update_session( $session->id, array( 'status' => 'aborted', 'tmp_path' => '' ) );
  return array( 'status' => 'aborted' );
}
