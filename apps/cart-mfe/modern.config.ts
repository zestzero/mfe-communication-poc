import { appTools, defineConfig } from '@modern-js/app-tools';
import { moduleFederationPlugin } from '@module-federation/modern-js-v3';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT ?? '3002';
const origin = (process.env.PUBLIC_ORIGIN ?? `http://127.0.0.1:${port}`).replace(/\/$/, '');

export default defineConfig({
  output: { assetPrefix: `${origin}/` },
  server: {
    port: Number(port),
    ssr: { mode: 'stream' },
    tsconfigPath: './server/tsconfig.json',
  },
  plugins: [appTools(), moduleFederationPlugin()],
});
