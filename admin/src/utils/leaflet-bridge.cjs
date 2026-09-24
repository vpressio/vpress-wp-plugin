// Stand-in for the `leaflet` module that @dboxjs/core's UMD build require()s
// at load time. dbox only dereferences `L.*` when a map is actually drawn, so
// the real leaflet can arrive later: lazyLeaflet.js dynamic-imports it and
// copies its exports onto this same object. Kept on globalThis so every copy
// of this module (Vite's dev prebundle vs. app code) shares one object.
// Aliased as the bare specifier `leaflet` in vite.config.js; real leaflet is
// imported through the `vpress-leaflet/*` alias.
/* global module */
var key = '__vpressLeaflet';
module.exports = globalThis[key] || (globalThis[key] = {});
