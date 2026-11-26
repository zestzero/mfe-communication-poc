import { describe, expect, it } from 'vitest';
import { anonymousContext } from '@platform/contracts';
import { createRuntime } from '../runtime/runtime.js';
import { publishOn, subscribeOn } from './bus.js';

describe('events', () => {
  it('rejects an invalid payload and records the validation error', () => {
    const runtime = createRuntime(anonymousContext, 'runtime-invalid');
    expect(() => publishOn(runtime, { type: 'cart.updated', version: 9 }, 'cart-mfe')).toThrow();
    expect(runtime.validationErrors).toHaveLength(1);
    expect(runtime.history).toHaveLength(0);
  });

  it('removes a subscriber', () => {
    const runtime = createRuntime(anonymousContext, 'runtime-sub');
    let calls = 0;
    const stop = subscribeOn(runtime, 'auth.changed', () => {
      calls += 1;
    });
    runtime.bus.emit('auth.changed', {
      id: '8d8b1e4a-3c1e-4f0a-9c1e-6b8a7c2d4e11',
      type: 'auth.changed',
      version: 1,
      source: 'host',
      timestamp: 1,
      payload: { status: 'anonymous', user: null },
    });
    stop();
    runtime.bus.emit('auth.changed', {
      id: '8d8b1e4a-3c1e-4f0a-9c1e-6b8a7c2d4e12',
      type: 'auth.changed',
      version: 1,
      source: 'host',
      timestamp: 2,
      payload: { status: 'anonymous', user: null },
    });
    expect(calls).toBe(1);
    expect(runtime.subscribers['auth.changed']).toBe(0);
  });
});
