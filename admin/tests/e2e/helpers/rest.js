import { expect } from '@playwright/test';

const BASE = '/wp-json/vpress/v1';

/**
 * Thin client over the Vpress REST routes. `request` is a Playwright
 * APIRequestContext (page.request shares the logged-in cookies).
 */
export async function listCharts(request, { page = 1, perPage = 100, q = '' } = {}) {
  const res = await request.get(`${BASE}/chart/list/?page=${page}&perPage=${perPage}&q=${q}`);
  expect(res.status()).toBe(200);
  return res.json();
}

export async function getChart(request, id) {
  const res = await request.get(`${BASE}/chart/get/${id}`);
  expect(res.status()).toBe(200);
  return res.json();
}

/**
 * Cookie-authenticated REST writes need a wp_rest nonce; WordPress core hands
 * one to logged-in users at admin-ajax.php?action=rest-nonce.
 */
export async function restNonce(request) {
  const res = await request.get('/wp-admin/admin-ajax.php?action=rest-nonce');
  expect(res.status()).toBe(200);
  const nonce = (await res.text()).trim();
  expect(nonce).toMatch(/^[a-f0-9]{10}$/);
  return nonce;
}

/** DELETE /chart/delete {id} — see api/controllers/chart.php + api/services/chart.php. */
export async function deleteChart(request, id) {
  const nonce = await restNonce(request);
  const res = await request.delete(`${BASE}/chart/delete`, {
    headers: { 'X-WP-Nonce': nonce },
    data: { id: Number(id) }
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.data).toBe(1);
  return body;
}

/**
 * POST /chart/create {dataset_id, value, owner_id, description, permissions}.
 * Returns the new chart id. The caller is responsible for deleting it.
 */
export async function createChart(request, { datasetId, value, permissions = 'public' }) {
  const nonce = await restNonce(request);
  const res = await request.post(`${BASE}/chart/create`, {
    headers: { 'X-WP-Nonce': nonce },
    data: {
      dataset_id: Number(datasetId),
      value: JSON.stringify(value),
      owner_id: 1,
      description: '',
      permissions,
      img_url: ''
    }
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Number(body.data)).toBeGreaterThan(0);
  return Number(body.data);
}