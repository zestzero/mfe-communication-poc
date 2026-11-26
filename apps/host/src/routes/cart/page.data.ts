import { contextFromRequest } from '@platform/mfe-communication';
import { redirect, type LoaderFunctionArgs } from '@modern-js/runtime/router';

export const loader = ({ request }: LoaderFunctionArgs) => {
  if (contextFromRequest(request).auth.status !== 'authenticated') {
    return redirect('/products?notice=auth');
  }
  return { route: 'cart' as const };
};
