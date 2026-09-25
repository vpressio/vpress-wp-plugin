import { describe, it, expect, beforeEach } from 'vitest';
import { scaleBand, scaleLinear, scaleTime } from 'd3';
import {
  ANNOTATIONS_CLASS,
  drawAnnotations,
  annotationColor,
  nextAnnotationId,
  createAnnotation,
  annotationPositionKeys
} from '../../src/charts/annotations.js';

const WIDTH = 400;
const HEIGHT = 200;
const CATEGORIES = ['Ene', 'Mar', 'Oct', 'Dic'];

/** The plot-local <g> dbox hands the load() hook, plus its scales. */
function plot() {
  document.body.innerHTML = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  // A mark already drawn, so "appended last" is observable.
  g.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'rect'));
  svg.appendChild(g);
  document.body.appendChild(svg);
  return {
    node: g,
    scales: {
      x: scaleBand().domain(CATEGORIES).rangeRound([0, WIDTH]).padding(0.1),
      y: scaleLinear().domain([0, 1000]).range([HEIGHT, 0])
    },
    opts: { width: WIDTH, height: HEIGHT }
  };
}

function draw(annotations, overrides = {}) {
  const p = plot();
  const group = drawAnnotations(
    p.node,
    annotations,
    { ...p.scales, ...(overrides.scales || {}) },
    { ...p.opts, ...(overrides.opts || {}) }
  );
  return { ...p, group };
}

