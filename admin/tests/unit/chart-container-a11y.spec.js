import { describe, it, expect } from 'vitest';
import { select } from 'd3';
import VpressChartContainer from '../../src/components/vpress-chart-container.vue';
import { contrastRatio } from '../../src/a11y/contrast.js';

const { methods, computed } = VpressChartContainer;

const chart1 = {
  chart: 'bars',
  title: '',
  theme: '',
  decimals: 1,
  preffix: '',
  suffix: '',
  labels: false,
  xAxis: { title: 'estado', type: 'ordinal', slug: 'estado' },
  yAxis: { title: 'ventas', type: 'linear', slug: 'ventas', func: 'sum' },
  groupBy: { title: 'canal', type: 'ordinal', slug: 'canal' },
  collapseBy: { title: 'ventas', type: 'linear', slug: 'ventas' },
  colors: ['#40348c', '#842f8e', '#ba2982', '#e2346d', '#fc5353', '#ff7b33', '#ffa600']
};

/** The container's methods bound to a minimal stand-in for `this`. */
function fakeVm(overrides = {}) {
  const vm = {
    id: 'vpress-chart-1-1',
    altText: 'Bar chart of ventas by estado, 8 categories.',
    altTitle: 'Gráfica 1',
    chartConfig: chart1,
    groupByOptions: ['Web', 'Directo', 'Distribuidor'],
    dateFormat: '%Y-%m-%d',
    ordinalAxis: chart1.xAxis,
    linearAxis: chart1.yAxis,
    ...overrides
  };
  Object.entries(methods).forEach(([name, fn]) => {
    vm[name] = fn.bind(vm);
  });
  return vm;
}

function drawGroupedBars() {
  document.documentElement.lang = 'en';
  document.body.innerHTML = '<div id="host"></div>';
  const svg = select('#host').append('svg');
  svg.append('g').attr('class', 'y axis').append('path').attr('class', 'domain');
  svg
    .append('g')
    .append('g')
    .attr('class', 'grouped')
    .selectAll('rect')
    .data([
      { key: 'Web', value: 511788, axis: 'Nuevo León' },
      { key: 'Directo', value: 677082, axis: 'Nuevo León' }
    ])
    .enter()
    .append('rect')
    .on('mouseover', () => {})
    .on('mouseout', () => {});
  return svg.node();
}

describe('vpress-chart-container accessibility pass', () => {
  it('gives the svg a <title>, a <desc> from the figure and role=graphics-document', () => {
    const svg = drawGroupedBars();
    fakeVm().applyA11y(svg);

    expect(svg.getAttribute('role')).toBe('graphics-document');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.firstElementChild.tagName.toLowerCase()).toBe('title');
    expect(svg.querySelector('title').textContent).toBe('Gráfica 1');
    expect(svg.querySelector('desc').textContent).toBe('Bar chart of ventas by estado, 8 categories.');
    expect(svg.getAttribute('aria-labelledby')).toBe('vpress-chart-1-1-svg-title');
    expect(svg.getAttribute('aria-describedby')).toBe('vpress-chart-1-1-svg-desc');
  });

  it('prefers the config title and, in the editor, describes the chart with it', () => {
    const svg = drawGroupedBars();
    fakeVm({ altText: '', altTitle: '', chartConfig: { ...chart1, title: 'Ventas 2026' } }).applyA11y(svg);

    expect(svg.querySelector('title').textContent).toBe('Ventas 2026');
    // desc equal to the title adds nothing, so it is left out.
    expect(svg.querySelector('desc')).toBeNull();
    expect(svg.hasAttribute('aria-describedby')).toBe(false);
  });

  it('does not stack titles on redraw', () => {
    const svg = drawGroupedBars();
    const vm = fakeVm();
    vm.applyA11y(svg);
    vm.applyA11y(svg);
    expect(svg.querySelectorAll('title')).toHaveLength(1);
    expect(svg.querySelectorAll('desc')).toHaveLength(1);
  });

  it('hides axes from assistive tech and labels every bar "{category}: {value}"', () => {
    const svg = drawGroupedBars();
    fakeVm().applyA11y(svg);

    expect(svg.querySelector('.axis').getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelector('.domain').getAttribute('aria-hidden')).toBe('true');
    const bars = [...svg.querySelectorAll('.grouped rect')];
    expect(bars.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Nuevo León, Web: 511,788.0',
      'Nuevo León, Directo: 677,082.0'
    ]);
    bars.forEach((b) => expect(b.getAttribute('tabindex')).toBe('0'));
  });

  it('labels other chart types from their dbox datum', () => {
    const vm = fakeVm();
    expect(vm.markLabel({ estado: 'Jalisco', ventas: 5 })).toBe('Jalisco: 5.0');
    const heat = fakeVm({ chartConfig: { ...chart1, chart: 'heatmap' } });
    expect(heat.markLabel({ x: 'A', y: 'Web', value: 2 })).toBe('A, Web: 2.0');
    const scatter = fakeVm({ chartConfig: { ...chart1, chart: 'scatter', groupBy: { slug: '' } } });
    expect(scatter.markLabel({ datum: {}, x: 6, y: 2 })).toBe('estado 6.0, ventas 2.0');
  });
});

describe('vpress-chart-container palette and labels', () => {
  it('lifts the series palette to 3:1 against the theme background', () => {
    const light = computed.palette.call({ chartConfig: { ...chart1, colors: ['#ffe066', '#40348c'] } });
    expect(light[1]).toBe('#40348c');
    expect(contrastRatio(light[0], '#ffffff')).toBeGreaterThanOrEqual(3);

    const dark = computed.palette.call({ chartConfig: { ...chart1, theme: 'dark', colors: ['#40348c'] } });
    expect(contrastRatio(dark[0], '#1e1e1e')).toBeGreaterThanOrEqual(3);
  });

  it('leaves sequential (heatmap, map) and unreadable palettes as saved', () => {
    const colors = ['#ffe066', '#40348c'];
    expect(computed.palette.call({ chartConfig: { ...chart1, chart: 'heatmap', colors } })).toBe(colors);
    const named = ['tomato'];
    expect(computed.palette.call({ chartConfig: { ...chart1, colors: named } })).toBe(named);
  });

  it('forces direct labels when more than one series shares the plot', () => {
    expect(fakeVm().labelsOn()).toBe(true);
    expect(fakeVm({ groupByOptions: [] }).labelsOn()).toBe(false);
    expect(fakeVm({ groupByOptions: ['Web'] }).labelsOn()).toBe(false);
    expect(fakeVm({ groupByOptions: [], chartConfig: { ...chart1, labels: true } }).labelsOn()).toBe(true);
  });

  it('rewrites grouped-bar labels with their own value and unit', () => {
    const svg = drawGroupedBars();
    const group = svg.querySelector('.grouped');
    ['0.5', '0.7'].forEach((t) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'dbox-label');
      text.textContent = t;
      group.appendChild(text);
    });
    fakeVm().labelBars(svg);
    expect([...group.querySelectorAll('.dbox-label')].map((t) => t.textContent)).toEqual(['510K', '680K']);
  });
});
