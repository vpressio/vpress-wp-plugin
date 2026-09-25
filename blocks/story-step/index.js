/**
 * Vpress story step block (`vpress/story-step`) — editor script.
 *
 * Plain JavaScript on the `wp.*` globals, no JSX and no build step; the
 * dependencies are declared in index.asset.php. The block is dynamic:
 * blocks/story-step/render.php prints the step.
 *
 * `heading` is PlainText and `text` is RichText, and that split is not
 * cosmetic: RichText stores HTML, so its value carries entities, and a
 * heading stored that way and then printed through esc_html() comes out
 * double-escaped ("A &amp;amp; B"). The heading is also what the story's live
 * region announces, where markup would be nonsense. So: raw text for the
 * heading (esc_html on the server), HTML for the body (wp_kses_post).
 *
 * The Inspector is what makes a step usable without editing JSON: the chart's
 * own annotations, as checkboxes, plus "Capturar estado actual", which reads
 * back what the preview is actually showing. Selecting a step applies it to
 * the story's live preview, so the editor is what the reader will get.
 */
( function ( wp ) {
	'use strict';

	var NAME = 'vpress/story-step';

	if ( ! wp || ! wp.blocks || ! wp.element || ! wp.blockEditor || ! wp.components ) {
		return;
	}
	// Register once, even if the script is printed twice.
	if ( wp.blocks.getBlockType && wp.blocks.getBlockType( NAME ) ) {
		return;
	}

	var shared = window.vpressBlockChart || {};
	var el = wp.element.createElement;
	var useEffect = wp.element.useEffect;
	var useRef = wp.element.useRef;
	var useBlockProps = wp.blockEditor.useBlockProps;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var PlainText = wp.blockEditor.PlainText;
	var RichText = wp.blockEditor.RichText;
	var CheckboxControl = wp.components.CheckboxControl;
	var PanelBody = wp.components.PanelBody;
	var SelectControl = wp.components.SelectControl;
	var TextControl = wp.components.TextControl;
	var Button = wp.components.Button;
	var __ = wp.i18n.__;
	var sprintf = wp.i18n.sprintf;

	/*
	 * Mirrors vpress_story_chart_types() in PHP and STORY_CHART_TYPES in
	 * admin/src/charts/story.js. All three are the list the chart container's
	 * own config watcher accepts — it throws on anything else, which is why
	 * `treemap` is absent although the figure can render one.
	 */
	var CHART_TYPES = [ 'bars', 'heatmap', 'spineplot', 'scatter', 'timeline', 'map' ];

	// The preview mounts asynchronously; a step selected while it is still
	// loading polls for it rather than silently doing nothing.
	var HANDLE_POLL_MS = 200;
	var HANDLE_POLL_TRIES = 25;

	/* -------------------------------------------------------------- helpers */

	/** The mounted chart of the story this step belongs to, if it is ready. */
	function findHandle( node ) {
		if ( ! node || ! node.closest ) {
			return null;
		}
		var story = node.closest( '.wp-block-vpress-story' );
		var figure = story && story.querySelector( '[data-vpress-chart]' );
		return ( figure && figure.vpressStoryHandle ) || null;
	}

	function annotationIds( annotations ) {
		return annotations.map( function ( annotation ) {
			return String( ( annotation && annotation.id ) || '' ).toLowerCase();
		} );
	}

	function annotationLabel( annotation ) {
		var label = annotation && typeof annotation.label === 'string' ? annotation.label.trim() : '';
		var id = String( ( annotation && annotation.id ) || '' );
		return label ? label + ' (' + id + ')' : id;
	}

	/* ---------------------------------------------------------- components */

	function StepInspector( props ) {
		var overrides = props.overrides;
		var annotations = props.annotations;
		var ids = annotationIds( annotations );

		function update( patch ) {
			var next = {};
			Object.keys( overrides ).forEach( function ( key ) {
				next[ key ] = overrides[ key ];
			} );
			Object.keys( patch ).forEach( function ( key ) {
				if ( patch[ key ] === undefined ) {
					delete next[ key ];
				} else {
					next[ key ] = patch[ key ];
				}
			} );
			props.onChange( next );
		}

		// `show` absent means "every annotation", which is the state of a step
		// nobody has touched. The first tick materialises the list, so from
		// then on it is an explicit allow-list — including the empty one,
		// which is how a step that has revealed nothing yet is expressed.
		function isShown( id ) {
			return ! Array.isArray( overrides.show ) || overrides.show.indexOf( id ) !== -1;
		}
		function isEmphasized( id ) {
			return Array.isArray( overrides.emphasize ) && overrides.emphasize.indexOf( id ) !== -1;
		}
		function toggle( key, fallback, id, on ) {
			var current = Array.isArray( overrides[ key ] ) ? overrides[ key ].slice() : fallback.slice();
			var at = current.indexOf( id );
			if ( on && at === -1 ) {
				current.push( id );
			}
			if ( ! on && at !== -1 ) {
				current.splice( at, 1 );
			}
			var patch = {};
			patch[ key ] = current;
			// Hiding an annotation cannot leave it emphasised: the chart would
			// have to both hide and highlight the same mark, and hiding wins.
			if ( key === 'show' && ! on && isEmphasized( id ) ) {
				patch.emphasize = overrides.emphasize.filter( function ( other ) {
					return other !== id;
				} );
			}
			update( patch );
		}

		var rows = annotations.length
			? annotations.map( function ( annotation ) {
					var id = String( ( annotation && annotation.id ) || '' ).toLowerCase();
					var shown = isShown( id );
					return el(
						'div',
						{ key: id, className: 'vpress-story-step__annotation' },
						el( 'p', { className: 'vpress-story-step__annotation-label' }, annotationLabel( annotation ) ),
						el( CheckboxControl, {
							label: __( 'Show', 'vpress' ),
							checked: shown,
							onChange: function ( checked ) {
								toggle( 'show', ids, id, !! checked );
							},
							__nextHasNoMarginBottom: true,
						} ),
						el( CheckboxControl, {
							label: __( 'Emphasise', 'vpress' ),
							checked: isEmphasized( id ),
							disabled: ! shown,
							onChange: function ( checked ) {
								toggle( 'emphasize', [], id, !! checked );
							},
							__nextHasNoMarginBottom: true,
						} )
					);
			  } )
			: [
					el(
						'p',
						{ key: 'none', className: 'vpress-story-step__empty' },
						props.chartId
							? __( 'This chart has no annotations yet. Add them in Vpress and they will appear here.', 'vpress' )
							: __( 'Choose a chart on the story block to see its annotations.', 'vpress' )
					),
			  ];

		return el(
			InspectorControls,
			{ key: 'inspector' },
			el(
				PanelBody,
				{ title: __( 'What the chart shows here', 'vpress' ), initialOpen: true },
				rows,
				el(
					Button,
					{
						key: 'capture',
						variant: 'secondary',
						className: 'vpress-story-step__capture',
						onClick: props.onCapture,
					},
					__( 'Capturar estado actual', 'vpress' )
				),
				props.captureNotice
					? el( 'p', { key: 'notice', className: 'vpress-story-step__notice' }, props.captureNotice )
					: null
			),
			el(
				PanelBody,
				{ title: __( 'Overrides', 'vpress' ), initialOpen: false },
				el( TextControl, {
					key: 'title',
					label: __( 'Title for this step', 'vpress' ),
					help: __( 'Replaces the figure caption while this step is active. Leave empty to keep the chart’s own.', 'vpress' ),
					value: typeof overrides.title === 'string' ? overrides.title : '',
					onChange: function ( value ) {
						update( { title: value ? value : undefined } );
					},
					__next40pxDefaultSize: true,
					__nextHasNoMarginBottom: true,
				} ),
				el( SelectControl, {
					key: 'chartType',
					label: __( 'Chart type for this step', 'vpress' ),
					value: typeof overrides.chartType === 'string' ? overrides.chartType : '',
					options: [ { label: __( 'No change', 'vpress' ), value: '' } ].concat(
						CHART_TYPES.map( function ( type ) {
							return { label: type, value: type };
						} )
					),
					onChange: function ( value ) {
						update( { chartType: value ? value : undefined } );
					},
					__next40pxDefaultSize: true,
					__nextHasNoMarginBottom: true,
				} )
			)
		);
	}

	function Edit( props ) {
		var attributes = props.attributes || {};
		var setAttributes = props.setAttributes;
		var context = props.context || {};
		var chartId = Number( context[ 'vpress/chartId' ] ) > 0 ? Number( context[ 'vpress/chartId' ] ) : 0;
		var overrides = attributes.overrides && typeof attributes.overrides === 'object' ? attributes.overrides : {};
		var blockProps = useBlockProps( { className: 'vpress-story__step is-active' } );
		var hostRef = useRef( null );
		var noticeState = wp.element.useState( '' );
		var setNotice = noticeState[ 1 ];

		var list = shared.useChartList();
		var selected = shared.useSelectedChart( chartId, list );
		var annotations = selected.status === 'found' ? shared.annotationsOf( selected.row ) : [];

		var overridesKey = JSON.stringify( overrides );

		// Selecting a step drives the story's live preview, so what the author
		// is editing is what the reader will see at that point in the scroll.
		useEffect(
			function () {
				if ( ! props.isSelected ) {
					return undefined;
				}
				var cancelled = false;
				var tries = 0;
				var timer = null;

				function attempt() {
					if ( cancelled ) {
						return;
					}
					var handle = findHandle( hostRef.current );
					if ( handle && typeof handle.applyStoryState === 'function' ) {
						try {
							handle.applyStoryState( JSON.parse( overridesKey ) );
						} catch ( error ) {
							window.console.error( '[vpress] story step preview:', error );
						}
						return;
					}
					tries += 1;
					if ( tries < HANDLE_POLL_TRIES ) {
						timer = window.setTimeout( attempt, HANDLE_POLL_MS );
					}
				}
				attempt();

				return function () {
					cancelled = true;
					if ( timer ) {
						window.clearTimeout( timer );
					}
				};
			},
			[ props.isSelected, overridesKey ]
		);

		function onCapture() {
			var handle = findHandle( hostRef.current );
			if ( ! handle || typeof handle.readStoryState !== 'function' ) {
				setNotice( __( 'The chart preview is not ready yet.', 'vpress' ) );
				return;
			}
			var state = handle.readStoryState();
			var next = { show: state.show, emphasize: state.emphasize };
			if ( Array.isArray( overrides.hide ) && overrides.hide.length ) {
				next.hide = overrides.hide;
			}
			if ( state.filters && state.filters.length ) {
				next.filters = state.filters;
			}
			if ( state.chartType ) {
				next.chartType = state.chartType;
			}
			if ( state.title ) {
				next.title = state.title;
			}
			setAttributes( { overrides: next } );
			setNotice(
				/* translators: %d: number of annotations captured as visible. */
				sprintf( __( 'Captured: %d visible.', 'vpress' ), state.show.length )
			);
		}

		return el(
			'div',
			blockProps,
			el( StepInspector, {
				key: 'inspector',
				annotations: annotations,
				chartId: chartId,
				overrides: overrides,
				captureNotice: noticeState[ 0 ],
				onCapture: onCapture,
				onChange: function ( next ) {
					setNotice( '' );
					setAttributes( { overrides: next } );
				},
			} ),
			el(
				'div',
				{ key: 'body', ref: hostRef, className: 'vpress-story-step__body' },
				el( PlainText, {
					key: 'heading',
					className: 'vpress-story__heading',
					value: typeof attributes.heading === 'string' ? attributes.heading : '',
					placeholder: __( 'Step heading', 'vpress' ),
					onChange: function ( value ) {
						setAttributes( { heading: value } );
					},
				} ),
				el( RichText, {
					key: 'text',
					tagName: 'p',
					className: 'vpress-story__text',
					value: typeof attributes.text === 'string' ? attributes.text : '',
					placeholder: __( 'What the reader should notice here.', 'vpress' ),
					onChange: function ( value ) {
						setAttributes( { text: value } );
					},
				} )
			)
		);
	}

	wp.blocks.registerBlockType( NAME, {
		edit: Edit,
		save: function () {
			return null;
		},
	} );
} )( window.wp );
