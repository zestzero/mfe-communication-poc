import type { LoaderFunctionArgs } from '@modern-js/runtime/router';

export const loader = ({ request }: LoaderFunctionArgs) => ({
  route: 'products' as const,
  notice: new URL(request.url).searchParams.get('notice'),
});
