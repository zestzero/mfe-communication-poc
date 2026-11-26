import type { PlatformMessage } from '@platform/contracts';
import { createMessage, useAuth, useRuntime } from '@platform/mfe-communication';
import { publishOn, subscribeOn } from '@platform/mfe-communication';
import { useEffect } from 'react';
import { addLine, clearLines } from './cart-state';

export function CartController() {
  const runtime = useRuntime();
  const auth = useAuth();
  useEffect(() => subscribeOn(runtime, 'cart.item.add.requested', (message: PlatformMessage) => {
    const current = runtime.store.getState().auth;
    if (message.type !== 'cart.item.add.requested' || current.status !== 'authenticated') return;
    const summary = addLine(runtime, message.payload as { productId: string; name: string; priceCents: number; quantity: number }, current.user?.id ?? null);
    publishOn(runtime, createMessage('cart.updated', 'cart-mfe', summary, message.correlationId), 'cart-mfe');
  }), [runtime]);
  useEffect(() => {
    if (auth.status === 'anonymous') {
      publishOn(runtime, createMessage('cart.updated', 'cart-mfe', clearLines(runtime)), 'cart-mfe');
    }
  }, [auth.status, runtime]);
  return <span data-testid="cart-controller" hidden />;
}
