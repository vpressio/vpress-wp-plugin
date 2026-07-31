import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/wp-content/plugins/vpress/admin/dist/' : '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
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
