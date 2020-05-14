<?php

if ( ! defined( 'ABSPATH' ) ) {
  exit;
}

function add_cors_http_header(){
  header("Access-Control-Allow-Origin: *");
}

// add_action('init','add_cors_http_header');

require plugin_dir_path( __FILE__ ) . 'routes.php';
require plugin_dir_path( __FILE__ ) . 'controllers/covid19.php';
