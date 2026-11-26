import { isProtectedPath, isSafeDestination } from '@platform/debug-panel/lib';
import type { NavigationState } from '@platform/contracts';
import { createMessage, emitMessage, readContext, rememberError, writeNavigation, type Runtime } from '../runtime/runtime.js';

export async function requestNavigation(runtime: Runtime, destination: string, source: string) {
  emitMessage(runtime, createMessage('navigation.requested', source, { destination }, `nav-${destination}`), source);
  if (!isSafeDestination(destination)) {
    rememberError(runtime, source, `Rejected navigation to ${destination}`);
    return;
  }
  if (isProtectedPath(destination) && readContext(runtime).auth.status !== 'authenticated') {
    rememberError(runtime, source, `Authentication is required for ${destination}`);
    return;
  }
  const handler = runtime.commands.navigation;
  if (!handler) throw new Error('The host has not registered a navigation handler.');
  await handler(destination);
}

export function applyNavigation(runtime: Runtime, navigation: NavigationState, source: string) {
  const current = readContext(runtime).navigation;
  if (current.pathname === navigation.pathname && current.search === navigation.search) return;
  writeNavigation(runtime, navigation);
  emitMessage(runtime, createMessage('navigation.changed', source, navigation), source);
}
