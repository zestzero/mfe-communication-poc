import { beforeEach, describe, expect, it, vi } from 'vitest';
import { alternateUser, defaultUser } from '@mfe/contracts';
import {
  appStore,
  cartCount,
  cartTotalCents,
  getRuntime,
  onAny,
  publish,
  resetCommunication,
} from './index';

const mug = {
  productId: 'stoneware-mug',
  name: 'Stoneware Mug',
  priceCents: 2800,
  quantity: 1,
};

describe('communication runtime', () => {
  beforeEach(() => {
    resetCommunication();
  });

  it('reuses one bus and one store inside the realm', () => {
    const first = getRuntime();
    const second = getRuntime();
    expect(second.bus).toBe(first.bus);
    expect(second.store).toBe(first.store);
    expect(appStore.getState().user).toEqual(defaultUser);
  });

  it('rejects an invalid payload without emitting or storing it', () => {
    const seen: string[] = [];
    const stop = onAny((event) => seen.push(event.type));
    expect(() => publish({ type: 'cart.item.added', source: 'product' })).toThrow();
    expect(seen).toEqual([]);
    expect(appStore.getState().log).toEqual([]);
    expect(appStore.getState().cart).toEqual([]);
    stop();
  });

  it('adds a line, then increments quantity for the same product', () => {
    const seen: string[] = [];
    const stop = onAny((event) => seen.push(event.type));
    publish({ type: 'cart.item.added', source: 'product', item: mug });
    publish({
      type: 'cart.item.added',
      source: 'product',
      item: { ...mug, quantity: 2 },
    });
    const cart = appStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0]?.quantity).toBe(3);
    expect(cartCount(cart)).toBe(3);
    expect(cartTotalCents(cart)).toBe(8400);
    expect(seen).toEqual(['cart.item.added', 'cart.item.added']);
    expect(appStore.getState().log.map((entry) => entry.summary)).toEqual([
      'Added Stoneware Mug × 1',
      'Added Stoneware Mug × 2',
    ]);
    stop();
  });

  it('removes a line and keeps the Mitt listener disposable', () => {
    publish({ type: 'cart.item.added', source: 'product', item: mug });
    const seen: string[] = [];
    const stop = onAny((event) => seen.push(event.type));
    publish({
      type: 'cart.item.removed',
      source: 'cart',
      productId: mug.productId,
      name: mug.name,
    });
    stop();
    publish({ type: 'cart.item.added', source: 'product', item: mug });
    expect(appStore.getState().cart).toHaveLength(1);
    expect(seen).toEqual(['cart.item.removed']);
    expect(appStore.getState().log.some((entry) => entry.summary === 'Removed Stoneware Mug')).toBe(
      true,
    );
  });

  it('switches the user without clearing the basket', () => {
    publish({ type: 'cart.item.added', source: 'product', item: mug });
    publish({ type: 'profile.user.switched', source: 'profile', user: alternateUser });
    const state = appStore.getState();
    expect(state.user).toEqual(alternateUser);
    expect(cartCount(state.cart)).toBe(1);
    expect(state.log.at(-1)?.summary).toBe('Switched user from Mara Ellison to Julian Cho');
  });

  it('stores the selected product', () => {
    publish({
      type: 'catalog.product.selected',
      source: 'product',
      product: {
        id: 'brass-kettle',
        name: 'Brass Kettle',
        description: 'Spun brass, oak handle.',
        priceCents: 12400,
      },
    });
    expect(appStore.getState().selectedProduct?.name).toBe('Brass Kettle');
  });

  it('reset clears listeners and state but keeps the same store', () => {
    const store = getRuntime().store;
    const handler = vi.fn();
    const stop = onAny(handler);
    resetCommunication();
    publish({ type: 'cart.item.added', source: 'product', item: mug });
    expect(getRuntime().store).toBe(store);
    expect(handler).not.toHaveBeenCalled();
    expect(appStore.getState().cart).toHaveLength(1);
    stop();
  });
});
