<?php
include plugin_dir_path( __FILE__ ) . '../services/api.php';

// Hook: Register REST API endpoints
add_action( 'rest_api_init', 'vpress_register_api_routes');

function vpress_register_api_routes(){
  register_rest_route(
      VPRESS_API_BASE_URL,
      VPRESS_API_CREATE_EXTERNAL_API_ROUTE,
      array(
      'methods' => WP_REST_SERVER::CREATABLE,
      'callback' => 'vpress_create_api',
      'permission_callback' => function ( WP_REST_Request $request ) {
          return current_user_can( 'publish_posts' );
      }
      )
  );

  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_GET_EXTERNAL_API_INFO_ROUTE,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'vpress_get_api_info',
      'permission_callback' => '__return_true'
    )
  );

  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_LIST_EXTERNAL_API_ROUTE,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'vpress_list_apis',
      'permission_callback' => '__return_true'
    )
  );

  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_UPDATE_EXTERNAL_API_ROUTE,
    array(
      'methods' => WP_REST_SERVER::EDITABLE,
      'callback' => 'vpress_update_api',
      'permission_callback' => function ( WP_REST_Request $request ) {
        return current_user_can( 'edit_posts' );
      }
    )
  );

  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_DELETE_EXTERNAL_API_ROUTE,
    array(
      'methods' => WP_REST_SERVER::DELETABLE,
      'callback' => 'vpress_delete_api',
      'permission_callback' => function ( WP_REST_Request $request ) {
        return current_user_can( 'delete_posts' );
      }
    )
  );
};