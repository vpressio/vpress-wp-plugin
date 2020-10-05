<?php

// Function to add text shortcode to posts and pages
function vpress_shortcode($atts) {
  //set default attributes and values
  $values = shortcode_atts( array(
    'url' => "//" . $_SERVER['HTTP_HOST'],
    'id' => explode("=", $atts[0], 2)
  ), $atts );
  return '
    <div
      style="margin: 15px 0 15px 0;min-height:420px;position:relative;box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);border-radius:14px"
    >
      <iframe
        src="' . esc_attr($values['url']) . '/wordpress/chart/' . esc_attr($values['id'][1]) . '"
        frameborder="0"
        style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:14px">
      </iframe>
    </div>
  ';
}

add_shortcode('vpress', 'vpress_shortcode');