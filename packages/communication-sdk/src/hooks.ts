import type { LanguageState } from '@platform/contracts';
import { requestLanguageChange } from './language/commands.js';
import { requestLogin, requestLogout, applyAuth } from './auth/commands.js';
import { applyLanguage } from './language/commands.js';
import { applyNavigation, requestNavigation } from './navigation/commands.js';
import { useRuntime } from './runtime/provider.js';

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
