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
- **Chunked CSV import pipeline** (route D′): chunked upload → server-side parse → client-driven ticks. Works on any shared hosting — no `LOAD DATA`, no WP-Cron, no php.ini flags. Progress dialog with row counts; sessions tracked in `wp_vpresscore_imports` with idempotent chunk retries, orphan sweep, and abort. Free tier capped at 20 MB via `vpress_max_upload_bytes` filter (Pro seam: `vpress_import_engine`).
- Server-side encoding detection (UTF-8 BOM / Windows-1252 → UTF-8) — Excel-on-Windows Spanish CSVs import correctly.
- `importPipeline.js` client driver with Vitest coverage (15 tests total).
- **Playwright end-to-end smoke suite** (`admin/tests/e2e`, `yarn test:e2e`): logs into WordPress, checks the public REST routes, asserts the public chart page `/chart/1` draws its bars with zero console errors, and drives the editor for real — dataset list → data module → editor, native drag of `estado`/`ventas` onto the X/Y slots, asserts dbox/d3 draws ≥ 5 bar marks under Vue 3, saves through the toolbar, and deletes the chart it created. Optional GitLab `e2e` job runs it when `E2E_BASE_URL` (+ `E2E_USER`/`E2E_PASSWORD`) is set.

### Fixed
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
