import type { PlatformMessage } from '@platform/contracts';
import { emitMessage, type Runtime } from '../runtime/runtime.js';

export function publishOn(runtime: Runtime, input: unknown, source: string): PlatformMessage {
  return emitMessage(runtime, input, source);
}

export function subscribeOn(runtime: Runtime, type: string, handler: (message: PlatformMessage) => void): () => void {
  runtime.subscribers[type] = (runtime.subscribers[type] ?? 0) + 1;
  const wrapped = (message: PlatformMessage) => handler(message);
  runtime.bus.on(type, wrapped);
  return () => {
    runtime.subscribers[type] = Math.max(0, (runtime.subscribers[type] ?? 1) - 1);
    runtime.bus.off(type, wrapped);
  };
}
