import type { AuthState } from '@platform/contracts';
import { createMessage, emitMessage, writeAuth, type Runtime } from '../runtime/runtime.js';

export async function requestLogin(runtime: Runtime, input: { username: string; password: string }, source: string) {
  emitMessage(runtime, createMessage('auth.login.requested', source, { username: input.username }), source);
  const handler = runtime.commands.login;
  if (!handler) throw new Error('The host has not registered a login handler.');
  await handler(input);
}

export async function requestLogout(runtime: Runtime, source: string) {
  emitMessage(runtime, createMessage('auth.logout.requested', source, {}), source);
  const handler = runtime.commands.logout;
  if (!handler) throw new Error('The host has not registered a logout handler.');
  await handler();
}

export function applyAuth(runtime: Runtime, auth: AuthState, source: string) {
  writeAuth(runtime, auth);
  emitMessage(runtime, createMessage('auth.changed', source, auth), source);
}
