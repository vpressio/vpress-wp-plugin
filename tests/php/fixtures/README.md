# PHPUnit fixtures

- `chart-1-value.json`: `wp_vpresscore_charts.value` for chart #1, the same text as `VpressFixtures::CHART_1_VALUE`. It was read from the dev DB with a read-only query on 2026-09-24.
- `chart-1-flat-body.json`: the output of the admin's real `queryBody()` (`admin/src/vpress/helpers/index.js`) for that config, with dataset slug `vpress_test_ventas` and source `null`. Regenerate it from `admin/` with:
  `node_modules/.bin/vite-node ../tests/php/fixtures/dump-chart-1-flat-body.mjs`
- `chart-1-rows.json`: the 24 rows the anonymous `POST /chart/query {"chart_id":1}` returned on the dev site on 2026-09-24 (read-only). Used by `FigureTextTest` and `render-fixture.php` as chart #1's data.
