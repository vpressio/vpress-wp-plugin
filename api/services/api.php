<?php

function vpress_create_api( $request ) {
  try {
    global $wpdb;
    $table_name = $wpdb->prefix.'vpresscore_apis';
    $name = $request->get_param('name');
    $api_key = $request->get_param('api_key');
    $api_prefix = $request->get_param('api_prefix');
  
    $data = $wpdb->insert( 
      $table_name, 
      array( 
        'name' => $name, 
        'api_key' => $api_key,
        'api_prefix' => $api_prefix
      ), 
      array( 
        '%s',
        '%s',
        '%s'
      )
    );
  
    $query = "SELECT * FROM $table_name WHERE id = $wpdb->insert_id";
  
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

function vpress_get_api_info( $request ) {
  try {
    global $wpdb;
    $id = (int)$request->get_param('id');
    $table_name = $wpdb->prefix.'vpresscore_apis';
  
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

function vpress_list_apis( $request ) {
  try {
    global $wpdb;
    // $page = (int)$request->get_param('page');
    // $per_page = (int)$request->get_param('perPage');
    // $q = strtolower($request->get_param('q'));
    // $start_at = $per_page * ($page - 1);
    $table_name = $wpdb->prefix.'vpresscore_apis';
  
    $query_total = "SELECT COUNT(*) AS total FROM $table_name";
    $query = 
    "SELECT * FROM $table_name ORDER BY name";
  
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

function vpress_update_api( $request ) {
  try {
    global $wpdb;
    $table_name = $wpdb->prefix.'vpresscore_apis';
    $name = $request->get_param('name');
    $api_key = $request->get_param('api_key');
    $api_prefix = $request->get_param('api_prefix');

    $data = $wpdb->update( 
      $table_name, 
      array( 
        'name' => $name, 
        'api_key' => $api_key,
        'api_prefix' => $api_prefix,
      ), 
      array( 'id' => $id ),
      array( 
        '%s',
        '%s',
        '%s'
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

function vpress_delete_api( $request ) {
  try {
    global $wpdb;
    $id = (int)$request->get_param('id');
    $table_name = $wpdb->prefix.'vpresscore_apis';
  
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