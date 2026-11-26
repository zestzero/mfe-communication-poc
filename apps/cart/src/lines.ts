import type { CartItem } from '@mfe/contracts';

export function lineTotalCents(item: CartItem): number {
  return item.priceCents * item.quantity;
}
