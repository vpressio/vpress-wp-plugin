<?php
/**
 * Minimal WordPress shims for unit-testing the Vpress REST services
 * without loading WordPress. Only what the services under test touch.
 */

define( 'ABSPATH', __DIR__ . '/' );
define( 'OBJECT', 'OBJECT' );
define( 'ARRAY_A', 'ARRAY_A' );
// Debug output is gated on edit_posts AND WP_DEBUG; tests vary the capability.
define( 'WP_DEBUG', true );
define( 'VPRESS_VERSION', '0.2.0-test' );
define( 'VPRESS_PLUGIN_FILE', '/srv/wp-content/plugins/vpress/vpress.php' );

// error_log() goes to a file the tests can read, never to the console.
$GLOBALS['vpress_test_error_log'] = tempnam( sys_get_temp_dir(), 'vpress-phpunit-log-' );
ini_set( 'error_log', $GLOBALS['vpress_test_error_log'] );

class WP_Error {
	private $code;
	private $message;
	private $data;

	public function __construct( $code = '', $message = '', $data = '' ) {
		$this->code    = $code;
		$this->message = $message;
		$this->data    = $data;
	}

	public function get_error_code() {
		return $this->code;
	}

	public function get_error_message() {
		return $this->message;
	}

	public function get_error_data() {
		return $this->data;
	}
}

function is_wp_error( $thing ) {
	return $thing instanceof WP_Error;
}

/** Filter callbacks by hook name; tests set this directly. Passthrough otherwise. */
$GLOBALS['vpress_test_filters'] = array();

function apply_filters( $hook_name, $value, ...$args ) {
	if ( isset( $GLOBALS['vpress_test_filters'][ $hook_name ] ) ) {
		return call_user_func( $GLOBALS['vpress_test_filters'][ $hook_name ], $value, ...$args );
	}
	return $value;
}

function __( $text, $domain = 'default' ) {
	return $text;
}

function esc_html__( $text, $domain = 'default' ) {
	return esc_html( $text );
}

function _n( $single, $plural, $number, $domain = 'default' ) {
	return 1 === (int) $number ? $single : $plural;
}

/** English-locale number_format_i18n(). */
function number_format_i18n( $number, $decimals = 0 ) {
	return number_format( (float) $number, (int) $decimals );
}

function esc_attr( $text ) {
	return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
}

function esc_html( $text ) {
	return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
}

function esc_url( $url ) {
	$url = (string) $url;
	if ( ! preg_match( '#^https?://#i', $url ) ) {
		return '';
	}
	return htmlspecialchars( $url, ENT_QUOTES, 'UTF-8' );
}

function rest_url( $path = '' ) {
	return 'http://example.test/wp-json/' . ltrim( $path, '/' );
}

function plugins_url( $path = '', $plugin = '' ) {
	return 'http://example.test/wp-content/plugins/' . basename( dirname( $plugin ) ) . '/' . ltrim( $path, '/' );
}

/** Whether the fake visitor is logged in. */
$GLOBALS['vpress_test_logged_in'] = false;

function is_user_logged_in() {
	return $GLOBALS['vpress_test_logged_in'];
}

function wp_create_nonce( $action = -1 ) {
	return 'nonce-' . $action;
}

function shortcode_atts( $pairs, $atts, $shortcode = '' ) {
	$atts = (array) $atts;
	$out  = array();
	foreach ( $pairs as $name => $default ) {
		$out[ $name ] = array_key_exists( $name, $atts ) ? $atts[ $name ] : $default;
	}
	return $out;
}

function add_shortcode( $tag, $callback ) {
	$GLOBALS['vpress_test_shortcodes'][ $tag ] = $callback;
}

/** Recorded calls to the enqueue APIs, inspected by the tests. */
$GLOBALS['vpress_test_calls'] = array();

function vpress_test_record( $fn, $args ) {
	$GLOBALS['vpress_test_calls'][] = array( $fn, $args );
}

function wp_register_script_module( $id, $src, $deps = array(), $version = false ) {
	vpress_test_record( __FUNCTION__, func_get_args() );
}

function wp_enqueue_script_module( $id ) {
	vpress_test_record( __FUNCTION__, func_get_args() );
}

