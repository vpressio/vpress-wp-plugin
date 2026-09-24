# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] - Unreleased

### Security
- **`/chart/query` no longer runs caller-supplied SQL fragments.** Every column must exist in the dataset table, aggregates and function operations are whitelisted, `ORDER BY`/`LIMIT` are validated, and filter values are bound through `$wpdb->prepare()`. Anonymous callers must send the `chart_id` of a public chart (403 for private). The query is then built from the saved chart config and any client-supplied dataset or context is ignored.
- **`/dataset/data/{dataset}` is guarded.** The dataset resolves through the registry, the quote-to-backtick rewrite is gone, and `page`/`perPage` are clamped (`perPage` 1–500). Anonymous callers only read public datasets. The hard-coded external SQL relay to `hue.devf.la` was removed; other sources can hook in through the `vpress_external_dataset_data` filter.
- **Private charts and datasets are hidden from anonymous callers** on the list and get endpoints, including dataset charts; a private item returns 403. Search terms are bound instead of interpolated. Column delete, rename and type-change, plus dataset delete, only interpolate guarded identifiers.
- **Datasets behind a public chart are readable anonymously.** The dataset record and its chart list can be read without logging in when at least one public chart uses the dataset, so a public chart on a private dataset still renders. The dataset's raw rows (`/dataset/data`) stay limited to public datasets.
- **`/chart/columns` is guarded.** The dataset must be a registered physical table and each column must be a real column of it. Anything else returns 400.
- **Removed the unreachable `/test/columns` route and `vpress_get_data()`.** The route's callback (`get_data`) did not exist, so its string-concatenated SQL builder could never run; both are gone.
- **SQL text and database errors are hidden from non-editors.** REST responses include the executed SQL and raw DB error messages only for `edit_posts` users with `WP_DEBUG` on. Everyone else gets `query: null` and a generic error message.
- **Each endpoint resolves datasets by one naming convention.** A registry slug and a `vpress_`-prefixed physical name can no longer be confused, so one dataset's queries can't be served from another's table.

