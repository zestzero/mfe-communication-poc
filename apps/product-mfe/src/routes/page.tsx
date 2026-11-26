import { anonymousContext } from '@platform/contracts';
import { PlatformProvider } from '@platform/mfe-communication';
import { Catalog } from '../Catalog';

export default function StandaloneProduct() {
  return (
    <PlatformProvider snapshot={anonymousContext}>
      <p data-testid="standalone-adapter">Standalone product adapter</p>
      <Catalog />
    </PlatformProvider>
  );
}
