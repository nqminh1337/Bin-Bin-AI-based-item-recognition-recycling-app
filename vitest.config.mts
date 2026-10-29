import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@features': r('./src/features'),
      '@components': r('./src/components'),
      '@store': r('./src/store'),
      '@services': r('./src/services'),
      '@utils': r('./src/utils'),
      '@theme': r('./src/theme'),
    },
  },
});
