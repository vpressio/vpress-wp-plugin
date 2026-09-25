import { describe, it, expect, vi, beforeEach } from 'vitest';
import VpressEmbed from '../../src/embed/VpressEmbed.vue';
import VpressChartContainer from '../../src/components/vpress-chart-container.vue';
import { storyQueryKey, HIDDEN_CLASS, EMPHASIS_CLASS, MUTED_CLASS, ANIMATED_CLASS, MARK_MUTED_CLASS, MARK_EMPHASIS_CLASS } from '../../src/charts/story.js';

/**
 * `applyStoryState` — the one entry point a story uses on a mounted chart —
 * and the container half it delegates the drawn SVG to. Both are exercised
 * through their own methods bound to a stand-in `this`, the same way
 * chart-container-annotations.spec.js does, so neither test needs dbox to
 * have actually drawn anything.
 */

/* --------------------------------------------------------------- the embed */

// A real enough chart config: queryBody() reads all of these.
const BASE = {
  chart: 'bars',
  title: 'Quejas por mes',
  xAxis: { title: 'Mes', type: 'ordinal', slug: 'mes', func: '' },
  yAxis: { title: 'Total', type: 'linear', slug: 'total', func: 'sum' },
  groupBy: { title: '', type: '', slug: '' },
  collapseBy: { title: '', type: '', slug: '', func: '' },
  orderBy: { order: 'asc', slug: '' },
  filters: [{ slug: 'estado', type: 'ordinal', value: ['Sonora'] }],
  annotations: [{ id: 'a1', type: 'point', x: 'Oct', y: 688 }]
};

function embedVm(overrides = {}) {
  document.body.innerHTML =
    '<figure class="vpress-figure">' +
    '<div class="vpress-figure__chart" aria-busy="true"><div class="vpress-embed"></div></div>' +
    '<figcaption class="vpress-figure__caption"><span class="vpress-figure__title">Quejas por mes</span></figcaption>' +
    '</figure>';

  const vm = {
    chartId: 1,
    baseValues: BASE,
    dataset: { slug: 'quejas', source: null },
    chartConfig: { ...BASE, title: '', subtitle: '' },
    chartData: [{ mes: 'Oct', total: 688 }],
    baseTitle: 'Quejas por mes',
    storyOverrides: null,
    loadedQueryKey: storyQueryKey(null),
    $el: document.querySelector('.vpress-embed'),
    $refs: { container: null },
    ...overrides
  };
  Object.entries(VpressEmbed.methods).forEach(([name, fn]) => {
    vm[name] = fn.bind(vm);
  });
  return vm;
}

function captionTitle() {
  return document.querySelector('.vpress-figure__title').textContent;
}

