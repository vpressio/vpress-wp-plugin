<?php
include plugin_dir_path( __FILE__ ) . '../services/chart.php';

// Hook: Register REST API endpoints
add_action( 'rest_api_init', 'register_chart_routes');

function register_chart_routes() {
  register_rest_route(
      BASE_URL,
      GET_CHART_DATA_ROUTE,
      array(
        'methods' => WP_REST_SERVER::EDITABLE,
        'callback' => 'get_chart_data'
      )
    );

}
