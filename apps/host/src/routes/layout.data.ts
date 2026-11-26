import { contextFromRequest } from '@platform/mfe-communication';
import type { LoaderFunctionArgs } from '@modern-js/runtime/router';

export const loader = ({ request }: LoaderFunctionArgs) => ({
  snapshot: contextFromRequest(request),
  runtimeId: crypto.randomUUID(),
});
