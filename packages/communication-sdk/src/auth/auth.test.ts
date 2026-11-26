import { describe, expect, it } from 'vitest';
import { anonymousContext, publicUsers } from '@platform/contracts';
import { createRuntime } from '../runtime/runtime.js';
import { applyAuth, requestLogin } from './commands.js';

describe('auth', () => {
  it('publishes the username and keeps the password off the bus', async () => {
    const runtime = createRuntime(anonymousContext, 'runtime-auth');
    runtime.commands.login = async () => {
      applyAuth(runtime, { status: 'authenticated', user: publicUsers[0]! }, 'host');
    };
    await requestLogin(runtime, { username: 'mara', password: 'atelier' }, 'host');
    expect(runtime.history[0]?.type).toBe('auth.login.requested');
    expect(JSON.stringify(runtime.history)).not.toContain('atelier');
    expect(runtime.store.getState().auth.user?.displayName).toBe('Mara Ellison');
  });
});
