import { DebugPanel } from '../components/DebugPanel';
import { Header } from '../components/Header';
import { CartRemote, ProductRemote, ProfileRemote } from '../remotes';
import './page.css';

const Page = () => (
  <div className="page">
    <Header />
    <main className="stage">
      <ProductRemote />
      <CartRemote />
      <ProfileRemote />
    </main>
    <DebugPanel />
  </div>
);

export default Page;
