import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { AuthState, LanguageState, NavigationState, PlatformContext } from '@platform/contracts';
import { createRuntime, ensureBrowserRuntime, type Diagnostics, type Runtime } from './runtime';

const RuntimeContext = createContext<Runtime | null>(null);

export function PlatformProvider({
  snapshot,
  runtimeId,
  children,
}: {
  snapshot: PlatformContext;
  runtimeId?: string;
  children: ReactNode;
}) {
  const runtime = useMemo(() => {
    if (typeof window === 'undefined') {
      return createRuntime(snapshot, runtimeId ?? globalThis.crypto.randomUUID());
    }
    return ensureBrowserRuntime(snapshot, runtimeId);
  }, [runtimeId, snapshot]);

  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): Runtime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) {
    throw new Error('PlatformProvider is missing. Federated components must render under the host runtime.');
  }
  return runtime;
}

export function useAuth(): AuthState {
  const runtime = useRuntime();
  return useSyncExternalStore(
    (listener) => subscribeRuntime(runtime, listener),
    () => runtime.store.getState().auth,
    () => runtime.store.getState().auth,
  );
}

export function useLanguage(): LanguageState {
  const runtime = useRuntime();
  return useSyncExternalStore(
    (listener) => subscribeRuntime(runtime, listener),
    () => runtime.store.getState().language,
    () => runtime.store.getState().language,
  );
}

export function useNavigation(): NavigationState {
  const runtime = useRuntime();
  return useSyncExternalStore(
    (listener) => subscribeRuntime(runtime, listener),
    () => runtime.store.getState().navigation,
    () => runtime.store.getState().navigation,
  );
}

export function useDiagnostics(): Diagnostics {
  const runtime = useRuntime();
  return useSyncExternalStore(
    (listener) => subscribeRuntime(runtime, listener),
    () => runtime.cachedDiagnostics,
    () => runtime.cachedDiagnostics,
  );
}

function subscribeRuntime(runtime: Runtime, listener: () => void) {
  runtime.listeners.add(listener);
  const unsubscribeStore = runtime.store.subscribe(listener);
  return () => {
    runtime.listeners.delete(listener);
    unsubscribeStore();
  };
}

export type { Runtime };
