/**
 * Shared editor helper: the REST-backed chart list, the chart combobox, and
 * reading a chart row's config.
 *
 * Extracted from `blocks/chart/index.js` when `vpress/story` needed the same
 * picker. One list request per editor load is shared by every Vpress block on
 * the page, which is the reason this is one module and not a copy per block.
 *
 * Plain script on the `wp.*` globals (no build step, no modules); registered
 * as `vpress-block-chart-picker` and declared as a dependency by each block's
 * index.asset.php. `wp` is read at call time, never captured at load time, so
 * the load order of the editor's own bundles cannot matter.
 *
 * Exposes `window.vpressBlockChart`:
 *   useChartList()                     → { status, charts }
 *   useSelectedChart( id, list )       → { status, row }
 *   chartPicker( list, id, onChange, key )
 *   parseValue( row )  chartTitle( row )  chartLabel( row )
 *   annotationsOf( row )               → the chart's annotations, always an array
 *   CHART_TYPES
 */
( function ( window ) {
	'use strict';

	if ( window.vpressBlockChart ) {
		return;
	}

	var LIST_PATH = '/vpress/v1/chart/list/?page=1&perPage=100&q=';
	var GET_PATH = '/vpress/v1/chart/get/';
	var CHART_TYPES = [ 'bars', 'scatter', 'heatmap', 'timeline', 'map', 'spineplot', 'treemap' ];

	function wp() {
		return window.wp || {};
	}

	/* ---------------------------------------------------------------- data */

	function parseValue( row ) {
		if ( ! row || typeof row.value !== 'string' ) {
			return row && row.value && typeof row.value === 'object' ? row.value : {};
		}
		try {
			var value = JSON.parse( row.value );
			return value && typeof value === 'object' ? value : {};
		} catch ( error ) {
			return {};
		}
	}

	function chartTitle( row ) {
		if ( row && typeof row.title === 'string' && row.title.trim() ) {
			return row.title.trim();
		}
		var value = parseValue( row );
		return typeof value.title === 'string' ? value.title.trim() : '';
	}

	function chartLabel( row ) {
		/* translators: %d: chart id. */
		return chartTitle( row ) || wp().i18n.sprintf( wp().i18n.__( 'Chart #%d', 'vpress' ), Number( row.id ) );
	}

	/**
	 * A chart's annotations. Always an array — a chart saved before they
	 * existed has none, and a story step referencing one it does not have is
	 * a no-op, so there is nothing here to report or repair.
	 */
	function annotationsOf( row ) {
		var value = parseValue( row );
		return Array.isArray( value.annotations ) ? value.annotations : [];
	}

	function findChart( charts, chartId ) {
		for ( var i = 0; i < charts.length; i++ ) {
			if ( Number( charts[ i ].id ) === chartId ) {
				return charts[ i ];
			}
		}
		return null;
	}

	// One list request per editor load, shared by every Vpress block.
	var listRequest = null;

	function fetchCharts() {
		if ( ! listRequest ) {
			listRequest = wp().apiFetch( { path: LIST_PATH } ).then(
				function ( body ) {
					return body && Array.isArray( body.data ) ? body.data : [];
				},
				function ( error ) {
					listRequest = null; // let the next block retry
					throw error;
				}
			);
		}
		return listRequest;
	}

	function useChartList() {
		var element = wp().element;
		var state = element.useState( { status: 'loading', charts: [] } );
		var setList = state[ 1 ];

		element.useEffect( function () {
			var cancelled = false;
			fetchCharts().then(
				function ( charts ) {
					if ( ! cancelled ) {
						setList( { status: 'ready', charts: charts } );
					}
				},
				function () {
					if ( ! cancelled ) {
						setList( { status: 'error', charts: [] } );
					}
				}
			);
			return function () {
				cancelled = true;
			};
		}, [] );

		return state[ 0 ];
	}

	/**
	 * Resolve the selected chart: from the list, else (past the first 100, or
	 * the list failed) by id. Status: none | loading | found | missing.
	 */
	function useSelectedChart( chartId, list ) {
		var element = wp().element;
		var listed = chartId ? findChart( list.charts, chartId ) : null;
		var state = element.useState( { id: 0, status: 'idle', row: null } );
		var lookup = state[ 0 ];
		var setLookup = state[ 1 ];
		var needsLookup = !! chartId && ! listed && list.status !== 'loading';

		element.useEffect(
			function () {
				if ( ! needsLookup ) {
					return undefined;
				}
				var cancelled = false;
				wp().apiFetch( { path: GET_PATH + chartId } ).then(
					function ( body ) {
						if ( ! cancelled ) {
							var row = body && body.data ? body.data : null;
							setLookup( { id: chartId, status: row ? 'found' : 'missing', row: row } );
						}
					},
					function () {
						if ( ! cancelled ) {
							setLookup( { id: chartId, status: 'missing', row: null } );
						}
					}
				);
				return function () {
					cancelled = true;
				};
			},
			[ chartId, needsLookup ]
		);

		if ( ! chartId ) {
			return { status: 'none', row: null };
		}
		if ( listed ) {
			return { status: 'found', row: listed };
		}
		if ( needsLookup && lookup.id === chartId && lookup.status !== 'idle' ) {
			return lookup;
		}
		return { status: 'loading', row: null };
	}

	function chartPicker( list, chartId, onChange, key ) {
		var el = wp().element.createElement;
		var components = wp().components;
		var __ = wp().i18n.__;

		if ( list.status === 'loading' ) {
			return el( components.Spinner, { key: key } );
		}
		if ( list.status === 'error' ) {
			return el(
				'p',
				{ key: key, className: 'vpress-block__error', role: 'alert' },
				__( 'Your charts could not be loaded.', 'vpress' )
			);
		}
		return el( components.ComboboxControl, {
			key: key,
			className: 'vpress-block__combobox',
			label: __( 'Chart', 'vpress' ),
			value: chartId ? String( chartId ) : null,
			options: list.charts.map( function ( row ) {
				return { label: chartLabel( row ), value: String( row.id ) };
			} ),
			onChange: onChange,
			__nextHasNoMarginBottom: true,
		} );
	}

	window.vpressBlockChart = {
		CHART_TYPES: CHART_TYPES,
		annotationsOf: annotationsOf,
		chartLabel: chartLabel,
		chartPicker: chartPicker,
		chartTitle: chartTitle,
		parseValue: parseValue,
		useChartList: useChartList,
		useSelectedChart: useSelectedChart,
	};
} )( window );
