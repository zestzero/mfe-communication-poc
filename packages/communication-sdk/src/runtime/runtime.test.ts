import { describe, expect, it } from 'vitest';
import { anonymousContext, publicUsers } from '@platform/contracts';
import { applyAuth } from '../auth/commands.js';
import { publishOn } from '../events/bus.js';
import { requestNavigation } from '../navigation/commands.js';
import { contextFromRequest, createRuntime, readContext } from './runtime.js';
import { readRequestSnapshot, runWithRequest } from '../server/index.js';

const mara = publicUsers[0]!;
const somchai = publicUsers[1]!;

describe('request isolation', () => {
  it('keeps two concurrent request runtimes from sharing auth or language', async () => {
    const english = {
      ...anonymousContext,
      auth: { status: 'authenticated' as const, user: mara },
      language: { locale: 'en' as const },
    };
    const thai = {
      ...anonymousContext,
      auth: { status: 'authenticated' as const, user: somchai },
      language: { locale: 'th' as const },
      navigation: { pathname: '/products', search: '' },
    };
    const [left, right] = await Promise.all([
      runWithRequest(english, async () => {
        await delay(15);
        return readRequestSnapshot();
      }),
      runWithRequest(thai, async () => {
        await delay(5);
        return readRequestSnapshot();
      }),
    ]);
    expect(left.auth.user?.displayName).toBe('Mara Ellison');
    expect(left.language.locale).toBe('en');
    expect(right.auth.user?.displayName).toBe('สมชาย ใจดี');
    expect(right.language.locale).toBe('th');
    expect(right.navigation.pathname).toBe('/products');
  });

  it('does not let one runtime mutate another', () => {
    const first = createRuntime(anonymousContext, 'runtime-a');
    const second = createRuntime(
      { ...anonymousContext, language: { locale: 'th' } },
      'runtime-b',
    );
    applyAuth(first, { status: 'authenticated', user: mara }, 'host');
    expect(readContext(second).auth.status).toBe('anonymous');
    expect(first.id).not.toBe(second.id);
  });
});

describe('commands and events', () => {
  it('rejects an invalid payload and records the validation error', () => {
    const runtime = createRuntime(anonymousContext, 'runtime-invalid');
    expect(() => publishOn(runtime, { type: 'cart.updated', version: 9 }, 'cart-mfe')).toThrow();
    expect(runtime.validationErrors).toHaveLength(1);
    expect(runtime.history).toHaveLength(0);
  });

  it('rejects external navigation without changing the route', async () => {
    const runtime = createRuntime(anonymousContext, 'runtime-nav');
    let moved = '';
    runtime.commands.navigation = (destination) => {
      moved = destination;
    };
    await requestNavigation(runtime, 'https://evil.example', 'product-mfe');
    expect(moved).toBe('');
    expect(runtime.validationErrors.at(-1)?.message).toContain('Rejected navigation');
    expect(readContext(runtime).navigation.pathname).toBe('/');
  });

  it('blocks protected routes while anonymous and allows them after login', async () => {
    const runtime = createRuntime(anonymousContext, 'runtime-guard');
    const visits: string[] = [];
    runtime.commands.navigation = (destination) => {
      visits.push(destination);
    };
    await requestNavigation(runtime, '/cart', 'product-mfe');
    expect(visits).toEqual([]);
    applyAuth(runtime, { status: 'authenticated', user: mara }, 'host');
    await requestNavigation(runtime, '/cart', 'product-mfe');
    expect(visits).toEqual(['/cart']);
  });

  it('cleans up subscriptions', () => {
    const runtime = createRuntime(anonymousContext, 'runtime-sub');
    let calls = 0;
    const stop = subscribe(runtime);
    applyAuth(runtime, { status: 'authenticated', user: mara }, 'host');
    stop();
    applyAuth(runtime, { status: 'anonymous', user: null }, 'host');
    expect(calls).toBe(1);
    expect(runtime.subscribers['auth.changed']).toBe(0);

    function subscribe(target: typeof runtime) {
      target.subscribers['auth.changed'] = (target.subscribers['auth.changed'] ?? 0) + 1;
      const handler = () => {
        calls += 1;
      };
      target.bus.on('auth.changed', handler);
      return () => {
        target.subscribers['auth.changed'] = 0;
        target.bus.off('auth.changed', handler);
      };
    }
  });
});

describe('contextFromRequest', () => {
  it('reads the session and locale cookies without exposing a password', () => {
    const request = new Request('http://app.local/products?q=1', {
      headers: { cookie: 'platform_session=user-somchai; platform_locale=th' },
    });
    const snapshot = contextFromRequest(request);
    expect(snapshot.auth.user?.displayName).toBe('สมชาย ใจดี');
    expect(snapshot.language.locale).toBe('th');
    expect(snapshot.navigation).toEqual({ pathname: '/products', search: '?q=1' });
    expect(JSON.stringify(snapshot)).not.toContain('atelier');
  });
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
