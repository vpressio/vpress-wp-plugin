<?php

// Function to add text shortcode to posts and pages
function vpress_shortcode($atts) {
  //set default attributes and values
  $values = shortcode_atts( array(
    'url' => get_home_url(),
    'id' => $atts['id']
  ), $atts );
  return '
    <Chart id="'.esc_attr($values['id']).'">
  ';
}

add_shortcode('vpress', 'vpress_shortcode');