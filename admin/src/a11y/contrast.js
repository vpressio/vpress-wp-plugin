// WCAG 2.x colour-contrast helpers for chart palettes (no dependencies).

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function parseHex(hex) {
  const match = typeof hex === 'string' ? hex.trim().match(HEX) : null;
  if (!match) throw new TypeError(`Not a hex colour: ${hex}`);
  const digits = match[1].length === 3 ? match[1].replace(/./g, '$&$&') : match[1];
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16));
}

function toHex(rgb) {
  return `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
}

/** WCAG 2.x relative luminance of an sRGB colour given as [r, g, b] (0-255). */
function luminance(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(rgbA, rgbB) {
  const a = luminance(rgbA);
  const b = luminance(rgbB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * WCAG 2.x contrast ratio between two hex colours (1 to 21).
 *
 * @param {string} hexA e.g. '#767676' or '#fff'
 * @param {string} hexB
 * @returns {number}
 */
export function contrastRatio(hexA, hexB) {
  return ratio(parseHex(hexA), parseHex(hexB));
}

function rgbToHsl([r, g, b]) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue = (p, q, t) => {
    let u = t;
    if (u < 0) u += 1;
    if (u > 1) u -= 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)].map((c) => c * 255);
}

const STEP = 0.01;

/**
 * Return the palette with every colour below `min`:1 against `background`
 * moved along its HSL lightness (darker on light backgrounds, lighter on
 * dark ones) in fixed 1% steps until it passes. Hue and saturation are kept;
 * colours that already pass are returned exactly as given. Deterministic.
 *
 * @param {string[]} palette
 * @param {string} background
 * @param {number} [min=3] WCAG 1.4.11 non-text contrast
 * @returns {string[]}
 */
export function ensureGraphicContrast(palette, background, min = 3) {
  if (!Array.isArray(palette)) return [];
  const bg = parseHex(background);
  // Move away from the background: towards black if black contrasts more.
  const darken = ratio(bg, [0, 0, 0]) >= ratio(bg, [255, 255, 255]);

  return palette.map((colour) => {
    const rgb = parseHex(colour);
    if (ratio(rgb, bg) >= min) return colour;
    const [h, s, l0] = rgbToHsl(rgb);
    let l = l0;
    let candidate = toHex(rgb);
    // At most 100 steps: lightness is bounded by 0 and 1.
    for (let i = 0; i < 100; i++) {
      l = darken ? Math.max(0, l - STEP) : Math.min(1, l + STEP);
      candidate = toHex(hslToRgb([h, s, l]));
      if (ratio(parseHex(candidate), bg) >= min || l === 0 || l === 1) break;
    }
    return candidate;
  });
}

/**
 * Text colour for a background: '#111' or '#fff', whichever contrasts more
 * (so ≥ 4.5:1 whenever either can reach it).
 *
 * @param {string} background
 * @returns {'#111'|'#fff'}
 */
export function textColorFor(background) {
  const bg = parseHex(background);
  return ratio(bg, parseHex('#111')) >= ratio(bg, [255, 255, 255]) ? '#111' : '#fff';
}
