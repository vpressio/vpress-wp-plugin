import { describe, it, expect } from 'vitest';
import {
  ANIMATED_CLASS,
  EMPHASIS_CLASS,
  HIDDEN_CLASS,
  MARK_EMPHASIS_CLASS,
  MARK_MUTED_CLASS,
  MUTED_CLASS,
  STORY_CHART_TYPES,
  applyAnnotationClasses,
  applyMarkClasses,
  markSelection,
  mergeStoryFilters,
  normalizeStoryOverrides,
  storyQueryKey
} from '../../src/charts/story.js';

/** A drawn annotation group, the shape drawAnnotations() produces. */
function chart(ids) {
  document.body.innerHTML =
    '<svg><g class="vpress-annotations">' +
    ids
      .map(
        (id) =>
          `<g class="vpress-annotation" data-annotation-id="${id}" data-annotation-type="point">` +
          `<text class="vpress-annotation__label">${id}</text></g>`
      )
      .join('') +
    '</g></svg>';
  return document.querySelector('svg');
}

function classesOf(root) {
  return Array.from(root.querySelectorAll('[data-annotation-id]')).map((node) => ({
    id: node.getAttribute('data-annotation-id'),
    hidden: node.classList.contains(HIDDEN_CLASS),
    emphasized: node.classList.contains(EMPHASIS_CLASS),
    muted: node.classList.contains(MUTED_CLASS)
  }));
}

describe('normalizeStoryOverrides', () => {
  it('keeps only what the front end reads, and lowercases ids', () => {
    expect(
      normalizeStoryOverrides({
        show: ['A1', ' a2 ', 'not valid!', 'a1'],
        emphasize: ['a2'],
        hide: ['a3'],
        filters: [{ slug: 'mes', value: ['Oct'] }],
        title: '  Octubre  ',
        chartType: 'timeline',
        nonsense: true
      })
    ).toEqual({
      show: ['a1', 'a2'],
      emphasize: ['a2'],
      hide: ['a3'],
      filters: [{ slug: 'mes', type: 'ordinal', value: ['Oct'] }],
      title: 'Octubre',
      chartType: 'timeline'
    });
  });

  it('tells an absent allow-list from an empty one', () => {
    // Absent: every annotation stays visible. Empty: none does — which is
    // what a checkbox list with nothing ticked produces, and the only way to
    // say "this step has not revealed anything yet".
    expect(normalizeStoryOverrides({})).toEqual({});
    expect(normalizeStoryOverrides({ show: [] })).toEqual({ show: [] });
  });

  it('drops a chart type the container would throw on', () => {
    // treemap draws on first paint but the chartConfig watcher rejects it.
    expect(STORY_CHART_TYPES).not.toContain('treemap');
    expect(normalizeStoryOverrides({ chartType: 'treemap' })).toEqual({});
    expect(normalizeStoryOverrides({ chartType: 'bars' })).toEqual({ chartType: 'bars' });
  });

  it('is an empty state, never a throw, whatever it is handed', () => {
    [null, undefined, 'not json', 17, [], true, '{"show":'].forEach((raw) => {
      expect(normalizeStoryOverrides(raw)).toEqual({});
    });
    expect(normalizeStoryOverrides('{"show":["a1"]}')).toEqual({ show: ['a1'] });
  });

  it('omits an empty title, filter list or chart type rather than storing a blank', () => {
    expect(normalizeStoryOverrides({ title: '   ', chartType: '', filters: [] })).toEqual({});
  });
});

describe('storyQueryKey', () => {
  it('is the same for two steps that differ only in emphasis', () => {
    const a = normalizeStoryOverrides({ show: ['a1'], emphasize: ['a1'] });
    const b = normalizeStoryOverrides({ show: ['a1', 'a2'] });
    expect(storyQueryKey(a)).toBe(storyQueryKey(b));
  });

  it('changes when the rows would change', () => {
    const base = normalizeStoryOverrides({});
    expect(storyQueryKey(normalizeStoryOverrides({ chartType: 'timeline' }))).not.toBe(storyQueryKey(base));
    expect(
      storyQueryKey(normalizeStoryOverrides({ filters: [{ slug: 'mes', value: ['Oct'] }] }))
    ).not.toBe(storyQueryKey(base));
  });
});

