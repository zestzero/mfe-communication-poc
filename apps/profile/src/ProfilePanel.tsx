import { appStore, publish } from '@mfe/communication-sdk';
import { useStore } from 'zustand';
import { nextUser } from './roster';
import './panel.css';

export function ProfilePanel() {
  const user = useStore(appStore, (state) => state.user);
  const selected = useStore(appStore, (state) => state.selectedProduct);
  const upcoming = nextUser(user.id);

  return (
    <section className="panel" data-testid="mfe-profile" aria-label="Profile">
      <div>
        <p className="kicker">Microfrontend · profile · 3003</p>
        <h2 data-testid="profile-name">{user.displayName}</h2>
      </div>
      <p className="email">{user.email}</p>
      <p className="viewing" data-testid="profile-viewing">
        {selected ? `Looking at ${selected.name}` : 'Nothing selected yet.'}
      </p>
      <button
        type="button"
        data-testid="switch-user"
        onClick={() =>
          publish({
            type: 'profile.user.switched',
            source: 'profile',
            user: upcoming,
          })
        }
      >
        Switch to {upcoming.displayName}
      </button>
    </section>
  );
}
