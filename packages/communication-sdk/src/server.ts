import { AsyncLocalStorage } from 'node:async_hooks';
import type { PlatformContext } from '@platform/contracts';
import { createRuntime, readContext, type Runtime } from './runtime';

export { contextFromRequest } from './runtime';

const requests = new AsyncLocalStorage<Runtime>();

export function runWithRequest<T>(snapshot: PlatformContext, fn: () => T): T {
  return requests.run(createRuntime(snapshot), fn);
}

export function readRequestSnapshot(): PlatformContext {
  const runtime = requests.getStore();
  if (!runtime) {
    throw new Error('No request-scoped communication runtime.');
  }
  return readContext(runtime);
}
