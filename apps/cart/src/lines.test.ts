import { describe, expect, it } from 'vitest';
import { lineTotalCents } from './lines';

describe('cart lines', () => {
  it('multiplies price by quantity', () => {
    expect(
      lineTotalCents({
        productId: 'stoneware-mug',
        name: 'Stoneware Mug',
        priceCents: 2800,
        quantity: 3,
      }),
    ).toBe(8400);
  });
});
