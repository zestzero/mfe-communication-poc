import { describe, expect, it } from 'vitest';
import { shellCopy } from './shell';

describe('shell copy', () => {
  it('has the same keys in English and Thai', () => {
    expect(Object.keys(shellCopy.en).sort()).toEqual(Object.keys(shellCopy.th).sort());
  });
});
