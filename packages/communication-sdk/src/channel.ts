import {
  isProtectedPath,
  isSafeDestination,
  type LanguageState,
  type PlatformMessage,
} from '@platform/contracts';
import { createMessage, emitMessage, readContext, rememberError, writeAuth, writeLanguage, writeNavigation, type Runtime } from './runtime';

export function publishOn(runtime: Runtime, input: unknown, source: string): PlatformMessage {
  return emitMessage(runtime, input, source);
}

export function subscribeOn(runtime: Runtime, type: string, handler: (message: PlatformMessage) => void): () => void {
  runtime.subscribers[type] = (runtime.subscribers[type] ?? 0) + 1;
  const wrapped = (message: PlatformMessage) => handler(message);
  runtime.bus.on(type, wrapped);
  return () => {
    runtime.subscribers[type] = Math.max(0, (runtime.subscribers[type] ?? 1) - 1);
    runtime.bus.off(type, wrapped);
  };
}

export async function requestLogin(runtime: Runtime, input: { username: string; password: string }, source: string) {
  const command = createMessage('auth.login.requested', source, { username: input.username });
  emitMessage(runtime, command, source);
  const handler = runtime.commands.login;
  if (!handler) {
    throw new Error('The host has not registered a login handler.');
  }
  await handler(input);
}

export async function requestLogout(runtime: Runtime, source: string) {
  const command = createMessage('auth.logout.requested', source, {});
  emitMessage(runtime, command, source);
  const handler = runtime.commands.logout;
  if (!handler) {
    throw new Error('The host has not registered a logout handler.');
  }
  await handler();
}

export async function requestLanguageChange(runtime: Runtime, locale: LanguageState['locale'], source: string) {
  const command = createMessage('language.change.requested', source, { locale });
  emitMessage(runtime, command, source);
  const handler = runtime.commands.language;
  if (!handler) {
    throw new Error('The host has not registered a language handler.');
  }
  await handler(locale);
}

export async function requestNavigation(runtime: Runtime, destination: string, source: string) {
  const command = createMessage('navigation.requested', source, { destination }, `nav-${destination}`);
  emitMessage(runtime, command, source);
  if (!isSafeDestination(destination)) {
    rememberError(runtime, source, `Rejected navigation to ${destination}`);
    return;
  }
  const snapshot = readContext(runtime);
  if (isProtectedPath(destination) && snapshot.auth.status !== 'authenticated') {
    rememberError(runtime, source, `Authentication is required for ${destination}`);
    return;
  }
  const handler = runtime.commands.navigation;
  if (!handler) {
    throw new Error('The host has not registered a navigation handler.');
  }
  await handler(destination);
}

export function applyAuth(runtime: Runtime, auth: Parameters<typeof writeAuth>[1], source: string) {
  writeAuth(runtime, auth);
  emitMessage(runtime, createMessage('auth.changed', source, auth), source);
}

export function applyLanguage(runtime: Runtime, language: Parameters<typeof writeLanguage>[1], source: string) {
  writeLanguage(runtime, language);
  emitMessage(runtime, createMessage('language.changed', source, language), source);
}

export function applyNavigation(runtime: Runtime, navigation: Parameters<typeof writeNavigation>[1], source: string) {
  const current = readContext(runtime).navigation;
  if (current.pathname === navigation.pathname && current.search === navigation.search) {
    return;
  }
  writeNavigation(runtime, navigation);
  emitMessage(runtime, createMessage('navigation.changed', source, navigation), source);
}
