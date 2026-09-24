// Load leaflet (JS + CSS) only when a map chart is drawn, then hand it to
// @dboxjs/core through the shared bridge object (see leaflet-bridge.cjs).
const KEY = '__vpressLeaflet';
let pending = null;

const bridge = () => globalThis[KEY] || (globalThis[KEY] = {});

export const isLeafletReady = () => typeof bridge().Map === 'function';

export function loadLeaflet() {
  if (isLeafletReady()) return Promise.resolve(bridge());
  if (!pending) {
    pending = Promise.all([
      import('vpress-leaflet/dist/leaflet-src.js'),
      import('vpress-leaflet/dist/leaflet.css')
    ])
      .then(([mod]) => Object.assign(bridge(), mod.default || mod))
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}
