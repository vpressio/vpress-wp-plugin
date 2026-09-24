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
import { Viz } from '../../src/models/index.js';

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

  // --- REMOVE_VIZZES: the migrated action deleted `vizzesSubstract[datasetName.slug]`.
  // `datasetName` is already resolved to the slug string (both by the default parameter
  // and by every real caller), so `.slug` on a string is undefined and the delete was a
  // no-op on key "undefined" — the target entry, and everything else, survived untouched.

  it('REMOVE_VIZZES removes exactly the targeted dataset entry and keeps the others', () => {
    const store = useEditorStore();
    const vizzesA = { marker: 'a' };
    const vizzesB = { marker: 'b' };
    store.vizzes = { 'dataset-a': vizzesA, 'dataset-b': vizzesB };

    store.REMOVE_VIZZES('dataset-a');

    expect(store.vizzes).toEqual({ 'dataset-b': vizzesB });
  });

  it('REMOVE_VIZZES with no argument clears the active dataset (real DataModule.vue call shape)', async () => {
    const workspace = useWorkspaceStore();
    const dataset = await workspace.ADD_DATASET({
      id: 1, name: 'Data', slug: 'data', description: '', owner_id: 1,
      permissions: 'public', source: 'csv', tag: '', rows: 0, size: 0
    });
    workspace.UPDATE_ACTIVE_DATASET(dataset.slug);
    const store = useEditorStore();
    store.LOAD_VIZZES({ vizValues: [] });
    expect(store.vizzes[dataset.slug]).toBeDefined();

    store.REMOVE_VIZZES();

    expect(store.vizzes).toEqual({});
  });

  // --- getAvailableCharts: the shared `requiredReduce` closure checked
  // `chartValue[chartValue]` (a required-field NAME indexing itself, e.g.
  // 'collapseBy'['collapseBy']), which is always undefined — so the reduce always
  // returned its own seed (false) unchanged, and every chart with a satisfied
  // axis-type match was reported available even when its required field
  // (collapseBy/groupBy) was never selected.

  it('getAvailableCharts enables bars for ordinal x + linear y once the required collapseBy is selected', () => {
    const store = useEditorStore();
    store.vizModel = new Viz({
      xAxis: { type: 'ordinal', slug: 'category' },
      yAxis: { type: 'linear', slug: 'value' },
      collapseBy: { slug: 'group' }
    });

    const bars = store.getAvailableCharts.find((g) => g.type === 'bars');

    expect(bars.disabled).toBe(false);
  });

  it('getAvailableCharts keeps bars disabled for ordinal x + linear y when the required collapseBy is unmet', () => {
    const store = useEditorStore();
    store.vizModel = new Viz({
      xAxis: { type: 'ordinal', slug: 'category' },
      yAxis: { type: 'linear', slug: 'value' }
      // collapseBy left at its default empty slug — required field unmet.
    });

    const bars = store.getAvailableCharts.find((g) => g.type === 'bars');

    expect(bars.disabled).toBe(true);
  });

  it('getAvailableCharts enables scatter (no required fields) for linear x + linear y, and disables bars', () => {
    const store = useEditorStore();
    store.vizModel = new Viz({
      xAxis: { type: 'linear', slug: 'x1' },
      yAxis: { type: 'linear', slug: 'y1' }
    });

    const graphs = store.getAvailableCharts;
    const scatter = graphs.find((g) => g.type === 'scatter');
    const bars = graphs.find((g) => g.type === 'bars');

    expect(scatter.disabled).toBe(false);
    expect(bars.disabled).toBe(true);
    expect(graphs.every((g) => g.disabled === false)).toBe(false);
  });
});
