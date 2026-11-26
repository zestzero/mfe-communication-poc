import { anonymousContext } from '@platform/contracts';
import { PlatformProvider } from '@platform/mfe-communication';
import { CartController } from '../CartController';
import { CartView } from '../CartView';
export default function StandaloneCart() {
  return <PlatformProvider snapshot={anonymousContext}><p data-testid="standalone-adapter">Standalone cart adapter</p><CartController /><CartView /></PlatformProvider>;
}
