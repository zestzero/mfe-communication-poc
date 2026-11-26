import { createLazyComponent, lazyLoadComponentPlugin } from '@module-federation/modern-js-v3/data-fetch';
import { getInstance, registerShared } from '@module-federation/modern-js-v3/runtime';
import * as Contracts from '@platform/contracts';
import * as Communication from '@platform/mfe-communication';
import { useEffect, type ReactNode } from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { markRemote } from './remote-status';

const instance = getInstance();
if (!instance) {
  throw new Error('Module Federation runtime is not initialized');
}

// The server bundle does not emit shared providers into the webpack share scope.
// Register the host copies explicitly so remotes reuse this React and this SDK.
const shared = {
  react: {
    version: '19.3.1',
    scope: 'default',
    lib: () => React,
    shareConfig: { singleton: true, requiredVersion: '^19.3.1', eager: true },
  },
  'react-dom': {
    version: '19.3.1',
    scope: 'default',
    lib: () => ReactDOM,
    shareConfig: { singleton: true, requiredVersion: '^19.3.1', eager: true },
  },
  '@platform/mfe-communication': {
    version: '1.0.0',
    scope: 'default',
    lib: () => Communication,
    shareConfig: { singleton: true, requiredVersion: '^1.0.0', eager: true },
  },
  '@platform/contracts': {
    version: '1.0.0',
    scope: 'default',
    lib: () => Contracts,
    shareConfig: { singleton: true, requiredVersion: '^1.0.0', eager: true },
  },
};
registerShared(shared);
instance.registerShared(shared);
instance.registerPlugins([lazyLoadComponentPlugin()]);

function RemoteNotice({ name, detail }: { name: string; detail: string }) {
  useEffect(() => {
    markRemote(name, 'error', detail);
  }, [detail, name]);
  return (
    <div role="alert" className="rounded-xl border border-orange-300 bg-orange-50 p-4 text-orange-950" data-testid={`${name}-error`}>
      <strong>{name} failed to load.</strong>
      <span> {detail}</span>
    </div>
  );
}

function failure(name: string) {
  return ({ error }: { error?: unknown }): ReactNode => (
    <RemoteNotice name={name} detail={error instanceof Error ? error.message : 'Remote unavailable'} />
  );
}

export const ProductRemote = createLazyComponent({
  loader: () => import('product/Catalog'),
  instance,
  loading: 'Loading products…',
  export: 'Catalog',
  fallback: failure('product'),
});

export const CartViewRemote = createLazyComponent({
  loader: () => import('cart/CartView'),
  instance,
  loading: 'Loading basket…',
  export: 'CartView',
  fallback: failure('cart'),
});

export const CartControllerRemote = createLazyComponent({
  loader: () => import('cart/CartController'),
  instance,
  loading: '',
  export: 'CartController',
  fallback: failure('cart'),
});

export const ProfileRemote = createLazyComponent({
  loader: () => import('profile/ProfileView'),
  instance,
  loading: 'Loading profile…',
  export: 'ProfileView',
  fallback: failure('profile'),
});

export function RemoteReady({ name, testId, children }: { name: string; testId: string; children: ReactNode }) {
  useEffect(() => {
    if (document.querySelector(`[data-testid="${testId}"]`)) {
      markRemote(name, 'ready');
    }
  }, [name, testId]);
  return children;
}
