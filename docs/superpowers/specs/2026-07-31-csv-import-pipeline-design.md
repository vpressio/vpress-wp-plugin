# CSV Import Pipeline — Design

**Date:** 2026-07-31 · **Status:** approved-pending-review · **Scope:** free tier (WP.org distribution)

## Problem

The legacy importer used `LOAD DATA LOCAL INFILE`, which requires `local_infile` on the MySQL server AND `mysqli.allow_local_infile` in PHP — flags shared hostings do not grant (and MySQL 8 disables by default). The interim fix (single-request batched INSERT, shipped 2026-07-31) works but is bounded by the host's `upload_max_filesize` / `post_max_size` (2–64 MB, host-locked) and `max_execution_time` (~30 s), with no progress feedback and no recovery from failure.

## Decision (operator, 2026-07-31)

- **The full chunked pipeline ships in the FREE plugin, capped at 20 MB.** One code path for every import; the cap is the free/premium line.
- The cap is a filter (`vpress_max_upload_bytes`, default `20 * MB_IN_BYTES`) so a future Pro addon can raise it without core changes. **Pro's differentiator is parked** — deliberately not designed here.
- No WP-Cron / Action Scheduler dependency. No `LOAD DATA` dependency. Works on the worst shared hosting unmodified.

## Architecture — chunked upload, server-side parse, client-driven ticks (route D′)

```
Browser                                  Server (WP REST, vpress/v1)
───────                                  ───────────────────────────
file picked / dropped
POST import/start ──────────────────────▶ validate name+size vs cap; create session row;
                                          create tmp file; reply {session_id, chunk_bytes}
loop: POST import/chunk (piece N) ──────▶ append bytes to tmp file; update session
POST import/finish-upload ──────────────▶ verify size; sniff mime; detect encoding (sample);
                                          parse header row; CREATE TABLE (existing logic);
                                          session → importing
loop: POST import/tick ─────────────────▶ fseek(byte_offset); fgetcsv ≤ rows_per_tick;
      (progress bar from reply)           iconv rows if needed; batched INSERT (existing
                                          engine); commit offset+count; reply progress
                                          … on EOF: session → done, unlink tmp file
POST dataset/create (unchanged) ────────▶ register dataset meta (existing endpoint)
```

- **`chunk_bytes` is server-computed**: `min(post_max_size, upload_max_filesize) × 0.75`, capped at 4 MB — every chunk fits any host's POST limits, no client guessing.
- **`rows_per_tick`** default 5 000 (filter `vpress_import_rows_per_tick`); each tick ~1–3 s — far under any execution timeout.
- **The tick loop is browser-driven** (sequential fetches). No cron. Tab closes → import pauses; session supports resume (re-enter tick loop from stored offset).

## Components

### 1. REST endpoints (namespace `vpress/v1`, all `permission_callback: current_user_can('publish_posts')` except noted)

| Endpoint | Method | Does |
|---|---|---|
| `import/start` | POST `{filename, total_bytes}` | Enforce cap + `.csv` extension; create session + tmp file (`uploads/vpress/tmp/{random}.csv`); return `{session_id, chunk_bytes}` |
| `import/chunk` | POST multipart `{session_id, index, blob}` | Append to tmp file iff `index == chunks_received` (ordered, idempotent retry safe); update `bytes_received` |
| `import/finish-upload` | POST `{session_id}` | Verify `bytes_received == total_bytes`; mime-sniff; encoding-detect (first 64 KB: BOM / `mb_check_encoding` UTF-8 else assume Windows-1252); parse+clean header (existing dedup/clean logic); `dbDelta` CREATE TABLE; store `columns`+`encoding`; status → `importing` |
| `import/tick` | POST `{session_id}` | Read ≤ `rows_per_tick` rows from `byte_offset`; `iconv(encoding→UTF-8)` per row when needed; `vpress_insert_rows()` (existing); advance `byte_offset`/`rows_inserted` only after successful insert; on EOF: status → `done`, delete tmp file. Reply `{status, rows_inserted, bytes_done, total_bytes}` |
| `import/abort` | POST `{session_id}` | Delete tmp file; DROP the table **only if this session created it** (`table_created` flag — re-imports into pre-existing tables never drop); status → `aborted` |

