import { appTools, defineConfig } from '@modern-js/app-tools';
import { moduleFederationPlugin } from '@module-federation/modern-js-v3';

export default defineConfig({
  html: { title: 'Northwind Atelier' },
  server: {
    port: Number(process.env.PORT ?? 3000),
    ssr: { mode: 'stream' },
    tsconfigPath: './server/tsconfig.json',
  },
  plugins: [appTools(), moduleFederationPlugin()],
});
