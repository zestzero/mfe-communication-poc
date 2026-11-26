import { createRequire } from 'node:module';
import { appTools, defineConfig } from '@modern-js/app-tools';
import { moduleFederationPlugin } from '@module-federation/modern-js-v3';

const require = createRequire(import.meta.url);

export default defineConfig({
  html: { title: 'Northwind Atelier' },
  source: {
    // Host imports DebugPanel (SDK peer) and the SDK imports @platform/debug-panel/lib.
    // Pin the helpers entry to its file so Module Federation DEV does not merge that
    // import into the React panel package graph.
    alias: {
      '@platform/debug-panel/lib': require.resolve('@platform/debug-panel/lib'),
    },
  },
  server: {
    port: Number(process.env.PORT ?? 3000),
    ssr: { mode: 'stream' },
    tsconfigPath: './server/tsconfig.json',
  },
  plugins: [appTools(), moduleFederationPlugin()],
});