### 2. Session model — table `wp_vpresscore_imports` (dbDelta, created lazily by `import/start`)

`id BIGINT PK · file_name · table_name · tmp_path · total_bytes · bytes_received · chunks_received · byte_offset · rows_inserted · columns TEXT (json) · encoding VARCHAR(16) · table_created TINYINT · status VARCHAR(16) (uploading|importing|done|error|aborted) · error TEXT · created · updated`

- Doubles as the **duplicate-import lock**: `import/start` rejects if an active session exists for the same `table_name`.
- **Failure recovery**: a failed/aborted tick is re-runnable — offset advances only on committed batch. Client retries a failed request up to 3× with backoff, then surfaces the session error state with a *Reanudar* (resume) action.
- **Orphan sweep**: `import/start` opportunistically deletes sessions (+tmp files) older than 24 h in non-done states.

### 3. Server parsing (single canonical parser)

- `fgetcsv` from stored file — the same parser for every import size.
- Encoding handled **once, server-side**: BOM strip; UTF-8 pass-through; Windows-1252/Latin-1 → `iconv` per row (the Excel-on-Windows Spanish-CSV case).
- Row width normalized to header (pad/truncate) — same semantics as the shipped importer.

### 4. Client (Vue 3) — `vpress-filepond.vue` + new `src/utils/importPipeline.js`

- `importPipeline.js`: pure module — `slice file → start → chunk loop → finish-upload → tick loop`, emitting `{phase, pct, rowsInserted}` via callback. **Unit-testable in Vitest with mocked fetch** (no DOM).
- `vpress-filepond.vue`: replaces the one-shot `api.dataset.upload` call with the pipeline; the modal `v-dialog` becomes a progress dialog (`v-progress-linear` — upload phase then import phase), with cancel → `import/abort`.
- Client pre-checks `file.size` against the cap (server re-enforces) and rejects with the existing notification pattern.
- On pipeline `done` → existing `dataset/create` call, unchanged (`uploaded` event contract preserved).

### 5. Free-tier cap

- `apply_filters('vpress_max_upload_bytes', 20 * MB_IN_BYTES)` enforced in `import/start` (authoritative) and read by the client for early UX rejection (exposed via localized script var).
- Engine seam retained: `apply_filters('vpress_import_engine', 'ticks')` reserved for a future fast path (e.g. LOAD DATA on self-hosted). Not implemented beyond the filter.

## Out of scope (parked)

- **Pro differentiator** (parked by operator — to be designed as its own initiative; must be "really good", not just a bigger cap).
- Action Scheduler / background (tab-closed) imports · LOAD DATA fast path (seam only) · scheduled dataset refresh · non-CSV sources.
- The legacy `/dataset/upload` endpoint stays as-is (deprecated-in-place; UI no longer calls it).

## Testing

1. **Vitest**: `importPipeline.js` unit tests — chunk slicing math, retry/backoff, phase transitions, abort (mocked fetch).
2. **Server integration (manual + browser-driven)**: the 13 KB test CSV (1 chunk); a generated ~15 MB CSV (multi-chunk, multi-tick); a >20 MB CSV (cap rejection, both client and server); a Windows-1252 CSV with accents (encoding path); kill-tab mid-import → resume.
3. Existing Vitest suite stays green.

## Risks

- **Shared-host POST throttling / mod_security on rapid sequential POSTs** — mitigated by modest chunk size and sequential (not parallel) requests; retry with backoff.
- **Disk**: tmp file ≤ cap (20 MB free) — negligible; sweep covers orphans.
- **fgetcsv offset resume across multi-line (quoted-newline) records** — offsets are only ever saved at record boundaries (`ftell` after `fgetcsv`), never mid-record, so seek-resume is always safe.
