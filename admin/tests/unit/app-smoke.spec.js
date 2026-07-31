import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

vi.mock('../../src/utils/axios.js', () => ({
  default: {
    dataset: {
      data: vi.fn().mockResolvedValue({ data: { data: [] } }),
      list: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } })
    },
    chart: {
      list: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }),
      query: vi.fn().mockResolvedValue({ data: { data: [] } })
    }
  }
}));

import App from '../../src/App.vue';
import { privateRouter } from '../../src/router.js';

describe('app smoke', () => {
  it('mounts App with router + pinia + vuetify without throwing', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: privateRouter.routes
    });
    const vuetify = createVuetify({ components, directives });
    router.push('/');
    await router.isReady();
    const wrapper = mount(App, {
      global: { plugins: [createPinia(), router, vuetify] }
    });
    expect(wrapper.find('.v-application').exists()).toBe(true);
  });
});
