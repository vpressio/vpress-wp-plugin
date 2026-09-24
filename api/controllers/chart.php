<?php
include plugin_dir_path( __FILE__ ) . '../services/chart.php';

// Hook: Register REST API endpoints
add_action( 'rest_api_init', 'vpress_register_chart_routes');
// Hook: pretty-print export.json only under WP_DEBUG.
add_filter( 'rest_json_encode_options', 'vpress_export_json_encode_options', 10, 2 );

function vpress_register_chart_routes() {
  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_GET_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'vpress_get_chart',
      'permission_callback' => '__return_true'
    )
  );
  // Public: visibility is decided in the callback by vpress_get_public_chart(),
  // the same rule as the figure (private charts 404 for non-editors).
  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_EXPORT_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'vpress_export_chart',
      'permission_callback' => '__return_true',
      'args' => array(
        'id' => array( 'type' => 'integer', 'required' => true ),
      ),
    )
  );
  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_LIST_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'vpress_list_charts',
      'permission_callback' => '__return_true'
    )
  );
  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_CREATE_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::CREATABLE,
      'callback' => 'vpress_create_chart',
      'permission_callback' => function ( WP_REST_Request $request ) {
        return current_user_can( 'publish_posts' );
      }
    )
  );
  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_UPDATE_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::EDITABLE,
      'callback' => 'vpress_update_chart',
      'permission_callback' => function ( WP_REST_Request $request ) {
        return current_user_can( 'edit_posts' );
      }
    )
  );
  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_DELETE_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::DELETABLE,
      'callback' => 'vpress_delete_chart',
      'permission_callback' => function ( WP_REST_Request $request ) {
        return current_user_can( 'delete_posts' );
      }
    )
  );
  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_GET_CHART_DATA_ROUTE,
    array(
      'methods' => WP_REST_SERVER::EDITABLE,
      'callback' => 'vpress_get_chart_data',
      'permission_callback' => function ( WP_REST_Request $request ) {
        return current_user_can( 'edit_posts' );
      }
    )
  );
  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_QUERY_CHART_DATA,
    array(
      'methods' => WP_REST_SERVER::EDITABLE,
      'callback' => 'vpress_query_chart_data',
      'permission_callback' => '__return_true'
    )
  );
  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_IMAGE_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::CREATABLE,
      'callback' => 'vpress_image_chart',
      'permission_callback' => function ( WP_REST_Request $request ) {
        return current_user_can( 'publish_posts' );
      }
    )
  );
  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_UPDATE_IMAGE_URL_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::CREATABLE,
      'callback' => 'vpress_update_image_url_chart',
      'permission_callback' => function ( WP_REST_Request $request ) {
        return current_user_can( 'publish_posts' );
      }
    )
  );
}
