import { federationShared } from '@platform/debug-panel/lib';
import { createModuleFederationConfig } from '@module-federation/modern-js-v3';
import dotenv from 'dotenv';
import { createFederationRemotes } from './src/remotes/factory';
import { remoteRegistry } from './src/remotes/registry.generated';

dotenv.config();

export default createModuleFederationConfig({
  name: 'host',
  remotes: createFederationRemotes(remoteRegistry, process.env),
  shared: federationShared(true),
  dts: process.env.MF_DTS === '1',
});
