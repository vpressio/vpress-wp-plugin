// Vite replacement for webpack's dynamic require() of bundled images.
// `new URL` with a partially-static template literal is statically analyzed
// by Vite at build time, so every file under assets/images/ ships in dist.
// A key missing from the build-time map yields ".../undefined" — fall back
// to the default thumbnail instead of a broken image (e.g. map.png).
export const imageUrl = (file) => {
  const href = new URL(`../assets/images/${file}`, import.meta.url).href;
  return href.endsWith('/undefined')
    ? new URL('../assets/images/viz-default.png', import.meta.url).href
    : href;
};
