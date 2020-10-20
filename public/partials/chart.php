<?php
function is_develop_serve()
 {
   $connection = @fsockopen('localhost', '8080');

   if ( $connection ) {
       return true;
   }

   return false;
 }


?>

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <meta property="og:title" content="Vpress">
    <meta property="og:description" content="Transforma tus datos en impacto.">
    <meta property="og:image" content="./img/vpress-share.png">
    <meta name="og:card" content="summary_large_image">
    <meta property="twitter:title" content="Vpress">
    <meta property="twitter:description" content="Transforma tus datos en impacto.">
    <meta property="twitter:image" content="./img/vpress-share.png">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" href="./favicon.ico/">
    <title>Vpress - Demo</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700,900">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.6.0/dist/leaflet.css" integrity="sha512-xwE/Az9zrjBIphAcBb3F6JVqxf46+CDLwfLMHloNu6KEQCAWi6HcDUbeOfBIptF7tcCzusKFjFw2yuvEpDL9wQ==" crossorigin=""/>
    <?php
      if (is_develop_serve() ) {
        echo '<link rel="stylesheet" href="http://localhost:8080/css/app.css" />';
      } else {		
        // foreach( glob( plugin_dir_path( __FILE__). 'admin/dist/css/*.css' ) as $file ) {
        //   $filename = substr($file, strrpos($file, '/') + 1);
        //   echo $filename;
        //   echo '<link rel="stylesheet" href="'. plugin_dir_url( __DIR__ ).'admin/dist/css/'.$filename .'"/>';
        // } 
        echo '<link rel="stylesheet" href="'. plugin_dir_url( __DIR__ ).'admin/dist/css/chunk-vendors.css"/>';
        echo '<link rel="stylesheet" href="'. plugin_dir_url( __DIR__ ).'admin/dist/css/app.css"/>';
      }
    ?>
  </head>
  <body>
    <noscript>
      <strong>We're sorry but Vpress doesn't work properly without JavaScript enabled. Please enable it to continue.</strong>
    </noscript>
      <div id="front"></div>
      <?php
        if (is_develop_serve() ) {
              echo '<script src="http://localhost:8080/js/app.js"></script>';
              echo '<script src="http://localhost:8080/js/chunk-vendors.js"></script>';
          		
          	} else {
              echo '<script src="'.plugin_dir_url( __DIR__ ) . 'admin/dist/js/chunk-vendors.js'.'"></script>';
              echo '<script src="'.plugin_dir_url( __DIR__ ) . 'admin/dist/js/app.js'.'"></script>';
            }
            
        
      ?>
      <script type="text/javascript"> var vpress_id = <?= $gdata ?> ;</script>
    <!-- built files will be auto injected -->
  </body>
</html>