function wp_enqueue_style( $handle, $src = '', $deps = array(), $ver = false ) {
	vpress_test_record( __FUNCTION__, func_get_args() );
}

/** Capabilities granted to the "current user"; tests set this directly. */
$GLOBALS['vpress_test_caps'] = array();

function current_user_can( $capability ) {
	return in_array( $capability, $GLOBALS['vpress_test_caps'], true );
}

function rest_ensure_response( $response ) {
	return $response;
}

/** Stand-in for WP_REST_Request: JSON body + query/url params. */
class FakeRestRequest implements ArrayAccess {
	private $json;
	private $params;
	private $route;

	public function __construct( array $params = array(), array $json = array(), string $route = '' ) {
		$this->params = $params;
		$this->json   = $json;
		$this->route  = $route;
	}

	public function get_route() {
		return $this->route;
	}

	public function get_json_params() {
		return $this->json;
	}

	public function get_param( $key ) {
		if ( array_key_exists( $key, $this->params ) ) {
			return $this->params[ $key ];
		}
		return $this->json[ $key ] ?? null;
	}

	public function offsetExists( mixed $offset ): bool {
		return null !== $this->get_param( $offset );
	}

	public function offsetGet( mixed $offset ): mixed {
		return $this->get_param( $offset );
	}

	public function offsetSet( mixed $offset, mixed $value ): void {
		$this->params[ $offset ] = $value;
	}

	public function offsetUnset( mixed $offset ): void {
		unset( $this->params[ $offset ] );
	}
}

/** Stand-in for WP_REST_Response: data, status and headers. */
class WP_REST_Response {
	private $data;
	private $status;
	private $headers = array();

	public function __construct( $data = null, $status = 200, $headers = array() ) {
		$this->data    = $data;
		$this->status  = $status;
		$this->headers = $headers;
	}

	public function get_data() {
		return $this->data;
	}

	public function get_status() {
		return $this->status;
	}

	public function header( $key, $value, $replace = true ) {
		$this->headers[ $key ] = $value;
	}

	public function get_headers() {
		return $this->headers;
	}
}

/**
 * wpdb double: prepare() follows WordPress semantics; every read/write
 * records its SQL and returns whatever the test scripted for the first
 * responder whose regex matches.
 */
class FakeWpdb {
	public $prefix     = 'wp_';
	public $options    = 'wp_options';
	public $last_query = '';
	public $last_error = '';
	public $insert_id  = 0;
	public $queries    = array();
	private $responders = array();
	private $failures   = array();

	public function on( string $pattern, $result ): void {
		$this->responders[] = array( $pattern, $result );
	}

	/** Makes queries matching $pattern set last_error, like a failing MySQL call. */
	public function fail_on( string $pattern, string $error ): void {
		$this->failures[] = array( $pattern, $error );
	}

	public function prepare( $query, ...$args ) {
		if ( 1 === count( $args ) && is_array( $args[0] ) ) {
			$args = $args[0];
		}
		$query = str_replace( array( "'%s'", '"%s"' ), '%s', $query );
		return preg_replace_callback(
			'/%%|%[sdf]/',
			function ( $m ) use ( &$args ) {
				if ( '%%' === $m[0] ) {
					return '%';
				}
				$value = array_shift( $args );
				if ( '%d' === $m[0] ) {
					return (string) intval( $value );
				}
				if ( '%f' === $m[0] ) {
					return (string) floatval( $value );
				}
				return "'" . addslashes( (string) $value ) . "'";
			},
			$query
		);
	}

	public function get_charset_collate() {
		return 'DEFAULT CHARSET=utf8mb4';
	}

	public function esc_like( $text ) {
		return addcslashes( $text, '_%\\' );
	}

	public function get_results( $sql, $output = OBJECT ) {
		return $this->respond( $sql ) ?? array();
	}

	public function get_row( $sql, $output = OBJECT ) {
		$result = $this->respond( $sql );
		if ( is_array( $result ) && array_is_list( $result ) ) {
			return $result[0] ?? null;
		}
		return $result;
	}

