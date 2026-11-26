import { useSyncExternalStore } from 'react';
import type { AuthState } from '@platform/contracts';
import { useRuntime } from '../runtime/provider.js';
import { subscribeRuntime } from '../runtime/subscribe.js';

export function useAuth(): AuthState {
  const runtime = useRuntime();
  return useSyncExternalStore(
    (listener) => subscribeRuntime(runtime, listener),
    () => runtime.store.getState().auth,
    () => runtime.store.getState().auth,
  );
}
