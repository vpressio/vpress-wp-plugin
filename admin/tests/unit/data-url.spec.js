import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

vi.mock('../../src/utils/axios.js', () => ({
  default: { dataset: { fromUrl: vi.fn() } }
}));

import api from '../../src/utils/axios.js';
import VpressDataUrl from '../../src/components/vpress-data-url.vue';
import { useNotificationsStore } from '../../src/store/notifications.js';
import { suggestDatasetName, isHttpUrl } from '../../src/utils/dataSources.js';

function mountForm() {
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(VpressDataUrl, {
    global: { plugins: [pinia, createVuetify({ components, directives })] }
  });
}

const importButton = w => w.find('[data-test="import"]');

describe('vpress-data-url', () => {
  beforeEach(() => {
    api.dataset.fromUrl.mockReset();
  });

  it('accepts only http(s) URLs', async () => {
    expect(isHttpUrl('https://example.com/a.csv')).toBe(true);
    expect(isHttpUrl('http://example.com')).toBe(true);
    expect(isHttpUrl('ftp://example.com/a.csv')).toBe(false);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('example.com/a.csv')).toBe(false);

    const w = mountForm();
    await w.find('[data-test="url"] input').setValue('ftp://example.com/ventas.csv');
    await w.find('[data-test="name"] input').setValue('Ventas');
    expect(w.text()).toContain('Ingresa una URL http(s) válida');
    expect(importButton(w).attributes('disabled')).toBeDefined();

    await w.find('[data-test="url"] input').setValue('https://example.com/ventas.csv');
    expect(importButton(w).attributes('disabled')).toBeUndefined();
  });

  it('shows the sharing hint only for Google Sheets URLs', async () => {
    const w = mountForm();
    await w.find('[data-test="url"] input').setValue('https://example.com/ventas.csv');
    expect(w.find('[data-test="gsheet-hint"]').exists()).toBe(false);

    await w.find('[data-test="url"] input').setValue('https://docs.google.com/spreadsheets/d/abc/edit#gid=0');
    expect(w.find('[data-test="gsheet-hint"]').text()).toBe(
      "Google Sheets: comparte la hoja como 'Cualquiera con el enlace' o publícala"
    );
  });

  it('prefills the name from the URL until the user types one', async () => {
    expect(suggestDatasetName('https://example.com/data/ventas_2026.csv?x=1')).toBe('ventas 2026');
    expect(suggestDatasetName('https://docs.google.com/spreadsheets/d/abc/edit')).toBe('');
    expect(suggestDatasetName('https://docs.google.com/spreadsheets/d/abc/edit?title=Censo')).toBe('Censo');

    const w = mountForm();
    await w.find('[data-test="url"] input').setValue('https://example.com/data/municipios.csv');
    expect(w.find('[data-test="name"] input').element.value).toBe('municipios');

    await w.find('[data-test="name"] input').setValue('Mis municipios');
    await w.find('[data-test="url"] input').setValue('https://example.com/data/otros.csv');
    expect(w.find('[data-test="name"] input').element.value).toBe('Mis municipios');
  });

  it('imports as private unless the visibility is changed', async () => {
    api.dataset.fromUrl.mockReturnValue(new Promise(() => {}));
    const w = mountForm();
    await w.find('[data-test="url"] input').setValue('https://docs.google.com/spreadsheets/d/abc/edit');
    await w.find('[data-test="name"] input').setValue('Censo');
    await w.find('form').trigger('submit');

    expect(api.dataset.fromUrl).toHaveBeenCalledWith(
      expect.objectContaining({ permissions: 'private' })
    );
  });

  it('posts { name, url, refresh_interval, permissions } and emits the created dataset', async () => {
    const dataset = { id: '9', slug: 'ventas', name: 'Ventas', source_type: 'url' };
    let resolve;
    api.dataset.fromUrl.mockReturnValue(new Promise(r => { resolve = r; }));
    const w = mountForm();
    await w.find('[data-test="url"] input').setValue('  https://example.com/ventas.csv ');
    await w.find('[data-test="name"] input').setValue('Ventas ');
    w.vm.refreshInterval = 'daily';
    w.vm.permissions = 'public';
    await w.find('form').trigger('submit');

    expect(api.dataset.fromUrl).toHaveBeenCalledWith({
      name: 'Ventas',
      url: 'https://example.com/ventas.csv',
      refresh_interval: 'daily',
      permissions: 'public'
    });
    expect(w.vm.loading).toBe(true);

    resolve({ data: { data: dataset, query: null } });
    await flushPromises();
    expect(w.vm.loading).toBe(false);
    expect(w.emitted('uploaded')).toEqual([[dataset]]);
    expect(useNotificationsStore().color).toBe('success');
  });

  it('surfaces the WP_Error message through the notifications store', async () => {
    api.dataset.fromUrl.mockRejectedValue({
      response: { data: { code: 'vpress_duplicate_dataset', message: 'A dataset with this name already exists.' } }
    });
    const w = mountForm();
    await w.find('[data-test="url"] input').setValue('https://example.com/ventas.csv');
    await w.find('form').trigger('submit');
    await flushPromises();

    const notifications = useNotificationsStore();
    expect(notifications.color).toBe('error');
    expect(notifications.text).toBe('A dataset with this name already exists.');
    expect(w.emitted('uploaded')).toBeUndefined();
    expect(w.vm.loading).toBe(false);
  });
});