### Added
- **Block `vpress/chart`** (`blocks/chart/`) — the primary way to insert a chart; the `[vpress]` shortcode keeps working. Dynamic block (`render.php` prints `vpress_render_figure()`, which enqueues the embed itself), apiVersion 3, category Embed, supports wide/full alignment, anchor and margin. The editor shows a live chart: the plain, unbuilt editor script (`index.js` on `wp.*` globals) loads the embed module into the editor canvas document (the iframe for block themes) and calls `window.vpress.mount()` on the block's figure. A placeholder picks a chart from the chart list; the sidebar has the chart picker, a "Show caption" toggle and an "Edit in Vpress" link. Unknown or deleted charts show a notice to editors and print nothing for visitors. `vpress_render_figure()` accepts `wrapper_attributes` (block classes, anchor and style merged into the `<figure>`) and `show_caption`.
- "Copy block" action on each chart card copies `<!-- wp:vpress/chart {"chartId":N} /-->` for pasting into the block editor.
- E2E `admin/tests/e2e/block-editor.spec.js` (helper `helpers/editor.js`): drives the real block editor — inserts "Vpress chart" from the inserter, picks chart #1 and asserts the chart draws inside the editor canvas iframe (≥ 5 bar marks, `aria-busy="false"`, the embed script and stylesheet in the iframe head only), toggles "Show caption", saves and checks the stored block comment, publishes and asserts the chart auto-mounts for an anonymous visitor (no `data-vpress-nonce`) and carries a nonce when logged in; zero console errors in the editor, canvas and front end. Uses a page because vpress-theme has no single-post template that prints post content. The page is deleted afterwards, also on failure.
- Tests: `tests/php/BlocksTest.php`, Vitest `blocks/chart/tests/index.test.js` (JSDOM, stubbed `window.wp`) and `admin/tests/unit/block-markup.spec.js`; `yarn lint:blocks` lints `blocks/`.
- **Server-rendered chart figure** — `vpress_render_figure( $chart_id, $args )` (`includes/class-vpress-figure.php`) prints one escaped `<figure class="vpress-figure …" data-vpress-chart data-vpress-rest>` with a labelled `role="group"` chart slot and a `<figcaption>` (title/subtitle), and enqueues the embed. `vpress_get_public_chart()` hides private charts from visitors who cannot `edit_posts`.
- **Lightweight public embed bundle** — `admin/dist/js/embed.js` + `css/embed.css`, loaded as a script module (`wp_register_script_module`). Mounts every `[data-vpress-chart]` on the page; `window.vpress.mount( el )` mounts content inserted later. No Vuetify, Pinia, vue-router or LogRocket. A non-map chart loads 268 KB gzipped / 844 KB raw (`embed.js` + `chunk-vue.js` + `vpress-chart-container.js` + `chunk-viz.js` + `css/embed.css`); the chart page previously loaded the whole admin bundle, 699 KB gzipped / 2.69 MB raw (`app.js` + `chunk-vendors.js` + `css/app.css`, plugin files only). Map charts additionally fetch `js/chunk-leaflet.js` (43 KB gzipped) and its stylesheet `css/chunk-leaflet.css` (6.5 KB gzipped) on demand; other chart types never download leaflet.
- **Standalone `/chart/{id}` page** — a valid HTML document with the figure and a site/Vpress footer; unknown or private charts get a 404 "Gráfica no disponible".
- Logged-in viewers get a `wp_rest` nonce on the figure (`data-vpress-nonce`), sent as `X-WP-Nonce` by the embed; anonymous markup carries none and stays cacheable.
- Tests: Vitest specs for the embed data flow and mounting; PHPUnit `tests/php/FigureTest.php`; static fixture `admin/tests/fixtures/embed.html`.
- **Accessibility layer for chart figures.**
  - *Text alternative:* the figure prints a deterministic description of its data (no LLM) in a visually hidden `<p class="vpress-figure__alt screen-reader-text" id="{figure id}-desc">`, referenced by `aria-describedby` on the chart slot. A fixed template per chart type ("Bar chart of ventas by estado, 8 categories. Highest: …; lowest: …. Grouped by canal, 3 series.") uses the chart's decimals, prefix and suffix. The rows come from the same hardened query path as `/chart/query` (`vpress_figure_rows()`, cached per request). The `vpress_figure_alt_text` filter overrides the text per chart. The server fetches at most 5,000 rows; a result that reaches that bound says so (" (first 5,000 rows)"). If the query fails, the figure renders as before.
  - *Data table fallback:* a collapsed `<details class="vpress-figure__data">` ("View data") before the caption (the `<figcaption>` stays the figure's last child), with every column (axis titles as headers), numbers right-aligned, capped at 200 rows with an "… and N more rows" line.
  - *SVG semantics:* the chart slot is `role="group"` and the chart `<svg>` is `role="graphics-document"` (both hold focusable marks, so neither is `img`), with a `<title>` and a `<desc>` (the figure's description); axes are `aria-hidden`.
  - *Keyboard:* bars, points and heat-map cells (map paths pending: tracked follow-up) are focusable (`tabindex="0"`, `role="graphics-symbol"`, `aria-label` "{category}: {value}"). Focus opens the same tooltip as hover; blur or Escape closes it; a 2px focus ring shows which mark is focused (`admin/src/a11y/marks.js`).
  - *Contrast:* series colours are lifted to ≥ 3:1 against the plot background (`#ffffff` light, `#1e1e1e` dark) along their HSL lightness, keeping the hue (`admin/src/a11y/contrast.js`). Heat-map and map ramps are left as saved, since their lightness encodes value.
  - *Tests:* PHPUnit `FigureTextTest` + `FigureA11yTest`; Vitest `a11y-marks`, `a11y-contrast`, `chart-container-a11y`; Playwright `a11y.spec.js` runs axe (`wcag2a`, `wcag2aa`, `wcag21aa`, zero critical/serious) on `/chart/1` or on the fixture that `tests/php/render-fixture.php` generates from `vpress_render_figure()` (`E2E_FIXTURE_URL`). New dev dependency: `@axe-core/playwright`.
- **Chunked CSV import pipeline** (route D′): chunked upload → server-side parse → client-driven ticks. Works on any shared hosting — no `LOAD DATA`, no WP-Cron, no php.ini flags. Progress dialog with row counts; sessions tracked in `wp_vpresscore_imports` with idempotent chunk retries, orphan sweep, and abort. Free tier capped at 20 MB via `vpress_max_upload_bytes` filter (Pro seam: `vpress_import_engine`).
- Server-side encoding detection (UTF-8 BOM / Windows-1252 → UTF-8) — Excel-on-Windows Spanish CSVs import correctly.
- `importPipeline.js` client driver with Vitest coverage (15 tests total).
- **Playwright end-to-end smoke suite** (`admin/tests/e2e`, `yarn test:e2e`): logs into WordPress, checks the public REST routes, asserts the public chart page `/chart/1` draws its bars with zero console errors, and drives the editor for real — dataset list → data module → editor, native drag of `estado`/`ventas` onto the X/Y slots, asserts dbox/d3 draws ≥ 5 bar marks under Vue 3, saves through the toolbar, and deletes the chart it created. Optional GitLab `e2e` job runs it when `E2E_BASE_URL` (+ `E2E_USER`/`E2E_PASSWORD`) is set.
- **Live data sources** — create a dataset from a CSV URL or a Google Sheet ("Desde URL" tab in the data module). Sheets links (`docs.google.com/spreadsheets/d/{ID}/…`, `gid` in the fragment or query, and published `/d/e/…` links) are fetched as CSV exports; other URLs must be public http(s) — `wp_safe_remote_get()` refuses private and loopback hosts. Downloads stream to the import tmp dir under the same 20 MB cap as uploads (`vpress_max_upload_bytes`); a body that reaches the cap is refused instead of imported truncated, and a sign-in page returned instead of CSV is rejected. Parsing reuses the chunked import pipeline's header reader and row parser.
- **Scheduled refresh** — each live dataset refreshes Manual / Cada hora / Diario / Semanal. An hourly WP-Cron event (`vpress_refresh_sources`, self-healing on `init`, removed on deactivation) refreshes up to 10 due datasets per run (filter `vpress_refresh_batch_size`), each under a 15-minute transient lock. A refresh imports into `vpress_<slug>__new` and swaps it in with one `RENAME TABLE`; on any failure the live table is untouched and the error is stored on the dataset. Dataset cards show "Actualizado hace …" and an "Actualizar ahora" button.
- REST: `POST /dataset/from-url` `{ name, url, refresh_interval }` and `POST /dataset/refresh` `{ id }` (`publish_posts`). `/dataset/get` and `/dataset/list` rows carry `source_type`, `source_url`, `refresh_interval`, `last_refreshed_at` and, for `edit_posts` users only, `last_refresh_error` (it can carry fetch diagnostics). Erasing data on uninstall also drops any `vpress_<slug>__new` / `__old` tables an interrupted refresh left behind.

### Fixed
- `tests/php/phpunit.xml` was not valid XML (a `--` inside a comment), so the default PHPUnit suite did not run.
- Production bundle resolved fonts/images from a hard-coded `/wp-content/plugins/vpress/admin/dist/` base, so on any install whose folder is not named `vpress` the MDI icon font and every non-inlined image (`btn-beta.png`, `db-gear.svg`, `map.svg`, …) 404'd — icons rendered blank. The Vite build now uses a relative base.
- The dataset list and dataset picker always called the optional Hue connector at `http://localhost:8000` (dev default baked into the bundle), firing a failing cross-origin request at the visitor's machine on every load. The connector is now only used when `VITE_HUE_API_BASE_URL` is set at build time.
- Vite dev server 403'd the MDI icon font inside git worktrees (symlinked `admin/node_modules` sits outside the default `server.fs.allow`).
- Vitest no longer tries to collect the Playwright specs under `tests/e2e`.

### WordPress.org readiness
- Plugin header: `Requires at least: 6.5`, `Requires PHP: 8.1`, GitLab Plugin/Author URIs, English description, `GPL-2.0-or-later`; header version and `VPRESS_VERSION` both `0.3.0`. Stale `data4.mx` `@link` docblocks replaced.
- `readme.txt` rewritten in WordPress.org format (English, Tested up to 7.1, Stable tag 0.3.0, five FAQs, six screenshots, external-services disclosure) with a condensed Spanish section.
- `uninstall.php` erases data only on opt-in (`vpress_erase_data_on_uninstall` option or filter): drops dataset tables with safe slugs, the three `vpresscore_*` tables, `vpress_` transients and the `uploads/vpress` folder; multisite aware. Otherwise removes only the plugin options.
- Rewrite rules are flushed on activation and deactivation instead of on every `init`.
- Leaflet 1.6.0 CSS and images bundled under `assets/vendor/leaflet/` (with its BSD-2-Clause LICENSE); no more unpkg request or SRI filter.
- `bin/build-release.sh` builds `build/vpress-<version>.zip` and asserts its contents.
- Plugin Check (`plugin_repo`): header and readme errors cleared (invalid Plugin URI, outdated Tested up to, trunk Stable tag, non-English readme), unpkg offloading and hand-built module `<script>` tags fixed: 93 errors on the pre-change checkout, 74 on the 0.3.0 release package. Remaining errors in the release package are in `api/` services and `public/index.php` / direct-access guards, outside this pass.

### Changed
- **`[vpress id="N" align="wide|full|center|none"]` now renders the chart inline** (it printed an empty `<div>`). The legacy `url` attribute is ignored; a non-numeric id renders nothing.
- The chart page no longer loads the admin app bundle, and no longer echoes the raw `?chart=` value into an inline script (reflected XSS); the id is cast to an integer.
- Build: two Vite entries (`app`, `embed`) with vendor chunks split by role (`chunk-vue`, `chunk-vue-app`, `chunk-viz`, `chunk-vuetify`, `chunk-leaflet`, `chunk-vendors`); still exactly one stylesheet per surface (`css/app.css`, `css/embed.css`) plus the lazily loaded `css/chunk-leaflet.css`; the build fails if either entry stylesheet is missing or empty, or if a stray per-chunk stylesheet is emitted that nothing loads. URLs emitted into JS are now relative to the importing chunk, so lazy chunks load from any plugin folder name.
- The chart container's loading state is a plain CSS spinner instead of Vuetify's `<v-progress-circular>`.
- **Direct value labels are on by default whenever a chart draws more than one series**, even if the chart was saved with labels off, so colour is never the only way to tell series apart (WCAG 1.4.1). This is a deliberate default. Grouped- and stacked-bar labels now show their own value in compact notation with the unit ("2,1 M", not the axis-scaled "2.1"), and labels inside stacked segments use a text colour that reaches 4.5:1 on the segment.
- All PHP tests, `FigureTest` and `BlocksTest` included, run under one bootstrap with one command (`php bin/phpunit.phar -c tests/php/phpunit.xml`); `tests/php/bootstrap-figure.php` and `bootstrap-blocks.php` are gone.
- The `/chart/{id}` page footer uses a solid grey instead of 70 % opacity, which had faded the theme's link colour below 4.5:1.
- **Datasets schema 0.3.0 with an upgrade routine.** The datasets registry gains `source_type` (`upload|url|gsheet`, default `upload`), `source_url`, `refresh_interval` (default `none`), `last_refreshed_at` and `last_refresh_error`. `vpress_maybe_upgrade_db()` re-runs the idempotent `dbDelta` schema on `plugins_loaded` whenever `vpress_db_version` differs from the plugin version, so existing installs upgrade without reactivation and existing rows keep working through the defaults. Activation now always runs the schema (dbDelta) instead of only on a fresh install.
- The CSV header reader and row-slice parser were extracted from `/import/finish-upload` and `/import/tick` into `vpress_import_read_header()` / `vpress_import_parse_slice()`; both endpoints are unchanged except: rows-per-tick now floors at 1; finish-upload returns `tmp_read_failed` (500) when the temp file cannot be opened.

### Removed
- The unreferenced 2023 public-embed spike (`public/vpress.js`, `public/components/`, `public/dboxjs/`, `public/vpress/`, `public/helpers/`, `public/utils/`) and the commented-out iframe shortcode.

### Verified
- 15 MB / 260,000 rows: 4 chunks, 52 ticks, 100% progress, exact row count.
- Cap rejection (413) client- and server-side; CP1252 accents (`Nuevo León`, `Suscripción`) decode correctly.

## [0.2.0] - 2026-07-30

### Changed
- **Admin frontend migrated to Vue 3.5 / Vuetify 3 / Pinia / vue-router 4, built with Vite 7** (was Vue 2.6 / Vuetify 2 / Vuex 3 / vue-router 3 on Vue CLI 4). All 30 SFCs, 2 mixins, and 3 store modules converted; dist contract (`js/app.js`, `js/chunk-vendors.js`, `css/app.css`) preserved.
- WordPress loaders (admin + public) now enqueue the bundle as a single ES-module entry, with a Vite dev-server mode on port 5173 (was webpack on 8080).
- Jest/Cypress scaffolding replaced by Vitest + @vue/test-utils 2 (store unit tests + app smoke mount, 11 tests).
- ESLint moved to flat config (eslint 9 + eslint-plugin-vue 10).

### Removed
- PWA service worker + precache (a self-destructing `service-worker.js` ships at the old path so previously-registered workers unregister themselves).
- `vue-tour` (was already disabled), `logrocket-vuex` (replaced by a custom Pinia plugin), `pug` template in `vpress-chart-container` (converted to HTML).

### Fixed
- Dead CSS `glob()` loop in both PHP loaders (globbed a URL, never matched); replaced by an explicit `css/app.css` enqueue.