describe('VpressEmbed.applyStoryState', () => {
  it('paints emphasis without re-running the query', () => {
    const paint = vi.fn();
    const vm = embedVm();
    vm.paintStoryState = paint;
    vm.runQuery = vi.fn();

    vm.applyStoryState({ show: ['a1'], emphasize: ['a1'] });

    expect(vm.runQuery).not.toHaveBeenCalled();
    expect(paint).toHaveBeenCalledWith(true); // a step change animates
    expect(vm.storyOverrides).toEqual({ show: ['a1'], emphasize: ['a1'] });
  });

  it('re-runs the query only when the ROWS would change', () => {
    const vm = embedVm();
    vm.paintStoryState = vi.fn();
    vm.runQuery = vi.fn();

    vm.applyStoryState({ filters: [{ slug: 'mes', type: 'ordinal', value: ['Oct'] }] });
    expect(vm.runQuery).toHaveBeenCalledTimes(1);

    vm.loadedQueryKey = storyQueryKey(vm.storyOverrides);
    vm.applyStoryState({ filters: [{ slug: 'mes', type: 'ordinal', value: ['Oct'] }], emphasize: ['a1'] });
    expect(vm.runQuery, 'same rows, different emphasis').toHaveBeenCalledTimes(1);

    vm.applyStoryState({ chartType: 'timeline' });
    expect(vm.runQuery).toHaveBeenCalledTimes(2);
  });

  it('remembers the first step when the chart has not loaded yet', () => {
    const vm = embedVm({ baseValues: null, chartData: [] });
    vm.paintStoryState = vi.fn();
    vm.runQuery = vi.fn();

    vm.applyStoryState({ show: ['a1'], chartType: 'timeline' });

    // Nothing to paint and nothing to re-query — load() has not happened —
    // so the state waits, and the FIRST draw already wears it.
    expect(vm.runQuery).not.toHaveBeenCalled();
    expect(vm.paintStoryState).not.toHaveBeenCalled();
    vm.baseValues = BASE;
    expect(vm.effectiveValues().chart).toBe('timeline');
  });

  it('folds a step’s filters over the chart’s own, by column', () => {
    const vm = embedVm();
    vm.paintStoryState = vi.fn();
    vm.runQuery = vi.fn();

    vm.applyStoryState({ filters: [{ slug: 'mes', type: 'ordinal', value: ['Oct'] }] });

    expect(vm.effectiveValues().filters).toEqual([
      { slug: 'estado', type: 'ordinal', value: ['Sonora'] },
      { slug: 'mes', type: 'ordinal', value: ['Oct'] }
    ]);
    expect(BASE.filters, 'the chart config is never edited').toEqual([
      { slug: 'estado', type: 'ordinal', value: ['Sonora'] }
    ]);
  });

  it('rewrites the caption for a step and puts it back for the next', () => {
    const vm = embedVm();
    vm.paintStoryState = vi.fn();

    vm.applyStoryState({ title: 'El pico de octubre' });
    expect(captionTitle()).toBe('El pico de octubre');

    vm.applyStoryState({ show: ['a1'] });
    expect(captionTitle()).toBe('Quejas por mes');
  });

  it('leaves the caption alone when the block hid it', () => {
    document.body.innerHTML = '<figure class="vpress-figure"><div class="vpress-figure__chart"><div class="vpress-embed"></div></div></figure>';
    const vm = embedVm({ $el: document.querySelector('.vpress-embed') });
    vm.paintStoryState = vi.fn();

    expect(() => vm.applyStoryState({ title: 'Octubre' })).not.toThrow();
  });

  it('paints BEFORE the figure says it is idle, with transitions off', () => {
    const order = [];
    const vm = embedVm();
    vm.paintStoryState = vi.fn((animate) => order.push(`paint:${animate}`));
    vm.setBusy = vi.fn((busy) => order.push(`busy:${busy}`));
    vm.$refs.container = { enableStoryTransitions: vi.fn(() => order.push('transitions')) };

    vm.onLoaded();

    /*
     * This order is the whole defence against the hazard that cost the
     * annotations their fade-in: anything that waits for aria-busy="false"
     * and then screenshots or measures must find the step settled, not a
     * third of the way through one.
     */
    expect(order).toEqual(['paint:false', 'busy:false', 'transitions']);
  });

  it('says it is busy again while a step re-queries', async () => {
    const vm = embedVm();
    vm.request = vi.fn(() => Promise.resolve([{ mes: 'Oct', total: 688 }]));
    const slot = document.querySelector('.vpress-figure__chart');

    const pending = vm.runQuery();
    expect(slot.getAttribute('aria-busy')).toBe('true');
    await pending;
    // Left true: onLoaded() clears it once the chart has actually redrawn.
    expect(slot.getAttribute('aria-busy')).toBe('true');
    expect(vm.chartConfig.filters).toEqual(BASE.filters);
  });

  it('reads back what the chart is really showing, not what was asked for', () => {
    const vm = embedVm({
      storyOverrides: { show: ['a1', 'a2', 'ghost'], emphasize: ['a1'] },
      chartConfig: { chart: 'timeline' }
    });
    // embedVm() owns document.body, so the drawn chart goes in afterwards.
    const drawn = document.createElement('div');
    drawn.innerHTML =
      '<svg>' +
      `<g data-annotation-id="a1" class="vpress-annotation ${EMPHASIS_CLASS}"></g>` +
      '<g data-annotation-id="a2" class="vpress-annotation"></g>' +
      `<g data-annotation-id="a3" class="vpress-annotation ${HIDDEN_CLASS}"></g>` +
      '</svg>';
    document.body.appendChild(drawn);
    vm.$refs.container = {
      $el: drawn,
      storyLegendFilter: () => ({ slug: 'mes', type: 'ordinal', value: ['Oct'] })
    };

    expect(vm.readStoryState()).toEqual({
      // "ghost" was asked for and is not in the chart, so it is not reported.
      show: ['a1', 'a2'],
      emphasize: ['a1'],
      filters: [{ slug: 'mes', type: 'ordinal', value: ['Oct'] }],
      chartType: 'timeline',
      title: ''
    });
  });

  it('reports no chart-type override when the chart is on its own type', () => {
    const vm = embedVm();
    vm.$refs.container = { $el: document.createElement('div') };
    expect(vm.readStoryState().chartType).toBe('');
  });

  it('paints nothing rather than throwing when the chart failed to draw', () => {
    const vm = embedVm({ $refs: { container: null } });
    expect(vm.paintStoryState(true)).toBeNull();
  });
});

