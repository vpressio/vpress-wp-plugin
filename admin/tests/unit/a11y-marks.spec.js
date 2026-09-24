import { describe, it, expect, beforeEach, vi } from 'vitest';
import { select } from 'd3';
import { enhanceMarks, findMarks, MARK_CLASS } from '../../src/a11y/marks.js';

const SVG = 'http://www.w3.org/2000/svg';

/**
 * A small dbox-like chart: three bars whose d3 hover handlers toggle a stub
 * tooltip, plus axis ticks and a legend that also have hover handlers.
 */
function drawChart(tip) {
  document.body.innerHTML = '<div id="host"></div>';
  const svg = select('#host').append('svg').attr('xmlns', SVG);
  svg
    .append('g')
    .attr('class', 'x axis')
    .selectAll('text')
    .data(['A', 'B'])
    .enter()
    .append('rect')
    .on('mouseover', () => {});
  svg
    .append('g')
    .attr('class', 'legendBox')
    .append('rect')
    .datum({ name: 'Web' })
    .on('mouseover', () => {});
  svg.append('rect').attr('class', 'background');
  svg
    .append('g')
    .selectAll('rect')
    .data([
      { estado: 'Jalisco', ventas: 10 },
      { estado: 'Puebla', ventas: 20 },
      { estado: '<b>Sonora</b>', ventas: 30 }
    ])
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .on('mouseover', (d) => tip.show(d))
    .on('mouseout', () => tip.hide());
  return svg.node();
}

function stubTip() {
  return {
    visible: false,
    datum: null,
    show(d) {
      this.visible = true;
      this.datum = d;
    },
    hide() {
      this.visible = false;
    }
  };
}

const getLabel = (d) => `${d.estado}: ${d.ventas}`;

describe('enhanceMarks', () => {
  let tip;
  let svg;

  beforeEach(() => {
    tip = stubTip();
    svg = drawChart(tip);
  });

  it('finds only the data marks (datum + hover handler, outside axes and legend)', () => {
    const marks = findMarks(svg);
    expect(marks).toHaveLength(3);
    marks.forEach((el) => expect(el.getAttribute('class')).toBe('bar'));
  });

  it('gives every mark tabindex, role and a "{category}: {value}" label', () => {
    const marks = enhanceMarks(svg, { getLabel });

    expect(marks).toHaveLength(3);
    const labels = marks.map((el) => el.getAttribute('aria-label'));
    expect(labels).toEqual(['Jalisco: 10', 'Puebla: 20', '<b>Sonora</b>: 30']);
    marks.forEach((el) => {
      expect(el.getAttribute('tabindex')).toBe('0');
      expect(el.getAttribute('role')).toBe('graphics-symbol');
      expect(el.classList.contains(MARK_CLASS)).toBe(true);
    });
    // Labels are attributes, never parsed as markup.
    expect(svg.querySelector('b')).toBeNull();
    expect(svg.querySelectorAll('[tabindex]')).toHaveLength(3);
  });

  it('focus shows the chart\'s own hover tooltip with the datum; blur hides it', () => {
    const [first, second] = enhanceMarks(svg, { getLabel });

    first.focus();
    expect(document.activeElement).toBe(first);
    expect(tip.visible).toBe(true);
    expect(tip.datum).toEqual({ estado: 'Jalisco', ventas: 10 });

    second.focus();
    expect(tip.visible).toBe(true);
    expect(tip.datum).toEqual({ estado: 'Puebla', ventas: 20 });

    second.blur();
    expect(tip.visible).toBe(false);
  });

  it('Escape hides the tooltip while the mark keeps focus', () => {
    const [first] = enhanceMarks(svg, { getLabel });
    first.focus();
    expect(tip.visible).toBe(true);

    first.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(tip.visible).toBe(false);
    expect(document.activeElement).toBe(first);

    first.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(tip.visible).toBe(false);
  });

  it('accepts an explicit tooltip and role, and is idempotent', () => {
    const tooltip = { show: vi.fn(), hide: vi.fn() };
    const marks = enhanceMarks(svg, { getLabel, tooltip, role: 'img' });
    enhanceMarks(svg, { getLabel, tooltip });

    marks[2].focus();
    marks[2].blur();
    expect(tooltip.show).toHaveBeenCalledTimes(1);
    expect(tooltip.show).toHaveBeenCalledWith(marks[2], { estado: '<b>Sonora</b>', ventas: 30 });
    expect(tooltip.hide).toHaveBeenCalledTimes(1);
    expect(marks[2].getAttribute('role')).toBe('img');
  });

  it('keeps the hover handlers working', () => {
    enhanceMarks(svg, { getLabel });
    const bar = findMarks(svg)[1];

    bar.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
    expect(tip.datum).toEqual({ estado: 'Puebla', ventas: 20 });
    bar.dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true }));
    expect(tip.visible).toBe(false);
  });

  it('makes an <svg> with marks a graphics-document, not an img', () => {
    svg.setAttribute('role', 'img');
    enhanceMarks(svg, { getLabel });
    expect(svg.getAttribute('role')).toBe('graphics-document');

    const empty = document.createElementNS(SVG, 'svg');
    enhanceMarks(empty, { getLabel });
    expect(empty.hasAttribute('role')).toBe(false);
  });

  it('does nothing without a root', () => {
    expect(enhanceMarks(null)).toEqual([]);
  });
});
