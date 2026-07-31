# Vpress Admin Frontend — Vue 3 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `admin/` SPA from Vue 2.6 / Vue CLI 4 / Vuetify 2 / Vuex 3 to Vue 3.5 / Vite / Vuetify 3 / Pinia / vue-router 4, preserving the WordPress asset + mount contract exactly.

**Architecture:** Big-bang migration on branch `refactor/vue3-upgrade` (no `@vue/compat` — Vuetify 3 doesn't support compat builds). The WP plugin PHP (`class-vpress-admin.php`) enqueues built assets by fixed name; the Vite build is configured to reproduce that contract, with the PHP loader updated to ESM (`type="module"`). Chart layer (d3 v5 + dboxjs + leaflet) is untouched.

**Tech Stack:** Vue 3.5, Vite 7, Vuetify 3, Pinia 3, vue-router 4, Vitest + @vue/test-utils 2, sass.

## Global Constraints

- **WP prod asset contract:** built output lands in `admin/dist/`; entry JS at `js/app.js`, vendor chunk at `js/chunk-vendors.js`, CSS at `css/app.css`. Prod `base` is exactly `/wp-content/plugins/vpress/admin/dist/` (deployed plugin dir is `vpress`, not `vpress-wp-plugin`).
- **Dual mount:** the bundle mounts `#app` (admin, privateRouter) or `#front` (public, publicRouter) — behavior preserved verbatim from `plugins/vueRouter.js`.
- **Out of scope — do not touch:** d3@5, dboxjs, @dboxjs/core, leaflet@1.6.0, topojson, xlsx, axios@0.19 (pinned), all PHP under `api/` and `includes/`, `src/vpress/` command layer, `src/models/`, `src/helpers/`.
- **Dropped by decision (operator, 2026-07-30):** PWA (service worker + register-service-worker + precache), vue-tour (already disabled in `plugins/index.js`), logrocket-vuex (replaced by a custom Pinia plugin), Cypress e2e scaffold (example-only, tests nothing).
- Code identifiers in English; UI strings remain Spanish (operator rule). No tracker/issue IDs in code comments.
- Router history mode: **hash** (vue-router 3 default when `mode` is unset — preserve).
- Env vars: `process.env.VUE_APP_API_URI` → `import.meta.env.VITE_API_URI`; `process.env.NODE_ENV === 'production'` → `import.meta.env.PROD`.
- Package manager: **yarn** (repo has `yarn.lock`). Node 24 is installed and satisfies Vite 7.
- Each task ends build-green: `cd admin && yarn build` (after Task 2) and `yarn vitest run` (after Task 9 exists).
- Commits stay local on `refactor/vue3-upgrade`; **never push**.

---

### Task 0: Baseline tag + scaffold hygiene

**Files:**
- No source changes; git tag only.

- [ ] **Step 1: Tag the pre-migration state**

```bash
git -C /Applications/MAMP/htdocs/wp-content/plugins/vpress-wp-plugin tag pre-vue3-upgrade
```

- [ ] **Step 2: Commit the plan document**

```bash
git add docs/superpowers/plans/2026-07-30-vue3-upgrade.md
git commit -m "docs: add Vue 3 upgrade implementation plan"
```

---

### Task 1: Dependency swap (package.json rewrite)

**Files:**
- Modify: `admin/package.json` (full rewrite below)
- Delete: `admin/babel.config.js`, `admin/vue.config.js`, `admin/jest.config.js`, `admin/cypress.json`, `admin/.browserslistrc`, `admin/tests/e2e/` (entire dir), `admin/postcss.config.js`
- Regenerate: `admin/yarn.lock`

**Interfaces:**
- Produces: node_modules for every later task. Scripts: `yarn dev`, `yarn build`, `yarn test:unit`, `yarn lint`.

- [ ] **Step 1: Replace `admin/package.json` with:**

```json
{
  "name": "admin_vue",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test:unit": "vitest run",
    "lint": "eslint src tests --ext .js,.vue"
  },
  "prettier": {
    "singleQuote": true
  },
  "dependencies": {
    "@dboxjs/core": "^0.1.5",
    "@mdi/font": "^5.5.55",
    "axios": "^0.19.0",
    "d3": "^5.16.0",
    "dboxjs": "^0.0.3",
    "file-saver": "^2.0.2",
    "filepond": "^4.18.0",
    "filepond-plugin-file-validate-type": "^1.2.5",
    "leaflet": "1.6.0",
    "lodash": "^4.17.20",
    "logrocket": "^1.0.11",
    "pinia": "^3.0.0",
    "topojson": "3.0.2",
    "vue": "^3.5.0",
    "vue-filepond": "^7.0.4",
    "vue-router": "^4.5.0",
    "vuetify": "^3.8.0",
    "xlsx": "^0.16.3"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.0",
    "@vue/test-utils": "^2.4.6",
    "eslint": "^9.0.0",
    "eslint-plugin-vue": "^10.0.0",
    "jsdom": "^26.0.0",
    "sass": "^1.77.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

Notes: `core-js`, `dotenv`, `pug`, `pug-plain-loader`, `register-service-worker`, `vue-tour`, `logrocket-vuex`, `vuex`, `vue-template-compiler`, all `@vue/cli-*`, `vuetify-loader`, `webpack-bundle-analyzer`, babel/jest packages, `gitHooks`/`lint-staged` blocks: **removed**. (Old lint-staged hook depended on vue-cli-service; re-adding hooks is out of scope.)

- [ ] **Step 2: Delete obsolete config files**

```bash
cd admin
rm -f babel.config.js vue.config.js jest.config.js cypress.json .browserslistrc postcss.config.js
rm -rf tests/e2e
```

- [ ] **Step 3: Install**

```bash
rm -rf node_modules yarn.lock && yarn install
```
Expected: lockfile regenerates cleanly. (Old `.eslintrc.js` will be replaced in Task 10; lint may not run until then — that's fine, `yarn lint` isn't a gate until Task 10.)

- [ ] **Step 4: Commit**

```bash
git add -A admin/package.json admin/yarn.lock && git add -u
git commit -m "build(admin): swap to Vue 3 / Vite / Vuetify 3 / Pinia dependency set"
```

---

### Task 2: Vite config + dev index.html

**Files:**
- Create: `admin/vite.config.js`, `admin/index.html`

**Interfaces:**
- Produces: `yarn build` emitting `dist/js/app.js` (entry, ESM), `dist/js/chunk-vendors.js` (all node_modules), `dist/css/app.css` (single stylesheet), fonts under `dist/fonts/`, images under `dist/img/`.

- [ ] **Step 1: Create `admin/vite.config.js`:**

```js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/wp-content/plugins/vpress/admin/dist/' : '/',
  plugins: [vue()],
  server: {
    port: 5173,
    cors: true,
    origin: 'http://localhost:5173'
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.names?.[0] ?? '';
          if (name.endsWith('.css')) return 'css/app.css';
          if (/\.(woff2?|ttf|eot)$/.test(name)) return 'fonts/[name][extname]';
          if (/\.(png|jpe?g|gif|svg|webp)$/.test(name)) return 'img/[name][extname]';
          return '[name][extname]';
        },
        manualChunks(id) {
          if (id.includes('node_modules')) return 'chunk-vendors';
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    server: { deps: { inline: ['vuetify'] } }
  }
}));
```

**Correction note:** do NOT import/use `vite-plugin-vuetify` unless tree-shaking is wanted; we import Vuetify wholesale (Task 4), so delete that import line — final plugins array is `[vue()]` only.

- [ ] **Step 2: Create `admin/index.html`** (Vite dev entry; in production WP provides the mount divs, this file is dev-only):

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Vpress (dev)</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 3: Commit** (build can't pass yet — src is still Vue 2; commit config only)

```bash
git add admin/vite.config.js admin/index.html
git commit -m "build(admin): add Vite config reproducing WP dist contract"
```

---

### Task 3: App bootstrap — main.js, router, vpress plugin, LogRocket util

**Files:**
- Modify: `admin/src/main.js`, `admin/src/plugins/index.js`, `admin/src/plugins/vueRouter.js`, `admin/src/plugins/vpress.js`, `admin/src/vpress/install.js`, `admin/src/router.js`, `admin/src/utils/LogRocket.js`, `admin/src/utils/axios.js`
- Delete: `admin/src/plugins/vueTour.js`, `admin/src/plugins/vuex.js`

**Interfaces:**
- Consumes: `createVuetifyInstance` from Task 4's `plugins/vuetify.js` (named `vuetify` default export), `pinia` from Task 5's `store/index.js`.
- Produces: app boots via `createApp`; `this.$vpress` still available in every component.

- [ ] **Step 1: Rewrite `admin/src/main.js`:**

```js
import { createApp } from 'vue';
import App from './App.vue';
import './utils/LogRocket.js';
import { pinia } from './store/index.js';
import vuetify from './plugins/vuetify.js';
import useRouter from './plugins/vueRouter.js';
import vpressPlugin from './plugins/vpress.js';

