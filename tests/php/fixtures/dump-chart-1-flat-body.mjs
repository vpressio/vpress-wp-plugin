// Regenerates chart-1-flat-body.json by running the admin's real queryBody()
// on chart #1's saved config (dataset slug vpress_test_ventas, source NULL).
// Run from admin/:  node_modules/.bin/vite-node ../tests/php/fixtures/dump-chart-1-flat-body.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { queryBody } from '../../../admin/src/vpress/helpers/index.js';

const here = new URL('.', import.meta.url);
const context = JSON.parse(readFileSync(new URL('chart-1-value.json', here), 'utf8'));
const body = queryBody(context, 'vpress_test_ventas', null);
writeFileSync(new URL('chart-1-flat-body.json', here), JSON.stringify(body, null, 2) + '\n');