	public function get_var( $sql ) {
		$result = $this->respond( $sql );
		if ( is_array( $result ) ) {
			$row = $result[0] ?? null;
			if ( null === $row ) {
				return null;
			}
			$values = array_values( (array) $row );
			return $values[0] ?? null;
		}
		return $result;
	}

	public function get_col( $sql ) {
		return $this->respond( $sql ) ?? array();
	}

	public function query( $sql ) {
		return $this->respond( $sql ) ?? 0;
	}

	public function delete( $table, $where, $format = null ) {
		return $this->respond( "DELETE FROM $table" ) ?? 1;
	}

	/** Every insert()/update() call, verbatim: array( op, table, data, where ). */
	public $writes = array();

	public function insert( $table, $data, $format = null ) {
		$this->writes[] = array( 'insert', $table, $data, null );
		$result = $this->respond( "INSERT INTO $table" );
		if ( '' === $this->last_error ) {
			++$this->insert_id;
		}
		return $result ?? 1;
	}

	public function update( $table, $data, $where, $format = null, $where_format = null ) {
		$this->writes[] = array( 'update', $table, $data, $where );
		return $this->respond( "UPDATE $table" ) ?? 1;
	}

	private function respond( $sql ) {
		$this->last_query = $sql;
		$this->queries[]  = $sql;
		$this->last_error = '';
		foreach ( $this->failures as list( $pattern, $error ) ) {
			if ( preg_match( $pattern, $sql ) ) {
				$this->last_error = $error;
				return null;
			}
		}
		foreach ( $this->responders as list( $pattern, $result ) ) {
			if ( preg_match( $pattern, $sql ) ) {
				return $result;
			}
		}
		return null;
	}
}

/**
 * Minimal $wpdb for FigureTest: get_row() returns the seeded chart row when
 * the prepared query asks for its id; everything else finds nothing.
 */
class Vpress_Test_Wpdb {
	public $prefix     = 'wp_';
	public $rows       = array();
	public $last_query = '';
	public $last_error = '';

	public function prepare( $query, ...$args ) {
		return vsprintf( $query, array_map( 'intval', $args ) );
	}

	public function get_row( $query ) {
		$this->last_query = $query;
		if ( preg_match( '/FROM wp_vpresscore_charts WHERE id = (\d+)/', $query, $m ) && isset( $this->rows[ (int) $m[1] ] ) ) {
			return (object) $this->rows[ (int) $m[1] ];
		}
		return null;
	}
}

// Block API shims for BlocksTest (vpress/chart registration and render.php).
define( 'VPRESS_PLUGIN_DIR', dirname( __DIR__, 2 ) . '/' );

/** What get_block_wrapper_attributes() returns for the block being rendered. */
$GLOBALS['vpress_test_wrapper'] = 'class="wp-block-vpress-chart"';

/** Editor script handles register_block_type_from_metadata() reports. */
$GLOBALS['vpress_test_editor_handles'] = array( 'vpress-chart-editor-script' );

function get_block_wrapper_attributes( $extra_attributes = array() ) {
	return $GLOBALS['vpress_test_wrapper'];
}

function register_block_type_from_metadata( $file_or_folder, $args = array() ) {
	vpress_test_record( __FUNCTION__, func_get_args() );
	$block                        = new stdClass();
	$block->name                  = 'vpress/chart';
	$block->editor_script_handles = $GLOBALS['vpress_test_editor_handles'];
	return $block;
}

function wp_add_inline_script( $handle, $data, $position = 'after' ) {
	vpress_test_record( __FUNCTION__, func_get_args() );
	return true;
}

function wp_json_encode( $data, $options = 0, $depth = 512 ) {
	return json_encode( $data, $options, $depth );
}

function home_url( $path = '' ) {
	return 'http://example.test/' . ltrim( (string) $path, '/' );
}

function get_bloginfo( $show = '' ) {
	return 'name' === $show ? 'Datos Abiertos MX' : '';
}

/** add_query_arg( $key, $value, $url ) form only. */
function add_query_arg( $key, $value, $url ) {
	return $url . ( false === strpos( $url, '?' ) ? '?' : '&' ) . rawurlencode( $key ) . '=' . rawurlencode( (string) $value );
}

/** Site timezone for wp_date(); tests may change it. */
$GLOBALS['vpress_test_timezone'] = 'UTC';

