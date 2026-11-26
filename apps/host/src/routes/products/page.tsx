import { ProductRemote, RemoteReady } from '../../remotes';

export default function ProductsPage() {
  return (
    <RemoteReady name="product" testId="mfe-product">
      <ProductRemote />
    </RemoteReady>
  );
}
