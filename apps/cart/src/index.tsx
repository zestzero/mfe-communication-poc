import { createRoot } from 'react-dom/client';
import { CartPanel } from './CartPanel';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Cart standalone shell is missing #root');
}

createRoot(root).render(
  <main className="standalone">
    <div className="standalone-frame">
      <CartPanel />
    </div>
  </main>,
);
