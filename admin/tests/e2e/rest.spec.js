import { test, expect } from '@playwright/test';

// Public GET routes (permission_callback __return_true in api/controllers/*.php).
// Run without the logged-in storage state to prove they really are public.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Vpress REST API', () => {
  test('chart/get/1 returns the seeded chart', async ({ request }) => {
    const res = await request.get('/wp-json/vpress/v1/chart/get/1');
    expect(res.status()).toBe(200);
    const body = await res.json();
    // wpdb returns ids as strings.
    expect(Number(body.data.id)).toBe(1);
  });

  test('chart/list returns a JSON array of charts', async ({ request }) => {
    const res = await request.get('/wp-json/vpress/v1/chart/list/?page=1&perPage=10&q=');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(typeof body.total).toBe('number');
  });

  test('dataset/list returns a JSON array of datasets', async ({ request }) => {
    const res = await request.get('/wp-json/vpress/v1/dataset/list/?page=1&perPage=10&q=');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.map((d) => d.slug)).toContain('vpress_test_ventas');
  });
});
