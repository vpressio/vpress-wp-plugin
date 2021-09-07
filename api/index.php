<?php

if ( ! defined( 'ABSPATH' ) ) {
  exit;
}

function vpress_add_cors_http_header(){
  header("Access-Control-Allow-Origin: *");
}

add_action('init','vpress_add_cors_http_header');

require plugin_dir_path( __FILE__ ) . 'routes.php';
require plugin_dir_path( __FILE__ ) . 'controllers/dataset.php';
require plugin_dir_path( __FILE__ ) . 'controllers/chart.php';
require plugin_dir_path( __FILE__ ) . 'controllers/api.php';
