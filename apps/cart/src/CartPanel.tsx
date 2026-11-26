import { appStore, cartTotalCents, publish } from '@mfe/communication-sdk';
import { formatPrice } from '@mfe/contracts';
import { useStore } from 'zustand';
import { lineTotalCents } from './lines';
import './panel.css';

export function CartPanel() {
  const cart = useStore(appStore, (state) => state.cart);
  const total = cartTotalCents(cart);

  return (
    <section className="panel" data-testid="mfe-cart" aria-label="Cart">
      <div>
        <p className="kicker">Microfrontend · cart · 3002</p>
        <h2>Basket</h2>
      </div>
      {cart.length === 0 ? (
        <p className="empty" data-testid="cart-empty">
          The basket is empty. Add a piece from the atelier.
        </p>
      ) : (
        <ul className="lines">
          {cart.map((item) => (
            <li key={item.productId} className="line" data-testid={`cart-line-${item.productId}`}>
              <span>
                {item.name}
                <br />
                <span>× {item.quantity}</span>
              </span>
              <strong>{formatPrice(lineTotalCents(item))}</strong>
              <button
                type="button"
                data-testid={`remove-${item.productId}`}
                onClick={() =>
                  publish({
                    type: 'cart.item.removed',
                    source: 'cart',
                    productId: item.productId,
                    name: item.name,
                  })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="total" data-testid="cart-total">
        {formatPrice(total)}
      </p>
    </section>
  );
}
