<?php
/**
 * Server-side text alternative for a chart figure.
 *
 * Runs the saved chart's query through the hardened REST query path (the
 * functions in api/services/, loaded at plugin boot) and turns the rows into
 * a deterministic one-paragraph description plus a data-table fallback, so
 * the figure is understandable without JavaScript, colour or a pointer.
 *
 * @package    Vpress
 * @subpackage Vpress/includes
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Maximum rows printed in the data-table fallback. */
const VPRESS_FIGURE_TABLE_MAX_ROWS = 200;

/** Maximum rows the server fetches for the text alternative (the builder's LIMIT clamp). */
const VPRESS_FIGURE_QUERY_MAX_ROWS = 5000;

/**
 * Whether a result stopped at the row bound (so more rows may exist).
 *
 * @param array $rows Rows from vpress_figure_rows().
 * @return bool
 */
function vpress_figure_rows_truncated( array $rows ): bool {
	return count( $rows ) >= VPRESS_FIGURE_QUERY_MAX_ROWS;
}

/**
 * " (first 5,000 rows)", appended where a description or table is partial.
 *
 * @return string
 */
function vpress_figure_partial_suffix(): string {
	/* translators: %s: number of rows the description is based on. */
	return sprintf( __( ' (first %s rows)', 'vpress' ), number_format_i18n( VPRESS_FIGURE_QUERY_MAX_ROWS ) );
}

/**
 * The per-request rows cache, by reference (keyed by chart id).
 *
 * @return array
 */
function &vpress_figure_rows_cache(): array {
	static $cache = array();
	return $cache;
}

/**
 * Test-only: empties the rows cache.
 *
 * @return void
 */
function vpress_figure_rows_reset(): void {
	$cache = &vpress_figure_rows_cache();
	$cache = array();
}

/**
 * The saved chart's config (decoded `value`), or an empty array.
 *
 * @param object $chart Chart row.
 * @return array
 */
function vpress_figure_config( $chart ): array {
	$values = json_decode( (string) ( $chart->value ?? '' ), true );
	return is_array( $values ) ? $values : array();
}

/**
 * The chart's display title: `charts.title`, else `value.title`, else ''.
 *
 * @param object $chart Chart row.
 * @return string
 */
function vpress_figure_title( $chart ): string {
	if ( isset( $chart->title ) && '' !== trim( (string) $chart->title ) ) {
		return (string) $chart->title;
	}
	$values = vpress_figure_config( $chart );
	return isset( $values['title'] ) && is_string( $values['title'] ) ? $values['title'] : '';
}

/**
 * Run the saved chart's query and return its rows.
 *
 * Uses the same path as an anonymous `/chart/query` for a saved chart: the
 * dataset row by `chart.dataset_id`, `vpress_query_body_from_context()`, the
 * quoted physical table from the dataset slug, and the strict
 * `vpress_build_chart_sql()` against the table's real columns. The caller has
 * already decided the visitor may see the chart (`vpress_get_public_chart()`).
 * Cached per request by chart id.
 *
 * @param object $chart Chart row from `{prefix}vpresscore_charts`.
 * @return array|WP_Error List of associative rows.
 */
function vpress_figure_rows( object $chart ) {
	global $wpdb;

	$chart_id = (int) ( $chart->id ?? 0 );
	$cache    = &vpress_figure_rows_cache();
	if ( array_key_exists( $chart_id, $cache ) ) {
		return $cache[ $chart_id ];
	}

	$cache[ $chart_id ] = vpress_figure_query_rows( $chart, $wpdb );
	return $cache[ $chart_id ];
}

/**
 * Uncached body of vpress_figure_rows().
 *
 * @param object $chart Chart row.
 * @param wpdb   $wpdb  Database.
 * @return array|WP_Error
 */
