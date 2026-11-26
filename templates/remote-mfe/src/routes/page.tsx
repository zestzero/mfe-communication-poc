import { anonymousContext } from '@platform/contracts';
import { PlatformProvider } from '@platform/mfe-communication';
import { View } from '../View';

export default function Standalone() {
  return (
    <PlatformProvider snapshot={anonymousContext}>
      <p data-testid="standalone-adapter">Standalone __NAME__ adapter</p>
      <View />
    </PlatformProvider>
  );
}
