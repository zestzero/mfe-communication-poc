import { publish, appStore } from '@mfe/communication-sdk';
import { formatPrice } from '@mfe/contracts';
import { useStore } from 'zustand';
import { products } from './catalog';
import './panel.css';

export function ProductPanel() {
  const selectedId = useStore(appStore, (state) => state.selectedProduct?.id ?? null);

  return (
    <section className="panel" data-testid="mfe-product" aria-label="Product atelier">
      <div>
        <p className="kicker">Microfrontend · product · 3001</p>
        <h2>The atelier</h2>
      </div>
      <p className="lede">Choose a piece, then send it to the basket. The other microfrontends hear the same event.</p>
      <ul className="catalog">
        {products.map((product) => {
          const selected = selectedId === product.id;
          return (
            <li
              key={product.id}
              className={selected ? 'card is-selected' : 'card'}
              data-testid={`product-card-${product.id}`}
            >
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <p className="price">{formatPrice(product.priceCents)}</p>
              <div className="actions">
                <button
                  type="button"
                  className="secondary"
                  aria-pressed={selected}
                  data-testid={`select-${product.id}`}
                  onClick={() =>
                    publish({
                      type: 'catalog.product.selected',
                      source: 'product',
                      product,
                    })
                  }
                >
                  {selected ? 'Selected' : 'Look at this'}
                </button>
                <button
                  type="button"
                  data-testid={`add-${product.id}`}
                  onClick={() =>
                    publish({
                      type: 'cart.item.added',
                      source: 'product',
                      item: {
                        productId: product.id,
                        name: product.name,
                        priceCents: product.priceCents,
                        quantity: 1,
                      },
                    })
                  }
                >
                  Add to cart
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
