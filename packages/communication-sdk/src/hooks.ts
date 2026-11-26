import type { LanguageState } from '@platform/contracts';
import { useEffect } from 'react';
import {
  applyAuth,
  applyLanguage,
  applyNavigation,
  publishOn,
  requestLanguageChange,
  requestLogin,
  requestLogout,
  requestNavigation,
  subscribeOn,
} from './channel';
import { useRuntime } from './react';
import type { PlatformMessage } from '@platform/contracts';

export function publish(input: unknown): PlatformMessage {
  return publishOn(useRuntime(), input, 'mfe');
}

export function subscribe(type: string, handler: (message: PlatformMessage) => void): () => void {
  return subscribeOn(useRuntime(), type, handler);
}

export function usePublish(source: string) {
  const runtime = useRuntime();
  return (input: unknown) => publishOn(runtime, input, source);
}

export function useSubscription(type: string, source: string, handler: (message: PlatformMessage) => void) {
  const runtime = useRuntime();
  useEffect(() => subscribeOn(runtime, type, handler), [runtime, type, source, handler]);
}

export function useCommands(source: string) {
  const runtime = useRuntime();
  return {
    requestLogin: (input: { username: string; password: string }) => requestLogin(runtime, input, source),
    requestLogout: () => requestLogout(runtime, source),
    requestLanguageChange: (locale: LanguageState['locale']) => requestLanguageChange(runtime, locale, source),
    requestNavigation: (destination: string) => requestNavigation(runtime, destination, source),
  };
}

export function useHostBindings(source: string) {
  const runtime = useRuntime();
  return {
    applyAuth: (auth: Parameters<typeof applyAuth>[1]) => applyAuth(runtime, auth, source),
    applyLanguage: (language: Parameters<typeof applyLanguage>[1]) => applyLanguage(runtime, language, source),
    applyNavigation: (navigation: Parameters<typeof applyNavigation>[1]) => applyNavigation(runtime, navigation, source),
    register(handlers: RuntimeCommands) {
      runtime.commands = handlers;
    },
  };
}

export interface RuntimeCommands {
  login?: (input: { username: string; password: string }) => Promise<void> | void;
  logout?: () => Promise<void> | void;
  language?: (locale: LanguageState['locale']) => Promise<void> | void;
  navigation?: (destination: string) => Promise<void> | void;
}
