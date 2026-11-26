import {
  createLazyComponent,
  ERROR_TYPE,
  lazyLoadComponentPlugin,
} from '@module-federation/modern-js-v3/data-fetch';
import { getInstance } from '@module-federation/modern-js-v3/runtime';
import type { ReactNode } from 'react';
import { loadingCopy } from './copy';

const instance = getInstance();

if (!instance) {
  throw new Error('Module Federation runtime is not initialized');
}

instance.registerPlugins([lazyLoadComponentPlugin()]);

function failure(label: string, testId: string) {
  return ({
    error,
    errorType,
  }: {
    error?: unknown;
    errorType?: number;
  }): ReactNode => (
    <div role="alert" className="remote-error" data-testid={testId}>
      <strong>{label} failed to load.</strong>
      <span>
        {errorType === ERROR_TYPE.LOAD_REMOTE
          ? ' The remote dev server is not reachable.'
          : ' The remote returned an unexpected error.'}
      </span>
      {error instanceof Error ? <span> {error.message}</span> : null}
    </div>
  );
}

export const ProductRemote = createLazyComponent({
  loader: () => import('product/ProductPanel'),
  instance,
  loading: loadingCopy.product,
  export: 'ProductPanel',
  // Rsbuild remotes emit a browser global remoteEntry and no ssrRemoteEntry.
  // Loading that file in Node throws "self is not defined", so the host
  // stream-renders the shell and hydrates these panels in the browser.
  noSSR: true,
  fallback: failure('Product microfrontend', 'mfe-product-error'),
});

export const CartRemote = createLazyComponent({
  loader: () => import('cart/CartPanel'),
  instance,
  loading: loadingCopy.cart,
  export: 'CartPanel',
  noSSR: true,
  fallback: failure('Cart microfrontend', 'mfe-cart-error'),
});

export const ProfileRemote = createLazyComponent({
  loader: () => import('profile/ProfilePanel'),
  instance,
  loading: loadingCopy.profile,
  export: 'ProfilePanel',
  noSSR: true,
  fallback: failure('Profile microfrontend', 'mfe-profile-error'),
});
