import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DOMWrapper, mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

vi.mock('../../src/utils/axios.js', () => ({
  default: { dataset: { refresh: vi.fn(), update: vi.fn(), charts: vi.fn() } }
}));

import api from '../../src/utils/axios.js';
import VpressDatasetCard from '../../src/components/vpress-dataset-card.vue';
import {
  LICENSE_SUGGESTIONS,
  isProvenanceDate,
  provenanceLine
} from '../../src/utils/dataSources.js';

const NOW = Date.parse('2026-09-24T12:00:00Z');

// jsdom has no visualViewport; Vuetify's overlay reads it the moment a dialog opens.
if (typeof globalThis.visualViewport === 'undefined') {
  globalThis.visualViewport = {
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    scale: 1,
    addEventListener() {},
    removeEventListener() {}
  };
}

/**
 * A dialog field. Vuetify teleports the overlay to document.body, so the
 * component wrapper cannot see it.
 */
function dialogField(selector) {
  const el = document.querySelector(`.v-overlay-container ${selector}`);
  if (!el) throw new Error(`no dialog element matching ${selector}`);
  return new DOMWrapper(el);
}

const mounted = [];

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
    source_type: 'upload',
    source_url: '',
    source_name: '',
    license: '',
    retrieved_at: '',
    source_notes: '',
    refresh_interval: 'none',
    last_refreshed_at: null,
    last_refresh_error: null,
    ...fields
  };
  const wrapper = mount(VpressDatasetCard, {
    props: { dataset },
    global: { plugins: [pinia, createVuetify({ components, directives })] },
    attachTo: document.body
  });
  mounted.push(wrapper);
  return wrapper;
}

/** Opens the Fuente dialog and waits for the teleported overlay to render. */
async function openDialog(w) {
  await w.find('[data-test="source-open"]').trigger('click');
  await flushPromises();
}

describe('dataset card provenance', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    api.dataset.update.mockReset();
    api.dataset.update.mockResolvedValue({ data: { data: {} } });
  });
  afterEach(() => {
    // Overlays live in document.body; a leftover one would shadow the next test's.
    while (mounted.length) mounted.pop().unmount();
    vi.useRealTimers();
  });

  it('validates the data date and keeps the empty value legal', () => {
    expect(isProvenanceDate('')).toBe(true);
    expect(isProvenanceDate('2026-09-01')).toBe(true);
    expect(isProvenanceDate('2026-13-40')).toBe(false);
    expect(isProvenanceDate('01/09/2026')).toBe(false);
  });

  it('builds the source line the figure will print, falling back to the host', () => {
    expect(provenanceLine({})).toBe('');
    expect(
      provenanceLine({ source_name: 'INEGI', license: 'CC-BY-4.0', retrieved_at: '2026-09-01' })
    ).toBe('Fuente: INEGI · CC-BY-4.0 · Datos al 1 de septiembre de 2026 · Descargar datos (JSON)');
    expect(provenanceLine({ source_url: 'https://datos.gob.mx/x.csv' })).toContain('Fuente: datos.gob.mx');
  });

  it('offers the licence suggestions in the combobox', () => {
    const w = card();
    expect(w.vm.licenseSuggestions).toEqual(LICENSE_SUGGESTIONS);
    expect(LICENSE_SUGGESTIONS).toContain('CC-BY-4.0');
  });

  it('saves the four provenance fields, with the URL, for an uploaded dataset', async () => {
    const w = card();
    await openDialog(w);

    w.vm.editedSource = {
      source_name: 'INEGI',
      source_url: 'https://datos.gob.mx/x.csv',
      license: 'CC-BY-4.0',
      retrieved_at: '2026-09-01',
      source_notes: 'Cifras preliminares'
    };
    await w.vm.saveSource();
    await flushPromises();

    expect(api.dataset.update).toHaveBeenCalledTimes(1);
    expect(api.dataset.update.mock.calls[0][0]).toMatchObject({
      source_name: 'INEGI',
      source_url: 'https://datos.gob.mx/x.csv',
      license: 'CC-BY-4.0',
      retrieved_at: '2026-09-01',
      source_notes: 'Cifras preliminares'
    });
    expect(w.find('[data-test="source-preview"]').text()).toContain('Fuente: INEGI');
  });

  it('carries what the editor typed into the dialog fields', async () => {
    const w = card();
    await openDialog(w);

    await dialogField('[data-test="source-name"] input').setValue('Secretaría de Hacienda');
    await dialogField('[data-test="source-url"] input').setValue('https://datos.gob.mx/p.csv');
    await dialogField('[data-test="source-license"] input').setValue('ODbL-1.0');
    await dialogField('[data-test="source-date"] input').setValue('2026-09-01');
    await dialogField('[data-test="source-notes"] textarea').setValue('Cifras preliminares');
    await flushPromises();

    expect(dialogField('[data-test="source-dialog-preview"]').text()).toBe(
      'Fuente: Secretaría de Hacienda · ODbL-1.0 · Datos al 1 de septiembre de 2026 · Descargar datos (JSON)'
    );

    await dialogField('[data-test="source-save"]').trigger('click');
    await flushPromises();

    expect(api.dataset.update.mock.calls[0][0]).toMatchObject({
      id: 5,
      name: 'Ventas',
      source_name: 'Secretaría de Hacienda',
      source_url: 'https://datos.gob.mx/p.csv',
      license: 'ODbL-1.0',
      retrieved_at: '2026-09-01',
      source_notes: 'Cifras preliminares'
    });
  });

  it('shows a live source URL but does not let it be edited here', async () => {
    const w = card({ source_type: 'url', source_url: 'https://datos.gob.mx/live.csv' });
    await openDialog(w);

    const url = dialogField('[data-test="source-url"] input');
    expect(url.element.value).toBe('https://datos.gob.mx/live.csv');
    expect(url.attributes('readonly')).toBeDefined();
  });

  it('never sends source_url for a live source: that URL belongs to the refresh flow', async () => {
    const w = card({
      source_type: 'gsheet',
      source_url: 'https://docs.google.com/spreadsheets/d/abc/edit',
      refresh_interval: 'hourly',
      last_refreshed_at: '2026-09-24 10:00:00'
    });
    await openDialog(w);

    w.vm.editedSource = { ...w.vm.editedSource, source_name: 'Hoja viva' };
    await w.vm.saveSource();
    await flushPromises();

    const body = api.dataset.update.mock.calls[0][0];
    expect(body.source_name).toBe('Hoja viva');
    expect(body).not.toHaveProperty('source_url');
  });

  it('refuses to save an impossible date', async () => {
    const w = card();
    await openDialog(w);

    w.vm.editedSource = { ...w.vm.editedSource, retrieved_at: '2026-13-40' };
    await w.vm.$nextTick();
    expect(w.vm.dateError).not.toBe('');

    await w.vm.saveSource();
    await flushPromises();
    expect(api.dataset.update).not.toHaveBeenCalled();
  });
});
