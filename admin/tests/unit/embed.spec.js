import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

// The real container draws with dbox/d3; the embed's job is the data flow.
vi.mock('../../src/components/vpress-chart-container.vue', () => ({
  default: defineComponent({
    name: 'VpressChartContainer',
    props: { id: String, data: Array, chartConfig: Object, dateFormat: String, iframe: Boolean },
    emits: ['chart_loaded', 'chart_error'],
    render() {
      return h('div', { class: 'chart-container-stub' });
    }
  })
}));

import VpressEmbed from '../../src/embed/VpressEmbed.vue';

const REST = 'http://example.test/wp-json/vpress/v1/';

const values = {
  chart: 'bars',
  theme: 'light',
  title: 'Ventas por estado',
  subtitle: '2026',
  xAxis: { title: 'estado', type: 'ordinal', slug: 'estado', showLabel: true },
  yAxis: { title: 'ventas', type: 'linear', slug: 'ventas', func: 'SUM', showLabel: true },
  groupBy: { title: '', type: '', slug: '' },
  collapseBy: { title: '', type: '', slug: '' },
  filters: [],
  orderBy: { slug: '', order: '' },
  colors: ['#1976d2']
};

const rows = [
  { estado: 'Nuevo León', ventas: '120' },
  { estado: 'Jalisco', ventas: '80' }
];

const json = (body, status = 200) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

function stubFetch(overrides = {}) {
  const fetchMock = vi.fn((url) => {
    if (url === `${REST}chart/get/1`) {
      return overrides.chart || json({ data: { id: '1', dataset_id: '7', value: JSON.stringify(values) } });
    }
    if (url === `${REST}dataset/get/7`) {
      return json({ data: { id: '7', slug: 'ventas_2026', source: null } });
    }
    if (url === `${REST}chart/query`) {
      return json({ data: rows });
    }
    return json({ message: 'not found' }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function mountEmbed(extraProps = {}) {
  const host = document.createElement('div');
  host.className = 'vpress-figure__chart';
  host.setAttribute('aria-busy', 'true');
  document.body.appendChild(host);
  return {
    host,
    wrapper: mount(VpressEmbed, { props: { chartId: 1, restRoot: REST, ...extraProps }, attachTo: host })
  };
}

const headersOf = (fetchMock) => fetchMock.mock.calls.map(([, init]) => init.headers);

describe('VpressEmbed', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('loads chart → dataset → query and renders the container with the saved config', async () => {
    const fetchMock = stubFetch();
    const { wrapper } = mountEmbed();
    await flushPromises();

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${REST}chart/get/1`,
      `${REST}dataset/get/7`,
      `${REST}chart/query`
    ]);

    const container = wrapper.findComponent({ name: 'VpressChartContainer' });
    expect(container.exists()).toBe(true);
    expect(container.props('data')).toEqual(rows);
    expect(container.props('iframe')).toBe(true);
    // Saved config, minus the title/subtitle the server-rendered caption shows.
    expect(container.props('chartConfig')).toEqual({ ...values, title: '', subtitle: '' });
    expect(wrapper.find('.vpress-figure__error').exists()).toBe(false);
  });

  it('sends chart_id alongside the query body built from the saved config', async () => {
    const fetchMock = stubFetch();
    mountEmbed();
    await flushPromises();

    const [, init] = fetchMock.mock.calls.find(([url]) => url === `${REST}chart/query`);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.chart_id).toBe(1);
    expect(body.dataset).toBe('vpress_ventas_2026');
    expect(body.chart_type).toBe('bars');
  });

  it('clears aria-busy on the host once the chart reports it has loaded', async () => {
    stubFetch();
    const { host, wrapper } = mountEmbed();
    await flushPromises();
    expect(host.getAttribute('aria-busy')).toBe('true');

    wrapper.findComponent({ name: 'VpressChartContainer' }).vm.$emit('chart_loaded');
    expect(host.getAttribute('aria-busy')).toBe('false');
  });

  it('renders a visible error and logs the detail when a request fails', async () => {
    stubFetch({ chart: json({ code: 'rest_forbidden' }, 403) });
    const { host, wrapper } = mountEmbed();
    await flushPromises();

    const error = wrapper.find('.vpress-figure__error');
    expect(error.exists()).toBe(true);
    expect(error.text()).toBe('No se pudo cargar la gráfica.');
    expect(wrapper.findComponent({ name: 'VpressChartContainer' }).exists()).toBe(false);
    expect(console.error).toHaveBeenCalled();
    expect(host.getAttribute('aria-busy')).toBe('false');
  });

  it('sends X-WP-Nonce on every request when a nonce is given', async () => {
    const fetchMock = stubFetch();
    mountEmbed({ nonce: 'abc123' });
    await flushPromises();

    const headers = headersOf(fetchMock);
    expect(headers).toHaveLength(3);
    headers.forEach((h) => expect(h['X-WP-Nonce']).toBe('abc123'));
  });

  it('sends no X-WP-Nonce for anonymous viewers', async () => {
    const fetchMock = stubFetch();
    mountEmbed();
    await flushPromises();

    const headers = headersOf(fetchMock);
    expect(headers).toHaveLength(3);
    headers.forEach((h) => expect(h).not.toHaveProperty('X-WP-Nonce'));
  });

  it('renders the generic error when fetch itself rejects (network failure)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
    const { host, wrapper } = mountEmbed();
    await flushPromises();

    expect(wrapper.find('.vpress-figure__error').text()).toBe('No se pudo cargar la gráfica.');
    expect(console.error).toHaveBeenCalledWith('[vpress] chart 1:', expect.any(TypeError));
    expect(host.getAttribute('aria-busy')).toBe('false');
  });

  it('renders the empty-data message when the query returns no rows', async () => {
    const fetchMock = stubFetch();
    fetchMock.mockImplementation((url) =>
      url.endsWith('chart/query')
        ? json({ data: [] })
        : url.endsWith('chart/get/1')
          ? json({ data: { id: '1', dataset_id: '7', value: JSON.stringify(values) } })
          : json({ data: { id: '7', slug: 'ventas_2026', source: null } })
    );
    const { host, wrapper } = mountEmbed();
    await flushPromises();

    expect(wrapper.find('.vpress-figure__error').text()).toBe('Esta gráfica no tiene datos.');
    expect(wrapper.findComponent({ name: 'VpressChartContainer' }).exists()).toBe(false);
    expect(host.getAttribute('aria-busy')).toBe('false');
  });

  it('turns a chart_error from the container (e.g. leaflet failed) into the visible error', async () => {
    stubFetch();
    const { host, wrapper } = mountEmbed();
    await flushPromises();

    wrapper.findComponent({ name: 'VpressChartContainer' }).vm.$emit('chart_error', new Error('leaflet offline'));
    await flushPromises();

    expect(wrapper.find('.vpress-figure__error').text()).toBe('No se pudo cargar la gráfica.');
    expect(wrapper.findComponent({ name: 'VpressChartContainer' }).exists()).toBe(false);
    expect(host.getAttribute('aria-busy')).toBe('false');
  });
});
