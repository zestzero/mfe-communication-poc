import { appTools, defineConfig } from '@modern-js/app-tools';
import { moduleFederationPlugin } from '@module-federation/modern-js-v3';

export default defineConfig({
  html: {
    title: 'Northwind Atelier',
  },
  server: {
    port: 3000,
    ssr: {
      mode: 'stream',
    },
  },
  plugins: [appTools(), moduleFederationPlugin()],
});
