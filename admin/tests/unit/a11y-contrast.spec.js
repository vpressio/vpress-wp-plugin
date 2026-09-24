import { describe, it, expect } from 'vitest';
import { contrastRatio, ensureGraphicContrast, textColorFor } from '../../src/a11y/contrast.js';

describe('contrastRatio (WCAG 2.x)', () => {
  it('matches known pairs', () => {
    expect(contrastRatio('#000', '#fff')).toBe(21);
    expect(contrastRatio('#ffffff', '#767676')).toBeCloseTo(4.54, 2);
    expect(contrastRatio('#fff', '#fff')).toBe(1);
    // #949494 is the classic "just under 3:1" grey on white.
    expect(contrastRatio('#ffffff', '#949494')).toBeCloseTo(3.03, 2);
  });

  it('is symmetric and accepts 3- and 6-digit hex in any case', () => {
    expect(contrastRatio('#767676', '#FFFFFF')).toBe(contrastRatio('#ffffff', '#767676'));
    expect(contrastRatio('#abc', '#000')).toBe(contrastRatio('#aabbcc', '#000000'));
  });

  it('rejects colours it cannot read', () => {
    expect(() => contrastRatio('red', '#fff')).toThrow(TypeError);
  });
});

describe('ensureGraphicContrast', () => {
  const chart1 = ['#40348c', '#842f8e', '#ba2982', '#e2346d', '#fc5353', '#ff7b33', '#ffa600'];

  it('leaves passing colours untouched and fixes failing ones', () => {
    const out = ensureGraphicContrast(chart1, '#ffffff');
    expect(out).toHaveLength(chart1.length);
    out.forEach((colour) => expect(contrastRatio(colour, '#ffffff')).toBeGreaterThanOrEqual(3));
    // Already ≥ 3:1 on white: returned as given.
    expect(out.slice(0, 5)).toEqual(chart1.slice(0, 5));
    // #ff7b33 (2.6:1) and #ffa600 (1.9:1) are darkened.
    expect(out[5]).not.toBe('#ff7b33');
    expect(out[6]).not.toBe('#ffa600');
  });

  it('darkens on light backgrounds and lightens on dark ones, keeping the hue', () => {
    const [onWhite] = ensureGraphicContrast(['#ffe066'], '#ffffff');
    const [onDark] = ensureGraphicContrast(['#40348c'], '#1e1e1e');
    expect(contrastRatio(onWhite, '#ffffff')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(onDark, '#1e1e1e')).toBeGreaterThanOrEqual(3);
    const hue = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return Math.round(h * 60 + 360) % 360;
    };
    expect(Math.abs(hue(onWhite) - hue('#ffe066'))).toBeLessThanOrEqual(2);
    expect(Math.abs(hue(onDark) - hue('#40348c'))).toBeLessThanOrEqual(2);
  });

  it('is deterministic and does not mutate its input', () => {
    const input = [...chart1];
    expect(ensureGraphicContrast(input, '#fff')).toEqual(ensureGraphicContrast(input, '#fff'));
    expect(input).toEqual(chart1);
  });

  it('honours a custom minimum and tolerates an empty or missing palette', () => {
    const [grey] = ensureGraphicContrast(['#767676'], '#ffffff', 7);
    expect(contrastRatio(grey, '#ffffff')).toBeGreaterThanOrEqual(7);
    expect(ensureGraphicContrast([], '#fff')).toEqual([]);
    expect(ensureGraphicContrast(undefined, '#fff')).toEqual([]);
  });
});

describe('textColorFor', () => {
  it('picks #111 or #fff, whichever reaches 4.5:1', () => {
    expect(textColorFor('#ffffff')).toBe('#111');
    expect(textColorFor('#ffa600')).toBe('#111');
    expect(textColorFor('#000000')).toBe('#fff');
    expect(textColorFor('#40348c')).toBe('#fff');
    expect(textColorFor('#1e1e1e')).toBe('#fff');
    for (const bg of ['#ffffff', '#ffa600', '#40348c', '#1e1e1e']) {
      expect(contrastRatio(textColorFor(bg), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('falls back to the better of the two when neither reaches 4.5:1', () => {
    // #e2346d: #111 gives 4.45:1, #fff 4.24:1.
    expect(textColorFor('#e2346d')).toBe('#111');
    expect(contrastRatio('#111', '#e2346d')).toBeGreaterThan(contrastRatio('#fff', '#e2346d'));
  });
});
