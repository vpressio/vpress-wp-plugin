// Route D′ client driver: chunked upload → server parse → tick loop.
// Pure module — the HTTP layer is injectable so Vitest never touches the DOM.
// Spec: docs/superpowers/specs/2026-07-31-csv-import-pipeline-design.md

const defaultRequest = async (path, { blob, json } = {}) => {
  const base = (import.meta.env.VITE_API_URI || '/') + 'wp-json/vpress/v1/';
  const headers = { 'X-WP-Nonce': (window.wpApiSettings || {}).nonce || '' };
  let body;
  if (blob) {
    body = new FormData();
    Object.entries(blob.fields || {}).forEach(([k, v]) => body.append(k, v));
    body.append('blob', blob.data, 'chunk.bin');
  } else if (json) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  return fetch(base + path, { method: 'POST', headers, body, credentials: 'same-origin' });
};

export const __chunkCount = (totalBytes, chunkBytes) => Math.ceil(totalBytes / chunkBytes);

async function requestWithRetry(request, path, opts, retryDelayMs, stage) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await request(path, opts);
      if (res.ok) return res.json();
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(body.message || `Error ${res.status}`);
        err.stage = stage;
        err.status = res.status;
        throw err; // 4xx: not retryable
      }
    } catch (e) {
      if (e.stage) throw e;
      // network/5xx error → fall through to retry
    }
    if (attempt < 3) await new Promise(r => setTimeout(r, retryDelayMs * attempt));
  }
  const err = new Error('La importación falló después de varios intentos.');
  err.stage = stage;
  throw err;
}

export async function runImport(file, { request = defaultRequest, onProgress = () => {}, retryDelayMs = 800 } = {}) {
  const start = await requestWithRetry(request, 'import/start', {
    json: { filename: file.name, total_bytes: file.size }
  }, retryDelayMs, 'start');

  const sessionId = start.session_id;
  const chunkBytes = start.chunk_bytes;
  const chunks = __chunkCount(file.size, chunkBytes);

  try {
    for (let i = 0; i < chunks; i++) {
      const piece = file.slice(i * chunkBytes, Math.min((i + 1) * chunkBytes, file.size));
      await requestWithRetry(request, 'import/chunk', {
        blob: { data: piece, fields: { session_id: sessionId, index: i } }
      }, retryDelayMs, 'upload');
      onProgress({ phase: 'upload', pct: Math.round(((i + 1) / chunks) * 100), rowsInserted: 0 });
    }

    await requestWithRetry(request, 'import/finish-upload', { json: { session_id: sessionId } }, retryDelayMs, 'upload');

    for (;;) {
      const tick = await requestWithRetry(request, 'import/tick', { json: { session_id: sessionId } }, retryDelayMs, 'import');
      onProgress({
        phase: 'import',
        pct: tick.total_bytes ? Math.round((tick.bytes_done / tick.total_bytes) * 100) : 0,
        rowsInserted: tick.rows_inserted
      });
      if (tick.status === 'done') {
        return { datasetName: tick.dataset_name, rowsInserted: tick.rows_inserted, sessionId };
      }
    }
  } catch (e) {
    e.sessionId = sessionId;
    throw e;
  }
}

export async function abortImport(sessionId, request = defaultRequest) {
  try {
    await request('import/abort', { json: { session_id: sessionId } });
  } catch (e) {
    // abort is best-effort; the server orphan sweep is the backstop
  }
}
