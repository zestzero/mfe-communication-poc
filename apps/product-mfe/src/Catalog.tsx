import { formatPrice } from '@platform/debug-panel/lib';
import { createMessage, useAuth, useLanguage, useRuntime } from '@platform/mfe-communication';
import { publishOn, requestNavigation } from '@platform/mfe-communication';
import { useState } from 'react';
import { productCopy, products } from './catalog';
import './styles.css';

export function Catalog() {
  const auth = useAuth();
  const language = useLanguage();
  const runtime = useRuntime();
  const copy = productCopy[language.locale];
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <section className="rounded-2xl bg-white p-5" data-testid="mfe-product" data-locale={language.locale} data-runtime-id={runtime.id}>
      <p className="text-xs uppercase tracking-widest text-orange-800">Product · federated</p>
      <h2 className="font-serif text-3xl">{copy.title}</h2>
      {auth.status === 'anonymous' ? <p data-testid="product-auth">{copy.signedOut}</p> : <p data-testid="product-auth">{auth.user?.displayName}</p>}
      <ul className="mt-4 space-y-3">
        {products.map((product) => (
          <li key={product.id} className="rounded-xl border border-stone-200 p-3" data-testid={`product-card-${product.id}`}>
            <h3 data-testid={`product-name-${product.id}`}>{product.name[language.locale]}</h3>
            <p>{product.detail[language.locale]}</p>
            <p>{formatPrice(product.priceCents, language.locale)}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="rounded-full border px-3 py-1" data-testid={`select-${product.id}`} onClick={() => setSelected(product.id)}>{selected === product.id ? copy.selected : product.name[language.locale]}</button>
              <button type="button" className="rounded-full bg-stone-900 px-3 py-1 text-white" data-testid={`add-${product.id}`} disabled={auth.status !== 'authenticated'} onClick={() => publishOn(runtime, createMessage('cart.item.add.requested', 'product-mfe', { productId: product.id, name: product.name[language.locale], priceCents: product.priceCents, quantity: 1 }, `add-${product.id}`), 'product-mfe')}>{copy.add}</button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-4 underline" data-testid="go-cart" onClick={() => requestNavigation(runtime, '/cart', 'product-mfe')}>{copy.look}</button>
    </section>
  );
}
