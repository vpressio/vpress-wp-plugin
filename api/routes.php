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
define('IMAGE_CHART_ROUTE','/chart/image');
define('UPDATE_IMAGE_URL_CHART_ROUTE','/chart/update_image_url');
//EDITABLE
define('QUERY_CHART_DATA', '/chart/query');
define('GET_CHART_DATA_ROUTE','/chart/columns');
define('GET_CHART_DATA_ROUTE_TEST','/test/columns');
//---- DATASET ROUTES
//READABLE
define('UPLOAD_DATASET','/dataset/upload');
define('GET_DATASET_ROUTE','/dataset/get/(?P<id>[\d]+)');
define('GET_DATASET_CHARTS_ROUTE','/dataset/charts/(?P<id>[\d]+)');
define('LIST_DATASET_ROUTE','/dataset/list');
define('CREATE_DATASET_ROUTE','/dataset/create');
define('UPDATE_DATASET_ROUTE','/dataset/update');
define('DELETE_DATASET_ROUTE','/dataset/delete');
define('GET_DATASET_DATA','/dataset/data/(?P<dataset>(.|%20)+)');

define('DELETE_COLUMN_DATASET_ROUTE','/dataset/column/delete');
define('RENAME_COLUMN_DATASET_ROUTE','/dataset/column/rename');
define('CHANGE_DATA_TYPE_COLUMN_DATASET_ROUTE','/dataset/column/change_data_type');
