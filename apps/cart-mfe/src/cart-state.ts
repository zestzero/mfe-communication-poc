import type { AddCartItem, CartSummary } from '@platform/contracts';

const KEY = Symbol.for('@platform/cart-lines');

type Holder = object & { [KEY]?: AddCartItem[] };

export function readLines(holder: object): AddCartItem[] {
  return (holder as Holder)[KEY] ?? [];
}

export function addLine(holder: object, item: AddCartItem, userId: string | null): CartSummary {
  const current = readLines(holder);
  const existing = current.find((line) => line.productId === item.productId);
  const next = existing
    ? current.map((line) => line.productId === item.productId ? { ...line, quantity: line.quantity + item.quantity } : line)
    : [...current, item];
  (holder as Holder)[KEY] = next;
  return summarize(next, userId);
}

export function clearLines(holder: object): CartSummary {
  (holder as Holder)[KEY] = [];
  return summarize([], null);
}

function summarize(items: readonly AddCartItem[], userId: string | null): CartSummary {
  return {
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    totalCents: items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
    userId,
  };
}
