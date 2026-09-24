import { describe, expect, it } from 'vitest';
import { chartBlockMarkup } from '../../src/utils/blockMarkup.js';

describe('chartBlockMarkup', () => {
  it('serializes a self-closing vpress/chart block with a numeric chartId', () => {
    expect(chartBlockMarkup(7)).toBe('<!-- wp:vpress/chart {"chartId":7} /-->');
  });

  it('accepts the string ids the REST list returns', () => {
    expect(chartBlockMarkup('42')).toBe('<!-- wp:vpress/chart {"chartId":42} /-->');
    expect(chartBlockMarkup(' 42 ')).toBe('<!-- wp:vpress/chart {"chartId":42} /-->');
  });

  it('returns an empty string for ids that are not positive integers', () => {
    for (const id of [0, -1, 1.5, NaN, '', 'abc', '1 or 1', '-3', null, undefined, {}]) {
      expect(chartBlockMarkup(id), String(id)).toBe('');
    }
  });
});
