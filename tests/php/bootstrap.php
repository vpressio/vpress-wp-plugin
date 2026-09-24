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
define( 'VPRESS_VERSION', '0.3.0' );

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
	return $text;
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

	public function __construct( array $params = array(), array $json = array() ) {
		$this->params = $params;
		$this->json   = $json;
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

function sanitize_text_field( $str ) {
	return trim( preg_replace( '/[\r\n\t ]+/', ' ', strip_tags( (string) $str ) ) );
}

function wp_json_encode( $data ) {
	return json_encode( $data );
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