/* ------------------------------------------------------------ the container */

function containerVm(chartConfig, markup) {
  document.body.innerHTML = `<div class="chart-container">${markup}</div>`;
  const vm = {
    id: 'vpress-chart-1-1',
    chartConfig,
    ordinalAxis: { slug: 'mes' },
    legendOptions: [],
    legendDisplay: { slug: 'estado' },
    $el: document.querySelector('.chart-container')
  };
  Object.entries(VpressChartContainer.methods).forEach(([name, fn]) => {
    vm[name] = fn.bind(vm);
  });
  return vm;
}

const ANNOTATED =
  '<svg>' +
  '<rect class="vpress-mark" data-i="0"></rect>' +
  '<rect class="vpress-mark" data-i="1"></rect>' +
  '<rect class="vpress-mark" data-i="2"></rect>' +
  '<g class="vpress-annotations">' +
  '<g class="vpress-annotation" data-annotation-id="a1"></g>' +
  '<g class="vpress-annotation" data-annotation-id="a2"></g>' +
  '</g></svg>';

function markData(vm, keys) {
  Array.from(vm.$el.querySelectorAll('.vpress-mark')).forEach((mark, i) => {
    mark.__data__ = { mes: keys[i], total: 1 };
  });
}

describe('VpressChartContainer.applyStoryEmphasis', () => {
  const CONFIG = {
    chart: 'bars',
    xAxis: { slug: 'mes', type: 'ordinal' },
    annotations: [
      { id: 'a1', type: 'point', x: 'Oct', y: 688 },
      { id: 'a2', type: 'line', axis: 'y', value: 500 }
    ]
  };

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('toggles the annotation classes and dims the marks an emphasis names', () => {
    const vm = containerVm(CONFIG, ANNOTATED);
    markData(vm, ['Sep', 'Oct', 'Nov']);

    const found = vm.applyStoryEmphasis({ show: ['a1'], emphasize: ['a1'] }, { animate: true });

    expect(found).toEqual({ visible: ['a1'], hidden: ['a2'], emphasized: ['a1'] });
    const marks = Array.from(vm.$el.querySelectorAll('.vpress-mark'));
    expect(marks.map((m) => m.classList.contains(MARK_EMPHASIS_CLASS))).toEqual([false, true, false]);
    expect(marks.map((m) => m.classList.contains(MARK_MUTED_CLASS))).toEqual([true, false, true]);
  });

  it('does not dim a single mark for an emphasis on the value axis', () => {
    const vm = containerVm(CONFIG, ANNOTATED);
    markData(vm, ['Sep', 'Oct', 'Nov']);

    vm.applyStoryEmphasis({ emphasize: ['a2'] }, { animate: true });

    // "Emphasise the target line" must not grey out every bar.
    const marks = Array.from(vm.$el.querySelectorAll('.vpress-mark'));
    expect(marks.some((m) => m.classList.contains(MARK_MUTED_CLASS))).toBe(false);
    expect(vm.$el.querySelector('[data-annotation-id="a2"]').classList.contains(EMPHASIS_CLASS)).toBe(true);
    expect(vm.$el.querySelector('[data-annotation-id="a1"]').classList.contains(MUTED_CLASS)).toBe(true);
  });

  it('paints with transitions OFF unless asked, and turns them on a frame later', async () => {
    const vm = containerVm(CONFIG, ANNOTATED);
    markData(vm, ['Sep', 'Oct', 'Nov']);
    vm.$el.classList.add(ANIMATED_CLASS);

    vm.applyStoryEmphasis({ emphasize: ['a1'] }, { animate: false });
    expect(vm.$el.classList.contains(ANIMATED_CLASS), 'the first paint of a draw cannot animate').toBe(false);

    vm.enableStoryTransitions();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(vm.$el.classList.contains(ANIMATED_CLASS)).toBe(true);

    // A later step change leaves the class alone, so the transition it wants
    // was already in the style BEFORE the classes changed.
    vm.applyStoryEmphasis({ emphasize: ['a2'] }, { animate: true });
    expect(vm.$el.classList.contains(ANIMATED_CLASS)).toBe(true);
  });

  it('is a no-op for an id the chart does not have', () => {
    const vm = containerVm(CONFIG, ANNOTATED);
    markData(vm, ['Sep', 'Oct', 'Nov']);

    expect(() => vm.applyStoryEmphasis({ show: ['a1', 'gone'], emphasize: ['gone'] }, {})).not.toThrow();
    expect(vm.$el.querySelector('[data-annotation-id="a1"]').classList.contains(HIDDEN_CLASS)).toBe(false);
    expect(
      Array.from(vm.$el.querySelectorAll('.vpress-mark')).some((m) => m.classList.contains(MARK_MUTED_CLASS))
    ).toBe(false);
  });

  it('survives a chart that drew nothing', () => {
    const vm = containerVm(CONFIG, '');
    expect(vm.applyStoryEmphasis({ emphasize: ['a1'] }, {})).toEqual({ visible: [], hidden: [], emphasized: [] });
    vm.$el = null;
    expect(vm.applyStoryEmphasis({ emphasize: ['a1'] }, {})).toBeNull();
  });
});

