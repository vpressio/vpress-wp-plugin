import { describe, it, expect } from 'vitest';
import { select, scaleBand, scaleLinear } from 'd3';
import VpressChartContainer from '../../src/components/vpress-chart-container.vue';
import { ANNOTATIONS_CLASS } from '../../src/charts/annotations.js';
import ChartPreset from '../../src/presets/Chart.js';
import { fillValues } from '../../src/helpers/index.js';

const { methods } = VpressChartContainer;

/** The container's methods bound to a minimal stand-in for `this`. */
function fakeVm(chartConfig) {
  const vm = { id: 'vpress-chart-1-1', chartConfig };
  Object.entries(methods).forEach(([name, fn]) => {
    vm[name] = fn.bind(vm);
  });
  return vm;
}

/**
 * What dbox hands `load(chart)`: `_svg` is the <g> translated by the chart
 * margins, `_scales` are the LAYER's scales with their domains already set,
 * and `_width`/`_height` are the plot size inside the margins.
 */
function fakeDboxChart() {
  document.body.innerHTML = '<div id="host"></div>';
  const svg = select('#host').append('svg');
  const g = svg.append('g').attr('transform', 'translate(40,20)');
  g.append('rect').attr('class', 'mark');
  return {
    _svg: g,
    _width: 400,
    _height: 200,
    _scales: {
      x: scaleBand().domain(['Ene', 'Mar', 'Oct', 'Dic']).rangeRound([0, 400]).padding(0.1),
      y: scaleLinear().domain([0, 1000]).range([200, 0])
    }
  };
}

describe('the chart container draws the chart config annotations', () => {
  it('draws them into the plot-local <g>, after the marks', () => {
    const chart = fakeDboxChart();
    fakeVm({ annotations: [{ id: 'a1', type: 'line', axis: 'y', value: 500, label: 'Meta anual' }] })
      .drawChartAnnotations(chart);

    const group = chart._svg.node().querySelector(`.${ANNOTATIONS_CLASS}`);
    expect(group).not.toBe(null);
    expect(chart._svg.node().lastElementChild).toBe(group);
    expect(group.querySelector('.vpress-annotation__label').textContent).toBe('Meta anual');
  });

  it('draws nothing for a chart config that has none', () => {
    const chart = fakeDboxChart();
    fakeVm({}).drawChartAnnotations(chart);
    expect(chart._svg.node().querySelector(`.${ANNOTATIONS_CLASS}`)).toBe(null);
  });

  it('clears a previous pass when the annotations are removed', () => {
    const chart = fakeDboxChart();
    fakeVm({ annotations: [{ id: 'a1', type: 'line', axis: 'y', value: 500 }] }).drawChartAnnotations(chart);
    expect(chart._svg.node().querySelector(`.${ANNOTATIONS_CLASS}`)).not.toBe(null);

    fakeVm({ annotations: [] }).drawChartAnnotations(chart);
    expect(chart._svg.node().querySelector(`.${ANNOTATIONS_CLASS}`)).toBe(null);
  });

  it('never throws on a chart whose scales it cannot use (map, treemap)', () => {
    const chart = fakeDboxChart();
    chart._scales = {};
    expect(() =>
      fakeVm({ annotations: [{ id: 'a1', type: 'line', axis: 'y', value: 1 }] }).drawChartAnnotations(chart)
    ).not.toThrow();

    expect(() => fakeVm({ annotations: [] }).drawChartAnnotations(undefined)).not.toThrow();
    expect(() => fakeVm({ annotations: [] }).drawChartAnnotations({ _svg: null })).not.toThrow();
  });
});

describe('the chart preset carries annotations through the editor', () => {
  it('survives fillValues, which drops every key the preset does not declare', () => {
    const annotations = [{ id: 'a1', type: 'line', axis: 'y', value: 500, label: 'Meta', color: 'signal' }];
    const filled = fillValues({ annotations }, ChartPreset);

    expect(filled.annotations).toEqual(annotations);
  });

  it('defaults to an empty list on a chart saved before annotations existed', () => {
    expect(fillValues({ chart: 'bars' }, ChartPreset).annotations).toEqual([]);
  });
});
