// In hindsight, making this a full web component using the shadow DOM wasn't a great idea
// - Styles aren't pulled in, and I had to include a lot of inline HTML to get things working
// - The reason I did this is because I couldn't find native Liquid solution for "recently viewed items"

if (!customElements.get('upsell-component')) {
  customElements.define(
    'upsell-component',
    class UpsellComponent extends HTMLElement {
      constructor() {
        super();
        this.cartDrawer = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.cartIcon = document.querySelector('.cart-count-bubble span');
        this.attachShadow({ mode: 'open' });
      }

      connectedCallback() {
        this.loadRecentlyViewed();
      }

      loadRecentlyViewed() {
        const currentProductHandle = this.getAttribute('product-handle');
        const maxProducts = parseInt(this.getAttribute('max-products'));
        let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];

        recentlyViewed = recentlyViewed.filter((handle) => handle !== currentProductHandle);
        const limitedRecentlyViewed = recentlyViewed.slice(-maxProducts);

        this.fetchProducts(limitedRecentlyViewed);

        if (!recentlyViewed.includes(currentProductHandle)) {
          recentlyViewed.push(currentProductHandle);
        }
        localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
      }

      fetchProducts(handles) {
        Promise.all(handles.map((handle) => this.fetchProductData(handle)))
          .then((products) => this.renderUpsell(products))
          .catch((err) => console.error(err));
      }

      fetchProductData(handle) {
        return fetch(`/products/${handle}.js`).then((response) => response.json());
      }

      renderUpsell(products) {
        const currency = window.ShopifyAnalytics.meta.currency; // Quick fix instead of passing in as Liquid

        const upsellHTML =
          products.length > 0
            ? products
                .map(
                  (product) => `
                    <div class="upsell-item">
                      <div class="upsell-item__image">
                        <img src="${product.featured_image}" alt="${product.title}">
                      </div>
                      <div class="upsell-item__description">
                        <div class="upsell-item__title">
                          <h5>${product.title}</h5>
                          <p>${(product.price / 100).toFixed(2)} ${currency}</p>
                        </div>
                        <button class="button button--secondary" data-id="${
                          product.variants[0].id
                        }">Add to Cart</button>
                      </div>
                    </div>
                  `
                )
                .join('')
            : `
              <div class="upsell-item--empty">
                <p>No recently viewed products available.</p>
              </div>
            `;

        // TODO: figure out if I can replace this with Liquid solution and move CSS to asset folder
        this.shadowRoot.innerHTML = `
          <style>
            .upsell-item {
              display: flex;
              padding: 0.8em;
              border: 1px solid #e7e7e7;
              margin-bottom: 0.4em;
            }
            .upsell-item--empty {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .upsell-item__description {
              padding-left: 1em;
              width: 100%;
              display: flex;
              justify-content: space-between;
              flex-direction: column;
            }
            .upsell-item__title {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
            }
            .upsell-item__description h5 {
              margin: 0;
              line-height: 1.2em;
            }
            .upsell-item__description p {
              margin: 0;
              font-size: 12px;
              text-align: right;
            }
            img { max-width: 100px; }
            .upsell-item button {
              width: 100%;
              background-color: #fff;
              border: 1px solid #000;
              border-radius: 0;
              padding: 1em 0;
              box-sizing: border-box;
            }
            .upsell-item button:hover {
              box-shadow: 0px 0px 0px 1px black;
              cursor: pointer;
            }
          </style>
          <div class="upsell-module">
            ${upsellHTML}
          </div>
        `;

        this.addCartListeners();
      }

      addCartListeners() {
        const buttons = this.shadowRoot.querySelectorAll('button');
        buttons.forEach((button) => {
          button.addEventListener('click', (event) => {
            event.preventDefault();
            const productId = event.target.getAttribute('data-id');
            this.addToCart(productId);
          });
        });
      }

      // TODO: render most recently added product inside cartDrawer
      openCartNotification() {
        console.log('Add to cart');

        this.cartDrawer.open();
      }

      updateCartIcon(cartData) {
        // TODO: Right now manually updating cart counter for time's sake
        // There are 2 spans in "cart counter" - so bad accessibility here - there should be an event to handle this
        if (this.cartIcon) {
          this.cartIcon.textContent = cartData.item_count;
        }
      }

      addToCart(productId) {
        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: productId, quantity: 1 }),
        })
          .then(() => {
            this.openCartNotification();

            return fetch('/cart.js');
          })
          .then((response) => response.json())
          .then((cartData) => this.updateCartIcon(cartData))
          .catch((error) => console.error('Error addig to cart:', error));
      }
    }
  );
}
