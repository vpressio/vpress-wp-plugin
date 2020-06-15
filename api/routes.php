<?php
//NAMESPACE
define('BASE_URL','vpress/v1');
//EDITABLE: POST, PUT, PATCH
//READABLE: GET

//---- CHART ROUTES
//EDITABLE
define('GET_CHART_DATA_ROUTE','/chart/columns');
//---- DATASET ROUTES
//READABLE
define('GET_DATASET_LIST_ROUTE','/dataset/list');
define('GET_DATASET_DATA','/dataset/(?P<dataset>(.|%20)+)');
