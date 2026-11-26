import { appStore, onAny } from '@mfe/communication-sdk';
import { useEffect, useState } from 'react';
import { useStore } from 'zustand';

export function DebugPanel() {
  const log = useStore(appStore, (state) => state.log);
  const [mittHits, setMittHits] = useState(0);

  useEffect(() => onAny(() => setMittHits((count) => count + 1)), []);

  return (
    <aside className="debug" data-testid="debug-panel">
      <div className="debug-head">
        <h2>Communication debug</h2>
        <p data-testid="mitt-count">Mitt deliveries: {mittHits}</p>
      </div>
      {log.length === 0 ? (
        <p data-testid="debug-empty">No events yet. Select a piece or add it to the basket.</p>
      ) : (
        <ol>
          {log.map((entry) => (
            <li key={entry.id} data-testid="debug-entry">
              <code>{entry.type}</code>
              <span>{entry.summary}</span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
