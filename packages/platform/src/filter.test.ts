import { describe, expect, it } from 'vitest';
import { matchesFilter, showPayloads } from './filter';

describe('debug filters', () => {
  const entry = { source: 'product-mfe', type: 'cart.item.add.requested', correlationId: 'add-cedar' };

  it('filters by application, type, and correlation id', () => {
    expect(matchesFilter(entry, { source: 'product', type: 'cart.item', correlationId: 'cedar' })).toBe(true);
    expect(matchesFilter(entry, { source: 'cart-mfe', type: '', correlationId: '' })).toBe(false);
  });

  it('hides payloads outside development', () => {
    expect(showPayloads('development')).toBe(true);
    expect(showPayloads('production')).toBe(false);
  });
});
