import { CartViewRemote, RemoteReady } from '../../remotes';

export default function CartPage() {
  return (
    <RemoteReady name="cart" testId="mfe-cart">
      <CartViewRemote />
    </RemoteReady>
  );
}
