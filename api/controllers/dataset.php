<?php
include plugin_dir_path( __FILE__ ) . '../services/dataset.php';

// Hook: Register REST API endpoints
add_action( 'rest_api_init', 'vpress_register_dataset_routes');

function vpress_register_dataset_routes(){
  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_UPLOAD_DATASET,
    array(
      'methods' => WP_REST_SERVER::CREATABLE,
      'callback' => 'vpress_upload_dataset',
      'permission_callback' => function () {
        return current_user_can( 'publish_posts' );
      }
    )
  );

  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_GET_DATASET_DATA,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'vpress_get_dataset_data',
      'permission_callback' => '__return_true'
    )
  );
  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_GET_DATASET_ROUTE,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'vpress_get_dataset',
      'permission_callback' => '__return_true'
    )
  );

  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_GET_DATASET_CHARTS_ROUTE,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'vpress_datasets_charts',
      'permission_callback' => '__return_true'
    )
  );

  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_LIST_DATASET_ROUTE,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'vpress_list_datasets',
      'permission_callback' => '__return_true'
    )
  );

  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_CREATE_DATASET_ROUTE,
    array(
      'methods' => WP_REST_SERVER::CREATABLE,
      'callback' => 'vpress_create_dataset',
      'permission_callback' => function () {
        return current_user_can( 'publish_posts' );
      }
    )
  );

  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_UPDATE_DATASET_ROUTE,
    array(
      'methods' => WP_REST_SERVER::EDITABLE,
      'callback' => 'vpress_update_dataset',
      'permission_callback' => function () {
        return current_user_can( 'edit_posts' );
      }
    )
  );

  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_DELETE_DATASET_ROUTE,
    array(
      'methods' => WP_REST_SERVER::DELETABLE,
      'callback' => 'vpress_delete_dataset',
      'permission_callback' => function () {
        return current_user_can( 'delete_posts' );
      }
    )
  );

  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_DELETE_COLUMN_DATASET_ROUTE,
    array(
      'methods' => WP_REST_SERVER::CREATABLE,
      'callback' => 'vpress_delete_column',
      'permission_callback' => function () {
        return current_user_can( 'publish_posts' );
      }
    )
  );

  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_RENAME_COLUMN_DATASET_ROUTE,
    array(
      'methods' => WP_REST_SERVER::CREATABLE,
      'callback' => 'vpress_rename_column',
      'permission_callback' => function () {
        return current_user_can( 'publish_posts' );
      }
    )
  );

  register_rest_route(
    VPRESS_API_BASE_URL,
    VPRESS_API_CHANGE_DATA_TYPE_COLUMN_DATASET_ROUTE,
    array(
      'methods' => WP_REST_SERVER::CREATABLE,
      'callback' => 'vpress_change_data_type_column',
      'permission_callback' => function () {
        return current_user_can( 'publish_posts' );
      }
    )
  );
};
