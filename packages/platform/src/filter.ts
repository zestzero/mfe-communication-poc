export interface RemoteStatus {
  name: string;
  state: 'loading' | 'ready' | 'error';
  detail?: string;
}

export function matchesFilter(
  entry: { source: string; type: string; correlationId?: string },
  filter: { source: string; type: string; correlationId: string },
): boolean {
  const source = filter.source.trim().toLowerCase();
  const type = filter.type.trim().toLowerCase();
  const correlationId = filter.correlationId.trim().toLowerCase();
  if (source && !entry.source.toLowerCase().includes(source)) return false;
  if (type && !entry.type.toLowerCase().includes(type)) return false;
  if (correlationId && !(entry.correlationId ?? '').toLowerCase().includes(correlationId)) return false;
  return true;
}

declare const process: { env?: { NODE_ENV?: string } } | undefined;

export function showPayloads(nodeEnv = typeof process === 'undefined' ? undefined : process.env?.NODE_ENV): boolean {
  return nodeEnv !== 'production';
}
