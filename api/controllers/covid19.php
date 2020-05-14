<?php
include plugin_dir_path( __FILE__ ) . '../services/covid19.php';

// Hook: Register REST API endpoints
add_action( 'rest_api_init', 'register_covid19_routes');

function register_covid19_routes(){
  register_rest_route(
    BASE_URL,
    GET_COVID19_ROUTE,
    array(
      'methods' => WP_REST_SERVER::READABLE,
      'callback' => 'vpress_api_get_data'
    )
  );
}
