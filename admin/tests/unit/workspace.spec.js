import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('../../src/utils/axios.js', () => ({
  default: { dataset: { data: vi.fn().mockResolvedValue({ data: { data: [] } }) } }
}));

import { useWorkspaceStore } from '../../src/store/workspace.js';

describe('workspace store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('starts with no active dataset', () => {
    const store = useWorkspaceStore();
    expect(store.activeDataset).toBe(null);
    expect(store.activeDatasetMeta).toBe(null);
  });

  it('ADD_DATASET registers meta and activeDatasetMeta resolves after activation', async () => {
    const store = useWorkspaceStore();
    const dataset = await store.ADD_DATASET({
      id: 1, name: 'Test', slug: 'test', description: '', owner_id: 1,
      permissions: 'public', source: 'csv', tag: '', rows: 0, size: 0
    });
    store.UPDATE_ACTIVE_DATASET(dataset.slug);
    expect(store.activeDatasetMeta.name).toBe('Test');
    expect(store.dataType).toEqual([]);
    expect(store.dataSetName).toBe('Test');
  });

  it('REMOVE_DATASET clears the active dataset when none remain', async () => {
    const store = useWorkspaceStore();
    const dataset = await store.ADD_DATASET({
      id: 1, name: 'Solo', slug: 'solo', description: '', owner_id: 1,
      permissions: 'public', source: 'csv', tag: '', rows: 0, size: 0
    });
    store.UPDATE_ACTIVE_DATASET(dataset.slug);
    const result = store.REMOVE_DATASET();
    expect(result).toEqual({});
    expect(store.activeDataset).toBe(null);
    expect(store.activeDatasetMeta).toBe(null);
  });
});
