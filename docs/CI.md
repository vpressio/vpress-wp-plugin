# CI pipeline

Five stages: `lint` → `test` → `build` → `package` → `e2e`.

- **`lint:js`** — `eslint . --max-warnings <N>` ratchet; `<N>` only moves down. Real lint errors fail regardless of `<N>`.
- **`lint:php`** — `bin/php-lint.sh` runs PHPCS (WordPress standards). Report-only. Artifacts: `phpcs.txt`, `phpcs.json`.
- **`test:js`** / **`test:php`** — Vitest and PHPUnit, one JUnit report each, rendered in the MR test summary.
- **`plugin-check`** — WordPress.org Plugin Check against a disposable WordPress + MySQL install. Report-only. Needs `build`'s `admin/dist`.
- **`build`** — `yarn build`, artifact `admin/dist/`.
- **`package`** — `bin/build-release.sh`, artifact `build/*.zip`. Auto on tags; `when: manual` otherwise.
- **`e2e`** — Playwright smoke suite; runs only when `E2E_BASE_URL` is set.

## Flipping a report-only job to blocking

`lint:php` and `plugin-check` carry `allow_failure: true` while their baselines aren't clean (PHPCS: 2990/908; Plugin Check: 74 `plugin_repo` errors — 2026-09-24). Delete that job's `allow_failure: true` line once its backlog hits zero.