describe('applyAnnotationClasses', () => {
  it('shows everything when the step names no allow-list', () => {
    const svg = chart(['a1', 'a2']);
    const found = applyAnnotationClasses(svg, normalizeStoryOverrides({}));

    expect(classesOf(svg).every((a) => !a.hidden && !a.emphasized && !a.muted)).toBe(true);
    expect(found).toEqual({ visible: ['a1', 'a2'], hidden: [], emphasized: [] });
  });

  it('treats an allow-list as exactly that, empty included', () => {
    const svg = chart(['a1', 'a2', 'a3']);

    applyAnnotationClasses(svg, normalizeStoryOverrides({ show: ['a2'] }));
    expect(classesOf(svg).map((a) => a.hidden)).toEqual([true, false, true]);

    applyAnnotationClasses(svg, normalizeStoryOverrides({ show: [] }));
    expect(classesOf(svg).map((a) => a.hidden)).toEqual([true, true, true]);
  });

  it('lets hide win over show, because hide is the explicit one', () => {
    const svg = chart(['a1', 'a2']);
    applyAnnotationClasses(svg, normalizeStoryOverrides({ show: ['a1', 'a2'], hide: ['a1'] }));
    expect(classesOf(svg).map((a) => a.hidden)).toEqual([true, false]);
  });

  it('mutes the others only while something is emphasised', () => {
    const svg = chart(['a1', 'a2']);

    applyAnnotationClasses(svg, normalizeStoryOverrides({ emphasize: ['a1'] }));
    expect(classesOf(svg)).toEqual([
      { id: 'a1', hidden: false, emphasized: true, muted: false },
      { id: 'a2', hidden: false, emphasized: false, muted: true }
    ]);

    applyAnnotationClasses(svg, normalizeStoryOverrides({}));
    expect(classesOf(svg).some((a) => a.muted)).toBe(false);
  });

  it('never emphasises what it is also hiding', () => {
    const svg = chart(['a1']);
    applyAnnotationClasses(svg, normalizeStoryOverrides({ show: [], emphasize: ['a1'] }));
    expect(classesOf(svg)).toEqual([{ id: 'a1', hidden: true, emphasized: false, muted: false }]);
  });

  it('is a no-op for an id this chart does not have', () => {
    const svg = chart(['a1']);

    // Not an error and not a warning: a chart can lose an annotation long
    // after a story started referencing it, and an annotation that cannot be
    // PLACED draws nothing even though the config still has it.
    expect(() =>
      applyAnnotationClasses(svg, normalizeStoryOverrides({ show: ['a1', 'gone'], emphasize: ['gone'] }))
    ).not.toThrow();
    expect(classesOf(svg)).toEqual([{ id: 'a1', hidden: false, emphasized: false, muted: false }]);
  });

  it('cannot be broken by an id that would break a selector', () => {
    const svg = chart(['a1']);
    // Ids are sanitised server-side; the editor preview passes them raw, so
    // nothing here may interpolate one into querySelector().
    expect(() => applyAnnotationClasses(svg, { show: ['a1"],[x'], emphasize: ['*'] })).not.toThrow();
  });

  it('survives being handed no chart at all', () => {
    expect(applyAnnotationClasses(null, {})).toEqual({ visible: [], hidden: [], emphasized: [] });
    expect(applyAnnotationClasses({}, {})).toEqual({ visible: [], hidden: [], emphasized: [] });
  });
});

