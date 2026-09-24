/**
 * Vpress chart block (`vpress/chart`) — editor script.
 *
 * Plain JavaScript on the `wp.*` globals, no JSX and no build step; the
 * dependencies are declared in index.asset.php. The block is dynamic:
 * `save` returns null and blocks/chart/render.php prints the figure.
 *
 * Live preview: the edit component renders the same figure contract PHP
 * prints (`<figure class="vpress-figure" data-vpress-chart data-vpress-rest>`
 * with a `.vpress-figure__chart` slot) and asks the embed bundle to mount a
 * chart into it. The embed module is loaded into the document that OWNS the
 * figure — for block themes that is the editor canvas iframe, not the editor
 * window. That matters: d3/dbox resolve `#id` selectors against the global
 * `document` of the window the module runs in, so a module imported in the
 * outer window could not draw into the iframe. The embed stylesheet is added
 * to the same document, once.
 *
 * Config comes from PHP (Vpress_Blocks::editor_config()) as `window.vpressBlock`.
 */
( function ( wp ) {
	'use strict';

	var NAME = 'vpress/chart';

	if ( ! wp || ! wp.blocks || ! wp.element || ! wp.blockEditor || ! wp.components ) {
		return;
	}
	// Register once, even if the script is printed twice.
	if ( wp.blocks.getBlockType && wp.blocks.getBlockType( NAME ) ) {
		return;
	}

	var config = window.vpressBlock || {};
	var el = wp.element.createElement;
	var useState = wp.element.useState;
	var useEffect = wp.element.useEffect;
	var useRef = wp.element.useRef;
	var useBlockProps = wp.blockEditor.useBlockProps;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var Placeholder = wp.components.Placeholder;
	var ComboboxControl = wp.components.ComboboxControl;
	var ToggleControl = wp.components.ToggleControl;
	var PanelBody = wp.components.PanelBody;
	var Spinner = wp.components.Spinner;
	var Button = wp.components.Button;
	var __ = wp.i18n.__;
	var sprintf = wp.i18n.sprintf;
	var apiFetch = wp.apiFetch;

	var LIST_PATH = '/vpress/v1/chart/list/?page=1&perPage=100&q=';
	var GET_PATH = '/vpress/v1/chart/get/';
	var DEFAULT_REST_ROOT = '/wp-json/vpress/v1/';
	var CHART_TYPES = [ 'bars', 'scatter', 'heatmap', 'timeline', 'map', 'spineplot', 'treemap' ];
	var adminUrl = config.adminUrl || 'admin.php?page=vpress';

	/* ---------------------------------------------------------------- data */

	function parseValue( row ) {
		if ( ! row || typeof row.value !== 'string' ) {
			return {};
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
		return chartTitle( row ) || sprintf( __( 'Chart #%d', 'vpress' ), Number( row.id ) );
	}

	function findChart( charts, chartId ) {
		for ( var i = 0; i < charts.length; i++ ) {
			if ( Number( charts[ i ].id ) === chartId ) {
				return charts[ i ];
			}
		}
		return null;
	}

	// One list request per editor load, shared by every chart block.
	var listRequest = null;

	function fetchCharts() {
		if ( ! listRequest ) {
			listRequest = apiFetch( { path: LIST_PATH } ).then(
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
		var state = useState( { status: 'loading', charts: [] } );
		var setList = state[ 1 ];

		useEffect( function () {
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
		var listed = chartId ? findChart( list.charts, chartId ) : null;
		var state = useState( { id: 0, status: 'idle', row: null } );
		var lookup = state[ 0 ];
		var setLookup = state[ 1 ];
		var needsLookup = !! chartId && ! listed && list.status !== 'loading';

		useEffect(
			function () {
				if ( ! needsLookup ) {
					return undefined;
				}
				var cancelled = false;
				apiFetch( { path: GET_PATH + chartId } ).then(
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

	/* ------------------------------------------------------- embed loading */

	var embedLoads = typeof WeakMap === 'function' ? new WeakMap() : null;

	function injectEmbedCss( doc ) {
		if ( ! config.embedCss || doc.querySelector( 'link[data-vpress-embed-css]' ) ) {
			return;
		}
		var link = doc.createElement( 'link' );
		link.rel = 'stylesheet';
		link.href = config.embedCss;
		link.setAttribute( 'data-vpress-embed-css', '' );
		( doc.head || doc.documentElement ).appendChild( link );
	}

	/**
	 * Load the embed module into `doc` (once per document) and resolve with
	 * that document's `window.vpress`.
	 */
	function loadEmbed( doc ) {
		var win = doc.defaultView;
		injectEmbedCss( doc );

		if ( win && win.vpress && typeof win.vpress.mount === 'function' ) {
			return Promise.resolve( win.vpress );
		}
		var pending = embedLoads && embedLoads.get( doc );
		if ( pending ) {
			return pending;
		}

		pending = new Promise( function ( resolve, reject ) {
			if ( ! config.embedUrl ) {
				reject( new Error( 'vpressBlock.embedUrl is not set' ) );
				return;
			}
			var script = doc.createElement( 'script' );
			script.type = 'module';
			script.src = config.embedUrl;
			script.setAttribute( 'data-vpress-embed', '' );
			// A module script's load event fires after it has run.
			script.addEventListener( 'load', function () {
				var vpress = win && win.vpress;
				if ( vpress && typeof vpress.mount === 'function' ) {
					resolve( vpress );
				} else {
					reject( new Error( 'the embed loaded but window.vpress.mount is missing' ) );
				}
			} );
			script.addEventListener( 'error', function () {
				reject( new Error( 'could not load ' + config.embedUrl ) );
			} );
			( doc.head || doc.documentElement ).appendChild( script );
		} );

		if ( embedLoads ) {
			embedLoads.set( doc, pending );
			pending.catch( function () {
				embedLoads.delete( doc ); // a later preview may retry
			} );
		}
		return pending;
	}

	/* ---------------------------------------------------------- components */

	function ChartPreview( props ) {
		var row = props.row;
		var value = parseValue( row );
		var title = chartTitle( row );
		var subtitle = typeof value.subtitle === 'string' ? value.subtitle : '';
		var type = CHART_TYPES.indexOf( value.chart ) !== -1 ? value.chart : 'bars';
		var theme = value.theme === 'dark' ? 'dark' : 'light';
		var hostRef = useRef( null );
		var errorState = useState( '' );
		var setError = errorState[ 1 ];

		useEffect(
			function () {
				var host = hostRef.current;
				if ( ! host ) {
					return undefined;
				}
				var cancelled = false;
				var apps = [];
				loadEmbed( host.ownerDocument ).then(
					function ( vpress ) {
						if ( cancelled ) {
							return;
						}
						// Rendered as "pending" so the embed's own auto-mount (which
						// runs when the module first loads) leaves this figure to us.
						delete host.dataset.vpressMounted;
						apps = vpress.mount( host ) || [];
					},
					function ( error ) {
						if ( ! cancelled ) {
							window.console.error( '[vpress] chart block preview:', error );
							setError( __( 'The chart preview could not be loaded.', 'vpress' ) );
						}
					}
				);
				return function () {
					cancelled = true;
					apps.forEach( function ( app ) {
						if ( app && typeof app.unmount === 'function' ) {
							app.unmount();
						}
					} );
				};
			},
			[ props.chartId ]
		);

		var caption = props.showCaption
			? el(
					'figcaption',
					{ className: 'vpress-figure__caption' },
					el( 'span', { className: 'vpress-figure__title' }, title ),
					subtitle ? el( 'span', { className: 'vpress-figure__subtitle' }, subtitle ) : null
			  )
			: null;

		return el(
			wp.element.Fragment || 'div',
			null,
			el(
				'figure',
				{
					ref: hostRef,
					className: 'vpress-figure vpress-figure--' + type + ' vpress-figure--' + theme,
					'data-vpress-chart': String( props.chartId ),
					'data-vpress-rest': config.restRoot || DEFAULT_REST_ROOT,
					'data-vpress-nonce': config.nonce || undefined,
					'data-vpress-mounted': 'pending',
				},
				el( 'div', {
					className: 'vpress-figure__chart',
					role: 'img',
					'aria-label': title || sprintf( __( 'Chart #%d', 'vpress' ), props.chartId ),
					'aria-busy': 'true',
				} ),
				caption
			),
			errorState[ 0 ] ? el( 'p', { className: 'vpress-block__error', role: 'alert' }, errorState[ 0 ] ) : null
		);
	}

	function chartPicker( list, chartId, onChange, key ) {
		if ( list.status === 'loading' ) {
			return el( Spinner, { key: key } );
		}
		if ( list.status === 'error' ) {
			return el(
				'p',
				{ key: key, className: 'vpress-block__error', role: 'alert' },
				__( 'Your charts could not be loaded.', 'vpress' )
			);
		}
		return el( ComboboxControl, {
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

	function Edit( props ) {
		var attributes = props.attributes || {};
		var setAttributes = props.setAttributes;
		var chartId = Number( attributes.chartId ) > 0 ? Number( attributes.chartId ) : 0;
		var showCaption = attributes.showCaption !== false;
		var blockProps = useBlockProps();
		var list = useChartList();
		var selected = useSelectedChart( chartId, list );

		function onChartChange( value ) {
			var id = parseInt( value, 10 );
			setAttributes( { chartId: id > 0 ? id : undefined } );
		}

		var inspector = el(
			InspectorControls,
			{ key: 'inspector' },
			el(
				PanelBody,
				{ title: __( 'Chart settings', 'vpress' ), initialOpen: true },
				chartPicker( list, chartId, onChartChange, 'picker' ),
				el( ToggleControl, {
					key: 'caption',
					label: __( 'Show caption', 'vpress' ),
					checked: showCaption,
					onChange: function ( checked ) {
						setAttributes( { showCaption: !! checked } );
					},
					__nextHasNoMarginBottom: true,
				} ),
				el(
					Button,
					{ key: 'edit', variant: 'link', href: adminUrl, target: '_blank', rel: 'noopener noreferrer' },
					__( 'Edit in Vpress', 'vpress' )
				)
			)
		);

		var body;
		if ( selected.status === 'found' ) {
			body = el( ChartPreview, {
				key: 'preview-' + chartId, // a new chart gets a fresh figure + mount
				chartId: chartId,
				row: selected.row,
				showCaption: showCaption,
			} );
		} else if ( selected.status === 'loading' ) {
			body = el(
				Placeholder,
				{ key: 'loading', icon: 'chart-bar', label: __( 'Vpress chart', 'vpress' ) },
				el( Spinner )
			);
		} else {
			var missing = selected.status === 'missing';
			body = el(
				Placeholder,
				{
					key: missing ? 'missing' : 'empty',
					className: missing ? 'vpress-block__placeholder is-missing' : 'vpress-block__placeholder',
					icon: 'chart-bar',
					label: __( 'Vpress chart', 'vpress' ),
					instructions: missing
						? /* translators: %d: chart id. */
						  sprintf( __( 'Chart #%d is not available. It may have been deleted. Choose another chart.', 'vpress' ), chartId )
						: __( 'Choose one of your Vpress charts to embed it.', 'vpress' ),
				},
				chartPicker( list, missing ? 0 : chartId, onChartChange, 'picker' ),
				el(
					'div',
					{ key: 'actions', className: 'vpress-block__actions' },
					el(
						Button,
						{ variant: 'secondary', href: adminUrl, target: '_blank', rel: 'noopener noreferrer' },
						__( 'Create a chart', 'vpress' )
					)
				)
			);
		}

		return el( 'div', blockProps, inspector, body );
	}

	wp.blocks.registerBlockType( NAME, {
		edit: Edit,
		save: function () {
			return null;
		},
	} );
} )( window.wp );
