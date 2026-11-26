import { federationShared } from '@platform/contracts';
import { createModuleFederationConfig } from '@module-federation/modern-js-v3';
import dotenv from 'dotenv';

dotenv.config();

function remote(name: string, envName: string): string {
  const entry = process.env[envName];
  if (!entry) {
    throw new Error(`${envName} must point at the remote mf-manifest.json URL`);
  }
  return `${name}@${entry}`;
}

export default createModuleFederationConfig({
  name: 'host',
  remotes: {
    product: remote('product', 'PRODUCT_REMOTE_URL'),
    cart: remote('cart', 'CART_REMOTE_URL'),
    profile: remote('profile', 'PROFILE_REMOTE_URL'),
  },
  shared: federationShared(true),
  dts: process.env.MF_DTS === '1',
});