document.addEventListener('DOMContentLoaded', () => {
  const [id, router] = useRouter();
  const app = createApp(App);
  app.use(pinia);
  app.use(router);
  app.use(vuetify);
  app.use(vpressPlugin);
  app.mount(`#${id}`);
});
```

- [ ] **Step 2: Rewrite `admin/src/plugins/vueRouter.js`:**

```js
import { createRouter, createWebHashHistory } from 'vue-router';
import { privateRouter, publicRouter } from '../router.js';

const routerProvider = (context) => {
  const routers = {
    app: privateRouter,
    front: publicRouter
  };
  return createRouter({
    history: createWebHashHistory(),
    routes: routers[context].routes
  });
};

export default () => {
  if (document.getElementById('app')) {
    return ['app', routerProvider('app')];
  } else if (document.getElementById('front')) {
    return ['front', routerProvider('front')];
  } else {
    throw new Error('App root element is missing in DOM');
  }
};
```

- [ ] **Step 3: Update `admin/src/router.js` route syntax** — vue-router 4 changes only:
  - Replace both `path: '*'` entries with `path: '/:pathMatch(.*)*'`.
  - The `/data` children use `component: null` (renders nothing in VR3). Replace each `null` with the stub `EmptyView` and make child paths relative:

```js
const EmptyView = { render: () => null };
// inside /data children:
children: [
  { path: '', component: EmptyView },
  { path: 'upload', component: EmptyView },
  { path: 'paste', component: EmptyView },
  { path: 'api', component: EmptyView },
]
```
  - Root `children: [{ path: '/', ... }]` → `children: [{ path: '', component: VpressChartList }, { path: 'datasets', component: VpressDatasetList }]`.

- [ ] **Step 4: Rewrite `admin/src/plugins/vpress.js` + `admin/src/vpress/install.js`:**

`plugins/vpress.js`:
```js
import Vpress from '../vpress/index.js';
export default Vpress;
```

`vpress/install.js` (Vue 3 plugin signature; keep the per-component `$vpress` bag):
```js
const install = function (app) {
  if (install.installed) return;
  install.installed = true;
  app.mixin({
    beforeCreate() {
      this.$vpress = {};
    }
  });
};

