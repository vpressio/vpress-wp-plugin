/**
 * Shared editor helper: load the Vpress embed bundle into the document that
 * OWNS a figure, and mount charts into it.
 *
 * Extracted from `blocks/chart/index.js` when `vpress/story` needed the same
 * thing. Why it exists at all: d3/dbox resolve `#id` selectors against the
 * global `document` of the window the module runs in, so a module imported in
 * the outer editor window could not draw into the block-editor canvas iframe.
 * Every block that previews a chart must load the embed into
 * `host.ownerDocument` and call THAT window's `vpress.mount( host )`. The
 * embed stylesheet is added to the same document, once.
 *
 * Plain script on the `wp.*`-era globals (no build step, no modules): it is
 * registered as `vpress-block-embed-loader` and declared as a dependency by
 * each block's index.asset.php, so it always runs first. Config comes from
 * PHP (`Vpress_Blocks::editor_config()`) as `window.vpressBlock`.
 *
 * Exposes `window.vpressBlockEmbed`:
 *   load( doc )     → Promise resolving with that document's `window.vpress`
 *   injectCss( doc )  (called by load(); exported for tests)
 */
( function ( window ) {
	'use strict';

	if ( window.vpressBlockEmbed ) {
		return;
	}

	var loads = typeof WeakMap === 'function' ? new WeakMap() : null;

	function config() {
		return window.vpressBlock || {};
	}

	function injectCss( doc ) {
		var css = config().embedCss;
		if ( ! css || doc.querySelector( 'link[data-vpress-embed-css]' ) ) {
			return;
		}
		var link = doc.createElement( 'link' );
		link.rel = 'stylesheet';
		link.href = css;
		link.setAttribute( 'data-vpress-embed-css', '' );
		( doc.head || doc.documentElement ).appendChild( link );
	}

	/**
	 * Load the embed module into `doc` (once per document) and resolve with
	 * that document's `window.vpress`.
	 *
	 * @param {Document} doc
	 * @return {Promise} resolves with `{ mount }`
	 */
	function load( doc ) {
		var win = doc.defaultView;
		injectCss( doc );

		if ( win && win.vpress && typeof win.vpress.mount === 'function' ) {
			return Promise.resolve( win.vpress );
		}
		var pending = loads && loads.get( doc );
		if ( pending ) {
			return pending;
		}

		pending = new Promise( function ( resolve, reject ) {
			var url = config().embedUrl;
			if ( ! url ) {
				reject( new Error( 'vpressBlock.embedUrl is not set' ) );
				return;
			}
			var script = doc.createElement( 'script' );
			script.type = 'module';
			script.src = url;
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
				reject( new Error( 'could not load ' + url ) );
			} );
			( doc.head || doc.documentElement ).appendChild( script );
		} );

		if ( loads ) {
			loads.set( doc, pending );
			pending.catch( function () {
				loads.delete( doc ); // a later preview may retry
			} );
		}
		return pending;
	}

	window.vpressBlockEmbed = { load: load, injectCss: injectCss };
} )( window );
