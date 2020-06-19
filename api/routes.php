<?php
//NAMESPACE
define('BASE_URL','vpress/v1');
//EDITABLE: POST, PUT, PATCH
//READABLE: GET

//---- CHART ROUTES
//EDITABLE
define('GET_CHART_DATA_ROUTE','/chart/columns');
define('GET_CHART_DATA_ROUTE_TEST','/test/columns');
define('GET_CHART_DATA_ROUTE','/chart/get');
define('GET_CHART_DATA_ROUTE','/chart/list');
define('GET_CHART_DATA_ROUTE','/chart/create');
define('GET_CHART_DATA_ROUTE','/chart/update');
define('GET_CHART_DATA_ROUTE','/chart/delete');

//---- DATASET ROUTES
//READABLE
define('GET_DATASET_LIST_ROUTE','/dataset/list');
define('GET_DATASET_DATA','/dataset/(?P<dataset>(.|%20)+)');
