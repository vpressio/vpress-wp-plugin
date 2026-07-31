import { describe, it, expect, vi } from 'vitest';
import { runImport, __chunkCount } from '../../src/utils/importPipeline.js';

const okJson = (obj) => ({ ok: true, status: 200, json: async () => obj });

function fakeFile(bytes, name = 'ventas.csv') {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'text/csv' });
  return new File([blob], name, { type: 'text/csv' });
}

describe('importPipeline', () => {
  it('computes chunk count from server chunk_bytes', () => {
    expect(__chunkCount(10_000_000, 4_000_000)).toBe(3);
    expect(__chunkCount(4_000_000, 4_000_000)).toBe(1);
  });

  it('drives start → chunks → finish → ticks → done and reports progress', async () => {
    const calls = [];
    const request = vi.fn(async (path) => {
      calls.push(path);
      if (path === 'import/start') return okJson({ session_id: 7, chunk_bytes: 4, table_name: 'vpress_v' });
      if (path === 'import/chunk') return okJson({ chunks_received: 1, bytes_received: 10 });
      if (path === 'import/finish-upload') return okJson({ status: 'importing' });
      if (path === 'import/tick') {
        return calls.filter(c => c === 'import/tick').length < 2
          ? okJson({ status: 'importing', rows_inserted: 5, bytes_done: 5, total_bytes: 10 })
          : okJson({ status: 'done', rows_inserted: 9, bytes_done: 10, total_bytes: 10, dataset_name: 'v' });
      }
      throw new Error('unexpected ' + path);
    });
    const phases = [];
    const result = await runImport(fakeFile(10), { request, onProgress: p => phases.push(p.phase) });
    expect(result.rowsInserted).toBe(9);
    expect(result.datasetName).toBe('v');
    expect(calls.filter(c => c === 'import/chunk').length).toBe(3); // 10 bytes / 4 = 3 chunks
    expect(phases).toContain('upload');
    expect(phases).toContain('import');
  });

  it('retries a failed chunk up to 3 times then rejects with stage', async () => {
    let chunkTries = 0;
    const request = vi.fn(async (path) => {
      if (path === 'import/start') return okJson({ session_id: 7, chunk_bytes: 4 });
      if (path === 'import/chunk') { chunkTries++; return { ok: false, status: 500, json: async () => ({}) }; }
      throw new Error('unexpected');
    });
    await expect(runImport(fakeFile(10), { request, retryDelayMs: 0 })).rejects.toMatchObject({ stage: 'upload' });
    expect(chunkTries).toBe(3);
  });

  it('does not retry a 4xx (cap rejection) and surfaces the server message', async () => {
    let startTries = 0;
    const request = vi.fn(async () => {
      startTries++;
      return { ok: false, status: 413, json: async () => ({ message: 'El archivo excede el tamaño máximo permitido.' }) };
    });
    await expect(runImport(fakeFile(10), { request, retryDelayMs: 0 }))
      .rejects.toMatchObject({ stage: 'start', status: 413 });
    expect(startTries).toBe(1);
  });
});
