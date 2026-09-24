<?php
/**
 * PHP port of queryBody() in admin/src/vpress/helpers/index.js: turns a saved
 * chart config ("context") into the flat /chart/query body. Lets the server
 * build anonymous chart queries from the SAVED chart instead of trusting the
 * caller. Keep the branches in step with the JS original, quirks included.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * JS sanitizeSpaces(): backtick-quote a column name containing whitespace.
 */
function vpress_query_body_quote_spaces( $column ) {
	return ( is_string( $column ) && preg_match( '/\s/', $column ) ) ? '`' . $column . '`' : $column;
}

/**
 * JS selectAggregateFunction(): context func name to SQL aggregate (default AVG).
 */
function vpress_query_body_aggregate( $func = null ): string {
	$map = array(
		'sum'  => 'SUM',
		'mean' => 'AVG',
		'min'  => 'MIN',
		'max'  => 'MAX',
	);
	return is_string( $func ) && isset( $map[ $func ] ) ? $map[ $func ] : 'AVG';
}

/**
 * @param array       $context     Saved chart value (decoded JSON).
 * @param string      $table_name  Dataset registry slug.
 * @param string|null $data_source Dataset source; empty means WordPress.
 * @return array|WP_Error Flat query body, as the admin would send it.
 */
function vpress_query_body_from_context( array $context, string $table_name, $data_source ) {
	$invalid = new WP_Error( 'vpress_invalid_chart', __( 'Invalid chart configuration.', 'vpress' ), array( 'status' => 400 ) );

	if ( ! is_array( $context['xAxis'] ?? null ) || ! is_array( $context['yAxis'] ?? null ) ) {
		return $invalid;
	}
	$axis = function ( $key ) use ( $context ) {
		$value = is_array( $context[ $key ] ?? null ) ? $context[ $key ] : array();
		return array(
			'slug' => $value['slug'] ?? '',
			'type' => $value['type'] ?? null,
			// Absent func stays null: JS `func !== ''` is true for undefined.
			'func' => $value['func'] ?? null,
		);
	};
	$x        = $axis( 'xAxis' );
	$y        = $axis( 'yAxis' );
	$collapse = $axis( 'collapseBy' );
	$group    = $axis( 'groupBy' );
	$q        = 'vpress_query_body_quote_spaces';
	$agg      = 'vpress_query_body_aggregate';
	$is_cat   = function ( $a ) {
		return 'ordinal' === $a['type'] || 'date' === $a['type'];
	};
	$has_func = function ( $a ) {
		return ! empty( $a['func'] );
	};

	$body = array(
		'dataset'    => $data_source ? $table_name : 'vpress_' . $table_name,
		'dataSource' => $data_source ? $data_source : 'wordpress',
		'chart_type' => $context['chart'] ?? null,
		'context'    => $context,
	);

	if ( 'linear' === $x['type'] && 'linear' === $y['type'] ) {
		if ( 'total_count' === $x['slug'] && 'total_count' === $y['slug'] ) {
			return $invalid;
		}
		if ( 'total_count' === $x['slug'] || 'total_count' === $y['slug'] ) {
			$variable                     = 'total_count' !== $x['slug'] ? $x : $y;
			$body['function_operation_2'] = 'COUNT(*)';
			$body['function_alias_2']     = 'total_count';
			if ( $has_func( $variable ) ) {
				$body['column_head'] = $variable['slug'];
			} else {
				$body['aggregate_column_head'] = $q( $variable['slug'] );
				$body['aggregate_head']        = $agg( $variable['func'] );
			}
			if ( '' !== $collapse['slug'] ) {
				$body['aggregate_column_3'] = $q( $collapse['slug'] );
				$body['aggregate_3']        = $agg( $collapse['func'] );
			}
			if ( '' !== $group['slug'] ) {
				$body['linear_column_4'] = $q( $group['slug'] );
			}
		} elseif ( $has_func( $x ) || $has_func( $y ) || $has_func( $collapse ) ) {
			if ( '' !== $x['func'] ) {
				$body['aggregate_column_head'] = $q( $x['slug'] );
				$body['aggregate_head']        = $agg( $x['func'] );
			} else {
				$body['column_head'] = $q( $x['slug'] );
			}
			if ( '' !== $y['func'] ) {
				$body['aggregate_column_2'] = $q( $y['slug'] );
				$body['aggregate_2']        = $agg( $y['func'] );
			} else {
				$body['column_2'] = $q( $y['slug'] );
			}
			if ( '' !== $collapse['slug'] && $collapse['slug'] !== $x['slug'] && $collapse['slug'] !== $y['slug'] ) {
				if ( 'total_count' === $collapse['slug'] ) {
					$body['function_operation_2'] = 'COUNT(*)';
					$body['function_alias_2']     = 'total_count';
				} else {
					$body['aggregate_column_3'] = $q( $collapse['slug'] );
					// Sic: the JS original uses xAxis.func here.
					$body['aggregate_3'] = $agg( $x['func'] );
				}
			}
			if ( '' !== $group['slug'] ) {
				$body['linear_column_4'] = $q( $group['slug'] );
			}
		} else {
			$body['linear_column_head'] = $q( $x['slug'] );
			$body['linear_column_2']    = $q( $y['slug'] );
			if ( '' !== $collapse['slug'] && $collapse['slug'] !== $x['slug'] && $collapse['slug'] !== $y['slug'] ) {
				$body['linear_column_3'] = $q( $collapse['slug'] );
			}
			if ( '' !== $group['slug'] && $group['slug'] !== $x['slug'] && $group['slug'] !== $y['slug'] ) {
				$body['linear_column_4'] = $q( $group['slug'] );
			}
		}
	} elseif ( $is_cat( $x ) && $is_cat( $y ) ) {
		$body['column_head'] = $q( $x['slug'] );
		$body['column_2']    = $q( $y['slug'] );
		if ( '' !== $collapse['slug'] ) {
			if ( 'total_count' === $collapse['slug'] ) {
				$body['function_operation_2'] = 'COUNT(*)';
				$body['function_alias_2']     = 'total_count';
			} else {
				$body['aggregate_column_2'] = $q( $collapse['slug'] );
				$body['aggregate_2']        = $agg( $collapse['func'] );
			}
		}
	} elseif ( ( 'linear' === $x['type'] && $is_cat( $y ) ) || ( 'linear' === $y['type'] && $is_cat( $x ) ) ) {
		$linear  = 'linear' === $x['type'] ? $x : $y;
		$ordinal = 'linear' === $x['type'] ? $y : $x;

		$body['column_head'] = $q( $ordinal['slug'] );
		if ( 'total_count' === $linear['slug'] ) {
			$body['function_operation_2'] = 'COUNT(*)';
			$body['function_alias_2']     = 'total_count';
		} else {
			$body['aggregate_2']        = $agg( $linear['func'] );
			$body['aggregate_column_2'] = $q( $linear['slug'] );
		}
		if ( '' !== $collapse['slug'] && $collapse['slug'] !== $linear['slug'] ) {
			$body['aggregate_column_3'] = $q( $collapse['slug'] );
			$body['aggregate_3']        = $agg( $collapse['func'] );
		}
		if ( '' !== $group['slug'] && $ordinal['slug'] !== $group['slug'] ) {
			$body['column_3'] = $q( $group['slug'] );
		}
	} elseif ( ( 'linear' === $x['type'] && '' === $y['slug'] ) || ( 'linear' === $y['type'] && '' === $x['slug'] ) ) {
		$linear = 'linear' === $x['type'] ? $x : $y;

		$body['aggregate_column_head'] = $q( $linear['slug'] );
		$body['aggregate_head']        = $agg();
		if ( '' !== $collapse['slug'] && $collapse['slug'] !== $linear['slug'] ) {
			$body['aggregate_column_2'] = $q( $collapse['slug'] );
			$body['aggregate_2']        = $agg( $collapse['func'] );
		}
		if ( '' !== $group['slug'] ) {
			$body['column_2'] = $q( $group['slug'] );
		}
	} elseif ( ( '' === $y['slug'] && $is_cat( $x ) ) || ( '' === $x['slug'] && $is_cat( $y ) ) ) {
		$ordinal = $is_cat( $x ) ? $x : $y;

		$body['column_2']                = $q( $ordinal['slug'] );
		$body['function_operation_head'] = 'COUNT(*)';
		$body['function_alias_head']     = 'total_count';
		if ( '' !== $collapse['slug'] ) {
			$body['aggregate_column_3'] = $q( $collapse['slug'] );
			$body['aggregate_3']        = $agg( $collapse['func'] );
		}
		if ( '' !== $group['slug'] ) {
			$body['column_3'] = $q( $group['slug'] );
		}
	} else {
		return $invalid;
	}

	$filters = is_array( $context['filters'] ?? null ) ? $context['filters'] : array();
	if ( count( $filters ) > 0 ) {
		$body['where'] = array();
		foreach ( $filters as $clause ) {
			if ( ! is_array( $clause ) ) {
				return $invalid;
			}
			$value           = $clause['value'] ?? array();
			$body['where'][] = array(
				'op'     => ( 'ordinal' !== ( $clause['type'] ?? null ) && is_array( $value ) && 2 === count( $value ) ) ? 'BETWEEN' : 'IN',
				'column' => $q( $clause['slug'] ?? '' ),
				'value'  => $value,
			);
		}
	}

	$order_by         = is_array( $context['orderBy'] ?? null ) ? $context['orderBy'] : array();
	$order_slug       = $order_by['slug'] ?? '';
	$body['order_by'] = '' === $order_slug ? null : $order_slug . ' ' . strtoupper( (string) ( $order_by['order'] ?? '' ) );

	return $body;
}
