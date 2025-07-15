// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        rw_matcher: 'rw_matcher.html',
        rw_payroll: 'rw_payroll.html',
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
