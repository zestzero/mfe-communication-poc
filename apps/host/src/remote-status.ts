import { useSyncExternalStore } from 'react';
import type { RemoteStatus } from '@platform/debug-panel';

const statuses: Record<string, RemoteStatus> = {
  product: { name: 'product', state: 'loading' },
  cart: { name: 'cart', state: 'loading' },
  profile: { name: 'profile', state: 'loading' },
};
const listeners = new Set<() => void>();
let version = 0;

export function markRemote(name: string, state: RemoteStatus['state'], detail?: string) {
  statuses[name] = { name, state, detail };
  version += 1;
  for (const listener of listeners) listener();
}

export function useRemoteStatuses(): RemoteStatus[] {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
    () => version,
  );
  return Object.values(statuses);
}
