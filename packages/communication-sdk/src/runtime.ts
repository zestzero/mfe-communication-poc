import {
  AuthStateSchema,
  LanguageStateSchema,
  NavigationStateSchema,
  PlatformContextSchema,
  CONTRACT_VERSION,
  PlatformMessageSchema,
  anonymousContext,
  redact,
  userById,
  type AuthState,
  type LanguageState,
  type NavigationState,
  type PlatformContext,
  type PlatformMessage,
} from '@platform/contracts';
import mitt, { type Emitter } from 'mitt';
import { createStore, type StoreApi } from 'zustand/vanilla';

export interface HistoryEntry {
  id: string;
  type: string;
  version: number;
  source: string;
  timestamp: number;
  correlationId?: string;
  payload: unknown;
}

export interface ValidationErrorEntry {
  id: string;
  timestamp: number;
  source: string;
  message: string;
}

export interface Diagnostics {
  runtimeId: string;
  subscribers: Record<string, number>;
  history: HistoryEntry[];
  validationErrors: ValidationErrorEntry[];
}

type CommandHandlers = {
  login?: (input: { username: string; password: string }) => Promise<void> | void;
  logout?: () => Promise<void> | void;
  language?: (locale: LanguageState['locale']) => Promise<void> | void;
  navigation?: (destination: string) => Promise<void> | void;
};

export interface Runtime {
  id: string;
  store: StoreApi<PlatformContext>;
  bus: Emitter<Record<string, PlatformMessage>>;
  subscribers: Record<string, number>;
  history: HistoryEntry[];
  validationErrors: ValidationErrorEntry[];
  commands: CommandHandlers;
  listeners: Set<() => void>;
  cachedDiagnostics: Diagnostics;
}

export function createRuntime(snapshot: PlatformContext, id: string = globalThis.crypto.randomUUID()): Runtime {
  return {
    id,
    store: createStore<PlatformContext>(() => PlatformContextSchema.parse(snapshot)),
    bus: mitt<Record<string, PlatformMessage>>(),
    subscribers: {},
    history: [],
    validationErrors: [],
    commands: {},
    listeners: new Set(),
    cachedDiagnostics: {
      runtimeId: id,
      subscribers: {},
      history: [],
      validationErrors: [],
    },
  };
}

export function diagnosticsOf(runtime: Runtime): Diagnostics {
  return {
    runtimeId: runtime.id,
    subscribers: { ...runtime.subscribers },
    history: runtime.history.map((entry) => ({ ...entry })),
    validationErrors: runtime.validationErrors.map((entry) => ({ ...entry })),
  };
}

function notify(runtime: Runtime) {
  runtime.cachedDiagnostics = diagnosticsOf(runtime);
  for (const listener of runtime.listeners) {
    listener();
  }
}

export function remember(runtime: Runtime, message: PlatformMessage) {
  runtime.history = [
    ...runtime.history,
    {
      id: message.id,
      type: message.type,
      version: message.version,
      source: message.source,
      timestamp: message.timestamp,
      correlationId: message.correlationId,
      payload: redact(message.payload),
    },
  ].slice(-40);
  notify(runtime);
}

export function rememberError(runtime: Runtime, source: string, message: string) {
  runtime.validationErrors = [
    ...runtime.validationErrors,
    { id: globalThis.crypto.randomUUID(), timestamp: Date.now(), source, message },
  ].slice(-20);
  notify(runtime);
}

export function emitMessage(runtime: Runtime, input: unknown, source: string): PlatformMessage {
  const parsed = PlatformMessageSchema.safeParse(input);
  if (!parsed.success) {
    rememberError(runtime, source, parsed.error.issues.map((issue) => issue.message).join('; '));
    throw parsed.error;
  }
  remember(runtime, parsed.data);
  runtime.bus.emit(parsed.data.type, parsed.data);
  return parsed.data;
}

export function createMessage(
  type: PlatformMessage['type'],
  source: string,
  payload: unknown,
  correlationId?: string,
): PlatformMessage {
  return PlatformMessageSchema.parse({
    id: globalThis.crypto.randomUUID(),
    type,
    version: CONTRACT_VERSION,
    source,
    timestamp: Date.now(),
    correlationId,
    payload,
  });
}

export function readContext(runtime: Runtime): PlatformContext {
  const state = runtime.store.getState();
  return PlatformContextSchema.parse(state);
}

export function writeAuth(runtime: Runtime, auth: AuthState) {
  runtime.store.setState({ ...runtime.store.getState(), auth: AuthStateSchema.parse(auth) });
  notify(runtime);
}

export function writeLanguage(runtime: Runtime, language: LanguageState) {
  runtime.store.setState({
    ...runtime.store.getState(),
    language: LanguageStateSchema.parse(language),
  });
  notify(runtime);
}

export function writeNavigation(runtime: Runtime, navigation: NavigationState) {
  runtime.store.setState({
    ...runtime.store.getState(),
    navigation: NavigationStateSchema.parse(navigation),
  });
  notify(runtime);
}

let browserRuntime: Runtime | null = null;

export function ensureBrowserRuntime(snapshot: PlatformContext, id?: string): Runtime {
  if (!browserRuntime) {
    browserRuntime = createRuntime(snapshot, id ?? globalThis.crypto.randomUUID());
  }
  return browserRuntime;
}

export function resetBrowserRuntime() {
  browserRuntime = null;
}

export function contextFromRequest(request: Request): PlatformContext {
  const url = new URL(request.url);
  const cookies = parseCookie(request.headers.get('cookie') ?? '');
  const locale = cookies.platform_locale === 'th' ? 'th' : 'en';
  const user = cookies.platform_session ? userById(cookies.platform_session) : null;
  return PlatformContextSchema.parse({
    auth: user ? { status: 'authenticated', user } : { status: 'anonymous', user: null },
    language: { locale },
    navigation: { pathname: url.pathname || '/', search: url.search },
  });
}

function parseCookie(header: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;
    cookies[decodeURIComponent(trimmed.slice(0, index))] = decodeURIComponent(trimmed.slice(index + 1));
  }
  return cookies;
}

export { anonymousContext };
