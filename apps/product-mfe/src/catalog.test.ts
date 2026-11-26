import { describe, expect, it } from 'vitest';
import { products } from './catalog';
describe('catalog', () => {
  it('has unique ids and both languages', () => {
    expect(new Set(products.map((item) => item.id)).size).toBe(products.length);
    expect(products[0]?.name.th).toContain('ซีดาร์');
  });
});
