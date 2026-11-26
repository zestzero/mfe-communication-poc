import { useSyncExternalStore } from 'react';
import type { LanguageState } from '@platform/contracts';
import { useRuntime } from '../runtime/provider.js';
import { subscribeRuntime } from '../runtime/subscribe.js';

export function useLanguage(): LanguageState {
  const runtime = useRuntime();
  return useSyncExternalStore(
    (listener) => subscribeRuntime(runtime, listener),
    () => runtime.store.getState().language,
    () => runtime.store.getState().language,
  );
}
