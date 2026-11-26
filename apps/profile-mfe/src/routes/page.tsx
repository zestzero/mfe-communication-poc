import { anonymousContext } from '@platform/contracts';
import { PlatformProvider } from '@platform/mfe-communication';
import { ProfileView } from '../ProfileView';
export default function StandaloneProfile() {
  return <PlatformProvider snapshot={anonymousContext}><p data-testid="standalone-adapter">Standalone profile adapter</p><ProfileView /></PlatformProvider>;
}
