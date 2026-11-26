import { createLazyComponent, lazyLoadComponentPlugin } from '@module-federation/modern-js-v3/data-fetch';
import { getInstance, registerShared } from '@module-federation/modern-js-v3/runtime';
import * as Contracts from '@platform/contracts';
import * as Communication from '@platform/mfe-communication';
import { useEffect, type ComponentType, type ReactNode } from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { markRemote } from './remote-status';
import { createRemoteComponents } from './remotes/factory';
import { remoteLoaders } from './remotes/imports.generated';
import { remoteRegistry } from './remotes/registry.generated';

const instance = getInstance();
if (!instance) {
  throw new Error('Module Federation runtime is not initialized');
}

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

const lazy = createLazyComponent as (options: {
  loader: () => Promise<unknown>;
  instance: typeof instance;
  loading: string;
  export: string;
  fallback: (props: { error?: unknown }) => ReactNode;
}) => ComponentType;

const created = createRemoteComponents(remoteRegistry, remoteLoaders, instance, (options) =>
  lazy({
    loader: options.loader,
    instance,
    loading: options.loading,
    export: options.exportName,
    fallback: failure(options.name),
  }),
);

export const remoteComponents = created.components;
export const persistentRemotes = created.persistent;

export function RemoteView({ id }: { id: string }) {
  const Remote = remoteComponents[id] as ComponentType | undefined;
  if (!Remote) throw new Error(`Remote ${id} is not in the registry`);
  return <Remote />;
}

export function RemoteReady({ name, testId, children }: { name: string; testId: string; children: ReactNode }) {
  useEffect(() => {
    if (document.querySelector(`[data-testid="${testId}"]`)) markRemote(name, 'ready');
  }, [name, testId]);
  return children;
}
