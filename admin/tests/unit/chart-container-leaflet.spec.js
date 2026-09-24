import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

vi.mock('../../src/utils/lazyLeaflet.js', () => ({
  isLeafletReady: () => false,
  loadLeaflet: () => Promise.reject(new Error('leaflet offline'))
}));

import VpressChartContainer from '../../src/components/vpress-chart-container.vue';

describe('VpressChartContainer — lazy leaflet', () => {
  it('emits chart_error (and does not draw) when leaflet fails to load for a map', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mount(VpressChartContainer, {
      props: {
        id: 'vpress-chart-test',
        iframe: true,
        data: [{ estado: 'Jalisco', ventas: 1 }],
        chartConfig: {
          chart: 'map',
          theme: 'light',
          title: '',
          subtitle: '',
          xAxis: { slug: 'estado', type: 'ordinal' },
          yAxis: { slug: 'ventas', type: 'linear' },
          groupBy: { slug: '' },
          collapseBy: { slug: '' },
          colors: ['#1976d2']
        }
      }
    });
    await flushPromises();

    const emitted = wrapper.emitted('chart_error');
    expect(emitted).toHaveLength(1);
    expect(emitted[0][0].message).toBe('leaflet offline');
    expect(wrapper.emitted('chart_loaded')).toBeUndefined();
    expect(wrapper.find('#leaflet-wrapper').exists()).toBe(false);
  });
});
