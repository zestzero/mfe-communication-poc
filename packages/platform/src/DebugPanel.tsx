import { useAuth, useDiagnostics, useLanguage, useNavigation, usePublish } from '@platform/mfe-communication';
import { useState } from 'react';
import { matchesFilter, showPayloads, type RemoteStatus } from './filter';

export function DebugPanel({ remotes }: { remotes: readonly RemoteStatus[] }) {
  const auth = useAuth();
  const language = useLanguage();
  const navigation = useNavigation();
  const diagnostics = useDiagnostics();
  const publish = usePublish('host');
  const [source, setSource] = useState('');
  const [type, setType] = useState('');
  const [correlationId, setCorrelationId] = useState('');
  const [invalidMessage, setInvalidMessage] = useState('');
  const payloads = showPayloads();
  const history = diagnostics.history.filter((entry) => matchesFilter(entry, { source, type, correlationId }));

  return (
    <aside className="mt-6 rounded-2xl bg-stone-950 p-4 text-stone-100" data-testid="debug-panel">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Communication debug</h2>
          <p data-testid="runtime-id">Runtime {diagnostics.runtimeId}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 text-sm md:grid-cols-4">
          <div>
            <dt>Auth</dt>
            <dd data-testid="debug-auth">{auth.status}</dd>
          </div>
          <div>
            <dt>Language</dt>
            <dd data-testid="debug-locale">{language.locale}</dd>
          </div>
          <div>
            <dt>Route</dt>
            <dd data-testid="debug-route">{navigation.pathname}</dd>
          </div>
          <div>
            <dt>Subscribers</dt>
            <dd data-testid="debug-subscribers">
              {Object.entries(diagnostics.subscribers)
                .map(([name, count]) => `${name}:${count}`)
                .join(' ') || 'none'}
            </dd>
          </div>
        </dl>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input className="rounded bg-stone-800 px-2 py-1" placeholder="Application" aria-label="Filter by application" value={source} onChange={(event) => setSource(event.target.value)} />
        <input className="rounded bg-stone-800 px-2 py-1" placeholder="Event type" aria-label="Filter by event type" value={type} onChange={(event) => setType(event.target.value)} />
        <input className="rounded bg-stone-800 px-2 py-1" placeholder="Correlation id" aria-label="Filter by correlation id" value={correlationId} onChange={(event) => setCorrelationId(event.target.value)} />
        <button
          type="button"
          className="rounded bg-orange-700 px-3 py-1"
          data-testid="send-invalid"
          onClick={() => {
            try {
              publish({ type: 'cart.updated', version: 9 });
              setInvalidMessage('');
            } catch (error) {
              setInvalidMessage(error instanceof Error ? error.message : 'Rejected');
            }
          }}
        >
          Send invalid event
        </button>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2" data-testid="remote-status">
        {remotes.map((remote) => (
          <li key={remote.name} data-testid={`remote-${remote.name}`}>
            {remote.name}: {remote.state}
            {remote.detail ? ` (${remote.detail})` : ''}
          </li>
        ))}
      </ul>
      {invalidMessage ? <p data-testid="validation-error">{invalidMessage}</p> : null}
      <ul className="mt-3 space-y-2">
        {diagnostics.validationErrors.map((error) => (
          <li key={error.id} data-testid="validation-entry">
            {error.source}: {error.message}
          </li>
        ))}
        {history.length === 0 ? <li data-testid="debug-empty">No matching events.</li> : null}
        {history.map((entry) => (
          <li key={entry.id} data-testid="debug-entry">
            <code>{entry.type}</code> {entry.source}
            {entry.correlationId ? <span data-testid="debug-correlation"> {entry.correlationId}</span> : null}
            {payloads ? <span> {JSON.stringify(entry.payload)}</span> : null}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export type { RemoteStatus };
