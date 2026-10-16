/**
 * DEVICE PRO — Universal Equipment & Package Cart System
 * Manages localStorage persistence, cart drawer rendering,
 * quantity adjustments, toast notifications, and checkout handoff.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'dp_equipment_cart_v1';

  const DeviceProCart = {
    /**
     * Retrieve all items currently in cart
     */
    getItems: function () {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        console.error('[CART ERROR] Failed to load cart from storage:', e);
        return [];
      }
    },

    /**
     * Save items to storage and notify UI
     */
    saveItems: function (items) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        this.updateBadge();
        this.renderDrawer();
        window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items, count: this.getCount(), subtotal: this.getSubtotal() } }));
      } catch (e) {
        console.error('[CART ERROR] Failed to save cart to storage:', e);
      }
    },

    /**
     * Add a product or package to cart
     */
    addItem: function (item) {
      if (!item || !item.name) return;

      const items = this.getItems();
      const itemId = item.id ? String(item.id) : (item.slug || item.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
      const existing = items.find(i => String(i.id) === itemId);

      const qtyToAdd = Math.max(1, parseInt(item.quantity, 10) || 1);
      const price = parseInt(item.price || item.price_ngn || 0, 10);

      if (existing) {
        existing.quantity += qtyToAdd;
      } else {
        items.push({
          id: itemId,
          slug: item.slug || itemId,
          name: item.name,
          brand: item.brand || 'DEVICE PRO',
          category: item.category || 'equipment',
          price: price,
          image: item.image || item.image_url || '/images/products/jinko-solar-panel.png',
          specifications: item.specifications || '',
          quantity: qtyToAdd
        });
      }

      this.saveItems(items);
      this.showToast(`Added "${item.name}" to cart`);
      this.openDrawer();
    },

    /**
     * Update quantity of item
     */
    updateQuantity: function (id, delta) {
      const items = this.getItems();
      const itemId = String(id);
      const index = items.findIndex(i => String(i.id) === itemId);

      if (index > -1) {
        items[index].quantity += delta;
        if (items[index].quantity <= 0) {
          items.splice(index, 1);
        }
        this.saveItems(items);
      }
    },

    /**
     * Remove item completely
     */
    removeItem: function (id) {
      const items = this.getItems();
      const itemId = String(id);
      const filtered = items.filter(i => String(i.id) !== itemId);
      this.saveItems(filtered);
    },

    /**
     * Clear all cart items
     */
    clearCart: function () {
      localStorage.removeItem(STORAGE_KEY);
      this.updateBadge();
      this.renderDrawer();
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items: [], count: 0, subtotal: 0 } }));
    },

    /**
     * Get total quantity of all items
     */
    getCount: function () {
      const items = this.getItems();
      return items.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 1), 0);
    },

    /**
     * Get total sum in Naira
     */
    getSubtotal: function () {
      const items = this.getItems();
      return items.reduce((sum, item) => sum + ((parseInt(item.price, 10) || 0) * (parseInt(item.quantity, 10) || 1)), 0);
    },

    /**
     * Format currency helper
     */
    formatNaira: function (val) {
      return '₦' + Number(val || 0).toLocaleString('en-NG');
    },

    /**
     * Update all badge counters across the page
     */
    updateBadge: function () {
      const count = this.getCount();
      document.querySelectorAll('.cart-badge, [data-cart-badge]').forEach(badge => {
        badge.textContent = count;
        if (count > 0) {
          badge.style.display = 'inline-flex';
        }
      });
    },

    /**
     * Render items inside any available cart drawer body container
     */
    renderDrawer: function () {
      const drawerBody = document.getElementById('cart-drawer-body') ||
                         document.querySelector('#cart-drawer .drawer-body') ||
                         document.getElementById('cart-items-container');
      const subtotalEl = document.getElementById('cart-subtotal-val') ||
                         document.querySelector('#cart-drawer .cart-subtotal-row span:last-child');
      const checkoutBtn = document.getElementById('btn-cart-checkout') ||
                          document.querySelector('#cart-drawer .btn-checkout-submit, #cart-drawer .btn-cart-checkout');

      if (!drawerBody) return;

      const items = this.getItems();
      const subtotal = this.getSubtotal();

      if (subtotalEl) {
        subtotalEl.textContent = this.formatNaira(subtotal);
      }

      if (checkoutBtn) {
        if (items.length === 0) {
          checkoutBtn.setAttribute('disabled', 'true');
          checkoutBtn.style.opacity = '0.5';
          checkoutBtn.style.cursor = 'not-allowed';
          checkoutBtn.onclick = null;
        } else {
          checkoutBtn.removeAttribute('disabled');
          checkoutBtn.style.opacity = '1';
          checkoutBtn.style.cursor = 'pointer';
          checkoutBtn.onclick = function () {
            window.location.href = '/checkout';
          };
        }
      }

      if (items.length === 0) {
        drawerBody.innerHTML = `
          <div style="text-align:center; padding: 3rem 1.5rem; color: #64748B;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5" style="margin: 0 auto 1rem;">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <p style="font-weight: 700; color: #0F172A; margin: 0 0 0.5rem; font-size: 1.05rem;">Your cart is empty</p>
            <p style="font-size: 0.875rem; margin: 0 0 1.5rem; line-height: 1.5;">Explore our Tier-1 solar panels, inverters, and high-voltage battery storage.</p>
            <a href="/products" class="btn-primary-yellow" style="display:inline-block; padding: 0.75rem 1.5rem; text-decoration:none; border-radius: 9999px; font-weight:700; font-size: 0.875rem; background: #FFC400; color: #061C35;">
              Browse Catalogue →
            </a>
          </div>
        `;
        return;
      }

      let html = '<div class="cart-items-list" style="display: flex; flex-direction: column; gap: 12px; padding: 1rem 0;">';
      items.forEach(item => {
        html += `
          <div class="cart-item-row" data-id="${item.id}" style="display: flex; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid #E2E8F0; align-items: center;">
            <img src="${item.image}" alt="${item.name}" style="width: 56px; height: 56px; object-fit: contain; background: #F8FAFC; border-radius: 8px; padding: 4px; border: 1px solid #E2E8F0; flex-shrink: 0;" onerror="this.src='/images/products/jinko-solar-panel.png'">
            <div style="flex: 1; min-width: 0;">
              <h4 style="margin: 0 0 4px; font-size: 0.875rem; font-weight: 700; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</h4>
              <div style="font-size: 0.8125rem; font-weight: 700; color: #061C35; margin-bottom: 6px;">${this.formatNaira(item.price)}</div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <button type="button" class="cart-qty-btn" data-qty-delta="-1" data-id="${item.id}" style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid #CBD5E1; background: #FFFFFF; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;">−</button>
                <span style="font-size: 0.875rem; font-weight: 700; min-width: 20px; text-align: center;">${item.quantity}</span>
                <button type="button" class="cart-qty-btn" data-qty-delta="1" data-id="${item.id}" style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid #CBD5E1; background: #FFFFFF; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;">+</button>
              </div>
            </div>
            <button type="button" class="cart-remove-btn" data-remove-id="${item.id}" style="background: none; border: none; color: #94A3B8; cursor: pointer; padding: 4px; font-size: 1.1rem; line-height: 1;" title="Remove item">✕</button>
          </div>
        `;
      });
      html += '</div>';

      drawerBody.innerHTML = html;

      // Attach event listeners for quantity buttons and remove buttons
      drawerBody.querySelectorAll('.cart-qty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const delta = parseInt(btn.getAttribute('data-qty-delta'), 10);
          const id = btn.getAttribute('data-id');
          DeviceProCart.updateQuantity(id, delta);
        });
      });

      drawerBody.querySelectorAll('.cart-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = btn.getAttribute('data-remove-id');
          DeviceProCart.removeItem(id);
        });
      });
    },

    /**
     * Show UI Toast
     */
    showToast: function (msg) {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.style.cssText = 'background: #061C35; color: #FFFFFF; border-left: 4px solid #FFC400; padding: 12px 18px; border-radius: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-size: 0.875rem; font-weight: 600; display: flex; align-items: center; gap: 8px; pointer-events: auto; animation: toastIn 0.3s ease;';
      toast.innerHTML = `<span>✓</span> <span>${msg}</span>`;

      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },

    /**
     * Open the cart drawer
     */
    openDrawer: function () {
      const cartDrawer = document.getElementById('cart-drawer');
      const backdrop = document.getElementById('modal-backdrop');

      if (cartDrawer) {
        cartDrawer.classList.add('open');
        cartDrawer.setAttribute('aria-hidden', 'false');
        if (backdrop) backdrop.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    }
  };

  // Expose globally
  window.DeviceProCart = DeviceProCart;

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    DeviceProCart.updateBadge();
    DeviceProCart.renderDrawer();

    // Hook into global buttons with data-add-cart
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-add-cart], [data-add-to-cart], [data-buy-now]');
      if (target) {
        e.preventDefault();
        const id = target.getAttribute('data-id') || target.getAttribute('data-product-id');
        const name = target.getAttribute('data-name') || target.getAttribute('data-product-name');
        const price = target.getAttribute('data-price') || target.getAttribute('data-product-price');
        const image = target.getAttribute('data-image') || target.getAttribute('data-product-image');
        const slug = target.getAttribute('data-slug');

        if (name) {
          DeviceProCart.addItem({ id, name, price, image, slug });
        }
      }
    });
  });
})();