describe('VpressChartContainer.markStoryKey', () => {
  const vm = () =>
    containerVm({ chart: 'bars', xAxis: { slug: 'mes' }, annotations: [] }, '');

  it('reads the category off the datum shapes the chart types produce', () => {
    const c = vm();
    expect(c.markStoryKey({ mes: 'Oct', total: 688 })).toBe('Oct');
    expect(c.markStoryKey({ datum: { mes: 'Nov' }, x: 1, y: 2 })).toBe('Nov');
    expect(c.markStoryKey({ x: 'Dic', y: 'Norte', value: 4 })).toBe('Dic');
    expect(c.markStoryKey('Ene')).toBe('Ene');
  });

  it('is an empty key, not a throw, for a datum it cannot read', () => {
    const c = vm();
    expect(c.markStoryKey(null)).toBe('');
    expect(c.markStoryKey(undefined)).toBe('');
    expect(c.markStoryKey({ nothing: 1 })).toBe('');
  });
});

describe('VpressChartContainer.storyLegendFilter', () => {
  it('reports only a real narrowing', () => {
    const vm = containerVm({ chart: 'bars', xAxis: { slug: 'mes' }, annotations: [] }, '');

    vm.legendOptions = [{ name: 'Norte', active: true }, { name: 'Sur', active: true }];
    expect(vm.storyLegendFilter(), 'everything on is not a filter').toBeNull();

    vm.legendOptions = [{ name: 'Norte', active: true }, { name: 'Sur', active: false }];
    expect(vm.storyLegendFilter()).toEqual({ slug: 'estado', type: 'ordinal', value: ['Norte'] });

    vm.legendOptions = [{ name: 'Todos', active: true }, { name: 'Norte', active: true }];
    expect(vm.storyLegendFilter(), 'a single series is not a legend').toBeNull();
  });
});
