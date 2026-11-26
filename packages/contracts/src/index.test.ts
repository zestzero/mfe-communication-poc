import { describe, expect, it } from 'vitest';
import { PlatformMessageSchema } from './index';

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

});