export default install;
```
(Check `vpress/index.js` — if it spreads `install` into an object with the command helpers, keep that shape; only the `install` signature changes from `(Vue)` to `(app)`.)

- [ ] **Step 5: Update `admin/src/plugins/index.js`:**

```js
export { default as vuetify } from './vuetify.js';
export { default as vpress } from './vpress.js';
export { default as useRouter } from './vueRouter.js';
```

- [ ] **Step 6: Delete dead plugin files**

```bash
git rm admin/src/plugins/vueTour.js admin/src/plugins/vuex.js
```

- [ ] **Step 7: Env-var swap** — in `admin/src/utils/axios.js` replace `process.env.VUE_APP_API_URI || '/'` with `import.meta.env.VITE_API_URI || '/'`. In `admin/src/utils/LogRocket.js` replace `process.env.NODE_ENV === 'production'` with `import.meta.env.PROD`. Sweep for stragglers:

```bash
grep -rn "process.env" admin/src   # expected: no hits after the two edits
```

- [ ] **Step 8: Commit**

```bash
git add -A admin/src
git commit -m "refactor(admin): Vue 3 bootstrap - createApp, vue-router 4, plugin rewrites"
```

---

### Task 4: Vuetify 3 plugin + theme

**Files:**
- Modify: `admin/src/plugins/vuetify.js`
- Read first: `admin/src/assets/vpress.theme.json` (theme shape feeds the mapping)

**Interfaces:**
- Produces: default export consumable by `app.use(vuetify)` in Task 3's main.js.

- [ ] **Step 1: Rewrite `admin/src/plugins/vuetify.js`:**

```js
import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import '@mdi/font/css/materialdesignicons.css';
import vpressConfig from '../assets/vpress.theme.json';

// Vuetify 2 theme shape: { themes: { light: { primary: '#...' } } }
// Vuetify 3 theme shape: { themes: { light: { colors: { primary: '#...' } } } }
const themes = Object.fromEntries(
  Object.entries(vpressConfig.themes).map(([name, colors]) => [
    name,
    { colors }
  ])
);

// Movable-dialog behavior (ported from Vuetify 2 version; overlay selectors updated)
(function () {
  const d = {};
  document.addEventListener('mousedown', (e) => {
    const closestDialog = e.target.closest('.v-overlay--active .v-overlay__content');
    if (e.button === 0 && closestDialog != null && e.target.closest('.v-card-title')) {
      d.el = closestDialog;
      d.mouseStartX = e.clientX;
      d.mouseStartY = e.clientY;
      d.elStartX = d.el.getBoundingClientRect().left;
      d.elStartY = d.el.getBoundingClientRect().top;
      d.el.style.position = 'fixed';
      d.el.style.margin = 0;
      d.oldTransition = d.el.style.transition;
      d.el.style.transition = 'none';
    }
  });
  document.addEventListener('mousemove', (e) => {
    if (d.el === undefined) return;
    d.el.style.left =
      Math.min(
        Math.max(d.elStartX + e.clientX - d.mouseStartX, 0),
        window.innerWidth - d.el.getBoundingClientRect().width
      ) + 'px';
    d.el.style.top =
      Math.min(
        Math.max(d.elStartY + e.clientY - d.mouseStartY, 0),
        window.innerHeight - d.el.getBoundingClientRect().height
      ) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (d.el === undefined) return;
    d.el.style.transition = d.oldTransition;
    d.el = undefined;
  });
})();