describe('drawAnnotations', () => {
  it('draws nothing at all when the chart has no annotations', () => {
    const { node, group } = draw([]);
    expect(group).toBe(null);
    expect(node.querySelector(`.${ANNOTATIONS_CLASS}`)).toBe(null);
  });

  it('appends one group last, above the marks', () => {
    const { node, group } = draw([{ id: 'a1', type: 'line', axis: 'y', value: 500 }]);
    expect(group).not.toBe(null);
    expect(node.lastElementChild).toBe(group);
    expect(group.getAttribute('class')).toBe(ANNOTATIONS_CLASS);
  });

  it('is idempotent: a redraw replaces the previous pass rather than stacking', () => {
    const p = plot();
    const annotations = [{ id: 'a1', type: 'line', axis: 'y', value: 500 }];
    drawAnnotations(p.node, annotations, p.scales, p.opts);
    drawAnnotations(p.node, annotations, p.scales, p.opts);
    expect(p.node.querySelectorAll(`.${ANNOTATIONS_CLASS}`)).toHaveLength(1);
    expect(p.node.querySelectorAll('.vpress-annotation')).toHaveLength(1);
  });

  it('carries each annotation id onto its own group, in config order', () => {
    const { group } = draw([
      { id: 'a4', type: 'text', x: 'Mar', y: 400, label: 'Nota' },
      { id: 'a1', type: 'line', axis: 'y', value: 500, label: 'Meta' }
    ]);
    expect([...group.querySelectorAll('.vpress-annotation')].map((el) => el.dataset.annotationId)).toEqual([
      'a4',
      'a1'
    ]);
  });

  // --- line --------------------------------------------------------------

  it('line on y is a dashed rule across the plot at the scaled value', () => {
    const { group } = draw([{ id: 'a1', type: 'line', axis: 'y', value: 500, label: 'Meta anual' }]);
    const rule = group.querySelector('.vpress-annotation__rule');

    expect(rule.getAttribute('x1')).toBe('0');
    expect(rule.getAttribute('x2')).toBe(String(WIDTH));
    expect(rule.getAttribute('y1')).toBe(String(HEIGHT / 2));
    expect(rule.getAttribute('y2')).toBe(String(HEIGHT / 2));
    expect(rule.getAttribute('stroke-dasharray')).toBeTruthy();
  });

  it('line on x is a vertical rule at the band centre', () => {
    const p = plot();
    const group = drawAnnotations(
      p.node,
      [{ id: 'a1', type: 'line', axis: 'x', value: 'Oct' }],
      p.scales,
      p.opts
    );
    const rule = group.querySelector('.vpress-annotation__rule');
    const expected = p.scales.x('Oct') + p.scales.x.bandwidth() / 2;

    expect(Number(rule.getAttribute('x1'))).toBeCloseTo(expected, 6);
    expect(rule.getAttribute('y1')).toBe('0');
    expect(rule.getAttribute('y2')).toBe(String(HEIGHT));
  });

  it("a line's label stays inside the plot bounds", () => {
    const { group } = draw([{ id: 'a1', type: 'line', axis: 'y', value: 1000, label: 'Techo' }]);
    const text = group.querySelector('.vpress-annotation__label');

    expect(Number(text.getAttribute('x'))).toBeLessThanOrEqual(WIDTH);
    expect(Number(text.getAttribute('y'))).toBeGreaterThanOrEqual(0);
    expect(Number(text.getAttribute('y'))).toBeLessThanOrEqual(HEIGHT);
  });

  // --- point -------------------------------------------------------------

  it('point draws a dot, a leader and an offset label', () => {
    const p = plot();
    const group = drawAnnotations(
      p.node,
      [{ id: 'a2', type: 'point', x: 'Oct', y: 688, label: '+73% vs. septiembre' }],
      p.scales,
      p.opts
    );

    const dot = group.querySelector('.vpress-annotation__dot');
    expect(Number(dot.getAttribute('cx'))).toBeCloseTo(p.scales.x('Oct') + p.scales.x.bandwidth() / 2, 6);
    expect(Number(dot.getAttribute('cy'))).toBeCloseTo(p.scales.y(688), 6);
    expect(group.querySelector('.vpress-annotation__leader')).not.toBe(null);
    expect(group.querySelector('.vpress-annotation__label').textContent).toBe('+73% vs. septiembre');
  });

  it('the leader flips rather than leaving the plot on the right edge', () => {
    const wide = { id: 'a2', type: 'point', x: 'Dic', y: 500, label: 'una nota editorial bastante larga' };
    const { group } = draw([wide]);
    const leader = group.querySelector('.vpress-annotation__leader');
    const text = group.querySelector('.vpress-annotation__label');

    expect(Number(leader.getAttribute('x2'))).toBeLessThan(Number(leader.getAttribute('x1')));
    expect(text.getAttribute('text-anchor')).toBe('end');
    expect(Number(text.getAttribute('x'))).toBeLessThanOrEqual(WIDTH);
  });

  it('the leader flips downward rather than leaving the plot at the top', () => {
    const { group } = draw([{ id: 'a2', type: 'point', x: 'Ene', y: 1000, label: 'Pico' }]);
    const leader = group.querySelector('.vpress-annotation__leader');

    expect(Number(leader.getAttribute('y2'))).toBeGreaterThanOrEqual(0);
    expect(Number(group.querySelector('.vpress-annotation__label').getAttribute('y'))).toBeGreaterThanOrEqual(0);
  });

  // --- range -------------------------------------------------------------

  it('range on x is a translucent band spanning both categories', () => {
    const p = plot();
    const group = drawAnnotations(
      p.node,
      [{ id: 'a3', type: 'range', axis: 'x', from: 'Oct', to: 'Dic', label: 'Tras el pico' }],
      p.scales,
      p.opts
    );
    const band = group.querySelector('.vpress-annotation__band');

    expect(Number(band.getAttribute('x'))).toBeCloseTo(p.scales.x('Oct'), 6);
    expect(Number(band.getAttribute('x')) + Number(band.getAttribute('width'))).toBeCloseTo(
      p.scales.x('Dic') + p.scales.x.bandwidth(),
      6
    );
    expect(band.getAttribute('height')).toBe(String(HEIGHT));
    expect(Number(band.getAttribute('fill-opacity'))).toBeLessThan(1);
  });

  it('range on y spans the full width and labels top-left inside the band', () => {
    const p = plot();
    const group = drawAnnotations(
      p.node,
      [{ id: 'a3', type: 'range', axis: 'y', from: 200, to: 600, label: 'Banda' }],
      p.scales,
      p.opts
    );
    const band = group.querySelector('.vpress-annotation__band');
    const text = group.querySelector('.vpress-annotation__label');

    expect(band.getAttribute('x')).toBe('0');
    expect(band.getAttribute('width')).toBe(String(WIDTH));
    expect(Number(band.getAttribute('y'))).toBeCloseTo(p.scales.y(600), 6);
    expect(Number(band.getAttribute('height'))).toBeCloseTo(p.scales.y(200) - p.scales.y(600), 6);
    expect(Number(text.getAttribute('y'))).toBeGreaterThan(Number(band.getAttribute('y')));
    expect(text.getAttribute('text-anchor')).toBe('start');
  });

  it('a range given back to front still draws a positive band', () => {
    const { group } = draw([{ id: 'a3', type: 'range', axis: 'y', from: 600, to: 200 }]);
    expect(Number(group.querySelector('.vpress-annotation__band').getAttribute('height'))).toBeGreaterThan(0);
  });

  // --- text --------------------------------------------------------------

  it('text is a bare label with no mark', () => {
    const { group } = draw([{ id: 'a4', type: 'text', x: 'Mar', y: 400, label: 'Nota libre' }]);
    const one = group.querySelector('.vpress-annotation');

    expect(one.querySelectorAll('line, circle, rect')).toHaveLength(0);
    expect(one.querySelector('.vpress-annotation__label').textContent).toBe('Nota libre');
  });

  // --- accessibility ------------------------------------------------------

  it('every element is inert except the label, which is focusable and labelled', () => {
    const { group } = draw([
      { id: 'a1', type: 'line', axis: 'y', value: 500, label: 'Meta anual' },
      { id: 'a2', type: 'point', x: 'Oct', y: 688, label: 'Pico' },
      { id: 'a3', type: 'range', axis: 'x', from: 'Oct', to: 'Dic', label: 'Tras' }
    ]);

    group.querySelectorAll('line, circle, rect').forEach((el) => {
      expect(el.getAttribute('pointer-events')).toBe('none');
      expect(el.hasAttribute('tabindex')).toBe(false);
    });

    const labels = [...group.querySelectorAll('.vpress-annotation__label')];
    expect(labels).toHaveLength(3);
    labels.forEach((el) => {
      expect(el.getAttribute('tabindex')).toBe('0');
      expect(el.getAttribute('role')).toBe('graphics-symbol');
      expect(el.getAttribute('aria-label')).toBe(el.textContent);
      expect(el.getAttribute('pointer-events')).toBe('auto');
    });
  });

  it('a label is text content, never markup', () => {
    const { group } = draw([{ id: 'a1', type: 'text', x: 'Mar', y: 400, label: '<b>Pico</b>' }]);
    const text = group.querySelector('.vpress-annotation__label');

    expect(text.textContent).toBe('<b>Pico</b>');
    expect(text.querySelector('b')).toBe(null);
    expect(text.innerHTML).not.toContain('<b>');
  });

  it('an unlabelled annotation still draws its mark and takes no focus', () => {
    const { group } = draw([{ id: 'a1', type: 'line', axis: 'y', value: 500 }]);

    expect(group.querySelector('.vpress-annotation__rule')).not.toBe(null);
    expect(group.querySelector('[tabindex]')).toBe(null);
  });

  // --- colour -------------------------------------------------------------

  it('only the named tokens are honoured; anything else falls back to the default', () => {
    expect(annotationColor({ color: 'signal' })).toBe('signal');
    expect(annotationColor({ color: 'muted' })).toBe('muted');
    expect(annotationColor({ color: 'series' })).toBe('series');
    expect(annotationColor({ color: '#ff0000' })).toBe('signal');
    expect(annotationColor({})).toBe('signal');
  });

  it('the colour token reaches the DOM as a token, never as a hex', () => {
    const { group } = draw([
      { id: 'a1', type: 'line', axis: 'y', value: 500, color: 'muted' },
      { id: 'a2', type: 'line', axis: 'y', value: 600, color: '#ff0000' }
    ]);
    const [first, second] = group.querySelectorAll('.vpress-annotation');

    expect(first.dataset.annotationColor).toBe('muted');
    expect(second.dataset.annotationColor).toBe('signal');
    expect(group.outerHTML).not.toContain('#ff0000');
  });

  // --- what it refuses to place -------------------------------------------

  it('an unknown type is skipped, never fatal', () => {
    const { group } = draw([
      { id: 'a1', type: 'arrow', x: 'Oct', y: 1 },
      { id: 'a2', type: 'line', axis: 'y', value: 500 }
    ]);
    expect([...group.querySelectorAll('.vpress-annotation')].map((el) => el.dataset.annotationId)).toEqual(['a2']);
  });

  it('a category the scale does not know places nothing, never the origin', () => {
    const { group } = draw([{ id: 'a1', type: 'point', x: 'Feb', y: 500, label: 'fantasma' }]);
    expect(group).toBe(null);
  });

  it('a non-numeric value on a linear axis places nothing', () => {
    const { group } = draw([{ id: 'a1', type: 'line', axis: 'y', value: 'mucho' }]);
    expect(group).toBe(null);
  });

  it('survives a chart type whose scales it cannot use', () => {
    const p = plot();
    expect(() =>
      drawAnnotations(p.node, [{ id: 'a1', type: 'line', axis: 'y', value: 1 }], {}, p.opts)
    ).not.toThrow();
    expect(p.node.querySelector(`.${ANNOTATIONS_CLASS}`)).toBe(null);
  });

  it('places a date on a time axis', () => {
    const p = plot();
    const x = scaleTime().domain([new Date('2026-01-01'), new Date('2026-12-31')]).range([0, WIDTH]);
    const group = drawAnnotations(
      p.node,
      [{ id: 'a1', type: 'line', axis: 'x', value: '2026-07-01' }],
      { ...p.scales, x },
      p.opts
    );
    expect(Number(group.querySelector('.vpress-annotation__rule').getAttribute('x1'))).toBeCloseTo(
      x(new Date('2026-07-01')),
      6
    );
  });

  it('draws nothing without a node, a document or a plot size', () => {
    expect(drawAnnotations(null, [{ id: 'a1', type: 'text', x: 1, y: 1 }], {}, {})).toBe(null);
    const p = plot();
    expect(drawAnnotations(p.node, [{ id: 'a1', type: 'line', axis: 'y', value: 1 }], p.scales, {})).toBe(null);
    expect(
      drawAnnotations(p.node, [{ id: 'a1', type: 'line', axis: 'y', value: 1 }], p.scales, { width: 0, height: 0 })
    ).toBe(null);
  });

  it('never draws more than the cap, whatever a hand-edited config carries', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: `a${i + 1}`,
      type: 'line',
      axis: 'y',
      value: i * 10
    }));
    const { group } = draw(many);
    expect(group.querySelectorAll('.vpress-annotation')).toHaveLength(20);
  });
});

