# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] - Unreleased

### Added
- **Chunked CSV import pipeline** (route D′): chunked upload → server-side parse → client-driven ticks. Works on any shared hosting — no `LOAD DATA`, no WP-Cron, no php.ini flags. Progress dialog with row counts; sessions tracked in `wp_vpresscore_imports` with idempotent chunk retries, orphan sweep, and abort. Free tier capped at 20 MB via `vpress_max_upload_bytes` filter (Pro seam: `vpress_import_engine`).
- Server-side encoding detection (UTF-8 BOM / Windows-1252 → UTF-8) — Excel-on-Windows Spanish CSVs import correctly.
- `importPipeline.js` client driver with Vitest coverage (15 tests total).

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