function vpress_figure_query_rows( $chart, $wpdb ) {
	if ( ! function_exists( 'vpress_build_chart_sql' ) || ! function_exists( 'vpress_query_body_from_context' ) ) {
		return new WP_Error( 'vpress_query_unavailable', __( 'The chart query service is not loaded.', 'vpress' ) );
	}

	$context = json_decode( (string) ( $chart->value ?? '' ), true );
	if ( ! is_array( $context ) ) {
		return new WP_Error( 'vpress_invalid_chart', __( 'Invalid chart configuration.', 'vpress' ) );
	}

	$dataset = $wpdb->get_row(
		$wpdb->prepare( "SELECT slug, source FROM {$wpdb->prefix}vpresscore_datasets WHERE id = %d", (int) ( $chart->dataset_id ?? 0 ) )
	);
	if ( ! $dataset ) {
		return new WP_Error( 'vpress_dataset_not_found', __( 'Dataset not found.', 'vpress' ) );
	}

	$table = vpress_guard_slug_table( (string) $dataset->slug );
	if ( null === $table ) {
		return vpress_guard_unknown_dataset();
	}

	$body = vpress_query_body_from_context( $context, (string) $dataset->slug, $dataset->source );
	if ( is_wp_error( $body ) ) {
		return $body;
	}
	$body['dataset'] = $table;
	// Bound the fetch; the builder clamps any limit to 1..5000 itself.
	if ( empty( $body['limit'] ) ) {
		$body['limit'] = VPRESS_FIGURE_QUERY_MAX_ROWS;
	}

	$sql = vpress_build_chart_sql( $body, vpress_guard_columns( $table ), $wpdb );
	if ( is_wp_error( $sql ) ) {
		return $sql;
	}

	$rows = $wpdb->get_results( $sql, ARRAY_A );
	if ( $wpdb->last_error ) {
		return new WP_Error( 'db_error', (string) $wpdb->last_error );
	}

	return array_values( array_map( 'vpress_figure_row_array', is_array( $rows ) ? $rows : array() ) );
}

/**
 * Normalise one result row to an associative array of strings (or null).
 *
 * @param array|object $row Result row.
 * @return array
 */
function vpress_figure_row_array( $row ): array {
	$out = array();
	foreach ( (array) $row as $key => $value ) {
		$out[ (string) $key ] = null === $value ? null : (string) $value;
	}
	return $out;
}

/**
 * An axis of the chart config: slug, title, type and func (empty when unset).
 *
 * @param array  $values Chart config.
 * @param string $key    xAxis, yAxis, groupBy or collapseBy.
 * @return array{slug:string,title:string,type:string,func:string}
 */
function vpress_figure_axis( array $values, string $key ): array {
	$axis = isset( $values[ $key ] ) && is_array( $values[ $key ] ) ? $values[ $key ] : array();
	$slug = isset( $axis['slug'] ) && is_scalar( $axis['slug'] ) ? (string) $axis['slug'] : '';
	return array(
		'slug'  => $slug,
		'title' => isset( $axis['title'] ) && is_scalar( $axis['title'] ) && '' !== trim( (string) $axis['title'] ) ? (string) $axis['title'] : $slug,
		'type'  => isset( $axis['type'] ) && is_string( $axis['type'] ) ? $axis['type'] : '',
		'func'  => isset( $axis['func'] ) && is_string( $axis['func'] ) ? $axis['func'] : '',
	);
}

/**
 * Format a number with the chart's decimals, prefix and suffix.
 *
 * Without a configured `decimals`, whole numbers print with none and others
 * with two, so the output never depends on float noise.
 *
 * @param float|int|string $number Value.
 * @param array            $values Chart config.
 * @return string
 */
function vpress_figure_format_number( $number, array $values ): string {
	$number = (float) $number;
	if ( isset( $values['decimals'] ) && is_numeric( $values['decimals'] ) ) {
		$decimals = max( 0, min( 10, (int) $values['decimals'] ) );
	} else {
		$decimals = floor( $number ) === $number ? 0 : 2;
	}
	$prefix = isset( $values['preffix'] ) && is_scalar( $values['preffix'] ) ? (string) $values['preffix'] : '';
	$suffix = isset( $values['suffix'] ) && is_scalar( $values['suffix'] ) ? (string) $values['suffix'] : '';
	return $prefix . number_format_i18n( $number, $decimals ) . $suffix;
}

/**
 * Totals of a numeric column per category, in first-seen category order.
 *
 * Several rows per category (one per series when grouped) are combined the
 * way the axis aggregate combines: summed for sum/count (and no func),
 * min/max for min/max, averaged otherwise.
 *
 * @param array  $rows     Result rows.
 * @param string $category Category column.
 * @param string $measure  Numeric column.
 * @param string $func     Aggregate of the measure axis.
 * @return array<string,float>
 */
