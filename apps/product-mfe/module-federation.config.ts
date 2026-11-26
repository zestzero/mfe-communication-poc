import { federationShared } from '@platform/contracts';
import { createModuleFederationConfig } from '@module-federation/modern-js-v3';

export default createModuleFederationConfig({
  name: 'product',
  filename: 'static/remoteEntry.js',
  manifest: { filePath: 'static' },
  exposes: {
    './Catalog': './src/Catalog.tsx'
  },
  shared: federationShared(false),
  dts: false,
});
