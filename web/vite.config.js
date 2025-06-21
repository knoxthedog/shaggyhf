// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/shaggyhf/',
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
