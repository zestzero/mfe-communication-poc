import type { Runtime } from './runtime.js';

export function subscribeRuntime(runtime: Runtime, listener: () => void) {
  runtime.listeners.add(listener);
  const unsubscribeStore = runtime.store.subscribe(listener);
  return () => {
    runtime.listeners.delete(listener);
    unsubscribeStore();
  };
}
