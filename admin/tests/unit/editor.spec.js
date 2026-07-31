import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('../../src/utils/axios.js', () => ({
  default: {
    dataset: { data: vi.fn().mockResolvedValue({ data: { data: [] } }) },
    chart: { create: vi.fn(), update: vi.fn() }
  }
}));

import { useEditorStore } from '../../src/store/editor.js';
import { useWorkspaceStore } from '../../src/store/workspace.js';

describe('editor store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('chart getter falls back to a fresh Viz when no viz is active', () => {
    const store = useEditorStore();
    const chart = store.chart;
    expect(chart).toBeTypeOf('object');
    expect(chart.xAxis.slug).toBe('');
    expect(chart.yAxis.slug).toBe('');
  });

  it('getAvailableCharts disables everything with empty axes', () => {
    const store = useEditorStore();
    const graphs = store.getAvailableCharts.filter(Boolean);
    expect(graphs.every((g) => g.disabled === true)).toBe(true);
  });

  it('LOAD_VIZZES registers vizzes under the dataset slug and activates one', async () => {
    const workspace = useWorkspaceStore();
    const dataset = await workspace.ADD_DATASET({
      id: 1, name: 'Data', slug: 'data', description: '', owner_id: 1,
      permissions: 'public', source: 'csv', tag: '', rows: 0, size: 0
    });
    workspace.UPDATE_ACTIVE_DATASET(dataset.slug);
    const store = useEditorStore();
    store.LOAD_VIZZES({ vizValues: [] });
    expect(store.getVizzes()).not.toBe(null);
    expect(store.viz).toBeTypeOf('object');
  });

  it('UPDATE_LOADING_STATE flips loadingState', () => {
    const store = useEditorStore();
    store.UPDATE_LOADING_STATE(true);
    expect(store.loadingState).toBe(true);
    store.UPDATE_LOADING_STATE(false);
    expect(store.loadingState).toBe(false);
  });
});
