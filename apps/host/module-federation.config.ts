import { createModuleFederationConfig } from '@module-federation/modern-js-v3';

export default createModuleFederationConfig({
  name: 'host',
  remotes: {
    product: 'product@http://127.0.0.1:3001/mf-manifest.json',
    cart: 'cart@http://127.0.0.1:3002/mf-manifest.json',
    profile: 'profile@http://127.0.0.1:3003/mf-manifest.json',
  },
  shared: {
    react: { singleton: true, eager: true },
    'react-dom': { singleton: true, eager: true },
    '@mfe/communication-sdk': { singleton: true, eager: true, requiredVersion: false },
  },
  dts: false,
});
