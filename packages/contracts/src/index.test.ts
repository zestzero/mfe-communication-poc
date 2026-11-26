import { describe, expect, it } from 'vitest';
import {
  AppEventSchema,
  alternateUser,
  defaultUser,
  formatPrice,
} from './index';

const pourOver = {
  id: 'cedar-pour-over',
  name: 'Cedar Pour-Over',
  description: 'Hand-thrown dripper with a walnut collar.',
  priceCents: 4800,
};

describe('contracts', () => {
  it('accepts a catalog selection', () => {
    const event = AppEventSchema.parse({
      type: 'catalog.product.selected',
      source: 'product',
      product: pourOver,
    });
    expect(event.type).toBe('catalog.product.selected');
  });

  it('rejects a cart line with a zero quantity', () => {
    const result = AppEventSchema.safeParse({
      type: 'cart.item.added',
      source: 'product',
      item: {
        productId: 'cedar-pour-over',
        name: 'Cedar Pour-Over',
        priceCents: 4800,
        quantity: 0,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown event type', () => {
    expect(AppEventSchema.safeParse({ type: 'cart.cleared', source: 'cart' }).success).toBe(
      false,
    );
  });

  it('formats cents as USD', () => {
    expect(formatPrice(4800)).toBe('$48.00');
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('ships two distinct demo users', () => {
    expect(defaultUser.displayName).toBe('Mara Ellison');
    expect(alternateUser.email).toContain('@');
    expect(defaultUser.id).not.toBe(alternateUser.id);
  });
});
