import type { LanguageState } from '@platform/contracts';
import { createMessage, emitMessage, writeLanguage, type Runtime } from '../runtime/runtime.js';

export async function requestLanguageChange(runtime: Runtime, locale: LanguageState['locale'], source: string) {
  emitMessage(runtime, createMessage('language.change.requested', source, { locale }), source);
  const handler = runtime.commands.language;
  if (!handler) throw new Error('The host has not registered a language handler.');
  await handler(locale);
}

export function applyLanguage(runtime: Runtime, language: LanguageState, source: string) {
  writeLanguage(runtime, language);
  emitMessage(runtime, createMessage('language.changed', source, language), source);
}