export default createVuetify({
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
  theme: { themes }
});
```

Note: the old 100 ms `setInterval` bounds-checker is intentionally dropped — it polled the DOM forever for a rare edge case; the drag handler already clamps to the viewport. If a theme key in `vpress.theme.json` carries non-color entries (e.g. `dark: true` flags), hoist those out of `colors` per Vuetify 3's `{ dark, colors }` shape when reading the actual file.

- [ ] **Step 2: Commit**

```bash
git add admin/src/plugins/vuetify.js
git commit -m "refactor(admin): Vuetify 3 plugin with theme mapping + ported movable dialogs"
```

---

### Task 5: Pinia stores

**Files:**
- Create: `admin/src/store/index.js`, `admin/src/store/logrocketPlugin.js`, `admin/src/store/workspace.js`, `admin/src/store/notifications.js`, `admin/src/store/editor.js`
- Delete: `admin/src/store/store.js`, `admin/src/store/modules/` (whole dir)
- Test: `admin/tests/unit/notifications.spec.js` (written in Task 9 — build-green is this task's gate)

**Interfaces:**
- Produces: `pinia` instance (default export of `store/index.js`), `useWorkspaceStore`, `useNotificationsStore`, `useEditorStore`. **State/getter/action names are preserved verbatim from the Vuex modules** with two exceptions: (1) mutations disappear (logic folded into actions/direct assignment); (2) Vuex getter key `'groupBy.slug'` (dot in name) becomes `groupBySlug` — its one call site (`vpress-viz-buttons.vue:116`) is updated in Task 6.

- [ ] **Step 1: Create `admin/src/store/index.js`:**

```js
import { createPinia } from 'pinia';
import { logrocketPlugin } from './logrocketPlugin.js';

export const pinia = createPinia();
pinia.use(logrocketPlugin);

export { useWorkspaceStore } from './workspace.js';
export { useNotificationsStore } from './notifications.js';
export { useEditorStore } from './editor.js';
```

- [ ] **Step 2: Create `admin/src/store/logrocketPlugin.js`** (replaces logrocket-vuex):

```js
import LogRocket from 'logrocket';

export function logrocketPlugin({ store }) {
  store.$onAction(({ name, args }) => {
    LogRocket.log(`pinia action ${store.$id}/${name}`, args);
  });
  store.$subscribe((mutation, state) => {
    LogRocket.log(`pinia state ${store.$id}`, { type: mutation.type, state });
  });
}
```

- [ ] **Step 3: Create `admin/src/store/notifications.js`** (full conversion — the worked example):

```js
import { defineStore } from 'pinia';

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    text: 'Hello world!',
    show: false,
    color: 'success',
    timeout: 3000
  }),
  actions: {
    open(payload) {
      this.text = payload.text;
      this.color = payload.color ? payload.color : 'primary';
      this.show = true;
    },
    close() {
      this.show = false;
    }
  }
});
```

- [ ] **Step 4: Create `admin/src/store/workspace.js`** — same mechanical recipe applied to `store/modules/workspace.js`:
  - `state` object → `state: () => ({ datasetMeta: {}, activeDataset: null })`
  - Mutations `ADD_DATASET_META` / `REMOVE_DATASET_META` / `SET_ACTIVE_DATASET` fold into the actions that called them (`this.datasetMeta = { [dataset.slug]: dataset }` etc. — `delete this.datasetMeta[dataset]` is fine, Pinia state is reactive Proxy).
  - Actions keep exact names `ADD_DATASET`, `REMOVE_DATASET`, `UPDATE_ACTIVE_DATASET`; `{ commit, state, dispatch }` context becomes `this`.
  - Getters keep exact names; Vuex `(state, getters)` args become `(state)` + `this`-style access. E.g.:

```js
getters: {
  activeDatasetMeta(state) {
    return state.activeDataset ? state.datasetMeta[state.activeDataset] : null;
  },
  dataType() {
    return this.activeDatasetMeta ? this.activeDatasetMeta.variables : [];
  },
  dateFormat() {
    return this.activeDatasetMeta ? this.activeDatasetMeta.dateFormat : '';
  },
  dataSetName() {
    return this.activeDatasetMeta ? this.activeDatasetMeta.name : '';
  }
}
```
  **Naming collision note:** Vuex had state `activeDataset` (slug string) AND getter `activeDataset` (resolved object) — legal in Vuex, illegal in Pinia (one namespace). Resolution: getter renames to `activeDatasetMeta`; state keeps `activeDataset`. Task 6's sweep maps `rootGetters['workspace/activeDataset']` / `$store.getters['workspace/activeDataset']` → `workspaceStore.activeDatasetMeta` (the OBJECT), and plain `state.activeDataset` stays the slug. The Vuex getter `datasetMeta: state => state.datasetMeta` is dropped — Pinia exposes state directly.

- [ ] **Step 5: Create `admin/src/store/editor.js`** — apply the same recipe to `store/modules/editor.js` (444 lines; read it in full first):
  - `state` → `state: () => ({ vizModel: {}, vizzes: {}, loadingChart: false, availableGraphs: [/* copied verbatim */] })`
  - Mutations fold: `SET_WSP_CHART_ID`, `SET_VIZZES`, `RESET_VIZZES`, `SET_LOADING_STATUS`, `ACTIVE_VIZ` become direct assignments inside the actions that committed them (`ACTIVE_VIZ` default arg `new Viz()` preserved).
  - `rootGetters['workspace/activeDataset']` → `useWorkspaceStore().activeDatasetMeta` (import at top: `import { useWorkspaceStore } from './workspace.js';`). It appears as a **default parameter value** in 6 actions — default params evaluate at call time, inside the active Pinia context, so `dataset = useWorkspaceStore().activeDatasetMeta` is valid.
  - Getters keep names: `vizzes` (still returns a function — a getter returning a parameterized closure works identically in Pinia), `viz`, `chart`, `loadingState`, `xAxis`, `yAxis`, `groupBy`, `collapseBy`, `filter`, `theme`, `chartType`, `labels`, `stackedBars`, `order`, `getAvailableCharts` — all converted from `(_, { chart })` destructuring to `this.chart` access. Exception: `'groupBy.slug'` → `groupBySlug`.
  - The `vizzes` getter's `rootGetters` 4th arg → `useWorkspaceStore().activeDatasetMeta` read inside the getter body.
- [ ] **Step 6: Delete Vuex files**

```bash
git rm admin/src/store/store.js admin/src/store/modules/editor.js admin/src/store/modules/workspace.js admin/src/store/modules/notifications.js
```

- [ ] **Step 7: Build must fail ONLY on remaining `$store` call sites** (components — Task 6). Verify store files themselves parse:

```bash
cd admin && node --input-type=module -e "import('./src/store/notifications.js').then(()=>console.log('ok'))" 2>&1 | tail -1
```
(Vitest store unit tests land in Task 9.)

- [ ] **Step 8: Commit**

```bash
git add -A admin/src/store
git commit -m "refactor(admin): convert Vuex modules to Pinia stores with LogRocket plugin"
```

---

### Task 6: Call-site sweep — `$store` → Pinia `mapStores`

**Files:**
- Modify (every file matching `grep -rl '\$store' admin/src`): `mixins/loaderMixin.js`, `mixins/editorMixin.js`, and the ~14 SFCs (`vpress-dataset-card.vue`, `vpress-data-table.vue`, `vpress-viz-buttons.vue`, `vpress-slot.vue`, `vpress-viz-toolbar.vue`, `vpress-filepond.vue`, `vpress-slot-group.vue`, `vpress-dataset-select.vue`, `vpress-variable-container.vue`, `vpress-chart-group.vue`, + any others the grep finds).

**Interfaces:**
- Consumes: `useEditorStore`, `useWorkspaceStore`, `useNotificationsStore` from `store/index.js` (Task 5).
- Produces: zero `$store` references in `admin/src`.

- [ ] **Step 1: In each file, add the Pinia Options-API bridge** (only the stores that file actually uses):

```js
import { mapStores } from 'pinia';
import { useEditorStore, useNotificationsStore, useWorkspaceStore } from '../store/index.js';

