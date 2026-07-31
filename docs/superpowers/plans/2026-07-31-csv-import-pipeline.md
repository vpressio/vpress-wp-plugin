# CSV Import Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the route-D′ import pipeline (chunked upload → server-side parse → client-driven ticks) as the free tier's single import path, capped at 20 MB.

**Architecture:** New `api/{controllers,services}/import.php` pair following the existing dataset.php pattern; a session row in `wp_vpresscore_imports` carries all state; the Vue side gets a pure `importPipeline.js` driver module wired into `vpress-filepond.vue` with a progress dialog. Spec: `docs/superpowers/specs/2026-07-31-csv-import-pipeline-design.md`.

**Tech Stack:** WP REST (`vpress/v1`), `$wpdb`/dbDelta, PHP `fgetcsv`/`iconv`; Vue 3 + Vitest on the client.

## Global Constraints

- Cap: `apply_filters( 'vpress_max_upload_bytes', 20 * MB_IN_BYTES )` — enforced server-side in `import/start`; client pre-checks via localized config.
- Rows per tick: `apply_filters( 'vpress_import_rows_per_tick', 5000 )`.
- Engine seam: `apply_filters( 'vpress_import_engine', 'ticks' )` — read, logged in session, nothing else.
- No WP-Cron, no LOAD DATA, no new PHP extensions (iconv/mbstring ship with WP hosts).
- Reuse: `vpress_clean_string()`, `vpress_insert_rows()` (both in `api/services/dataset.php`).
- Byte offsets only ever saved at record boundaries (`ftell` after `fgetcsv`).
- UI strings Spanish; code identifiers English. Legacy `/dataset/upload` endpoint untouched.
- Gates per task: `yarn --cwd admin vitest run` green; `php -l` on touched PHP; commit per task, local only.

---

### Task 1: Server — session service + `import/start`

**Files:**
- Create: `api/services/import.php`
- Create: `api/controllers/import.php`
- Modify: `api/index.php` (add `require ... 'controllers/import.php';` after chart.php)
- Modify: `api/routes.php` (add route consts)

**Interfaces:**
- Produces: `vpress_import_sessions_table()` (ensures table, returns name), `vpress_import_get_session( $id )` (row object or null), `vpress_import_update_session( $id, array $fields )`, endpoint `POST vpress/v1/import/start {filename,total_bytes}` → `{session_id, chunk_bytes, table_name}` or `WP_Error(4xx)`.

- [ ] **Step 1: routes.php consts**

```php
define('VPRESS_API_IMPORT_START','/import/start');
define('VPRESS_API_IMPORT_CHUNK','/import/chunk');
define('VPRESS_API_IMPORT_FINISH_UPLOAD','/import/finish-upload');
define('VPRESS_API_IMPORT_TICK','/import/tick');
define('VPRESS_API_IMPORT_ABORT','/import/abort');
```

- [ ] **Step 2: `api/services/import.php` — session helpers + start**

