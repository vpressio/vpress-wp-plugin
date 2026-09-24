import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

vi.mock('../../src/utils/axios.js', () => ({
  default: { dataset: { refresh: vi.fn(), update: vi.fn(), charts: vi.fn() } }
}));

import api from '../../src/utils/axios.js';
import VpressDatasetCard from '../../src/components/vpress-dataset-card.vue';
import { useNotificationsStore } from '../../src/store/notifications.js';
import { relativeTime } from '../../src/utils/dataSources.js';

const NOW = Date.parse('2026-09-24T12:00:00Z');

function card(fields = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const dataset = {
    id: '5',
    name: 'Ventas',
    description: '',
    tag: [],
    permissions: 'public',
    size: '1 KB',
    rows: '2',
    updated: '2026-09-24 11:00:00',
    source_type: 'gsheet',
    source_url: 'https://docs.google.com/spreadsheets/d/abc/edit#gid=0',
    refresh_interval: 'hourly',
    last_refreshed_at: '2026-09-24 10:00:00',
    last_refresh_error: null,
    ...fields
  };
  return mount(VpressDatasetCard, {
    props: { dataset },
    global: { plugins: [pinia, createVuetify({ components, directives })] }
  });
}

describe('dataset card freshness', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    api.dataset.refresh.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('formats UTC MySQL datetimes as relative Spanish time', () => {
    expect(relativeTime('2026-09-24 10:00:00', NOW)).toBe('hace 2 horas');
    expect(relativeTime('2026-09-23 12:00:00', NOW)).toBe('ayer');
    expect(relativeTime(null, NOW)).toBe('nunca');
  });

  it('shows the freshness line with the interval for live sources', () => {
    const w = card();
    expect(w.find('[data-test="freshness"]').text()).toContain('Actualizado hace 2 horas · Cada hora');
  });

  it('omits the interval for manual sources and the line for uploads', () => {
    expect(card({ refresh_interval: 'none' }).find('[data-test="freshness"]').text()).not.toContain('·');
    expect(card({ source_type: 'upload' }).find('[data-test="freshness"]').exists()).toBe(false);
    expect(card({ source_type: undefined }).find('[data-test="freshness"]').exists()).toBe(false);
  });

  it('refreshes now: disabled while running, then shows the new timestamp', async () => {
    let resolve;
    api.dataset.refresh.mockReturnValue(new Promise(r => { resolve = r; }));
    const w = card();
    await w.find('[data-test="refresh"]').trigger('click');

    expect(api.dataset.refresh).toHaveBeenCalledWith(5);
    expect(w.find('[data-test="refresh"]').attributes('disabled')).toBeDefined();
    await w.find('[data-test="refresh"]').trigger('click');
    expect(api.dataset.refresh).toHaveBeenCalledTimes(1);

    const updated = { id: '5', source_type: 'gsheet', refresh_interval: 'hourly', last_refreshed_at: '2026-09-24 12:00:00', last_refresh_error: null };
    resolve({ data: { data: updated } });
    await flushPromises();

    expect(w.find('[data-test="refresh"]').attributes('disabled')).toBeUndefined();
    expect(w.find('[data-test="freshness"]').text()).toContain('Actualizado este minuto · Cada hora');
    expect(w.emitted('on-dataset-refresh')).toEqual([[updated]]);
  });

  it('reports a failed refresh through the notifications store', async () => {
    api.dataset.refresh.mockRejectedValue({ response: { data: { message: 'The source responded with HTTP 404.' } } });
    const w = card();
    await w.find('[data-test="refresh"]').trigger('click');
    await flushPromises();

    const notifications = useNotificationsStore();
    expect(notifications.color).toBe('error');
    expect(notifications.text).toBe('The source responded with HTTP 404.');
    expect(w.find('[data-test="refresh-error"]').exists()).toBe(true);
    expect(w.find('[data-test="refresh"]').attributes('disabled')).toBeUndefined();
  });
});