// inside component/mixin definition:
computed: {
  ...mapStores(useEditorStore, useNotificationsStore, useWorkspaceStore),
  // existing computeds…
}
```
`mapStores` exposes `this.editorStore`, `this.notificationsStore`, `this.workspaceStore`.

- [ ] **Step 2: Apply the mechanical replacement table:**

| Vuex call site | Pinia replacement |
|---|---|
| `this.$store.getters['editor/X']` | `this.editorStore.X` |
| `this.$store.getters['editor/vizzes'](slug)` | `this.editorStore.vizzes(slug)` |
| `this.$store.getters['editor/groupBy.slug']` | `this.editorStore.groupBySlug` |
| `this.$store.getters['workspace/activeDataset']` | `this.workspaceStore.activeDatasetMeta` |
| `this.$store.getters['workspace/X']` (other) | `this.workspaceStore.X` |
| `this.$store.dispatch('editor/ACTION', p)` | `this.editorStore.ACTION(p)` |
| `this.$store.dispatch('workspace/ACTION', p)` | `this.workspaceStore.ACTION(p)` |
| `this.$store.dispatch('notifications/open', p)` | `this.notificationsStore.open(p)` |
| template `$store.getters['editor/chart']` | `editorStore.chart` |

- [ ] **Step 3: Verify zero stragglers**

```bash
grep -rn '\$store' admin/src   # expected: no output
grep -rn "from 'vuex'" admin/src   # expected: no output
```

- [ ] **Step 4: Commit**

```bash
git add -A admin/src
git commit -m "refactor(admin): replace Vuex call sites with Pinia mapStores"
```

---### Task 7: Component migration sweep — Vue 3 + Vuetify 3 (31 SFCs)

**Files:**
- Modify: all of `admin/src/views/*.vue`, `admin/src/components/*.vue`, `admin/src/App.vue`, `admin/src/mixins/*.js`
- Order: `App.vue` → views (`Vpress.vue`, `ChartList.vue`, `DatasetList.vue`, `EditorModule.vue`, `DataModule.vue`, `Chart.vue`) → components (leaf-first).

**Interfaces:**
- Consumes: Task 6's store bridge (already in the files).
- Produces: `yarn build` green; every SFC compiles under `@vitejs/plugin-vue`.

Read each file before editing; apply every row of both checklists that matches.

**Vue 3 checklist (per file):**
1. `filters: { ... }` block → move functions into `methods`, rewrite template pipes: `{{ x | intFormat }}` → `{{ intFormat(x) }}`. Known sites: `vpress-dataset-card.vue` (intFormat), `vpress-chart-card.vue` (dateFormat), `EditorModule.vue` (name), `mixins/loaderMixin.js` (intFormat).
2. `::v-deep` / `/deep/` / `>>>` in styles → `:deep(selector)`.
3. `v-model` on custom components: Vue 2 default (`value`/`input`) → Vue 3 (`modelValue`/`update:modelValue`). Any component declaring `props: ['value']` + `this.$emit('input', …)` gets `modelValue` + `update:modelValue`, and parents' `v-model` keeps working. `.sync` → `v-model:propName`.
4. `$emit` events: add `emits: [...]` declarations (warning-level, do it while in the file).
5. `this.$set(obj, k, v)` / `$delete` → plain assignment/`delete` (grep found zero — verify per file anyway).
6. `v-on.native` → plain `v-on`.
7. `key` on `<template v-for>` moves onto the `<template>`.
8. Pug: `vpress-chart-container.vue` template `lang="pug"` → convert to plain HTML (drop the attribute), keeping structure identical.

**Vuetify 2 → 3 checklist (apply where the component appears):**
1. `v-list-item-content` / `v-list-item-icon` / `v-list-item-avatar` wrappers → gone; content goes directly in `v-list-item` (use `prepend`/`append` slots for icons).
2. `v-expansion-panel-header` → `v-expansion-panel-title`; `v-expansion-panel-content` → `v-expansion-panel-text`.
3. `v-data-table`: `:headers` item keys `text` → `title`; `item.slug`-style slot names `item.X` stay; slot props `{ item }` unchanged in v3 but the row object moves under `item.raw` ONLY if using `return-object`-style columns — verify against actual usage in `vpress-data-table.vue` and adjust; `:items-per-page` casing same; `footer-props` → `:items-per-page-options` on the table.
4. Activator slots: `v-slot:activator="{ on, attrs }"` + `v-bind="attrs" v-on="on"` → `v-slot:activator="{ props }"` + `v-bind="props"` (dialogs, menus, tooltips).
5. `v-dialog` remains `v-model`-driven; internal ` .v-dialog--active` classes are gone (CSS in `App.vue` steps below).
6. `v-app-bar` drops `app` prop; `v-main` unchanged.
7. Size/state props: `text` → `variant="text"`, `outlined` → `variant="outlined"`, `depressed` → `variant="flat"`, `dense` → `density="compact"`, `x-small` → `size="x-small"` on `v-btn`/`v-text-field`/etc.
8. Inputs: `v-text-field`/`v-select`/`v-combobox`/`v-checkbox` — `filled/outlined/solo` → `variant="..."`; `v-checkbox` `input-value` → `model-value` when not using v-model.
9. `v-img` `contain` prop → `cover=false` semantics (v3 default is contain-like; only touch if visual diff).
10. `@click:row` on data-table → still emitted; signature `(event, { item })` in v3 — check `vpress-data-table.vue` handlers.
11. `v-chip` `close` prop → `closable`; `@click:close` unchanged.
12. `v-tooltip` / `v-menu`: `bottom`/`top`/etc. boolean props → `location="bottom"`.

**App.vue specific:**
- Styles reference Vuetify 2 classnames — update: `.v-dialog__content` → `.v-overlay__content`; `.v-dialog.v-dialog--active .v-card__title` → `.v-overlay--active .v-card-title` (grab cursors), `.v-application` margin hack stays (classname still exists).

**Steps (repeat per group, views first then components in leaf-first order):**

- [ ] **Step 1: Convert the group's files per both checklists**
- [ ] **Step 2: Build**

```bash
cd admin && yarn build
```
Expected: compiles; template-compile errors name the exact file/line — fix before moving on.

- [ ] **Step 3: Commit the group**

```bash
git add -A admin/src && git commit -m "refactor(admin): migrate <group> to Vue 3 + Vuetify 3 APIs"
```

- [ ] **Final step: full-tree verification**

```bash
grep -rnE 'v-list-item-content|v-expansion-panel-header|v-expansion-panel-content|::v-deep|lang="pug"|filters:' admin/src
```
Expected: no output. Then `yarn build` green, and dist contract check:

```bash
ls admin/dist/js admin/dist/css
```
Expected: `app.js`, `chunk-vendors.js` under js/; `app.css` under css/.

---

### Task 8: PWA + dead-code removal, service-worker kill switch

**Files:**
- Delete: any `admin/src/registerServiceWorker*` (grep first — may already be gone), `admin/dist/service-worker.js` + `admin/dist/precache-manifest.*.js` (stale build artifacts, untracked)
- Create: `admin/public/service-worker.js` (self-destruct — Vite copies `public/` into `dist/`)

**Interfaces:**
- Produces: previously-installed service workers in users' browsers unregister themselves on next load (they poll their script URL; serving a self-destruct at the same path is the standard kill).

- [ ] **Step 1: Confirm and remove any SW registration refs**

```bash
grep -rn "serviceWorker\|register-service-worker" admin/src   # expected: no output; delete any hits
```

- [ ] **Step 2: Create `admin/public/service-worker.js`:**

```js
// Self-destructing service worker: unregisters the PWA worker shipped by the
// old Vue CLI build so stale precached assets stop being served.
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', async () => {
  await self.registration.unregister();
  const clientList = await self.clients.matchAll({ type: 'window' });
  clientList.forEach((client) => client.navigate(client.url));
});
```

- [ ] **Step 3: Build + verify it lands in dist**

```bash
cd admin && yarn build && ls dist/service-worker.js
```

- [ ] **Step 4: Commit**

```bash
git add admin/public/service-worker.js
git commit -m "chore(admin): drop PWA; ship self-destructing service worker"
```

---

### Task 9: Tests — Vitest + smoke mounts + store units

**Files:**
- Create: `admin/tests/unit/notifications.spec.js`, `admin/tests/unit/workspace.spec.js`, `admin/tests/unit/app-smoke.spec.js`
- Modify: `admin/tests/unit/dataLoader.spec.js` (port Jest → Vitest: read it; typically only `jest.mock`→`vi.mock`, `jest.fn`→`vi.fn` change)
- Delete: `admin/tests/unit/example.spec.js` (CLI scaffold)

- [ ] **Step 1: Write `admin/tests/unit/notifications.spec.js` (failing first — red):**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNotificationsStore } from '../../src/store/notifications.js';

describe('notifications store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('open() shows the message with default primary color', () => {
    const store = useNotificationsStore();
    store.open({ text: 'guardado' });
    expect(store.show).toBe(true);
    expect(store.text).toBe('guardado');
    expect(store.color).toBe('primary');
  });

  it('open() respects an explicit color', () => {
    const store = useNotificationsStore();
    store.open({ text: 'error', color: 'error' });
    expect(store.color).toBe('error');
  });

  it('close() hides the notification', () => {
    const store = useNotificationsStore();
    store.open({ text: 'x' });
    store.close();
    expect(store.show).toBe(false);
  });
});
```

- [ ] **Step 2: Run to see it pass** (store exists since Task 5 — this validates the conversion):

```bash
cd admin && yarn vitest run tests/unit/notifications.spec.js
```
Expected: 3 passing. (If the store were wrong, these fail — that's the value.)

- [ ] **Step 3: Write `admin/tests/unit/workspace.spec.js`:**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('../../src/utils/axios.js', () => ({
  default: { dataset: { data: vi.fn().mockResolvedValue({ data: { data: [] } }) } }
}));
vi.mock('../../src/utils/LogRocket.js', () => ({}));

import { useWorkspaceStore } from '../../src/store/workspace.js';

describe('workspace store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('starts with no active dataset', () => {
    const store = useWorkspaceStore();
    expect(store.activeDataset).toBe(null);
    expect(store.activeDatasetMeta).toBe(null);
  });

  it('ADD_DATASET registers meta and activeDatasetMeta resolves after activation', async () => {
    const store = useWorkspaceStore();
    const dataset = await store.ADD_DATASET({
      id: 1, name: 'Test', slug: 'test', description: '', owner_id: 1,
      permissions: 'public', source: 'csv', tag: '', rows: 0, size: 0
    });
    store.UPDATE_ACTIVE_DATASET(dataset.slug);
    expect(store.activeDatasetMeta.name).toBe('Test');
    expect(store.dataType).toEqual([]);
  });
});
```

- [ ] **Step 4: Write `admin/tests/unit/app-smoke.spec.js`** (the regression net for the whole boot path):

```js
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

vi.mock('../../src/utils/LogRocket.js', () => ({}));

import App from '../../src/App.vue';
import { privateRouter } from '../../src/router.js';

describe('app smoke', () => {
  it('mounts App with router + pinia + vuetify without throwing', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: privateRouter.routes
    });
    const vuetify = createVuetify({ components, directives });
    router.push('/');
    await router.isReady();
    const wrapper = mount(App, {
      global: { plugins: [createPinia(), router, vuetify] }
    });
    expect(wrapper.find('.v-application').exists()).toBe(true);
  });
});
```

- [ ] **Step 5: Port `dataLoader.spec.js`, delete `example.spec.js`, full run**

```bash
cd admin && yarn vitest run
```
Expected: all green. Fix real failures — they're conversion bugs, the whole point.

- [ ] **Step 6: Commit**

```bash
git add -A admin/tests && git commit -m "test(admin): Vitest suite - store units + app smoke mount"
```

---

### Task 10: PHP loader — ESM enqueue + Vite dev mode

**Files:**
- Modify: `admin/class-vpress-admin.php` (`enqueue_scripts` lines 97–141, `enqueue_styles` lines 148–199)
- Read first: wherever `$this->client` is set (grep `client` in `includes/` and the class constructor) to find the dev/prod switch.

**Interfaces:**
- Consumes: dist contract from Task 2 (`js/app.js` ESM entry that imports `js/chunk-vendors.js` itself).
- Produces: prod loads `js/app.js` as `type="module"`; dev loads the Vite dev server.

- [ ] **Step 1: In `enqueue_scripts`, replace the two prod enqueues (`_chunks` + `_app`) with one module enqueue:**

```php
if ($this->client['env'] == 'prod') {
    wp_enqueue_script(
        $this->plugin_name . '_app',
        $this->client['location'] . '/js/app.js',
        array(),
        $this->version,
        true
    );
} else {
    wp_enqueue_script(
        $this->plugin_name . '_vite_client',
        'http://localhost:5173/@vite/client',
        array(),
        null,
        true
    );
    wp_enqueue_script(
        $this->plugin_name . '_app',
        'http://localhost:5173/src/main.js',
        array(),
        null,
        true
    );
}
```
(ESM `app.js` imports `chunk-vendors.js` relatively — no separate enqueue needed.)

- [ ] **Step 2: Add the module-type filter to the same class (new method + hook it where other filters/actions are registered — check `includes/class-vpress-loader.php` wiring pattern and follow it):**

```php
public function script_type_module($tag, $handle, $src) {
    $module_handles = array(
        $this->plugin_name . '_app',
        $this->plugin_name . '_vite_client',
    );
    if (in_array($handle, $module_handles, true)) {
        $tag = '<script type="module" src="' . esc_url($src) . '"></script>';
    }
    return $tag;
}
// registered as: add_filter('script_loader_tag', array($admin, 'script_type_module'), 10, 3);
```

- [ ] **Step 3: In `enqueue_styles`, delete the two explicit `app.css` / `chunk-vendors.css` enqueues** (lines 174–185) — the `glob()` loop already enqueues every CSS in `dist/css/`, and `chunk-vendors.css` no longer exists (single `app.css`). Keep the glob loop, leaflet CDN, and Roboto font enqueues untouched.

- [ ] **Step 4: PHP lint**

```bash
php -l admin/class-vpress-admin.php
```
Expected: `No syntax errors detected`. (MAMP's php binary: `/Applications/MAMP/bin/php/php*/bin/php` if `php` isn't on PATH.)

- [ ] **Step 5: Commit**

```bash
git add admin/class-vpress-admin.php includes/
git commit -m "feat(admin): load Vite ESM bundle in prod, Vite dev server in dev"
```

---

### Task 11: Lint config, docs, changelog

**Files:**
- Replace: `admin/.eslintrc.js` → `admin/eslint.config.js` (flat config)
- Modify: `README.md` (dev-workflow section), `CHANGELOG.md` (create if missing)

- [ ] **Step 1: Create `admin/eslint.config.js`, delete `admin/.eslintrc.js`:**

```js
import pluginVue from 'eslint-plugin-vue';

