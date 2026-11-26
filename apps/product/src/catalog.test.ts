import { describe, expect, it } from 'vitest';
import { products } from './catalog';

describe('product catalog', () => {
  it('uses unique ids and positive prices', () => {
    const ids = products.map((product) => product.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(products.every((product) => product.priceCents > 0)).toBe(true);
    expect(products.map((product) => product.name)).toContain('Cedar Pour-Over');
  });
});
