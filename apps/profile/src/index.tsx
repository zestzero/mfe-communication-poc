import { createRoot } from 'react-dom/client';
import { ProfilePanel } from './ProfilePanel';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Profile standalone shell is missing #root');
}

createRoot(root).render(
  <main className="standalone">
    <div className="standalone-frame">
      <ProfilePanel />
    </div>
  </main>,
);
