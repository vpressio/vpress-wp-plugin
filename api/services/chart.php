<?php
function get_data($request) {
  $body = $request->get_json_params();
  $dataset = $body['dataset'];
  $chart_type = $body['chart_type'];
  $column_1 = $body['column_1'];
  $column_2 = $body['column_2'];
  $column_3 = $body['column_3'];
  $aggregate = $body['aggregate'];

  $sql1 = 
  "SELECT
	c1.ESTADO,
	c2.MASCULINO,
  c3.FEMENINO,
   COUNT(*) as total_count
  FROM vpress_covid19 AS c1,
    (SELECT ESTADO, COUNT(*) AS MASCULINO
    FROM vpress_covid19 
      WHERE Sexo = 'HOMBRE'
      GROUP BY ESTADO) AS c2,
      (SELECT ESTADO, COUNT(*) AS FEMENINO
    FROM vpress_covid19 
      WHERE Sexo = 'MUJER'
      GROUP BY ESTADO) AS c3
  WHERE c1.ESTADO = c2.ESTADO
    AND c2.ESTADO = c3.ESTADO
  GROUP BY ESTADO";

  $sql2 = 
  "SELECT $column_1, $aggregate($column_2) AS total_count
  FROM vpress_$dataset
  GROUP BY $column_1";
  
  if($column_3 != ''){
    $query = $sql1;
  } else {
    $query = $sql2;
  }
  global $wpdb;
  $data =$wpdb->get_results($wpdb->prepare($query));
  $response = array(
    'query' => $query,
    'data' => $data,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );

 return $response;
 
}

function get_chart_data($request){
  $body = $request->get_json_params();
  $column_1 = $body['column_1'];
  $column_2 = $body['column_2'];
  $column_3 = $body['column_3'];
  $dataset = $body['dataset'];
  
  $query3col = 
  "SELECT $column_1 , $column_2 , $column_3 FROM vpress_$dataset";

  $query2col =
  "SELECT $column_1 , $column_2 FROM $dataset ";

  if($column_3 != '') {
    $query = $query3col;
  } else {
    $query = $query2col;
  }
  global $wpdb;
  
  $data =$wpdb->get_results($wpdb->prepare($query));
  
  $response = array(
    'data' => $data,
    'error' => $wpdb->last_error ? $wpdb->last_error : false,
  );

 return $response;
};