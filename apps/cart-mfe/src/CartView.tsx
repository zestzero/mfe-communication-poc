import { formatPrice } from '@platform/debug-panel/lib';
import { useDiagnostics, useLanguage, useRuntime } from '@platform/mfe-communication';
import { subscribeOn } from '@platform/mfe-communication';
import { useEffect, useState } from 'react';
import { readLines } from './cart-state';
import './styles.css';

const copy = { en: { title: 'Basket', empty: 'The basket is empty.' }, th: { title: 'ตะกร้า', empty: 'ตะกร้าว่าง' } };

export function CartView() {
  const runtime = useRuntime();
  const diagnostics = useDiagnostics();
  const language = useLanguage();
  const [lines, setLines] = useState(() => readLines(runtime));
  useEffect(() => subscribeOn(runtime, 'cart.updated', () => setLines(readLines(runtime))), [runtime]);
  const text = copy[language.locale];
  return (
    <section className="rounded-2xl bg-white p-5" data-testid="mfe-cart" data-runtime-id={runtime.id}>
      <h2 className="font-serif text-3xl">{text.title}</h2>
      <p>
        Cart SDK <span data-testid="cart-sdk-package-version">{diagnostics.sdkPackageVersion}</span>
      </p>
      {lines.length === 0 ? <p data-testid="cart-empty">{text.empty}</p> : (
        <ul>
          {lines.map((line) => (
            <li key={line.productId} data-testid={`cart-line-${line.productId}`}>{line.name} × {line.quantity} {formatPrice(line.priceCents * line.quantity, language.locale)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