```php
<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

function vpress_import_sessions_table() {
  global $wpdb;
  $table = $wpdb->prefix . 'vpresscore_imports';
  if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) {
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset = $wpdb->get_charset_collate();
    dbDelta( "CREATE TABLE $table (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      file_name VARCHAR(255) NOT NULL,
      table_name VARCHAR(255) NOT NULL,
      tmp_path VARCHAR(1024) NOT NULL,
      total_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
      bytes_received BIGINT UNSIGNED NOT NULL DEFAULT 0,
      chunks_received INT UNSIGNED NOT NULL DEFAULT 0,
      byte_offset BIGINT UNSIGNED NOT NULL DEFAULT 0,
      rows_inserted BIGINT UNSIGNED NOT NULL DEFAULT 0,
      columns_json TEXT NULL,
      encoding VARCHAR(16) NOT NULL DEFAULT 'UTF-8',
      table_created TINYINT(1) NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL DEFAULT 'uploading',
      error TEXT NULL,
      created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY  (id)
    ) $charset;" );
  }
  return $table;
}

function vpress_import_get_session( $id ) {
  global $wpdb;
  $table = vpress_import_sessions_table();
  return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE id = %d", $id ) );
}

function vpress_import_update_session( $id, $fields ) {
  global $wpdb;
  $wpdb->update( vpress_import_sessions_table(), $fields, array( 'id' => $id ) );
}

function vpress_import_tmp_dir() {
  $upload_dir = wp_upload_dir();
  $dir = $upload_dir['basedir'] . '/vpress/tmp';
  if ( ! file_exists( $dir ) ) {
    wp_mkdir_p( $dir );
  }
  return $dir;
}

function vpress_import_sweep_orphans() {
  global $wpdb;
  $table = vpress_import_sessions_table();
  $stale = $wpdb->get_results(
    "SELECT id, tmp_path FROM $table
     WHERE status IN ('uploading','importing','error')
       AND updated < (NOW() - INTERVAL 24 HOUR)"
  );
  foreach ( $stale as $row ) {
    if ( $row->tmp_path && file_exists( $row->tmp_path ) ) {
      wp_delete_file( $row->tmp_path );
    }
    vpress_import_update_session( $row->id, array( 'status' => 'aborted', 'tmp_path' => '' ) );
  }
}

function vpress_import_chunk_bytes() {
  $post_max   = wp_convert_hr_to_bytes( ini_get( 'post_max_size' ) );
  $upload_max = wp_convert_hr_to_bytes( ini_get( 'upload_max_filesize' ) );
  $limit = min( array_filter( array( $post_max, $upload_max ) ) );
  return (int) min( max( floor( $limit * 0.75 ), 256 * KB_IN_BYTES ), 4 * MB_IN_BYTES );
}

function vpress_import_start( $request ) {
  global $wpdb;
  $filename    = sanitize_file_name( (string) $request->get_param( 'filename' ) );
  $total_bytes = (int) $request->get_param( 'total_bytes' );
  $cap         = (int) apply_filters( 'vpress_max_upload_bytes', 20 * MB_IN_BYTES );

  if ( strtolower( pathinfo( $filename, PATHINFO_EXTENSION ) ) !== 'csv' ) {
    return new WP_Error( 'invalid_extension', 'Solo se permiten archivos CSV.', array( 'status' => 400 ) );
  }
  if ( $total_bytes <= 0 || $total_bytes > $cap ) {
    return new WP_Error( 'file_too_large', 'El archivo excede el tamaño máximo permitido.', array( 'status' => 413, 'max_bytes' => $cap ) );
  }

  vpress_import_sweep_orphans();

  $table_name = 'vpress_' . vpress_clean_string( explode( '.', $filename )[0] );
  $sessions   = vpress_import_sessions_table();
  $active = $wpdb->get_var( $wpdb->prepare(
    "SELECT COUNT(*) FROM $sessions WHERE table_name = %s AND status IN ('uploading','importing')",
    $table_name
  ) );
  if ( (int) $active > 0 ) {
    return new WP_Error( 'import_in_progress', 'Ya hay una importación en curso para este dataset.', array( 'status' => 409 ) );
  }

  $tmp_path = vpress_import_tmp_dir() . '/' . wp_generate_password( 20, false ) . '.csv';
  if ( file_put_contents( $tmp_path, '' ) === false ) {
    return new WP_Error( 'tmp_write_failed', 'No se pudo crear el archivo temporal.', array( 'status' => 500 ) );
  }

  $wpdb->insert( $sessions, array(
    'file_name'   => $filename,
    'table_name'  => $table_name,
    'tmp_path'    => $tmp_path,
    'total_bytes' => $total_bytes,
    'status'      => 'uploading',
  ) );

  return array(
    'session_id'  => (int) $wpdb->insert_id,
    'chunk_bytes' => vpress_import_chunk_bytes(),
    'table_name'  => $table_name,
    'engine'      => apply_filters( 'vpress_import_engine', 'ticks' ),
  );
}
```

