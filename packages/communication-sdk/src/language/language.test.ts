import { describe, expect, it } from 'vitest';
import { anonymousContext } from '@platform/contracts';
import { createRuntime } from '../runtime/runtime.js';
import { applyLanguage, requestLanguageChange } from './commands.js';

describe('language', () => {
  it('changes the locale through the host handler', async () => {
    const runtime = createRuntime(anonymousContext, 'runtime-lang');
    runtime.commands.language = (locale) => applyLanguage(runtime, { locale }, 'host');
    await requestLanguageChange(runtime, 'th', 'profile-mfe');
    expect(runtime.store.getState().language.locale).toBe('th');
    expect(runtime.history.map((entry) => entry.type)).toEqual(['language.change.requested', 'language.changed']);
  });
});
