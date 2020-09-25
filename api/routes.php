<?php
//NAMESPACE
define('BASE_URL','vpress/v1');
//EDITABLE: POST, PUT, PATCH
//READABLE: GET

//---- CHART ROUTES
define('GET_CHART_ROUTE','/chart/get/(?P<id>[\d]+)');
define('LIST_CHART_ROUTE','/chart/list');
define('CREATE_CHART_ROUTE','/chart/create');
define('UPDATE_CHART_ROUTE','/chart/update');
define('DELETE_CHART_ROUTE','/chart/delete');
//EDITABLE
define('QUERY_CHART_DATA', '/chart/query');
define('GET_CHART_DATA_ROUTE','/chart/columns');
define('GET_CHART_DATA_ROUTE_TEST','/test/columns');
//---- DATASET ROUTES
//READABLE
define('UPLOAD_DATASET','/dataset/upload');
define('GET_DATASET_ROUTE','/dataset/get/(?P<id>[\d]+)');
define('LIST_DATASET_ROUTE','/dataset/list');
define('CREATE_DATASET_ROUTE','/dataset/create');
define('UPDATE_DATASET_ROUTE','/dataset/update');
define('DELETE_DATASET_ROUTE','/dataset/delete');
define('GET_DATASET_LIST_ROUTE','/dataset/list');
define('GET_DATASET_LIST_INFO', '/dataset/info/(?P<column>(.|%20)+)/(?P<value>(.|%20)+)');
define('GET_DATASET_DATA','/dataset/(?P<dataset>(.|%20)+)');
