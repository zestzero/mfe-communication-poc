import { describe, expect, it } from 'vitest';
import { loadingCopy, shellTitle } from './copy';

describe('host copy', () => {
  it('names the shell and each remote slot', () => {
    expect(shellTitle).toBe('Northwind Atelier');
    expect(loadingCopy.product).toContain('atelier');
    expect(loadingCopy.cart).toContain('basket');
    expect(loadingCopy.profile).toContain('profile');
  });
});
