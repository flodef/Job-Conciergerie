import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    environment: 'jsdom',
    pool: 'forks', // Use separate processes for better test isolation
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
