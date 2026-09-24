import { describe, it, expect, vi, beforeEach } from 'vitest';

// Every axios.create() instance shares these spies, so we can tell whether
// the optional Hue connector ever went to the network.
const get = vi.fn(() => Promise.resolve({ data: ['from-network'] }));
vi.mock('axios', () => ({
  create: vi.fn(() => ({ get, post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
}));

describe('api.dataset.listHue', () => {
  beforeEach(() => {
    get.mockClear();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('is a no-op (empty list, no request) when VITE_HUE_API_BASE_URL is not set', async () => {
    vi.stubEnv('VITE_HUE_API_BASE_URL', '');
    const { default: api } = await import('../../src/utils/axios.js');
    await expect(api.dataset.listHue({ page: 1 })).resolves.toEqual({ data: [] });
    expect(get).not.toHaveBeenCalled();
  });

  it('queries the Hue connector when VITE_HUE_API_BASE_URL is set', async () => {
    vi.stubEnv('VITE_HUE_API_BASE_URL', 'http://hue.example');
    const { default: api } = await import('../../src/utils/axios.js');
    await expect(api.dataset.listHue({ page: 1 })).resolves.toEqual({ data: ['from-network'] });
    expect(get).toHaveBeenCalledWith('/sql/datasets', { page: 1 });
  });
});
