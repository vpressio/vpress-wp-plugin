<?php

function vpress_clean_string($string) {
  $string = str_replace(' ', '', $string);
  //Replace not allowed characters with _ 
  $string = preg_replace('/[^A-Za-z0-9_]/', '_', $string);
  if(!$string) $string = 'empty';
  return strtolower($string);
}

function vpress_call_external_api($method, $url, $data){
  $curl = curl_init();
  switch ($method){
    case "POST":
      curl_setopt($curl, CURLOPT_POST, 1);
      if ($data)
        curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
      break;
    case "PUT":
      curl_setopt($curl, CURLOPT_CUSTOMREQUEST, "PUT");
      if ($data)
        curl_setopt($curl, CURLOPT_POSTFIELDS, $data);			 					
      break;
    default:
      if ($data)
          $url = sprintf("%s?%s", $url, http_build_query($data));
  }
  // OPTIONS:
  curl_setopt($curl, CURLOPT_URL, $url);
  curl_setopt($curl, CURLOPT_HTTPHEADER, array(
    // 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVjYjY0ZWZhZGJmNmM4MDAxN2QzYzYyNCIsInJvbGUiOiJBRE1JTiIsImdvb2dsZSI6IiIsImV4cCI6MTYyNTE3NDE2NSwiaWF0IjoxNjI1MDg3NzY1fQ.TAGrUgZJJm6WZwrDeCdzRuzo3IgqBhlpULfC8Bk7bLA',
    'Content-Type: application/json',
  ));
  curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
  curl_setopt($curl, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
  // EXECUTE:
  $result = curl_exec($curl);
  if(!$result){die("Connection Failure");}
  curl_close($curl);
  return $result;
}
