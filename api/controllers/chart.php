<?php
include plugin_dir_path( __FILE__ ) . '../services/chart.php';

// Hook: Register REST API endpoints
add_action( 'rest_api_init', 'register_chart_routes');

function register_chart_routes() {
  register_rest_route(
    BASE_URL,
    GET_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'get_chart'
    )
  );
  register_rest_route(
    BASE_URL,
    LIST_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'list_charts'
    )
  );
  register_rest_route(
    BASE_URL,
    CREATE_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::CREATABLE,
      'callback' => 'create_chart',
      /* 'permission_callback' => function () {
        return current_user_can( 'publish_posts' );
      } */
    )
  );
  register_rest_route(
    BASE_URL,
    UPDATE_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::EDITABLE,
      'callback' => 'update_chart',
      /* 'permission_callback' => function () {
        return current_user_can( 'edit_posts' );
      } */
    )
  );
  register_rest_route(
    BASE_URL,
    DELETE_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::DELETABLE,
      'callback' => 'delete_chart',
      /* 'permission_callback' => function () {
        return current_user_can( 'delete_posts' );
      } */
    )
  );
  register_rest_route(
    BASE_URL,
    GET_CHART_DATA_ROUTE,
    array(
      'methods' => WP_REST_SERVER::EDITABLE,
      'callback' => 'get_chart_data',
      /* 'permission_callback' => function () {
        return current_user_can( 'edit_posts' );
      } */
    )
  );
  register_rest_route(
    BASE_URL,
    GET_CHART_DATA_ROUTE_TEST,
    array(
      'methods' => WP_REST_SERVER::EDITABLE,
      'callback' => 'get_data',
      /* 'permission_callback' => function () {
        return current_user_can( 'edit_posts' );
      } */
    )
  );
  register_rest_route(
    BASE_URL,
    QUERY_CHART_DATA,
    array(
      'methods' => WP_REST_SERVER::EDITABLE,
      'callback' => 'query_chart_data'
      /* 'permission_callback' => function () {
        return current_user_can( 'edit_posts' );
      } */
    )
  );
  register_rest_route(
    BASE_URL,
    IMAGE_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::CREATABLE,
      'callback' => 'image_chart',
      /* 'permission_callback' => function () {
        return current_user_can( 'publish_posts' );
      } */
    )
  );
  register_rest_route(
    BASE_URL,
    UPDATE_IMAGE_URL_CHART_ROUTE,
    array(
      'methods' => WP_REST_SERVER::CREATABLE,
      'callback' => 'update_image_url_chart',
      /* 'permission_callback' => function () {
        return current_user_can( 'publish_posts' );
      } */
    )
  );
}
