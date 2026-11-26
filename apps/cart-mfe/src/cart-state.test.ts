import { describe, expect, it } from 'vitest';
import { addLine, clearLines, readLines } from './cart-state';
const item = { productId: 'cedar', name: 'Cedar Pour-Over', priceCents: 4800, quantity: 1 };
describe('cart ownership', () => {
  it('keeps lines on the runtime object and isolates holders', () => {
    const mara = {};
    const somchai = {};
    expect(addLine(mara, item, 'user-mara').count).toBe(1);
    expect(addLine(mara, item, 'user-mara').count).toBe(2);
    expect(addLine(somchai, item, 'user-somchai').count).toBe(1);
    expect(readLines(mara)[0]?.quantity).toBe(2);
    expect(clearLines(mara).count).toBe(0);
    expect(readLines(somchai)).toHaveLength(1);
  });
});
