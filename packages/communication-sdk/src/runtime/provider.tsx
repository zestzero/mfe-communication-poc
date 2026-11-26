import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { PlatformContext } from '@platform/contracts';
import { createRuntime, ensureBrowserRuntime, type Diagnostics, type Runtime } from './runtime.js';
import { subscribeRuntime } from './subscribe.js';

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

export function useDiagnostics(): Diagnostics {
  const runtime = useRuntime();
  return useSyncExternalStore(
    (listener) => subscribeRuntime(runtime, listener),
    () => runtime.cachedDiagnostics,
    () => runtime.cachedDiagnostics,
  );
}

export type { Runtime };