function wp_date( $format, $timestamp = null, $timezone = null ) {
	$timezone = $timezone ?? new DateTimeZone( $GLOBALS['vpress_test_timezone'] );
	return ( new DateTimeImmutable( '@' . ( $timestamp ?? time() ) ) )->setTimezone( $timezone )->format( $format );
}

function admin_url( $path = '' ) {
	return 'http://example.test/wp-admin/' . ltrim( $path, '/' );
}

// Plugin boot order: the figure is required before the API services.
require_once dirname( __DIR__, 2 ) . '/includes/class-vpress-figure.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-vpress-figure-text.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-vpress-figure-source.php';
require_once dirname( __DIR__, 2 ) . '/includes/vpress-shortcode.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-vpress-blocks.php';
if ( ! defined( 'KB_IN_BYTES' ) ) {
	define( 'KB_IN_BYTES', 1024 );
	define( 'MB_IN_BYTES', 1024 * KB_IN_BYTES );
	define( 'MINUTE_IN_SECONDS', 60 );
	define( 'HOUR_IN_SECONDS', 60 * MINUTE_IN_SECONDS );
	define( 'DAY_IN_SECONDS', 24 * HOUR_IN_SECONDS );
	define( 'WEEK_IN_SECONDS', 7 * DAY_IN_SECONDS );
}

/** dbDelta routes each statement through $wpdb->query() so tests see it. */
function dbDelta( $queries ) {
	foreach ( (array) $queries as $sql ) {
		$GLOBALS['wpdb']->query( $sql );
	}
	return array();
}

/** Options, transients and the cron schedule; tests read and seed these directly. */
$GLOBALS['vpress_test_options']    = array();
$GLOBALS['vpress_test_transients'] = array();
$GLOBALS['vpress_test_cron']       = array();

function get_option( $name, $default = false ) {
	return array_key_exists( $name, $GLOBALS['vpress_test_options'] ) ? $GLOBALS['vpress_test_options'][ $name ] : $default;
}

function update_option( $name, $value ) {
	$GLOBALS['vpress_test_options'][ $name ] = $value;
	return true;
}

function add_option( $name, $value = '' ) {
	if ( array_key_exists( $name, $GLOBALS['vpress_test_options'] ) ) {
		return false;
	}
	$GLOBALS['vpress_test_options'][ $name ] = $value;
	return true;
}

function get_transient( $name ) {
	return $GLOBALS['vpress_test_transients'][ $name ] ?? false;
}

function set_transient( $name, $value, $expiration = 0 ) {
	$GLOBALS['vpress_test_transients'][ $name ] = $value;
	return true;
}

function delete_transient( $name ) {
	unset( $GLOBALS['vpress_test_transients'][ $name ] );
	return true;
}

function wp_next_scheduled( $hook ) {
	return $GLOBALS['vpress_test_cron'][ $hook ]['timestamp'] ?? false;
}

function wp_schedule_event( $timestamp, $recurrence, $hook ) {
	$GLOBALS['vpress_test_cron'][ $hook ] = array( 'timestamp' => $timestamp, 'recurrence' => $recurrence );
	return true;
}

function wp_clear_scheduled_hook( $hook ) {
	unset( $GLOBALS['vpress_test_cron'][ $hook ] );
	return 1;
}

/** "Now" for current_time(); tests pin it (UTC, MySQL format). */
$GLOBALS['vpress_test_now'] = '2026-09-24 12:00:00';

function current_time( $type, $gmt = 0 ) {
	return 'mysql' === $type ? $GLOBALS['vpress_test_now'] : strtotime( $GLOBALS['vpress_test_now'] . ' UTC' );
}

function get_current_user_id() {
	return 7;
}

/** wp_strip_all_tags(): script/style elements go with their contents. */
function wp_strip_all_tags( $text ) {
	return strip_tags( preg_replace( '@<(script|style)[^>]*?>.*?</\\1>@si', '', (string) $text ) );
}

function sanitize_text_field( $str ) {
	return trim( preg_replace( '/[\r\n\t ]+/', ' ', wp_strip_all_tags( (string) $str ) ) );
}

