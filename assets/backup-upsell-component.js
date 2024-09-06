// THis is my original component only solution - realised LIQUID would have better performance

if (!customElements.get('upsell-component')) {
  customElements.define(
    'upsell-component',
    class UpsellComponent extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
      }

      connectedCallback() {
        this.loadRecentlyViewed();
      }

      loadRecentlyViewed() {
        const currentProductHandle = this.getAttribute('product-handle');
        let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];

        recentlyViewed = recentlyViewed.filter((handle) => handle !== currentProductHandle);

        if (!recentlyViewed.includes(currentProductHandle)) {
          recentlyViewed.push(currentProductHandle);
        }

        localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));

        this.fetchProducts(recentlyViewed);
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
        const upsellHTML = products
          .map(
            (product) => `
              <div class="upsell-item">
                <img src="${product.featured_image}" alt="${product.title}">
                <h3>${product.title}</h3>
                <p>${product.price} USD</p>
                <button data-id="${product.variants[0].id}">Add to Cart</button>
              </div>
            `
          )
          .join('');

        // <p>${Shopify.formatMoney(product.price, '{{amount_no_decimals_with_comma_separator}}')} USD</p>

        this.shadowRoot.innerHTML = `
          <style>
            .upsell-item { border: 2px solid red; }
            img { max-width: 100px; }
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

      addToCart(productId) {
        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: productId, quantity: 1 }),
        })
          // .then(() => Shopify.theme.jsCartDrawer.open())
          .then(() => {
            console.log('Add to cart');
            const cartNotification =
              document.querySelector('cart-notification') || document.querySelector('cart-drawer');
            if (cartNotification) {
              console.log('Opening cart');
              cartNotification.classList.add('animate', 'active');
            }
          })
          .catch((error) => console.error('Error adding to cart:', error));
      }
    }
  );
}
