import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h } from 'vue';

const mounted = [];
const behaviour = { throwFor: null };

vi.mock('../../src/embed/VpressEmbed.vue', () => ({
  default: defineComponent({
    name: 'VpressEmbed',
    props: ['chartId', 'restRoot', 'nonce'],
    setup(props) {
      if (props.chartId === behaviour.throwFor) throw new Error('boom');
      mounted.push({ ...props });
      return () => h('div', { class: 'embed-stub' });
    }
  })
}));

const figure = (id, rest = 'http://example.test/wp-json/vpress/v1/', extra = '') =>
  `<figure class="vpress-figure" data-vpress-chart="${id}" data-vpress-rest="${rest}"${extra}>` +
  '<div class="vpress-figure__chart" role="img" aria-busy="true"></div></figure>';

describe('embed.js', () => {
  beforeEach(() => {
    mounted.length = 0;
    behaviour.throwFor = null;
    vi.resetModules();
    delete window.vpress;
  });

  it('mounts once per [data-vpress-chart] into its chart slot', async () => {
    document.body.innerHTML = figure(1) + figure(2);
    await import('../../src/embed.js');

    expect(mounted.map((p) => p.chartId)).toEqual([1, 2]);
    expect(mounted[0].restRoot).toBe('http://example.test/wp-json/vpress/v1/');
    document.querySelectorAll('.vpress-figure__chart').forEach((slot) => {
      expect(slot.querySelector('.embed-stub')).not.toBeNull();
    });
  });

  it('skips already-mounted figures and mounts content inserted later', async () => {
    document.body.innerHTML = figure(1);
    await import('../../src/embed.js');
    expect(mounted).toHaveLength(1);

    // Re-scanning the page does not mount the same figure twice…
    expect(window.vpress.mount()).toHaveLength(0);
    expect(window.vpress.mount(document.querySelector('[data-vpress-chart="1"]'))).toHaveLength(0);

    // …while a figure added afterwards (e.g. by the block editor) gets mounted.
    const later = document.createElement('div');
    later.innerHTML = figure(3);
    document.body.appendChild(later);
    expect(window.vpress.mount(later.firstElementChild)).toHaveLength(1);
    expect(mounted.map((p) => p.chartId)).toEqual([1, 3]);
    expect(document.querySelectorAll('.embed-stub')).toHaveLength(2);
  });

  it('ignores figures without a numeric id or a chart slot', async () => {
    document.body.innerHTML =
      '<figure data-vpress-chart="abc"><div class="vpress-figure__chart"></div></figure>' +
      '<figure data-vpress-chart="4"></figure>';
    await import('../../src/embed.js');
    expect(mounted).toHaveLength(0);
  });

  it('passes the nonce through only when the figure carries one', async () => {
    document.body.innerHTML = figure(1) + figure(2, undefined, ' data-vpress-nonce="n0nce"');
    await import('../../src/embed.js');

    expect(mounted[0].nonce).toBeUndefined();
    expect(mounted[1].nonce).toBe('n0nce');
  });

  it('leaves a figure unmarked when mounting it fails, so it can be retried', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    behaviour.throwFor = 1;
    document.body.innerHTML = figure(1) + figure(2);
    await import('../../src/embed.js');

    const [first, second] = document.querySelectorAll('[data-vpress-chart]');
    expect(first.dataset.vpressMounted).toBeUndefined();
    expect(second.dataset.vpressMounted).toBe('true');
    expect(errors).toHaveBeenCalledWith('[vpress] could not mount chart 1:', expect.any(Error));

    behaviour.throwFor = null;
    expect(window.vpress.mount(first)).toHaveLength(1);
    expect(first.dataset.vpressMounted).toBe('true');
    errors.mockRestore();
  });
});
