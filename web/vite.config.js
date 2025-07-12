// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/shaggyhf/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        rw_matcher: 'rw_matcher.html',
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
