<?php

// Function to add text shortcode to posts and pages
function vpress_shortcode($atts) {
  //set default attributes and values
  $values = shortcode_atts( array(
    'url' => "//" . $_SERVER['HTTP_HOST'],
    'id' => $atts[0][1]
  ), $atts );
  
  return '<div style="min-height: 350px;position:relative;box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);"><iframe src="' . esc_attr($values['url']) . '/chart/' . esc_attr($values['id']) . '" frameborder="0" style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe></div>';
}

add_shortcode('vpress', 'vpress_shortcode');