function vpress_figure_totals( array $rows, string $category, string $measure, string $func ): array {
	$groups = array();
	foreach ( $rows as $row ) {
		if ( ! isset( $row[ $measure ] ) || ! is_numeric( $row[ $measure ] ) ) {
			continue;
		}
		$key              = (string) ( $row[ $category ] ?? '' );
		$groups[ $key ][] = (float) $row[ $measure ];
	}

	$totals = array();
	foreach ( $groups as $key => $numbers ) {
		switch ( strtolower( $func ) ) {
			case 'min':
				$totals[ $key ] = min( $numbers );
				break;
			case 'max':
				$totals[ $key ] = max( $numbers );
				break;
			case 'mean':
			case 'avg':
				$totals[ $key ] = array_sum( $numbers ) / count( $numbers );
				break;
			default:
				$totals[ $key ] = array_sum( $numbers );
		}
	}
	return $totals;
}

/**
 * Key of the highest and lowest value (first one wins on ties).
 *
 * @param array<string,float> $totals Values by key.
 * @return array{0:string,1:string} [ max key, min key ]
 */
function vpress_figure_extremes( array $totals ): array {
	$max_key = null;
	$min_key = null;
	foreach ( $totals as $key => $value ) {
		if ( null === $max_key || $value > $totals[ $max_key ] ) {
			$max_key = $key;
		}
		if ( null === $min_key || $value < $totals[ $min_key ] ) {
			$min_key = $key;
		}
	}
	return array( (string) $max_key, (string) $min_key );
}

/**
 * Distinct non-empty values of a column, in first-seen order.
 *
 * @param array  $rows   Result rows.
 * @param string $column Column.
 * @return string[]
 */
function vpress_figure_distinct( array $rows, string $column ): array {
	$seen = array();
	foreach ( $rows as $row ) {
		if ( isset( $row[ $column ] ) && '' !== (string) $row[ $column ] ) {
			$seen[ (string) $row[ $column ] ] = true;
		}
	}
	return array_map( 'strval', array_keys( $seen ) );
}

/**
 * Numeric values of a column.
 *
 * @param array  $rows   Result rows.
 * @param string $column Column.
 * @return float[]
 */
function vpress_figure_numbers( array $rows, string $column ): array {
	$numbers = array();
	foreach ( $rows as $row ) {
		if ( isset( $row[ $column ] ) && is_numeric( $row[ $column ] ) ) {
			$numbers[] = (float) $row[ $column ];
		}
	}
	return $numbers;
}

/**
 * Deterministic text alternative for a chart (no LLM, no randomness).
 *
 * The result is plain text; escape it on output.
 *
 * @param object $chart Chart row.
 * @param array  $rows  Rows from vpress_figure_rows().
 * @return string
 */
function vpress_figure_alt_text( object $chart, array $rows ): string {
	if ( empty( $rows ) ) {
		return __( 'No data available for this chart.', 'vpress' );
	}

	$values = vpress_figure_config( $chart );
	$type   = isset( $values['chart'] ) && is_string( $values['chart'] ) ? $values['chart'] : 'bars';
	$x      = vpress_figure_axis( $values, 'xAxis' );
	$y      = vpress_figure_axis( $values, 'yAxis' );
	$fmt    = static function ( $number ) use ( $values ) {
		return vpress_figure_format_number( $number, $values );
	};

	$text = vpress_figure_alt_for_type( $type, $values, $rows, $x, $y, $fmt );
	return vpress_figure_rows_truncated( $rows ) ? $text . vpress_figure_partial_suffix() : $text;
}

/**
 * The per-type sentence of vpress_figure_alt_text().
 *
 * @param string   $type   Chart type.
 * @param array    $values Chart config.
 * @param array    $rows   Rows (non-empty).
 * @param array    $x      x axis.
 * @param array    $y      y axis.
 * @param callable $fmt    Number formatter.
 * @return string
 */