- [ ] **Step 3: `api/controllers/import.php`**

```php
<?php
include plugin_dir_path( __FILE__ ) . '../services/import.php';

add_action( 'rest_api_init', 'vpress_register_import_routes' );

function vpress_register_import_routes() {
  $perm = function ( WP_REST_Request $request ) {
    return current_user_can( 'publish_posts' );
  };
  foreach ( array(
    VPRESS_API_IMPORT_START         => 'vpress_import_start',
    VPRESS_API_IMPORT_CHUNK         => 'vpress_import_chunk',
    VPRESS_API_IMPORT_FINISH_UPLOAD => 'vpress_import_finish_upload',
    VPRESS_API_IMPORT_TICK          => 'vpress_import_tick',
    VPRESS_API_IMPORT_ABORT         => 'vpress_import_abort',
  ) as $route => $callback ) {
    register_rest_route( VPRESS_API_BASE_URL, $route, array(
      'methods'             => WP_REST_SERVER::CREATABLE,
      'callback'            => $callback,
      'permission_callback' => $perm,
    ) );
  }
}
```

(Stubs for the three not-yet-written callbacks so registration doesn't fatal: define them in `services/import.php` in Tasks 2–3; for THIS task's commit add temporary implementations returning `WP_Error('not_implemented', '', array('status' => 501))`.)

- [ ] **Step 4: Wire include + lint + smoke**

`api/index.php`: add `require plugin_dir_path( __FILE__ ) . 'controllers/import.php';`

Run: `php -l api/services/import.php && php -l api/controllers/import.php`
Smoke (unauthenticated → 401, proves registration): `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8888/wp-json/vpress/v1/import/start` → expect `401`.

- [ ] **Step 5: Commit** — `feat(api): import sessions + import/start endpoint`

---

### Task 2: Server — `import/chunk` + `import/finish-upload` (+ header/table refactor)

**Files:**
- Modify: `api/services/import.php` (replace 501 stubs)
- Modify: `api/services/dataset.php` (extract header logic into `vpress_prepare_dataset_table()`, call it from `vpress_upload_dataset`)

**Interfaces:**
- Consumes: session helpers (Task 1).
- Produces: `vpress_prepare_dataset_table( $table_name, array $header_row )` → `array $columns` (cleaned, deduped; creates table via dbDelta) — used by BOTH the legacy upload and finish-upload. `vpress_import_detect_encoding( $sample )` → `'UTF-8'|'Windows-1252'`.

- [ ] **Step 1: Extract `vpress_prepare_dataset_table` in dataset.php**

Move the header-cleaning/dedup/CREATE TABLE block out of `vpress_upload_dataset` verbatim:

```php
function vpress_prepare_dataset_table( $table_name, $header_row ) {
  global $wpdb;
  $charset_collate = $wpdb->get_charset_collate();
  require_once ABSPATH . 'wp-admin/includes/upgrade.php';

  $sql_create_dataset = "CREATE TABLE IF NOT EXISTS $table_name (";
  $data = array_map( 'vpress_clean_string', $header_row );
  foreach ( $data as $value ) {
    $duplicates = array_keys( $data, $value );
    if ( count( $duplicates ) > 1 ) {
      foreach ( $duplicates as $k => $v ) {
        $i = $k + 1;
        $data[ $v ] .= "_{$i}";
      }
    }
  }
  foreach ( array_filter( $data ) as $value ) {
    $sql_create_dataset .= "`$value` TEXT NULL, ";
  }
  $sql_create_dataset .= "created TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ";
  $sql_create_dataset .= "updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP";
  $sql_create_dataset = rtrim( $sql_create_dataset, ", " );
  $sql_create_dataset .= ") $charset_collate;";
  dbDelta( $sql_create_dataset );

  return array_values( array_filter( $data ) );
}
```

