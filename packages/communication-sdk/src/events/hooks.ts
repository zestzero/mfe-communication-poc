import type { PlatformMessage } from '@platform/contracts';
import { useEffect } from 'react';
import { useRuntime } from '../runtime/provider.js';
import { publishOn, subscribeOn } from './bus.js';

export function publish(input: unknown): PlatformMessage {
  return publishOn(useRuntime(), input, 'mfe');
}

export function subscribe(type: string, handler: (message: PlatformMessage) => void): () => void {
  return subscribeOn(useRuntime(), type, handler);
}

export function usePublish(source: string) {
  const runtime = useRuntime();
  return (input: unknown) => publishOn(runtime, input, source);
}

export function useSubscription(type: string, source: string, handler: (message: PlatformMessage) => void) {
  const runtime = useRuntime();
  useEffect(() => subscribeOn(runtime, type, handler), [runtime, type, source, handler]);
}
