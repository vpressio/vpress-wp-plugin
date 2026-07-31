// Vite replacement for webpack's dynamic require() of bundled images.
// `new URL` with a partially-static template literal is statically analyzed
// by Vite at build time, so every file under assets/images/ ships in dist.
export const imageUrl = (file) => new URL(`../assets/images/${file}`, import.meta.url).href;