In `vpress_upload_dataset`, replace the inlined block inside the `if ( $headerFlag )` branch with:
```php
$columns = vpress_prepare_dataset_table( $table_name, $data );
```
(and delete the now-dead local `$sql_create_dataset` code; keep everything else identical).

- [ ] **Step 2: chunk + finish-upload in services/import.php (replace stubs)**

```php
function vpress_import_chunk( $request ) {
  $session = vpress_import_get_session( (int) $request->get_param( 'session_id' ) );
  if ( ! $session || $session->status !== 'uploading' ) {
    return new WP_Error( 'invalid_session', 'Sesión de importación inválida.', array( 'status' => 404 ) );
  }
  $index = (int) $request->get_param( 'index' );
  $files = $request->get_file_params();
  if ( empty( $files['blob'] ) || ! is_uploaded_file( $files['blob']['tmp_name'] ) ) {
    return new WP_Error( 'missing_chunk', 'Falta el fragmento del archivo.', array( 'status' => 400 ) );
  }
  // Idempotent retry: a re-sent, already-applied chunk is acknowledged, not appended.
  if ( $index < (int) $session->chunks_received ) {
    return array( 'chunks_received' => (int) $session->chunks_received, 'bytes_received' => (int) $session->bytes_received );
  }
  if ( $index !== (int) $session->chunks_received ) {
    return new WP_Error( 'out_of_order', 'Fragmento fuera de orden.', array( 'status' => 409 ) );
  }
  $bytes = file_get_contents( $files['blob']['tmp_name'] );
  $new_total = (int) $session->bytes_received + strlen( $bytes );
  if ( $new_total > (int) $session->total_bytes ) {
    return new WP_Error( 'overflow', 'Se recibieron más bytes de los declarados.', array( 'status' => 400 ) );
  }
  if ( file_put_contents( $session->tmp_path, $bytes, FILE_APPEND ) === false ) {
    return new WP_Error( 'tmp_write_failed', 'No se pudo escribir el fragmento.', array( 'status' => 500 ) );
  }
  vpress_import_update_session( $session->id, array(
    'chunks_received' => (int) $session->chunks_received + 1,
    'bytes_received'  => $new_total,
  ) );
  return array( 'chunks_received' => (int) $session->chunks_received + 1, 'bytes_received' => $new_total );
}

function vpress_import_detect_encoding( $sample ) {
  if ( substr( $sample, 0, 3 ) === "\xEF\xBB\xBF" ) {
    return 'UTF-8'; // BOM handled at read time
  }
  return mb_check_encoding( $sample, 'UTF-8' ) ? 'UTF-8' : 'Windows-1252';
}

function vpress_import_finish_upload( $request ) {
  $session = vpress_import_get_session( (int) $request->get_param( 'session_id' ) );
  if ( ! $session || $session->status !== 'uploading' ) {
    return new WP_Error( 'invalid_session', 'Sesión de importación inválida.', array( 'status' => 404 ) );
  }
  if ( (int) $session->bytes_received !== (int) $session->total_bytes ) {
    return new WP_Error( 'incomplete_upload', 'La carga está incompleta.', array( 'status' => 400 ) );
  }
  $mime = mime_content_type( $session->tmp_path );
  if ( ! in_array( $mime, array( 'text/csv', 'text/plain', 'application/csv' ), true ) ) {
    return new WP_Error( 'invalid_mime', 'El archivo no es un CSV válido.', array( 'status' => 400 ) );
  }

  $handle = fopen( $session->tmp_path, 'r' );
  $sample = fread( $handle, 64 * KB_IN_BYTES );
  $encoding = vpress_import_detect_encoding( $sample );
  rewind( $handle );
  // Strip BOM if present so the first header cell is clean.
  $bom = fread( $handle, 3 );
  if ( $bom !== "\xEF\xBB\xBF" ) {
    rewind( $handle );
  }
  $header = fgetcsv( $handle, 0, ',' );
  if ( ! $header || count( array_filter( $header ) ) === 0 ) {
    fclose( $handle );
    return new WP_Error( 'invalid_header', 'No se pudo leer el encabezado del CSV.', array( 'status' => 400 ) );
  }
  if ( $encoding !== 'UTF-8' ) {
    $header = array_map( function ( $v ) use ( $encoding ) {
      return iconv( $encoding, 'UTF-8//TRANSLIT', (string) $v );
    }, $header );
  }
  $data_offset = ftell( $handle );
  fclose( $handle );

  global $wpdb;
  $table_existed = ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $session->table_name ) ) === $session->table_name );
  $columns = vpress_prepare_dataset_table( $session->table_name, $header );

  vpress_import_update_session( $session->id, array(
    'columns_json'  => wp_json_encode( $columns ),
    'encoding'      => $encoding,
    'byte_offset'   => $data_offset,
    'table_created' => $table_existed ? 0 : 1,
    'status'        => 'importing',
  ) );
  return array( 'status' => 'importing', 'columns' => $columns, 'encoding' => $encoding );
}
```

