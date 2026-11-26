import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@platform/contracts': path.resolve(root, '../contracts/src/index.ts'),
      '@platform/debug-panel/lib': path.resolve(root, '../platform/src/lib/index.ts'),
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
