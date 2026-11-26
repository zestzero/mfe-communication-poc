import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

const origin = 'http://127.0.0.1:3003';

export default defineConfig({
  server: {
    port: 3003,
    host: '0.0.0.0',
    cors: {
      origin: '*',
    },
  },
  dev: {
    assetPrefix: origin,
  },
  output: {
    assetPrefix: `${origin}/`,
  },
  source: {
    entry: {
      index: './src/index.tsx',
    },
  },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'profile',
      filename: 'remoteEntry.js',
      exposes: {
        './ProfilePanel': './src/ProfilePanel.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        '@mfe/communication-sdk': { singleton: true, requiredVersion: false },
      },
      dts: false,
    }),
  ],
});