- [ ] **Step 3: Lint + commit** — `php -l` both files; commit `feat(api): chunked upload receive + finish-upload with encoding detection`

---

### Task 3: Server — `import/tick` + `import/abort`

**Files:**
- Modify: `api/services/import.php` (replace remaining stubs)

**Interfaces:**
- Consumes: `vpress_insert_rows( $table_name, $columns, $rows )` (dataset.php), session helpers.
- Produces: `POST import/tick {session_id}` → `{status, rows_inserted, bytes_done, total_bytes}`; `POST import/abort {session_id}` → `{status:'aborted'}`.

- [ ] **Step 1: Implement**

```php
function vpress_import_tick( $request ) {
  global $wpdb;
  $session = vpress_import_get_session( (int) $request->get_param( 'session_id' ) );
  if ( ! $session || $session->status !== 'importing' ) {
    return new WP_Error( 'invalid_session', 'Sesión de importación inválida.', array( 'status' => 404 ) );
  }
  $columns = json_decode( (string) $session->columns_json, true );
  if ( empty( $columns ) ) {
    return new WP_Error( 'invalid_session', 'Sesión sin columnas.', array( 'status' => 500 ) );
  }
  $rows_per_tick = (int) apply_filters( 'vpress_import_rows_per_tick', 5000 );

  $handle = fopen( $session->tmp_path, 'r' );
  if ( ! $handle ) {
    return new WP_Error( 'tmp_read_failed', 'No se pudo leer el archivo temporal.', array( 'status' => 500 ) );
  }
  fseek( $handle, (int) $session->byte_offset );

  $rows = array();
  $eof  = false;
  while ( count( $rows ) < $rows_per_tick ) {
    $data = fgetcsv( $handle, 0, ',' );
    if ( $data === false ) {
      $eof = true;
      break;
    }
    if ( $data === array( null ) ) {
      continue;
    }
    if ( $session->encoding !== 'UTF-8' ) {
      $data = array_map( function ( $v ) use ( $session ) {
        return iconv( $session->encoding, 'UTF-8//TRANSLIT', (string) $v );
      }, $data );
    }
    $rows[] = array_slice( array_pad( $data, count( $columns ), '' ), 0, count( $columns ) );
  }
  $new_offset = ftell( $handle );
  fclose( $handle );

  $inserted = 0;
  if ( count( $rows ) > 0 ) {
    $inserted = vpress_insert_rows( $session->table_name, $columns, $rows );
    if ( $wpdb->last_error ) {
      vpress_import_update_session( $session->id, array( 'status' => 'error', 'error' => $wpdb->last_error ) );
      return new WP_Error( 'insert_failed', $wpdb->last_error, array( 'status' => 500 ) );
    }
  }

  $fields = array(
    'byte_offset'   => $new_offset,
    'rows_inserted' => (int) $session->rows_inserted + $inserted,
  );
  if ( $eof ) {
    $fields['status'] = 'done';
    if ( $session->tmp_path && file_exists( $session->tmp_path ) ) {
      wp_delete_file( $session->tmp_path );
    }
    $fields['tmp_path'] = '';
  }
  vpress_import_update_session( $session->id, $fields );

  return array(
    'status'        => $eof ? 'done' : 'importing',
    'rows_inserted' => (int) $session->rows_inserted + $inserted,
    'bytes_done'    => (int) $new_offset,
    'total_bytes'   => (int) $session->total_bytes,
    'dataset_name'  => preg_replace( '/^vpress_/', '', $session->table_name ),
  );
}

function vpress_import_abort( $request ) {
  global $wpdb;
  $session = vpress_import_get_session( (int) $request->get_param( 'session_id' ) );
  if ( ! $session ) {
    return new WP_Error( 'invalid_session', 'Sesión de importación inválida.', array( 'status' => 404 ) );
  }
  if ( $session->tmp_path && file_exists( $session->tmp_path ) ) {
    wp_delete_file( $session->tmp_path );
  }
  if ( (int) $session->table_created === 1 ) {
    $wpdb->query( "DROP TABLE IF EXISTS `{$session->table_name}`" );
  }
  vpress_import_update_session( $session->id, array( 'status' => 'aborted', 'tmp_path' => '' ) );
  return array( 'status' => 'aborted' );
}
```

