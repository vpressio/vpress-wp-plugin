<?php

if ( ! defined( 'ABSPATH' ) ) {
  exit;
}

require plugin_dir_path( __FILE__ ) . 'routes.php';

/**
 * Allows anonymous cross-origin reads of the plugin's OWN REST namespace.
 *
 * This used to be a bare header() on `init`, which put
 * `Access-Control-Allow-Origin: *` on every page and every REST namespace of
 * the whole site, not just on Vpress routes.
 *
 * A figure is normally embedded on the site that serves it, so the embed
 * reads its chart, dataset and query endpoints same-origin. It is also loaded
 * from a static page during local verification
 * (admin/tests/fixtures/embed.html), and it fetches with
 * credentials: 'same-origin' — so what this grants a cross-origin caller is a
 * cookie-less read of exactly what an anonymous visitor may already read.
 *
 * @param bool             $served  Whether the request has already been served.
 * @param mixed            $result  Response data.
 * @param WP_REST_Request  $request The request.
 * @return bool
 */
function vpress_rest_allow_cross_origin_reads( $served, $result, $request ) {
  if ( $request instanceof WP_REST_Request && 0 === strpos( (string) $request->get_route(), '/' . VPRESS_API_BASE_URL . '/' ) ) {
    header( 'Access-Control-Allow-Origin: *' );
  }
  return $served;
}

// Priority 11: core's own rest_send_cors_headers() runs at 10 and echoes the
// request's Origin, so a header sent earlier would simply be replaced.
add_filter( 'rest_pre_serve_request', 'vpress_rest_allow_cross_origin_reads', 11, 3 );

require plugin_dir_path( __FILE__ ) . 'controllers/dataset.php';
require plugin_dir_path( __FILE__ ) . 'controllers/chart.php';
require plugin_dir_path( __FILE__ ) . 'controllers/import.php';
