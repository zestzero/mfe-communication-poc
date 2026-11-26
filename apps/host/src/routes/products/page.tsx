import { useLoaderData } from '@modern-js/runtime/router';
import { ProductRemote, RemoteReady } from '../../remotes';

export default function ProductsPage() {
  const data = useLoaderData() as { route: string; notice: string | null };
  return (
    <>
      <p data-testid="route-loader">{data.route}</p>
      {data.notice === 'auth' ? <p data-testid="auth-guard">Sign in to open this page.</p> : null}
      <RemoteReady name="product" testId="mfe-product">
        <ProductRemote />
      </RemoteReady>
    </>
  );
}