function vpress_figure_alt_for_type( string $type, array $values, array $rows, array $x, array $y, callable $fmt ): string {
	switch ( $type ) {
		case 'bars':
			return vpress_figure_alt_bars( $values, $rows, $x, $y, $fmt );
		case 'timeline':
			return vpress_figure_alt_timeline( $values, $rows, $x, $y, $fmt );
		case 'scatter':
			return vpress_figure_alt_scatter( $rows, $x, $y, $fmt );
		case 'heatmap':
			return vpress_figure_alt_heatmap( $values, $rows, $x, $y, $fmt );
		case 'map':
			return vpress_figure_alt_map( $rows, $x, $y, $fmt );
	}

	$names = array(
		/* translators: chart type name at the start of a sentence. */
		'spineplot' => __( 'Spine plot', 'vpress' ),
		/* translators: chart type name at the start of a sentence. */
		'treemap'   => __( 'Treemap', 'vpress' ),
	);
	$name = $names[ $type ] ?? __( 'Chart', 'vpress' );

	return sprintf(
		/* translators: 1: chart type, 2: measure title, 3: category title, 4: number of data points. */
		_n( '%1$s of %2$s by %3$s, %4$s data point.', '%1$s of %2$s by %3$s, %4$s data points.', count( $rows ), 'vpress' ),
		$name,
		$y['title'],
		$x['title'],
		number_format_i18n( count( $rows ) )
	);
}

/**
 * Bars (and stacked bars): the category axis is the non-linear one.
 *
 * @param array    $values Chart config.
 * @param array    $rows   Rows.
 * @param array    $x      x axis.
 * @param array    $y      y axis.
 * @param callable $fmt    Number formatter.
 * @return string
 */
function vpress_figure_alt_bars( array $values, array $rows, array $x, array $y, callable $fmt ): string {
	// Horizontal bars put the categories on y and the measure on x.
	$horizontal = 'linear' === $x['type'] && 'linear' !== $y['type'];
	$category   = $horizontal ? $y : $x;
	$measure    = $horizontal ? $x : $y;

	$totals = vpress_figure_totals( $rows, $category['slug'], $measure['slug'], $measure['func'] );
	$n      = count( $totals );
	if ( 0 === $n ) {
		return __( 'No data available for this chart.', 'vpress' );
	}
	list( $max_key, $min_key ) = vpress_figure_extremes( $totals );

	$text = sprintf(
		/* translators: 1: measure title, 2: category title, 3: number of categories, 4: category with the highest value, 5: highest value, 6: category with the lowest value, 7: lowest value. */
		_n(
			'Bar chart of %1$s by %2$s, %3$s category. Highest: %4$s (%5$s); lowest: %6$s (%7$s).',
			'Bar chart of %1$s by %2$s, %3$s categories. Highest: %4$s (%5$s); lowest: %6$s (%7$s).',
			$n,
			'vpress'
		),
		$measure['title'],
		$category['title'],
		number_format_i18n( $n ),
		$max_key,
		$fmt( $totals[ $max_key ] ),
		$min_key,
		$fmt( $totals[ $min_key ] )
	);

	$group = vpress_figure_axis( $values, 'groupBy' );
	if ( '' !== $group['slug'] && $group['slug'] !== $category['slug'] ) {
		$k     = count( vpress_figure_distinct( $rows, $group['slug'] ) );
		$text .= ' ' . sprintf(
			/* translators: 1: grouping title, 2: number of series. */
			_n( 'Grouped by %1$s, %2$s series.', 'Grouped by %1$s, %2$s series.', $k, 'vpress' ),
			$group['title'],
			number_format_i18n( $k )
		);
	}

	return $text;
}

/**
 * Timeline: points ordered by x; several series per x are combined.
 *
 * @param array    $values Chart config.
 * @param array    $rows   Rows.
 * @param array    $x      x axis.
 * @param array    $y      y axis.
 * @param callable $fmt    Number formatter.
 * @return string
 */
function vpress_figure_alt_timeline( array $values, array $rows, array $x, array $y, callable $fmt ): string {
	$totals = vpress_figure_totals( $rows, $x['slug'], $y['slug'], $y['func'] );
	if ( empty( $totals ) ) {
		return __( 'No data available for this chart.', 'vpress' );
	}
	ksort( $totals, SORT_STRING );
	$keys   = array_map( 'strval', array_keys( $totals ) );
	$first  = $keys[0];
	$last   = $keys[ count( $keys ) - 1 ];
	$y_from = $totals[ $first ];
	$y_to   = $totals[ $last ];

	if ( $y_to > $y_from ) {
		/* translators: the value went up over time. */
		$trend = __( 'rose', 'vpress' );
	} elseif ( $y_to < $y_from ) {
		/* translators: the value went down over time. */
		$trend = __( 'fell', 'vpress' );
	} else {
		/* translators: the value did not change over time. */
		$trend = __( 'was flat', 'vpress' );
	}

	return sprintf(
		/* translators: 1: measure title, 2: time axis title, 3: first x value, 4: last x value, 5: number of points, 6: rose/fell/was flat, 7: first value, 8: last value. */
		_n(
			'Line chart of %1$s over %2$s from %3$s to %4$s, %5$s point; %1$s %6$s from %7$s to %8$s.',
			'Line chart of %1$s over %2$s from %3$s to %4$s, %5$s points; %1$s %6$s from %7$s to %8$s.',
			count( $keys ),
			'vpress'
		),
		$y['title'],
		$x['title'],
		$first,
		$last,
		number_format_i18n( count( $keys ) ),
		$trend,
		$fmt( $y_from ),
		$fmt( $y_to )
	);
}