describe('markSelection', () => {
  const MONTHS = ['Ene', 'Feb', 'Mar', 'Oct', 'Nov', 'Dic'];
  const ANNOTATIONS = [
    { id: 'meta', type: 'line', axis: 'y', value: 500 },
    { id: 'pico', type: 'point', x: 'Oct', y: 688 },
    { id: 'despues', type: 'range', axis: 'x', from: 'Oct', to: 'Dic' },
    { id: 'nota', type: 'text', x: 'Feb', y: 300 },
    { id: 'corte', type: 'line', axis: 'x', value: 'Mar' }
  ];

  it('selects nothing at all for an annotation on the value axis', () => {
    // A target line says something about EVERY mark. If it selected none of
    // them, "emphasise the target" would grey out the whole chart.
    expect(markSelection(ANNOTATIONS, ['meta'], MONTHS)).toBeNull();
  });

  it('selects the mark a point or a text sits on', () => {
    expect(markSelection(ANNOTATIONS, ['pico'], MONTHS)).toEqual([3]);
    expect(markSelection(ANNOTATIONS, ['nota'], MONTHS)).toEqual([1]);
  });

  it('selects the band a range on the category axis covers', () => {
    expect(markSelection(ANNOTATIONS, ['despues'], MONTHS)).toEqual([3, 4, 5]);
  });

  it('selects the mark a line on the category axis sits on', () => {
    expect(markSelection(ANNOTATIONS, ['corte'], MONTHS)).toEqual([2]);
  });

  it('unions several emphasised annotations', () => {
    expect(markSelection(ANNOTATIONS, ['pico', 'nota'], MONTHS)).toEqual([1, 3]);
  });

  it('reads a range numerically when the axis is not categories', () => {
    const years = ['2020', '2021', '2022', '2023'];
    const band = [{ id: 'r', type: 'range', axis: 'x', from: 2021, to: 2022 }];
    expect(markSelection(band, ['r'], years)).toEqual([1, 2]);
  });

  it('selects nothing for an id the chart does not have, or an empty list', () => {
    expect(markSelection(ANNOTATIONS, ['gone'], MONTHS)).toBeNull();
    expect(markSelection(ANNOTATIONS, [], MONTHS)).toBeNull();
    expect(markSelection([], ['pico'], MONTHS)).toBeNull();
    expect(markSelection(ANNOTATIONS, ['pico'], [])).toBeNull();
  });

  it('declines a range whose ends are on neither scale, rather than selecting none', () => {
    // Unplaceable, exactly like an annotation drawAnnotations() cannot put on
    // the chart — so it is a no-op, not a selection of zero marks. The two
    // are not interchangeable here: only null leaves the marks untouched.
    const band = [{ id: 'r', type: 'range', axis: 'x', from: 'Marzo', to: 'Abril' }];
    expect(markSelection(band, ['r'], MONTHS)).toBeNull();
  });

  it('selects zero marks for a numeric range the data does not reach', () => {
    // Placeable, just empty — and applyMarkClasses() reads an empty
    // selection the same as none, so the chart is not left fully dimmed.
    const years = ['2020', '2021'];
    const band = [{ id: 'r', type: 'range', axis: 'x', from: 3000, to: 3100 }];
    expect(markSelection(band, ['r'], years)).toEqual([]);
  });
});

describe('applyMarkClasses', () => {
  function marks(n) {
    document.body.innerHTML = Array.from({ length: n }, () => '<div class="vpress-mark"></div>').join('');
    return Array.from(document.querySelectorAll('.vpress-mark'));
  }

  it('emphasises the selection and mutes the rest', () => {
    const list = marks(3);
    expect(applyMarkClasses(list, [1])).toBe(1);
    expect(list.map((m) => m.classList.contains(MARK_EMPHASIS_CLASS))).toEqual([false, true, false]);
    expect(list.map((m) => m.classList.contains(MARK_MUTED_CLASS))).toEqual([true, false, true]);
  });

  it('clears every class when nothing selects marks', () => {
    const list = marks(2);
    applyMarkClasses(list, [0]);
    expect(applyMarkClasses(list, null)).toBe(0);
    expect(list.some((m) => m.classList.contains(MARK_MUTED_CLASS))).toBe(false);
    expect(list.some((m) => m.classList.contains(MARK_EMPHASIS_CLASS))).toBe(false);
  });

  it('treats an empty selection the same as none', () => {
    const list = marks(2);
    applyMarkClasses(list, [0]);
    applyMarkClasses(list, []);
    expect(list.some((m) => m.classList.contains(MARK_MUTED_CLASS))).toBe(false);
  });
});

describe('mergeStoryFilters', () => {
  it('replaces the chart’s clause for the same column and keeps the others', () => {
    const base = [
      { slug: 'mes', type: 'ordinal', value: ['Ene'] },
      { slug: 'estado', type: 'ordinal', value: ['Sonora'] }
    ];
    expect(mergeStoryFilters(base, [{ slug: 'mes', type: 'ordinal', value: ['Oct'] }])).toEqual([
      { slug: 'estado', type: 'ordinal', value: ['Sonora'] },
      { slug: 'mes', type: 'ordinal', value: ['Oct'] }
    ]);
  });

  it('survives either side being missing', () => {
    expect(mergeStoryFilters(undefined, undefined)).toEqual([]);
    expect(mergeStoryFilters([{ slug: 'mes' }], undefined)).toEqual([{ slug: 'mes' }]);
  });
});

describe('the animated class', () => {
  it('is its own name, so nothing else can switch the transitions on', () => {
    // The whole aria-busy hazard depends on this class NOT being present at
    // the moment of the first paint; it is set one frame later, by the
    // container, and nowhere else.
    expect(ANIMATED_CLASS).toBe('vpress-story-animated');
  });
});
