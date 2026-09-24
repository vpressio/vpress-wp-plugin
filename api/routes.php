<?php
//NAMESPACE
define('VPRESS_API_BASE_URL','vpress/v1');
//EDITABLE: POST, PUT, PATCH
//READABLE: GET

//---- CHART ROUTES
define('VPRESS_API_GET_CHART_ROUTE','/chart/get/(?P<id>[\d]+)');
define('VPRESS_API_LIST_CHART_ROUTE','/chart/list');
define('VPRESS_API_CREATE_CHART_ROUTE','/chart/create');
define('VPRESS_API_UPDATE_CHART_ROUTE','/chart/update');
define('VPRESS_API_DELETE_CHART_ROUTE','/chart/delete');
define('VPRESS_API_IMAGE_CHART_ROUTE','/chart/image');
define('VPRESS_API_UPDATE_IMAGE_URL_CHART_ROUTE','/chart/update_image_url');
//EDITABLE
define('VPRESS_API_QUERY_CHART_DATA', '/chart/query');
define('VPRESS_API_GET_CHART_DATA_ROUTE','/chart/columns');
//---- DATASET ROUTES
//READABLE
define('VPRESS_API_UPLOAD_DATASET','/dataset/upload');
define('VPRESS_API_GET_DATASET_ROUTE','/dataset/get/(?P<id>[\d]+)');
define('VPRESS_API_GET_DATASET_CHARTS_ROUTE','/dataset/charts/(?P<id>[\d]+)');
define('VPRESS_API_LIST_DATASET_ROUTE','/dataset/list/');
define('VPRESS_API_CREATE_DATASET_ROUTE','/dataset/create');
define('VPRESS_API_UPDATE_DATASET_ROUTE','/dataset/update');
define('VPRESS_API_DELETE_DATASET_ROUTE','/dataset/delete');
define('VPRESS_API_GET_DATASET_DATA','/dataset/data/(?P<dataset>(.|%20)+)');

define('VPRESS_API_IMPORT_START','/import/start');
define('VPRESS_API_IMPORT_CHUNK','/import/chunk');
define('VPRESS_API_IMPORT_FINISH_UPLOAD','/import/finish-upload');
define('VPRESS_API_IMPORT_TICK','/import/tick');
define('VPRESS_API_IMPORT_ABORT','/import/abort');

define('VPRESS_API_DELETE_COLUMN_DATASET_ROUTE','/dataset/column/delete');
define('VPRESS_API_RENAME_COLUMN_DATASET_ROUTE','/dataset/column/rename');
define('VPRESS_API_CHANGE_DATA_TYPE_COLUMN_DATASET_ROUTE','/dataset/column/change_data_type');
