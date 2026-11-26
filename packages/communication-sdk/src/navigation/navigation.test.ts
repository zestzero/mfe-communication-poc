import { describe, expect, it } from 'vitest';
import { anonymousContext, publicUsers } from '@platform/contracts';
import { applyAuth } from '../auth/commands.js';
import { createRuntime, readContext } from '../runtime/runtime.js';
import { requestNavigation } from './commands.js';

describe('navigation', () => {
  it('rejects an external destination', async () => {
    const runtime = createRuntime(anonymousContext, 'runtime-nav');
    let moved = '';
    runtime.commands.navigation = (destination) => {
      moved = destination;
    };
    await requestNavigation(runtime, 'https://evil.example', 'product-mfe');
    expect(moved).toBe('');
    expect(readContext(runtime).navigation.pathname).toBe('/');
  });

  it('blocks a protected path until the viewer is authenticated', async () => {
    const runtime = createRuntime(anonymousContext, 'runtime-guard');
    const visits: string[] = [];
    runtime.commands.navigation = (destination) => {
      visits.push(destination);
    };
    await requestNavigation(runtime, '/cart', 'product-mfe');
    applyAuth(runtime, { status: 'authenticated', user: publicUsers[0]! }, 'host');
    await requestNavigation(runtime, '/cart', 'product-mfe');
    expect(visits).toEqual(['/cart']);
  });
});