/**
 * Scatter: ranges of both axes.
 *
 * @param array    $rows Rows.
 * @param array    $x    x axis.
 * @param array    $y    y axis.
 * @param callable $fmt  Number formatter.
 * @return string
 */
function vpress_figure_alt_scatter( array $rows, array $x, array $y, callable $fmt ): string {
	$xs = vpress_figure_numbers( $rows, $x['slug'] );
	$ys = vpress_figure_numbers( $rows, $y['slug'] );
	if ( empty( $xs ) || empty( $ys ) ) {
		return __( 'No data available for this chart.', 'vpress' );
	}

	return sprintf(
		/* translators: 1: y title, 2: x title, 3: number of points, 4: x minimum, 5: x maximum, 6: y minimum, 7: y maximum. */
		_n(
			'Scatter plot of %1$s against %2$s, %3$s point; %2$s ranges %4$s–%5$s, %1$s ranges %6$s–%7$s.',
			'Scatter plot of %1$s against %2$s, %3$s points; %2$s ranges %4$s–%5$s, %1$s ranges %6$s–%7$s.',
			count( $rows ),
			'vpress'
		),
		$y['title'],
		$x['title'],
		number_format_i18n( count( $rows ) ),
		$fmt( min( $xs ) ),
		$fmt( max( $xs ) ),
		$fmt( min( $ys ) ),
		$fmt( max( $ys ) )
	);
}

/**
 * Heat map: grid size and the hottest cell.
 *
 * @param array    $values Chart config.
 * @param array    $rows   Rows.
 * @param array    $x      x axis.
 * @param array    $y      y axis.
 * @param callable $fmt    Number formatter.
 * @return string
 */
function vpress_figure_alt_heatmap( array $values, array $rows, array $x, array $y, callable $fmt ): string {
	$value = vpress_figure_axis( $values, 'collapseBy' );
	$best  = null;
	foreach ( $rows as $row ) {
		if ( isset( $row[ $value['slug'] ] ) && is_numeric( $row[ $value['slug'] ] ) && ( null === $best || (float) $row[ $value['slug'] ] > (float) $best[ $value['slug'] ] ) ) {
			$best = $row;
		}
	}
	if ( null === $best ) {
		return __( 'No data available for this chart.', 'vpress' );
	}

	return sprintf(
		/* translators: 1: value title, 2: x title, 3: y title, 4: number of rows, 5: number of columns, 6: highest value, 7: its x, 8: its y. */
		__( 'Heat map of %1$s by %2$s and %3$s, %4$s×%5$s cells; highest %6$s at (%7$s,%8$s).', 'vpress' ),
		$value['title'],
		$x['title'],
		$y['title'],
		number_format_i18n( count( vpress_figure_distinct( $rows, $y['slug'] ) ) ),
		number_format_i18n( count( vpress_figure_distinct( $rows, $x['slug'] ) ) ),
		$fmt( $best[ $value['slug'] ] ),
		(string) ( $best[ $x['slug'] ] ?? '' ),
		(string) ( $best[ $y['slug'] ] ?? '' )
	);
}

/**
 * Map: regions are the x column, the fill value is the y column.
 *
 * @param array    $rows Rows.
 * @param array    $x    x axis (region).
 * @param array    $y    y axis (value).
 * @param callable $fmt  Number formatter.
 * @return string
 */
