import { useLoaderData } from '@modern-js/runtime/router';
import { CartViewRemote, RemoteReady } from '../../remotes';

export default function CartPage() {
  const data = useLoaderData() as { route: string };
  return (
    <>
      <p data-testid="route-loader">{data.route}</p>
      <RemoteReady name="cart" testId="mfe-cart">
        <CartViewRemote />
      </RemoteReady>
    </>
  );
}
