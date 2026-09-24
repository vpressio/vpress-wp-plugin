<?php
require_once plugin_dir_path( __FILE__ ) . '../services/import.php';

add_action( 'rest_api_init', 'vpress_register_import_routes' );

function vpress_register_import_routes() {
  $perm = function ( WP_REST_Request $request ) {
    return current_user_can( 'publish_posts' );
  };
  foreach ( array(
    VPRESS_API_IMPORT_START         => 'vpress_import_start',
    VPRESS_API_IMPORT_CHUNK         => 'vpress_import_chunk',
    VPRESS_API_IMPORT_FINISH_UPLOAD => 'vpress_import_finish_upload',
    VPRESS_API_IMPORT_TICK          => 'vpress_import_tick',
    VPRESS_API_IMPORT_ABORT         => 'vpress_import_abort',
  ) as $route => $callback ) {
    register_rest_route( VPRESS_API_BASE_URL, $route, array(
      'methods'             => WP_REST_SERVER::CREATABLE,
      'callback'            => $callback,
      'permission_callback' => $perm,
    ) );
  }
}