export default [
  ...pluginVue.configs['flat/recommended'],
  {
    rules: {
      'vue/multi-word-component-names': 'off'
    },
    languageOptions: {
      globals: { window: 'readonly', document: 'readonly' }
    }
  },
  { ignores: ['dist/**', 'node_modules/**'] }
];
```

- [ ] **Step 2: Run `yarn lint`, fix or rule-off noise** (auto-fixables: `yarn lint --fix`). Gate: zero errors; warnings acceptable.

- [ ] **Step 3: Update `README.md`** — replace the Vue CLI dev instructions with:

````markdown
## Admin frontend (Vue 3 + Vite)

```bash
cd admin
yarn install
yarn dev        # Vite dev server on :5173 (WP dev mode loads it automatically)
yarn build      # production bundle → admin/dist/ (js/app.js + js/chunk-vendors.js + css/app.css)
yarn test:unit  # Vitest
```
````

- [ ] **Step 4: Add CHANGELOG entry** (Keep-a-Changelog style, one consolidated entry for today: Vue 3.5/Vite/Vuetify 3/Pinia migration, PWA + vue-tour removal, ESM loader, self-destructing service worker).

- [ ] **Step 5: Final full verification**

```bash
cd admin && yarn build && yarn vitest run && ls dist/js dist/css
```
Expected: build green, tests green, contract files present.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "docs: Vue 3 migration - lint flat config, README dev workflow, changelog"
```

