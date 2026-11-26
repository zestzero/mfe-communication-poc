import { useSyncExternalStore } from 'react';
import type { NavigationState } from '@platform/contracts';
import { useRuntime } from '../runtime/provider.js';
import { subscribeRuntime } from '../runtime/subscribe.js';

export function useNavigation(): NavigationState {
  const runtime = useRuntime();
  return useSyncExternalStore(
    (listener) => subscribeRuntime(runtime, listener),
    () => runtime.store.getState().navigation,
    () => runtime.store.getState().navigation,
  );
}
