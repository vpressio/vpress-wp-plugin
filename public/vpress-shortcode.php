<?php

// Function to add text shortcode to posts and pages
function vpress_shortcode($atts) {
  //set default attributes and values
  $values = shortcode_atts( array(
    'url' => 'https://demo-stc.v-press.org',
    'id' => 1
  ), $atts );

  return '<iframe src="' . esc_attr($values['url']) . '/#/shared/' . esc_attr($values['id']) . '" style="border:none" height="380"></iframe>';
}

add_shortcode('vpress', 'vpress_shortcode');