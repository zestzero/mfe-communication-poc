import { describe, expect, it } from 'vitest';
import { federationShared, formatPrice, isProtectedPath, isSafeDestination, redact, userById } from './index';

describe('platform helpers', () => {
  it('rejects external navigation and unknown paths', () => {
    expect(isSafeDestination('/products')).toBe(true);
    expect(isSafeDestination('https://evil.example')).toBe(false);
    expect(isSafeDestination('//evil.example')).toBe(false);
    expect(isSafeDestination('/admin')).toBe(false);
    expect(isProtectedPath('/cart')).toBe(true);
    expect(isProtectedPath('/products')).toBe(false);
  });

  it('redacts secrets and formats money', () => {
    expect(redact({ password: 'atelier', name: 'Mara' })).toEqual({
      password: '[redacted]',
      name: 'Mara',
    });
    expect(formatPrice(4800, 'en')).toBe('$48.00');
  });

  it('looks up the public mock users and shares semver ranges', () => {
    expect(userById('user-mara')?.displayName).toBe('Mara Ellison');
    expect(userById('missing')).toBeNull();
    expect(federationShared(true).react.requiredVersion).toBe('^19.3.1');
    expect(federationShared(false)['@platform/contracts'].eager).toBe(false);
  });
});
