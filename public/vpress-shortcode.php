<?php

// Function to add text shortcode to posts and pages
function vpress_shortcode($atts) {
  //set default attributes and values
  $values = shortcode_atts( array(
    'url' => "//" . $_SERVER['HTTP_HOST'],
    'id' => 1
  ), $atts );

  return '<div style="padding:72% 0 0 0;position:relative;"><iframe src="' . esc_attr($values['url']) . '/chart/' . esc_attr($values['id']) . '" frameborder="0" style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe></div>';
}

add_shortcode('vpress', 'vpress_shortcode');