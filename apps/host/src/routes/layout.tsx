import { DebugPanel } from '@platform/debug-panel';
import { isProtectedPath, type PlatformContext, type PlatformMessage } from '@platform/contracts';
import { PlatformProvider, requestLanguageChange, requestLogin, requestLogout, useAuth, useLanguage, useRuntime } from '@platform/mfe-communication';
import { applyAuth, applyLanguage, applyNavigation } from '@platform/mfe-communication/host';
import { useLoaderData, useLocation } from '@modern-js/runtime/router';
import { useEffect, useState, type FormEvent } from 'react';
import { HomePanel } from './page';
import { CartControllerRemote, CartViewRemote, ProductRemote, ProfileRemote, RemoteReady } from '../remotes';
import { useRemoteStatuses } from '../remote-status';
import { shellCopy } from '../shell';
import '../styles.css';

export default function Layout() {
  const { snapshot, runtimeId } = useLoaderData() as { snapshot: PlatformContext; runtimeId: string };
  return (
    <PlatformProvider snapshot={snapshot} runtimeId={runtimeId}>
      <Shell />
    </PlatformProvider>
  );
}

function Shell() {
  const runtime = useRuntime();
  const auth = useAuth();
  const language = useLanguage();
  const location = useLocation();
  const [clientPath, setClientPath] = useState<string | null>(null);
  const pathname = clientPath ?? location.pathname;
  const copy = shellCopy[language.locale];
  const remotes = useRemoteStatuses();
  const [username, setUsername] = useState('mara');
  const [password, setPassword] = useState('atelier');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('0');

  useEffect(() => {
    runtime.commands = {
      login: async ({ username: name, password: secret }) => {
        const response = await fetch('/api/session', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: name, password: secret }),
        });
        if (!response.ok) throw new Error('Login rejected');
        const body = (await response.json()) as { auth: PlatformContext['auth'] };
        applyAuth(runtime, body.auth, 'host');
      },
      logout: async () => {
        await fetch('/api/session', { method: 'DELETE', credentials: 'include' });
        applyAuth(runtime, { status: 'anonymous', user: null }, 'host');
      },
      language: (locale) => {
        document.cookie = `platform_locale=${locale}; Path=/; SameSite=Lax`;
        applyLanguage(runtime, { locale }, 'host');
      },
      navigation: (destination) => {
        setClientPath(destination.split('?')[0] || '/');
        window.history.pushState({}, '', destination);
      },
    };
  }, [runtime]);

  useEffect(() => {
    const onPop = () => setClientPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    applyNavigation(runtime, { pathname, search: location.search }, 'host');
  }, [location.search, pathname, runtime]);

  useEffect(() => {
    const handler = (message: PlatformMessage) => {
      if (message.type === 'cart.updated') setSummary(String((message.payload as { count: number }).count));
    };
    runtime.bus.on('cart.updated', handler);
    return () => runtime.bus.off('cart.updated', handler);
  }, [runtime]);

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    try {
      await requestLogin(runtime, { username, password }, 'host');
      setError('');
    } catch {
      setError(copy.rejected);
    }
  }

  const blocked = isProtectedPath(pathname) && auth.status !== 'authenticated';
  function go(destination: string) {
    setClientPath(destination);
    window.history.pushState({}, '', destination);
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-stone-100 px-4 py-6 text-stone-900">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-stone-950 px-5 py-4 text-stone-50" data-testid="host-header">
        <div>
          <p className="text-xs uppercase tracking-widest text-orange-200">Modern.js host · stream SSR</p>
          <h1 className="font-serif text-4xl">{copy.brand}</h1>
        </div>
        <nav className="flex gap-3 text-sm" aria-label="Primary">
          <a href="/" data-testid="nav-home" onClick={(event) => { event.preventDefault(); go('/'); }}>{copy.home}</a>
          <a href="/products" data-testid="nav-products" onClick={(event) => { event.preventDefault(); go('/products'); }}>{copy.products}</a>
          <a href="/cart" data-testid="nav-cart" onClick={(event) => { event.preventDefault(); go('/cart'); }}>{copy.cart}</a>
          <a href="/profile" data-testid="nav-profile" onClick={(event) => { event.preventDefault(); go('/profile'); }}>{copy.profile}</a>
        </nav>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p data-testid="auth-status">{auth.status === 'authenticated' ? copy.authenticated : copy.anonymous}</p>
          <p data-testid="host-user">{auth.user?.displayName ?? '—'}</p>
          <p data-testid="host-cart-count">{summary}</p>
          <label>
            {copy.language}
            <select className="ml-2 rounded bg-stone-800 px-2 py-1" data-testid="language-select" value={language.locale} onChange={(event) => requestLanguageChange(runtime, event.target.value as 'en' | 'th', 'host')}>
              <option value="en">English</option>
              <option value="th">ไทย</option>
            </select>
          </label>
          {auth.status === 'authenticated' ? (
            <button type="button" className="rounded-full bg-orange-700 px-3 py-1" data-testid="logout" onClick={() => requestLogout(runtime, 'host')}>{copy.logout}</button>
          ) : (
            <form className="flex flex-wrap gap-2" onSubmit={onLogin}>
              <input className="rounded px-2 py-1 text-stone-900" aria-label={copy.username} data-testid="login-username" value={username} onChange={(event) => setUsername(event.target.value)} />
              <input className="rounded px-2 py-1 text-stone-900" aria-label={copy.password} data-testid="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <button type="submit" className="rounded-full bg-orange-700 px-3 py-1" data-testid="login-submit">{copy.login}</button>
            </form>
          )}
        </div>
      </header>
      {error ? <p role="alert" data-testid="login-error">{error}</p> : null}
      <CartControllerRemote />
      <main className="mt-6">
        {blocked ? <p data-testid="auth-guard">Sign in to open this page.</p> : null}
        {!blocked && pathname === '/' ? <HomePanel /> : null}
        {!blocked && pathname === '/products' ? <RemoteReady name="product" testId="mfe-product"><ProductRemote /></RemoteReady> : null}
        {!blocked && pathname === '/cart' ? <RemoteReady name="cart" testId="mfe-cart"><CartViewRemote /></RemoteReady> : null}
        {!blocked && pathname === '/profile' ? <RemoteReady name="profile" testId="mfe-profile"><ProfileRemote /></RemoteReady> : null}
      </main>
      <DebugPanel remotes={remotes} />
    </div>
  );
}
