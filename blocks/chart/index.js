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
 * chart into it, through the shared canvas-iframe loader
 * `window.vpressBlockEmbed` (blocks/shared/embed-loader.js, a declared
 * dependency of this script — see its header for why the embed must be
 * loaded into the figure's OWN document). `vpress/story` previews the same
 * way, which is why the loader is shared rather than copied.
 *
 * The REST-backed chart list and its combobox are shared for the same
 * reason (`window.vpressBlockChart`, blocks/shared/chart-picker.js): one
 * list request per editor load serves every Vpress block on the page.
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
	var shared = window.vpressBlockChart || {};
	var el = wp.element.createElement;
	var useEffect = wp.element.useEffect;
	var useRef = wp.element.useRef;
	var useState = wp.element.useState;
	var useBlockProps = wp.blockEditor.useBlockProps;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var Placeholder = wp.components.Placeholder;
	var ToggleControl = wp.components.ToggleControl;
	var PanelBody = wp.components.PanelBody;
	var Spinner = wp.components.Spinner;
	var Button = wp.components.Button;
	var __ = wp.i18n.__;
	var sprintf = wp.i18n.sprintf;

	var DEFAULT_REST_ROOT = '/wp-json/vpress/v1/';
	var adminUrl = config.adminUrl || 'admin.php?page=vpress';

	/* ------------------------------------------------------- embed loading */

	/**
	 * The shared canvas-iframe loader (blocks/shared/embed-loader.js), a
	 * declared dependency of this script, so it has already run. Resolved on
	 * each call rather than captured: a test may replace the global.
	 *
	 * @param {Document} doc The document that owns the figure.
	 * @return {Promise} resolves with that document's `window.vpress`.
	 */
	function loadEmbed( doc ) {
		var loader = window.vpressBlockEmbed;
		if ( ! loader || typeof loader.load !== 'function' ) {
			return Promise.reject( new Error( 'window.vpressBlockEmbed is not loaded' ) );
		}
		return loader.load( doc );
	}

	/* ---------------------------------------------------------- components */

	function ChartPreview( props ) {
		var row = props.row;
		var value = shared.parseValue( row );
		var title = shared.chartTitle( row );
		var subtitle = typeof value.subtitle === 'string' ? value.subtitle : '';
		var type = shared.CHART_TYPES.indexOf( value.chart ) !== -1 ? value.chart : 'bars';
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
					role: 'group',
					'aria-label': title || sprintf( __( 'Chart #%d', 'vpress' ), props.chartId ),
					'aria-busy': 'true',
				} ),
				caption
			),
			errorState[ 0 ] ? el( 'p', { className: 'vpress-block__error', role: 'alert' }, errorState[ 0 ] ) : null
		);
	}

	function Edit( props ) {
		var attributes = props.attributes || {};
		var setAttributes = props.setAttributes;
		var chartId = Number( attributes.chartId ) > 0 ? Number( attributes.chartId ) : 0;
		var showCaption = attributes.showCaption !== false;
		var blockProps = useBlockProps();
		var list = shared.useChartList();
		var selected = shared.useSelectedChart( chartId, list );

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
				shared.chartPicker( list, chartId, onChartChange, 'picker' ),
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
				shared.chartPicker( list, missing ? 0 : chartId, onChartChange, 'picker' ),
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
