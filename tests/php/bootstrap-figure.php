<?php
/**
 * Self-contained bootstrap for FigureTest: just enough WordPress to exercise
 * includes/class-vpress-figure.php without a database or a WP install.
 *
 * Usage: php bin/phpunit.phar --bootstrap tests/php/bootstrap-figure.php tests/php/FigureTest.php
 *
 * @package Vpress
 */

define( 'ABSPATH', __DIR__ . '/' );
define( 'VPRESS_VERSION', '0.2.0-test' );
define( 'VPRESS_PLUGIN_FILE', '/srv/wp-content/plugins/vpress/vpress.php' );

/** Recorded calls to the enqueue APIs, inspected by the tests. */
$GLOBALS['vpress_test_calls'] = array();
/** Capabilities the fake current user holds. */
$GLOBALS['vpress_test_caps'] = array();
/** Filters: name => callable. */
$GLOBALS['vpress_test_filters'] = array();

function vpress_test_record( $fn, $args ) {
	$GLOBALS['vpress_test_calls'][] = array( $fn, $args );
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

function __( $text, $domain = 'default' ) {
	return $text;
}

function rest_url( $path = '' ) {
	return 'http://example.test/wp-json/' . ltrim( $path, '/' );
}

function plugins_url( $path = '', $plugin = '' ) {
	return 'http://example.test/wp-content/plugins/' . basename( dirname( $plugin ) ) . '/' . ltrim( $path, '/' );
}

function current_user_can( $cap ) {
	return in_array( $cap, $GLOBALS['vpress_test_caps'], true );
}

function apply_filters( $name, $value ) {
	if ( isset( $GLOBALS['vpress_test_filters'][ $name ] ) ) {
		return call_user_func( $GLOBALS['vpress_test_filters'][ $name ], $value );
	}
	return $value;
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

/**
 * $wpdb fake: get_row() returns the scripted row when the prepared query
 * asks for its id.
 */
class Vpress_Test_Wpdb {
	public $prefix = 'wp_';
	public $rows   = array();
	public $last_query = '';

	public function prepare( $query, ...$args ) {
		return vsprintf( str_replace( '%d', '%d', $query ), array_map( 'intval', $args ) );
	}

	public function get_row( $query ) {
		$this->last_query = $query;
		if ( preg_match( '/FROM wp_vpresscore_charts WHERE id = (\d+)/', $query, $m ) && isset( $this->rows[ (int) $m[1] ] ) ) {
			return (object) $this->rows[ (int) $m[1] ];
		}
		return null;
	}
}

$GLOBALS['wpdb'] = new Vpress_Test_Wpdb();

require_once dirname( __DIR__, 2 ) . '/includes/class-vpress-figure.php';
