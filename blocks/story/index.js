/**
 * Vpress story block (`vpress/story`) — editor script.
 *
 * Plain JavaScript on the `wp.*` globals, no JSX and no build step; the
 * dependencies are declared in index.asset.php. The block is dynamic:
 * blocks/story/render.php prints the figure and the steps.
 *
 * It IS, however, a parent block, so `save` returns `InnerBlocks.Content`
 * rather than null. A dynamic block whose save returns null serializes to a
 * self-closing comment — which for a parent means its children are dropped
 * on save, silently, and the story loses its steps.
 *
 * The live preview goes through the shared canvas-iframe loader
 * (`window.vpressBlockEmbed`) and the shared chart picker
 * (`window.vpressBlockChart`), both of which the chart block also uses.
 * The mounted chart's handle is parked on the figure element so the SELECTED
 * step can drive it — see blocks/story-step/index.js.
 */
( function ( wp ) {
	'use strict';

	var NAME = 'vpress/story';

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
	var useInnerBlocksProps = wp.blockEditor.useInnerBlocksProps;
	var InnerBlocks = wp.blockEditor.InnerBlocks;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var Placeholder = wp.components.Placeholder;
	var ToggleControl = wp.components.ToggleControl;
	var PanelBody = wp.components.PanelBody;
	var Spinner = wp.components.Spinner;
	var Button = wp.components.Button;
	var __ = wp.i18n.__;
	var sprintf = wp.i18n.sprintf;

	var DEFAULT_REST_ROOT = '/wp-json/vpress/v1/';
	var ALLOWED = [ 'vpress/story-step' ];
	// Two empty steps on insert: one step is not a story, and an author who
	// sees two immediately understands what the block is for.
	var TEMPLATE = [ [ 'vpress/story-step' ], [ 'vpress/story-step' ] ];
	var adminUrl = config.adminUrl || 'admin.php?page=vpress';

	/** The shared canvas-iframe loader; a declared dependency, so it has run. */
	function loadEmbed( doc ) {
		var loader = window.vpressBlockEmbed;
		if ( ! loader || typeof loader.load !== 'function' ) {
			return Promise.reject( new Error( 'window.vpressBlockEmbed is not loaded' ) );
		}
		return loader.load( doc );
	}

	/* ---------------------------------------------------------- components */

	/**
	 * The sticky figure, mounted live into the editor canvas.
	 *
	 * The handle the embed returns is parked on the figure element as
	 * `vpressStoryHandle`. That is how a selected step reaches this chart:
	 * the step is a sibling component with no prop path to here, and a shared
	 * store for one DOM node's worth of state would be the bigger machine.
	 * Nothing outside blocks/ reads it.
	 */
	function StoryPreview( props ) {
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
				var handles = [];
				loadEmbed( host.ownerDocument ).then(
					function ( vpress ) {
						if ( cancelled ) {
							return;
						}
						// Rendered as "pending" so the embed's own auto-mount
						// leaves this figure to us.
						delete host.dataset.vpressMounted;
						handles = vpress.mount( host ) || [];
						if ( handles[ 0 ] ) {
							host.vpressStoryHandle = handles[ 0 ];
						}
					},
					function ( error ) {
						if ( ! cancelled ) {
							window.console.error( '[vpress] story block preview:', error );
							setError( __( 'The chart preview could not be loaded.', 'vpress' ) );
						}
					}
				);
				return function () {
					cancelled = true;
					if ( hostRef.current ) {
						delete hostRef.current.vpressStoryHandle;
					}
					handles.forEach( function ( handle ) {
						if ( handle && typeof handle.unmount === 'function' ) {
							handle.unmount();
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
			'div',
			{ className: 'vpress-story__figure' },
			el( 'p', { className: 'vpress-story__now', 'data-vpress-story-status': '' } ),
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
		var blockProps = useBlockProps( { className: 'vpress-story' } );
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
				{ title: __( 'Story settings', 'vpress' ), initialOpen: true },
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

		var steps = useInnerBlocksProps
			? el(
					'div',
					useInnerBlocksProps(
						{ className: 'vpress-story__steps' },
						{ allowedBlocks: ALLOWED, template: TEMPLATE, templateLock: false }
					)
			  )
			: el(
					'div',
					{ className: 'vpress-story__steps' },
					el( InnerBlocks, { allowedBlocks: ALLOWED, template: TEMPLATE } )
			  );

		if ( selected.status === 'found' ) {
			return el(
				'section',
				blockProps,
				inspector,
				el( StoryPreview, {
					key: 'preview-' + chartId, // a new chart gets a fresh figure + mount
					chartId: chartId,
					row: selected.row,
					showCaption: showCaption,
				} ),
				steps
			);
		}

		var body;
		if ( selected.status === 'loading' ) {
			body = el( Placeholder, { key: 'loading', icon: 'book', label: __( 'Vpress story', 'vpress' ) }, el( Spinner ) );
		} else {
			var missing = selected.status === 'missing';
			body = el(
				Placeholder,
				{
					key: missing ? 'missing' : 'empty',
					className: missing ? 'vpress-block__placeholder is-missing' : 'vpress-block__placeholder',
					icon: 'book',
					label: __( 'Vpress story', 'vpress' ),
					instructions: missing
						? /* translators: %d: chart id. */
						  sprintf( __( 'Chart #%d is not available. It may have been deleted. Choose another chart.', 'vpress' ), chartId )
						: __( 'Choose the chart this story is about. The steps below change what it emphasises as the reader scrolls.', 'vpress' ),
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

		// The steps stay mounted without a chart: an author can write the
		// narrative first and pick the chart afterwards.
		return el( 'section', blockProps, inspector, body, steps );
	}

	wp.blocks.registerBlockType( NAME, {
		edit: Edit,
		save: function () {
			// A parent block must serialize its children; see the header.
			return el( InnerBlocks.Content );
		},
	} );
} )( window.wp );