- [ ] **Step 2: Lint + end-to-end smoke via browser harness** (13 KB CSV through start→chunk→finish→ticks→done; verify row count 240 in table)
- [ ] **Step 3: Commit** — `feat(api): import tick loop + abort`

---

### Task 4: Client — `importPipeline.js` + Vitest

**Files:**
- Create: `admin/src/utils/importPipeline.js`
- Test: `admin/tests/unit/importPipeline.spec.js`

**Interfaces:**
- Produces: `runImport(file, { onProgress, request })` → resolves `{datasetName, rowsInserted}` / rejects `Error` with `.stage`. `request(path, opts)` defaults to a nonce-aware fetch wrapper (injectable for tests). `abortImport(sessionId, request)`.

- [ ] **Step 1: Failing tests**

```js
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
    const request = vi.fn(async (path, opts) => {
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
});
```

- [ ] **Step 2: Run to fail** — `yarn --cwd admin vitest run tests/unit/importPipeline.spec.js` → module not found.

- [ ] **Step 3: Implement `admin/src/utils/importPipeline.js`**

```js
// Route D′ client driver: chunked upload → server parse → tick loop.
// Pure module — the HTTP layer is injectable so Vitest never touches the DOM.

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
      // network error → fall through to retry
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
```

- [ ] **Step 4: Tests green** — `yarn --cwd admin vitest run` (whole suite).
- [ ] **Step 5: Commit** — `feat(admin): importPipeline client driver with tests`

---

### Task 5: Client — wire `vpress-filepond.vue` (progress dialog, cap pre-check)

**Files:**
- Modify: `admin/src/components/vpress-filepond.vue`
- Modify: `admin/class-vpress-admin.php` (localize `vpressImportConfig` with `{ maxUploadBytes }` on the `_app` handle in BOTH env branches)

**Interfaces:**
- Consumes: `runImport`, `abortImport` (Task 4); existing `notificationsStore.open`, `api.dataset.create`, `uploaded` emit.

- [ ] **Step 1: PHP — localize config (both branches of `enqueue_scripts`)**

```php
wp_localize_script( $this->plugin_name . '_app', 'vpressImportConfig', array(
    'maxUploadBytes' => (int) apply_filters( 'vpress_max_upload_bytes', 20 * MB_IN_BYTES ),
) );
```

- [ ] **Step 2: Component — replace `handleFile` internals**

