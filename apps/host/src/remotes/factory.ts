import type { ComponentType } from 'react';
import type { RemoteDefinition } from './registry.generated';

export function createFederationRemotes(registry: readonly RemoteDefinition[], env: Record<string, string | undefined>) {
  const remotes: Record<string, string> = {};
  for (const remote of registry) {
    const entry = env[remote.env];
    if (!entry) {
      throw new Error(`${remote.env} must point at the remote mf-manifest.json URL`);
    }
    remotes[remote.name] = `${remote.name}@${entry}`;
  }
  return remotes;
}

type RemoteFactoryOptions = {
  loader: () => Promise<unknown>;
  instance: unknown;
  loading: string;
  exportName: string;
  name: string;
};

export function createRemoteComponents(
  registry: readonly RemoteDefinition[],
  loaders: Record<string, () => Promise<unknown>>,
  instance: unknown,
  create: (options: RemoteFactoryOptions) => ComponentType,
) {
  const components: Record<string, ComponentType> = {};
  const persistent: ComponentType[] = [];
  for (const remote of registry) {
    for (const expose of [...remote.exposes, ...remote.persistent]) {
      const id = `${remote.name}/${expose.export}`;
      const loader = loaders[id];
      if (!loader) throw new Error(`Missing static loader for ${id}`);
      const component = create({
        loader,
        instance,
        loading: expose.loading,
        exportName: expose.export,
        name: remote.name,
      });
      if (remote.persistent.some((item) => item.export === expose.export)) persistent.push(component);
      else components[id] = component;
    }
  }
  return { components, persistent };
}
