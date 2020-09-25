<?php
include plugin_dir_path( __FILE__ ) . '../services/dataset.php';

// Hook: Register REST API endpoints
add_action( 'rest_api_init', 'register_dataset_routes');

function register_dataset_routes(){
  register_rest_route(
    BASE_URL,
    UPLOAD_DATASET,
    array(
      'methods' => WP_REST_SERVER::CREATABLE,
      'callback' => 'upload_dataset',
      /* 'permission_callback' => function () {
        return current_user_can( 'publish_posts' );
      } */
    )
  );
  register_rest_route(
    BASE_URL,
    GET_DATASET_LIST_ROUTE,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'get_demo_datasets'
    )
  );
  register_rest_route(
    BASE_URL,
    GET_DATASET_LIST_INFO,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'get_dataset_info'  
    )
  );
  register_rest_route(
    BASE_URL,
    GET_DATASET_DATA,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'get_dataset_data'  
    )
  );

  register_rest_route(
    BASE_URL,
    GET_DATASET_ROUTE,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'get_dataset'
    )
  );

  register_rest_route(
    BASE_URL,
    LIST_DATASET_ROUTE,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'list_datasets'
    )
  );
  register_rest_route(
    BASE_URL,
    CREATE_DATASET_ROUTE,
    array(
      'methods' => WP_REST_SERVER::CREATABLE,
      'callback' => 'create_dataset',
      /* 'permission_callback' => function () {
        return current_user_can( 'publish_posts' );
      } */
    )
  );
  register_rest_route(
    BASE_URL,
    UPDATE_DATASET_ROUTE,
    array(
      'methods' => WP_REST_SERVER::EDITABLE,
      'callback' => 'update_dataset',
      /* 'permission_callback' => function () {
        return current_user_can( 'edit_posts' );
      } */
    )
  );
  register_rest_route(
    BASE_URL,
    DELETE_DATASET_ROUTE,
    array(
      'methods' => WP_REST_SERVER::DELETABLE,
      'callback' => 'delete_dataset',
      /* 'permission_callback' => function () {
        return current_user_can( 'delete_posts' );
      } */
    )
  );
};
