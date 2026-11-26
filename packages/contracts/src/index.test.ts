import { describe, expect, it } from 'vitest';
import {
  PlatformMessageSchema,
  formatPrice,
  isProtectedPath,
  isSafeDestination,
  redact,
} from './index';

const envelope = {
  id: '8d8b1e4a-3c1e-4f0a-9c1e-6b8a7c2d4e11',
  version: 1,
  source: 'product-mfe',
  timestamp: 1,
  correlationId: 'add-cedar',
};

describe('contracts v1', () => {
  it('accepts a versioned cart command', () => {
    const parsed = PlatformMessageSchema.parse({
      ...envelope,
      type: 'cart.item.add.requested',
      payload: { productId: 'cedar', name: 'Cedar Pour-Over', priceCents: 4800, quantity: 1 },
    });
    expect(parsed.type).toBe('cart.item.add.requested');
  });

  it('rejects the wrong contract version', () => {
    const result = PlatformMessageSchema.safeParse({
      ...envelope,
      version: 2,
      type: 'cart.updated',
      payload: { count: 1, totalCents: 100, userId: null },
    });
    expect(result.success).toBe(false);
  });

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
});
