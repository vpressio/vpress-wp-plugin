import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

vi.mock('../../src/utils/axios.js', () => ({
  default: {
    dataset: {
      list: vi.fn().mockResolvedValue({
        data: { data: [{ id: '5', name: 'Ventas', tag: '', rows: '3', size: '1 KB', source_type: 'url' }], total: 1 }
      }),
      listHue: vi.fn().mockResolvedValue({ data: [] })
    }
  }
}));

import api from '../../src/utils/axios.js';
import VpressDatasetList from '../../src/views/DatasetList.vue';
import VpressDatasetPanel from '../../src/components/vpress-dataset-panel.vue';

const CardStub = {
  name: 'VpressDatasetCard',
  props: ['dataset'],
  emits: ['on-dataset-delete', 'on-dataset-refresh'],
  template: '<div class="card-stub" />'
};

function plugins() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] });
  return [createPinia(), router, createVuetify({ components, directives })];
}

describe('dataset refresh wiring', () => {
  it('the panel forwards a card refresh with the updated row', async () => {
    const w = mount(VpressDatasetPanel, {
      props: { items: [{ id: '5', name: 'Ventas' }] },
      global: { plugins: plugins(), stubs: { VpressDatasetCard: CardStub } }
    });
    const updated = { id: '5', last_refreshed_at: '2026-09-24 12:00:00' };
    w.findComponent(CardStub).vm.$emit('on-dataset-refresh', updated);

    expect(w.emitted('on-dataset-refresh')).toEqual([[updated]]);
  });

  it('the dataset list reloads (rows and size) after a refresh', async () => {
    const w = mount(VpressDatasetList, {
      global: { plugins: plugins(), stubs: { VpressDatasetPanel: true } }
    });
    await flushPromises();
    const before = api.dataset.list.mock.calls.length;

    w.findComponent({ name: 'VpressDatasetPanel' }).vm.$emit('on-dataset-refresh', { id: '5' });
    await flushPromises();

    expect(api.dataset.list.mock.calls.length).toBe(before + 1);
  });
});
