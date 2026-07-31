import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/wp-content/plugins/vpress/admin/dist/' : '/',
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
    origin: 'http://localhost:5180'
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
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.js'],
    server: { deps: { inline: ['vuetify'] } }
  }
}));
