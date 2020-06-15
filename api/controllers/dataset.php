<?php
include plugin_dir_path( __FILE__ ) . '../services/dataset.php';

// Hook: Register REST API endpoints
add_action( 'rest_api_init', 'register_dataset_routes');

function register_dataset_routes(){
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
    GET_DATASET_DATA,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'get_dataset_data'  
    )
  );
};
