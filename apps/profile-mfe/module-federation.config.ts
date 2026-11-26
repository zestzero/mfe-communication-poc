import { federationShared } from '@platform/debug-panel/lib';
import { createModuleFederationConfig } from '@module-federation/modern-js-v3';

export default createModuleFederationConfig({
  name: 'profile',
  filename: 'static/remoteEntry.js',
  manifest: { filePath: 'static' },
  exposes: {
    './ProfileView': './src/ProfileView.tsx'
  },
  shared: federationShared(false),
  dts: false,
});