describe('the annotation model', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('names the position keys each type needs', () => {
    expect(annotationPositionKeys('line')).toEqual(['value']);
    expect(annotationPositionKeys('range')).toEqual(['from', 'to']);
    expect(annotationPositionKeys('point')).toEqual(['x', 'y']);
    expect(annotationPositionKeys('text')).toEqual(['x', 'y']);
  });

  it('issues an id above every one in use', () => {
    expect(nextAnnotationId([])).toBe('a1');
    expect(nextAnnotationId([{ id: 'a1' }, { id: 'a2' }])).toBe('a3');
    expect(nextAnnotationId([{ id: 'a9' }, { id: 'a2' }])).toBe('a10');
    // A hand-written id carries no number, so it cannot drive the counter.
    expect(nextAnnotationId([{ id: 'meta-anual' }])).toBe('a1');
  });

  it('never hands back an id a deleted annotation used, given the floor', () => {
    const after = nextAnnotationId([{ id: 'a1' }, { id: 'a2' }]); // a3
    // a3 created, then deleted: max+1 alone would hand a3 straight back.
    expect(nextAnnotationId([{ id: 'a1' }, { id: 'a2' }])).toBe(after);
    expect(nextAnnotationId([{ id: 'a1' }, { id: 'a2' }], 4)).toBe('a4');
  });

  it('creates each type with a fresh id and placeable defaults', () => {
    expect(createAnnotation('line', [])).toEqual({ id: 'a1', type: 'line', axis: 'y', value: 0, label: '' });
    expect(createAnnotation('range', [{ id: 'a1' }])).toEqual({
      id: 'a2',
      type: 'range',
      axis: 'x',
      from: 0,
      to: 0,
      label: ''
    });
    expect(createAnnotation('point', [])).toEqual({ id: 'a1', type: 'point', x: 0, y: 0, label: '' });
    expect(createAnnotation('text', [])).toEqual({ id: 'a1', type: 'text', x: 0, y: 0, label: '' });
    expect(createAnnotation('wormhole', []).type).toBe('text');
  });
});
