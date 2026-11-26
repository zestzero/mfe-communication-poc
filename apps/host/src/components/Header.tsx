import { appStore, cartCount } from '@mfe/communication-sdk';
import { useStore } from 'zustand';
import { shellTitle } from '../copy';

export function Header() {
  const user = useStore(appStore, (state) => state.user);
  const count = useStore(appStore, (state) => cartCount(state.cart));

  return (
    <header className="masthead" data-testid="host-header">
      <div>
        <p className="kicker">Modern.js host · streaming SSR · 3000</p>
        <h1>{shellTitle}</h1>
      </div>
      <div className="mast-meta">
        <p>
          <span>Signed in</span>
          <strong data-testid="host-user">{user.displayName}</strong>
        </p>
        <p className="count">
          <span>Basket</span>
          <strong data-testid="host-cart-count">{count}</strong>
        </p>
      </div>
    </header>
  );
}
