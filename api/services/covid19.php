<?php

function vpress_api_get_data(){
  global $wpdb;
  $query = "SELECT ESTADO, Sexo, 'Codigo INEGI' FROM covid19";
  $data =$wpdb->get_results($query);
  $response = array(
    'data' => $data,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );
  return $response;
};