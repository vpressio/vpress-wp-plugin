<?php
/**
 * What REST responses may reveal about the database. SQL text and raw
 * database errors are shown only to edit_posts users on WP_DEBUG sites;
 * everyone else gets no SQL and a generic error message.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function vpress_can_see_sql(): bool {
	return current_user_can( 'edit_posts' ) && defined( 'WP_DEBUG' ) && WP_DEBUG;
}

/**
 * Value for a response's 'query' field: the SQL, or null.
 */
function vpress_debug_sql( $sql ) {
	return vpress_can_see_sql() ? $sql : null;
}

/**
 * The raw database error, or a generic message.
 */
function vpress_debug_text( $detail ): string {
	$detail = (string) $detail;
	return ( '' !== $detail && vpress_can_see_sql() ) ? $detail : __( 'A database error occurred.', 'vpress' );
}

function vpress_db_error( $detail, int $status = 400, string $code = 'db_error' ): WP_Error {
	return new WP_Error( $code, vpress_debug_text( $detail ), array( 'status' => $status ) );
}
