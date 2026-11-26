import {
  AppEventSchema,
  defaultUser,
  type AppEvent,
  type CartItem,
  type Product,
  type User,
} from '@mfe/contracts';
import mitt, { type Emitter } from 'mitt';
import { createStore, type StoreApi } from 'zustand/vanilla';

export interface LogEntry {
  id: string;
  at: string;
  type: AppEvent['type'];
  source: AppEvent['source'];
  summary: string;
}

export interface AppState {
  selectedProduct: Product | null;
  cart: CartItem[];
  user: User;
  log: LogEntry[];
}

type EventMap = {
  [Event in AppEvent as Event['type']]: Event;
};

export interface CommunicationRuntime {
  bus: Emitter<EventMap>;
  store: StoreApi<AppState>;
}

const GLOBAL_KEY = Symbol.for('@mfe/communication-sdk/runtime');

type GlobalWithRuntime = typeof globalThis & {
  [GLOBAL_KEY]?: CommunicationRuntime;
};

export function initialState(): AppState {
  return {
    selectedProduct: null,
    cart: [],
    user: defaultUser,
    log: [],
  };
}

export function createRuntime(): CommunicationRuntime {
  return {
    bus: mitt<EventMap>(),
    store: createStore<AppState>(() => initialState()),
  };
}

export function getRuntime(): CommunicationRuntime {
  const scope = globalThis as GlobalWithRuntime;
  const existing = scope[GLOBAL_KEY];
  if (existing) {
    return existing;
  }
  const created = createRuntime();
  scope[GLOBAL_KEY] = created;
  return created;
}

export function cartCount(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartTotalCents(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

function summarize(event: AppEvent, previous: AppState): string {
  switch (event.type) {
    case 'catalog.product.selected':
      return `Selected ${event.product.name}`;
    case 'cart.item.added':
      return `Added ${event.item.name} × ${event.item.quantity}`;
    case 'cart.item.removed':
      return `Removed ${event.name}`;
    case 'profile.user.switched':
      return `Switched user from ${previous.user.displayName} to ${event.user.displayName}`;
    default: {
      const neverEvent: never = event;
      return neverEvent;
    }
  }
}

function addItem(cart: readonly CartItem[], item: CartItem): CartItem[] {
  const existing = cart.find((line) => line.productId === item.productId);
  if (!existing) {
    return [...cart, item];
  }
  return cart.map((line) =>
    line.productId === item.productId
      ? { ...line, quantity: line.quantity + item.quantity }
      : line,
  );
}

function reduce(state: AppState, event: AppEvent): Pick<AppState, 'selectedProduct' | 'cart' | 'user'> {
  switch (event.type) {
    case 'catalog.product.selected':
      return {
        selectedProduct: event.product,
        cart: state.cart,
        user: state.user,
      };
    case 'cart.item.added':
      return {
        selectedProduct: state.selectedProduct,
        cart: addItem(state.cart, event.item),
        user: state.user,
      };
    case 'cart.item.removed':
      return {
        selectedProduct: state.selectedProduct,
        cart: state.cart.filter((line) => line.productId !== event.productId),
        user: state.user,
      };
    case 'profile.user.switched':
      return {
        selectedProduct: state.selectedProduct,
        cart: state.cart,
        user: event.user,
      };
    default: {
      const neverEvent: never = event;
      return neverEvent;
    }
  }
}

export function publish(input: unknown): AppEvent {
  const event = AppEventSchema.parse(input);
  const runtime = getRuntime();
  let entry: LogEntry | undefined;
  runtime.store.setState((state) => {
    entry = {
      id: globalThis.crypto.randomUUID(),
      at: new Date().toISOString(),
      type: event.type,
      source: event.source,
      summary: summarize(event, state),
    };
    const next = reduce(state, event);
    return {
      ...next,
      log: [...state.log, entry].slice(-30),
    };
  });
  runtime.bus.emit(event.type, event);
  return event;
}

export function onAny(handler: (event: AppEvent) => void): () => void {
  const runtime = getRuntime();
  const wrapped = (type: keyof EventMap, event: EventMap[keyof EventMap]) => {
    if (!event || event.type !== type) {
      return;
    }
    handler(event);
  };
  runtime.bus.on('*', wrapped);
  return () => {
    runtime.bus.off('*', wrapped);
  };
}

export function resetCommunication(): void {
  const runtime = getRuntime();
  runtime.bus.all.clear();
  runtime.store.setState(initialState(), true);
}

export const appStore = new Proxy({} as StoreApi<AppState>, {
  get(_target, property, receiver) {
    const store = getRuntime().store;
    const value = Reflect.get(store, property, receiver);
    return typeof value === 'function' ? value.bind(store) : value;
  },
});