```js
import { runImport, abortImport } from '../utils/importPipeline.js';
```

```js
async handleFile(file) {
  const cap = (window.vpressImportConfig || {}).maxUploadBytes || 20 * 1024 * 1024;
  if (file.size > cap) {
    this.notificationsStore.open({
      color: 'warning',
      text: `El archivo excede el máximo de ${Math.round(cap / 1048576)} MB.`
    });
    return;
  }
  this.loading = true;
  this.progress = { phase: 'upload', pct: 0, rowsInserted: 0 };
  try {
    const result = await runImport(file, {
      onProgress: (p) => { this.progress = p; }
    });
    const createRes = await api.dataset.create({
      name: result.datasetName,
      slug: result.datasetName,
      permissions: 'public',
      owner_id: window.userSettings.uid
    });
    this.notificationsStore.open({ color: 'success', text: 'Dataset guardado con éxito' });
    this.$emit('uploaded', createRes.data.data[0]);
  } catch (e) {
    if (e.sessionId) abortImport(e.sessionId);
    this.notificationsStore.open({ color: 'error', text: 'Hubo un error al intentar guardar el dataset' });
    if (this.$refs.fileInput) this.$refs.fileInput.value = '';
  }
  this.loading = false;
}
```

data() gains `progress: { phase: 'upload', pct: 0, rowsInserted: 0 }`.

- [ ] **Step 3: Progress dialog** — replace the indeterminate `v-progress-linear` block inside the existing `v-dialog`:

```html
<v-card-text>
  <v-card-title class="px-0 text-subtitle-1">
    {{ progress.phase === 'upload' ? 'Subiendo archivo…' : 'Importando datos…' }}
  </v-card-title>
  <v-progress-linear :model-value="progress.pct" color="white" height="8" class="mb-2" />
  <div v-if="progress.phase === 'import'" class="text-caption">
    {{ new Intl.NumberFormat().format(progress.rowsInserted) }} filas importadas
  </div>
</v-card-text>
```

- [ ] **Step 4: Gates** — `yarn --cwd admin build && yarn --cwd admin vitest run`; `php -l admin/class-vpress-admin.php`.
- [ ] **Step 5: Commit** — `feat(admin): filepond drives the chunked import pipeline with progress dialog`

---

### Task 6: End-to-end verification (browser harness)

- [ ] 13 KB CSV (1 chunk, 1 tick) → dataset appears, 240 rows.
- [ ] Generate ~15 MB CSV (`python3`, same generator × ~70 months) → multi-chunk upload, multi-tick import, progress advances, row count exact.
- [ ] >20 MB file → client rejects instantly; direct API call also rejects (413).
- [ ] Windows-1252 CSV (iconv the test file to CP1252) → accents import correctly.
- [ ] Mid-import tab reload → session resumable state verified in `wp_vpresscore_imports` (no duplicate rows after re-import of remaining ticks is NOT expected in v1 — verify the session is `error/importing` and abort cleans up; resume-UX itself is follow-up).
- [ ] Legacy `Vpress Legacy` mount still functional (shared API untouched).
- [ ] Commit any fixes — `fix(...)` per finding.

## Self-Review

- **Spec coverage:** endpoints ✓ (T1–T3), session model ✓ (T1), encoding ✓ (T2), cap+filters ✓ (T1/T5), client module+tests ✓ (T4), UI ✓ (T5), sweep ✓ (T1), abort/table_created ✓ (T3), E2E matrix ✓ (T6). Resume *UX* deliberately out (spec says "session supports resume" — state model supports it; surfacing a resume button is follow-up; noted in T6).
- **Placeholder scan:** clean — no TBDs.
- **Type consistency:** `vpress_insert_rows( $table, $columns, $rows )` matches shipped signature; `runImport` return `{datasetName, rowsInserted, sessionId}` consumed in T5; `chunk_bytes`/`session_id` names consistent across T1/T4.
