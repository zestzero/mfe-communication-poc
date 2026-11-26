import {
  appPaths,
  protectedPaths,
  publicUsers,
  sharedModuleVersions,
  type AppPath,
  type Locale,
  type User,
} from '@platform/contracts';

export function federationShared(eager: boolean) {
  return {
    react: { singleton: true as const, requiredVersion: sharedModuleVersions.react, eager },
    'react-dom': { singleton: true as const, requiredVersion: sharedModuleVersions.reactDom, eager },
    '@platform/mfe-communication': {
      singleton: true as const,
      requiredVersion: sharedModuleVersions.communication,
      eager,
    },
    '@platform/contracts': {
      singleton: true as const,
      requiredVersion: sharedModuleVersions.contracts,
      eager,
    },
  };
}

export function isAppPath(value: string): value is AppPath {
  return (appPaths as readonly string[]).includes(value);
}

export function isProtectedPath(pathname: string): boolean {
  return (protectedPaths as readonly string[]).includes(pathname);
}

export function isSafeDestination(destination: string): destination is AppPath {
  if (!destination.startsWith('/') || destination.startsWith('//') || destination.includes('://')) {
    return false;
  }
  const pathname = destination.split('?')[0] ?? '';
  return isAppPath(pathname);
}

const sensitiveKeys = new Set(['password', 'token', 'accessToken', 'refreshToken', 'secret', 'cookie', 'session']);

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = sensitiveKeys.has(key) ? '[redacted]' : redact(item);
  }
  return output;
}

export function formatPrice(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function userById(id: string): User | null {
  return publicUsers.find((user) => user.id === id) ?? null;
}
