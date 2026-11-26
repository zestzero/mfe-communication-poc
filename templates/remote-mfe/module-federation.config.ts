import { federationShared } from '@platform/debug-panel/lib';
import { createModuleFederationConfig } from '@module-federation/modern-js-v3';

export default createModuleFederationConfig({
  name: '__NAME__',
  filename: 'static/remoteEntry.js',
  manifest: { filePath: 'static' },
  exposes: {
    './View': './src/View.tsx',
  },
  shared: federationShared(false),
  dts: false,
});
