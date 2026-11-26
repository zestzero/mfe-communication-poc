import { contextFromRequest } from '@platform/mfe-communication';
import type { LoaderFunctionArgs } from '@modern-js/runtime/router';

export const loader = ({ request }: LoaderFunctionArgs) => ({
  snapshot: contextFromRequest(request),
  runtimeId: crypto.randomUUID(),
});

// The browser runtime is created once from this payload. Re-running the layout
// loader on every client navigation would mint a new id and a new store.
export const shouldRevalidate = () => false;
