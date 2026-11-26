import { federationShared } from '@platform/contracts';
import { createModuleFederationConfig } from '@module-federation/modern-js-v3';

export default createModuleFederationConfig({
  name: 'cart',
  filename: 'static/remoteEntry.js',
  manifest: { filePath: 'static' },
  exposes: {
    './CartView': './src/CartView.tsx',
    './CartController': './src/CartController.tsx'
  },
  shared: federationShared(false),
  dts: false,
});
