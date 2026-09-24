<?php
/**
 * Minimal WordPress shims for unit-testing the Vpress REST services
 * without loading WordPress. Only what the services under test touch.
 */

define( 'ABSPATH', __DIR__ . '/' );
define( 'OBJECT', 'OBJECT' );
define( 'ARRAY_A', 'ARRAY_A' );

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

function apply_filters( $hook_name, $value, ...$args ) {
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
	public $last_query = '';
	public $last_error = '';
	public $insert_id  = 0;
	public $queries    = array();
	private $responders = array();

	public function on( string $pattern, $result ): void {
		$this->responders[] = array( $pattern, $result );
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

	private function respond( $sql ) {
		$this->last_query = $sql;
		$this->queries[]  = $sql;
		foreach ( $this->responders as list( $pattern, $result ) ) {
			if ( preg_match( $pattern, $sql ) ) {
				return $result;
			}
		}
		return null;
	}
}

require_once dirname( __DIR__, 2 ) . '/api/services/chart.php';
require_once dirname( __DIR__, 2 ) . '/api/services/dataset.php';
require_once __DIR__ . '/fixtures.php';
