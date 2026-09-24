import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => ({
  // Relative base: the bundle resolves its fonts/images from its own URL, so
  // it works whatever folder the plugin is installed under. The old absolute
  // '/wp-content/plugins/vpress/admin/dist/' 404'd every non-inlined asset
  // (MDI icon font, btn-beta.png, db-gear.svg, map.svg…) on any install not
  // named exactly "vpress" — e.g. this repo's own vpress-wp-plugin checkout.
  base: mode === 'production' ? './' : '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // @dboxjs/core's package.json "module" points to a dist/dbox.mjs that
      // was never published — resolve straight to the real UMD build.
      '@dboxjs/core': fileURLToPath(
        new URL('./node_modules/@dboxjs/core/dist/dbox.js', import.meta.url)
      )
    }
  },
  server: {
    // 5173-5175 collide with other local dev servers; strictPort keeps the
    // WP loader's probe (includes/class-vpress.php) and this server in lockstep.
    port: 5180,
    strictPort: true,
    cors: true,
    origin: 'http://localhost:5180',
    // Standalone dev (opening :5180 directly) proxies REST calls to MAMP's WP.
    proxy: {
      '/wp-json': 'http://localhost:8888'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    rollupOptions: {
      // Name the entry "app" so the bundle lands at js/app.js (WP enqueue contract).
      input: { app: fileURLToPath(new URL('./index.html', import.meta.url)) },
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
    // tests/e2e holds Playwright specs (yarn test:e2e), not Vitest suites.
    include: ['tests/unit/**/*.spec.js'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.js'],
    server: { deps: { inline: ['vuetify'] } }
  }
}));
