import { existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { realpathSync } from 'node:fs';
import process from 'node:process';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import vue from '@vitejs/plugin-vue';
import assertEntryCss from './vite/assert-entry-css.js';
import cssPerEntry from './vite/css-per-entry.js';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

// The leaflet @dboxjs/core was actually running against: its own nested copy
// (1.9.x) when installed that way, else the hoisted one.
const leafletDir = existsSync(here('./node_modules/@dboxjs/core/node_modules/leaflet/package.json'))
  ? here('./node_modules/@dboxjs/core/node_modules/leaflet')
  : here('./node_modules/leaflet');

// Package name from the LAST node_modules segment (nested deps count as themselves).
const packageOf = (id) => {
  const match = id.match(/.*[\\/]node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/);
  return match ? match[1].replace('\\', '/') : null;
};

export default defineConfig(({ mode }) => ({
  // Relative base: the bundle resolves its fonts/images from its own URL, so
  // it works whatever folder the plugin is installed under. The old absolute
  // '/wp-content/plugins/vpress/admin/dist/' 404'd every non-inlined asset
  // (MDI icon font, btn-beta.png, db-gear.svg, map.svg…) on any install not
  // named exactly "vpress" — e.g. this repo's own vpress-wp-plugin checkout.
  base: mode === 'production' ? './' : '/',
  plugins: [vue(), cssPerEntry(), assertEntryCss()],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // @dboxjs/core's package.json "module" points to a dist/dbox.mjs that
      // was never published — resolve straight to the real UMD build.
      {
        find: '@dboxjs/core',
        replacement: fileURLToPath(
          new URL('./node_modules/@dboxjs/core/dist/dbox.js', import.meta.url)
        )
      },
      // dbox require()s the bare `leaflet` at load time; hand it a bridge
      // object instead so leaflet itself is only downloaded for map charts.
      {
        find: /^leaflet$/,
        replacement: here('./src/utils/leaflet-bridge.cjs')
      },
      // The real leaflet, for src/utils/lazyLeaflet.js's dynamic import().
      { find: /^vpress-leaflet\/(.*)$/, replacement: `${leafletDir}/$1` }
    ]
  },
  server: {
    // 5173-5175 collide with other local dev servers; strictPort keeps the
    // WP loader's probe (includes/class-vpress.php) and this server in lockstep.
    port: 5180,
    strictPort: true,
    cors: true,
    origin: 'http://localhost:5180',
    // Git worktrees symlink admin/node_modules to the main checkout; Vite's
    // default fs.allow stops at the worktree root and 403s /@fs/ requests
    // into the real node_modules (e.g. the MDI icon font) — allow it.
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        realpathSync(fileURLToPath(new URL('./node_modules', import.meta.url)))
      ]
    },
    // Standalone dev (opening :5180 directly) proxies REST calls to MAMP's WP.
    proxy: {
      '/wp-json': 'http://localhost:8888'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: true,
    commonjsOptions: {
      include: [/node_modules/, /leaflet-bridge\.cjs$/]
    },
    rollupOptions: {
      input: {
        // Name the entries so the bundles land at js/app.js and js/embed.js
        // (WP enqueue contract).
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        embed: fileURLToPath(new URL('./src/embed.js', import.meta.url))
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.names?.[0] ?? '';
          if (name.endsWith('.css')) return 'css/[name][extname]';
          if (/\.(woff2?|ttf|eot)$/.test(name)) return 'fonts/[name][extname]';
          if (/\.(png|jpe?g|gif|svg|webp)$/.test(name)) return 'img/[name][extname]';
          return '[name][extname]';
        },
        // Split so the public embed (js/embed.js) never downloads admin-only
        // code: Vuetify/MDI, pinia/vue-router, LogRocket, filepond, axios…
        manualChunks(id) {
          // Rollup's shared CommonJS interop helpers would otherwise be absorbed
          // into chunk-vendors, dragging it into every chunk that wraps CJS.
          // chunk-vue is loaded by both entries anyway.
          if (id === '\0commonjsHelpers.js') return 'chunk-vue';
          const pkg = packageOf(id);
          if (!pkg) return undefined;
          if (pkg === 'vuetify' || pkg.startsWith('@mdi/')) return 'chunk-vuetify';
          if (pkg === 'leaflet') return 'chunk-leaflet';
          if (
            pkg === 'd3' || pkg.startsWith('d3-') || pkg.startsWith('@dboxjs/') ||
            pkg === 'dboxjs' || pkg === 'topojson' || pkg.startsWith('topojson-') ||
            // lodash is a hard dependency of @dboxjs/core and the chart container.
            pkg === 'lodash'
          ) return 'chunk-viz';
          if (pkg === 'vue' || pkg.startsWith('@vue/')) return 'chunk-vue';
          // pinia/vue-router are admin-only: kept out of chunk-vue so the
          // embed's Vue chunk does not carry them.
          if (pkg === 'pinia' || pkg === 'vue-router') return 'chunk-vue-app';
          return 'chunk-vendors';
        }
      }
    }
  },
  experimental: {
    // URLs written into JS (lazy-chunk preload lists, imported images) are
    // resolved relative to the importing chunk, so they work whatever folder
    // the plugin is installed in. CSS URLs still follow `base`.
    renderBuiltUrl(filename, { hostType }) {
      return hostType === 'js' ? { relative: true } : undefined;
    }
  },
  test: {
    // tests/e2e holds Playwright specs (yarn test:e2e), not Vitest suites.
    include: ['tests/unit/**/*.spec.js'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.js'],
    server: { deps: { inline: ['vuetify'] } }
  }
}));