function vpress_figure_alt_map( array $rows, array $x, array $y, callable $fmt ): string {
	$totals = vpress_figure_totals( $rows, $x['slug'], $y['slug'], $y['func'] );
	$n      = count( $totals );
	if ( 0 === $n ) {
		return __( 'No data available for this chart.', 'vpress' );
	}
	list( $max_key, $min_key ) = vpress_figure_extremes( $totals );

	return sprintf(
		/* translators: 1: value title, 2: number of regions, 3: region with the highest value, 4: highest value, 5: region with the lowest value, 6: lowest value. */
		_n(
			'Map of %1$s by region, %2$s region; highest %3$s (%4$s), lowest %5$s (%6$s).',
			'Map of %1$s by region, %2$s regions; highest %3$s (%4$s), lowest %5$s (%6$s).',
			$n,
			'vpress'
		),
		$y['title'],
		number_format_i18n( $n ),
		$max_key,
		$fmt( $totals[ $max_key ] ),
		$min_key,
		$fmt( $totals[ $min_key ] )
	);
}

/**
 * Data-table fallback: a collapsed `<details>` with every column of the rows.
 *
 * Column headers use the axis titles where a slug matches, else the raw
 * slug. At most VPRESS_FIGURE_TABLE_MAX_ROWS rows are printed; a final row
 * says how many were left out. Numeric cells get a right-aligned class, and
 * values of the chart's measure columns use the chart's number format.
 *
 * @param object $chart Chart row.
 * @param array  $rows  Rows from vpress_figure_rows().
 * @return string Escaped markup, or '' when there are no rows.
 */
function vpress_figure_data_table( object $chart, array $rows ): string {
	if ( empty( $rows ) ) {
		return '';
	}

	$values  = vpress_figure_config( $chart );
	$labels  = array();
	$measure = array();
	foreach ( array( 'xAxis', 'yAxis', 'groupBy', 'collapseBy' ) as $key ) {
		$axis = vpress_figure_axis( $values, $key );
		if ( '' === $axis['slug'] ) {
			continue;
		}
		if ( ! isset( $labels[ $axis['slug'] ] ) ) {
			$labels[ $axis['slug'] ] = $axis['title'];
		}
		if ( 'linear' === $axis['type'] ) {
			$measure[ $axis['slug'] ] = true;
		}
	}

	$columns = array();
	foreach ( $rows as $row ) {
		foreach ( array_keys( $row ) as $column ) {
			$columns[ (string) $column ] = true;
		}
	}
	$columns = array_map( 'strval', array_keys( $columns ) );

	$title = vpress_figure_title( $chart );
	if ( '' === $title ) {
		/* translators: %d: chart id. */
		$title = sprintf( __( 'Gráfica %d', 'vpress' ), (int) ( $chart->id ?? 0 ) );
	}

	$html  = '<details class="vpress-figure__data"><summary>' . esc_html__( 'View data', 'vpress' ) . '</summary>';
	$html .= '<table class="vpress-figure__table"><caption>' . esc_html( $title ) . '</caption><thead><tr>';
	foreach ( $columns as $column ) {
		$html .= '<th scope="col">' . esc_html( $labels[ $column ] ?? $column ) . '</th>';
	}
	$html .= '</tr></thead><tbody>';

	foreach ( array_slice( $rows, 0, VPRESS_FIGURE_TABLE_MAX_ROWS ) as $row ) {
		$html .= '<tr>';
		foreach ( $columns as $column ) {
			$cell = isset( $row[ $column ] ) ? (string) $row[ $column ] : '';
			if ( '' !== $cell && is_numeric( $cell ) ) {
				$text  = isset( $measure[ $column ] ) ? vpress_figure_format_number( $cell, $values ) : $cell;
				$html .= '<td class="vpress-figure__num">' . esc_html( $text ) . '</td>';
			} else {
				$html .= '<td>' . esc_html( $cell ) . '</td>';
			}
		}
		$html .= '</tr>';
	}

	$more = count( $rows ) - VPRESS_FIGURE_TABLE_MAX_ROWS;
	if ( $more > 0 ) {
		$html .= '<tr><td colspan="' . esc_attr( (string) count( $columns ) ) . '">' . esc_html(
			sprintf(
				/* translators: %s: number of rows not shown. */
				_n( '… and %s more row', '… and %s more rows', $more, 'vpress' ),
				number_format_i18n( $more )
			) . ( vpress_figure_rows_truncated( $rows ) ? vpress_figure_partial_suffix() : '' )
		) . '</td></tr>';
	}

	$html .= '</tbody></table></details>';
	return $html;
}