/** sanitize_textarea_field(): like sanitize_text_field() but keeps line breaks. */
function sanitize_textarea_field( $str ) {
	$lines = preg_split( '/\r\n|\r|\n/', wp_strip_all_tags( (string) $str ) );
	return trim( implode( "\n", array_map( static fn( $l ) => trim( preg_replace( '/[\t ]+/', ' ', $l ) ), $lines ) ) );
}

/** esc_url_raw(): http(s) URLs pass unchanged, anything else becomes ''. */
function esc_url_raw( $url ) {
	$url = trim( (string) $url );
	return preg_match( '#^https?://[^\s<>"]+$#i', $url ) ? $url : '';
}

function delete_option( $name ) {
	unset( $GLOBALS['vpress_test_options'][ $name ] );
	return true;
}

function is_multisite() {
	return false;
}

function trailingslashit( $value ) {
	return rtrim( $value, '/\\' ) . '/';
}

function wp_parse_url( $url, $component = -1 ) {
	return parse_url( $url, $component );
}

/**
 * wp_http_validate_url(): http(s) with a host; URLs listed in
 * $GLOBALS['vpress_test_rejected_urls'] are refused (the private/loopback verdict).
 */
$GLOBALS['vpress_test_rejected_urls'] = array();

function wp_http_validate_url( $url ) {
	if ( in_array( $url, $GLOBALS['vpress_test_rejected_urls'], true ) ) {
		return false;
	}
	$parts = parse_url( (string) $url );
	if ( ! $parts || empty( $parts['host'] ) || ! in_array( $parts['scheme'] ?? '', array( 'http', 'https' ), true ) ) {
		return false;
	}
	return $url;
}

/** Scripted HTTP: $GLOBALS['vpress_test_http'] = fn( $url, $args ) => response|WP_Error. */
$GLOBALS['vpress_test_http']       = null;
$GLOBALS['vpress_test_http_calls'] = array();

function wp_safe_remote_get( $url, $args = array() ) {
	$GLOBALS['vpress_test_http_calls'][] = array( $url, $args );
	return call_user_func( $GLOBALS['vpress_test_http'], $url, $args );
}

function wp_remote_retrieve_response_code( $response ) {
	return is_array( $response ) ? ( $response['response']['code'] ?? '' ) : '';
}

function wp_upload_dir() {
	return array( 'basedir' => $GLOBALS['vpress_test_upload_dir'] );
}

$GLOBALS['vpress_test_upload_dir'] = sys_get_temp_dir() . '/vpress-phpunit-' . getmypid();
register_shutdown_function(
	function () {
		$dir = $GLOBALS['vpress_test_upload_dir'];
		if ( is_dir( $dir ) ) {
			foreach ( new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $dir, FilesystemIterator::SKIP_DOTS ), RecursiveIteratorIterator::CHILD_FIRST ) as $f ) {
				$f->isDir() ? rmdir( $f->getPathname() ) : unlink( $f->getPathname() );
			}
			rmdir( $dir );
		}
	}
);

function wp_mkdir_p( $dir ) {
	return is_dir( $dir ) || mkdir( $dir, 0777, true );
}

function wp_generate_password( $length = 12, $special_chars = true ) {
	return substr( bin2hex( random_bytes( $length ) ), 0, $length );
}

function wp_delete_file( $file ) {
	if ( file_exists( $file ) ) {
		unlink( $file );
	}
}

/** Writes a CSV fixture under the fake uploads dir and returns its path. */
function vpress_test_csv( string $contents ): string {
	$dir = $GLOBALS['vpress_test_upload_dir'] . '/fixtures';
	wp_mkdir_p( $dir );
	$path = $dir . '/' . wp_generate_password( 12, false ) . '.csv';
	file_put_contents( $path, $contents );
	return $path;
}

require_once dirname( __DIR__, 2 ) . '/api/services/chart.php';
require_once dirname( __DIR__, 2 ) . '/api/services/dataset.php';
require_once dirname( __DIR__, 2 ) . '/api/services/import.php';
require_once dirname( __DIR__, 2 ) . '/api/services/class-vpress-sources.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-vpress-upgrader.php';
require_once __DIR__ . '/fixtures.php';