---

### Task 12: Review pass + visual verification (best-effort overnight)

- [ ] **Step 1: Dispatch code-review subagent** (Goose seat) over `git diff pre-vue3-upgrade..HEAD` — focus: conversion mistakes (missed Vuetify renames, Pinia getter/action semantic drift, template pipe leftovers), silent failures in folded mutations.
- [ ] **Step 2: Address CONFIRMED findings; re-run build + tests.**
- [ ] **Step 3: Visual check** — if MAMP is serving WP locally, load the Vpress admin page (env=dev with `yarn dev` running, or point env=prod at the fresh dist) and screenshot the chart list + editor. If WP login/MAMP isn't reachable overnight, **flag as pending operator verification** in the debrief — per operator rule, UI is not "done" until visually verified.
- [ ] **Step 4: Update vault** — project note `[[vpress]]` (Current State, session note, decisions log entries: Vite over webpack, Pinia over Vuex 4, PWA/tour dropped), daily note, session insights. Vault commit + push.

## Self-Review (completed at write time)

- **Spec coverage:** operator decisions (Vite ✓ Task 2, Pinia ✓ Tasks 5–6, drop PWA+tour ✓ Tasks 1/3/8) all have tasks; WP contract preserved ✓ Tasks 2/10; "latest Vue" ✓ Task 1.
- **Placeholder scan:** all code blocks are real content; per-file sweeps (Tasks 6–7) carry exact mapping tables + verification greps instead of per-file rewrites (31 files can't be pre-written without reading each — the checklists + build gate are the executable spec).
- **Type consistency:** `activeDatasetMeta` rename propagated to Tasks 5 (definition), 6 (sweep table), 9 (workspace test). `groupBySlug` rename propagated to Tasks 5 and 6. `pinia` export name consistent across Tasks 3/5/9.
