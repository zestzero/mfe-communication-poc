import { DebugPanel } from '@platform/debug-panel';
import type { PlatformContext, PlatformMessage } from '@platform/contracts';
import { PlatformProvider, requestLanguageChange, requestLogin, requestLogout, useAuth, useLanguage, useRuntime } from '@platform/mfe-communication';
import { applyAuth, applyLanguage, applyNavigation } from '@platform/mfe-communication/host';
import { Link, Outlet, useLoaderData, useLocation, useNavigate } from '@modern-js/runtime/router';
import { useEffect, useState, type FormEvent } from 'react';
import { CartControllerRemote } from '../remotes';
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
  const navigate = useNavigate();
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
        navigate(destination);
      },
    };
  }, [navigate, runtime]);

  useEffect(() => {
    applyNavigation(runtime, { pathname: location.pathname, search: location.search }, 'host');
  }, [location.pathname, location.search, runtime]);

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

  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-stone-100 px-4 py-6 text-stone-900">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-stone-950 px-5 py-4 text-stone-50" data-testid="host-header">
        <div>
          <p className="text-xs uppercase tracking-widest text-orange-200">Modern.js host · stream SSR</p>
          <h1 className="font-serif text-4xl">{copy.brand}</h1>
        </div>
        <nav className="flex gap-3 text-sm" aria-label="Primary">
          <Link to="/" data-testid="nav-home">{copy.home}</Link>
          <Link to="/products" data-testid="nav-products">{copy.products}</Link>
          <Link to="/cart" data-testid="nav-cart">{copy.cart}</Link>
          <Link to="/profile" data-testid="nav-profile">{copy.profile}</Link>
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
        <Outlet />
      </main>
      <DebugPanel remotes={remotes} />
    </div>
  );
}
