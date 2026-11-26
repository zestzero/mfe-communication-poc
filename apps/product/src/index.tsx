import { createRoot } from 'react-dom/client';
import { ProductPanel } from './ProductPanel';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Product standalone shell is missing #root');
}

createRoot(root).render(
  <main className="standalone">
    <div className="standalone-frame">
      <ProductPanel />
    </div>
  </main>,
);
