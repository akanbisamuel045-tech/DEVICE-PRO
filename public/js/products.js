/**
 * DEVICE PRO — Product Listing Page Client Logic
 * Handles catalogue fetching, filtering, sorting, pagination, URL state sync,
 * cart interactions, mobile filter drawer, and UI micro-interactions.
 */

(function () {
  'use strict';

  // State object
  const state = {
    search: '',
    category: 'all',
    brands: [],
    min_price: null,
    max_price: null,
    power_tier: [],
    in_stock: false,
    sort: 'featured',
    page: 1,
    per_page: 12
  };

  // DOM Elements
  const gridContainer = document.getElementById('products-grid-view');
  const countLabel = document.getElementById('products-count-label');
  const paginationNav = document.getElementById('catalogue-pagination');
  const sortSelect = document.getElementById('catalogue-sort');
  const filterForm = document.getElementById('filters-form');
  const searchInput = document.getElementById('sidebar-search-input');
  const priceMinInput = document.getElementById('price-min');
  const priceMaxInput = document.getElementById('price-max');
  const priceSlider = document.getElementById('price-range-slider');
  const btnClearAll = document.getElementById('btn-clear-all');
  const categoryPills = document.querySelectorAll('.category-pill-btn');
  const brandContainer = document.getElementById('brand-checkboxes-container');
  const cartBadges = document.querySelectorAll('.cart-badge');
  const toastContainer = document.getElementById('toast-container');

  // Mobile Drawer elements
  const mobileFilterBtn = document.getElementById('mobile-filter-btn');
  const mobileFilterDrawer = document.getElementById('mobile-filter-drawer');
  const closeMobileFilters = document.getElementById('close-mobile-filters');
  const mobileFiltersContent = document.getElementById('mobile-filters-drawer-content');
  const mobileClearFilters = document.getElementById('mobile-clear-filters');
  const mobileApplyFiltersSubmit = document.getElementById('mobile-apply-filters-submit');

  // Search debounce timer
  let searchDebounceTimeout = null;

  // LocalStorage keys
  const STORAGE_CART_KEY = 'devicepro_cart';

  // Helper: Format Naira currency (e.g. ₦1,250,000)
  function formatNaira(amount) {
    if (typeof amount !== 'number') amount = Number(amount) || 0;
    return new Intl.NumberFormat('en-NG').format(amount);
  }

  // Helper: Toast notification
  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFC400" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // =========================================================================
  // URL QUERY SYNC
  // =========================================================================
  function loadStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('search')) state.search = params.get('search');
    if (params.has('category')) state.category = params.get('category');
    if (params.has('brand')) state.brands = params.get('brand').split(',').filter(Boolean);
    if (params.has('min_price')) state.min_price = Number(params.get('min_price'));
    if (params.has('max_price')) state.max_price = Number(params.get('max_price'));
    if (params.has('power_tier')) state.power_tier = params.get('power_tier').split(',').filter(Boolean);
    if (params.has('in_stock')) state.in_stock = params.get('in_stock') === '1';
    if (params.has('sort')) state.sort = params.get('sort');
    if (params.has('page')) state.page = parseInt(params.get('page'), 10) || 1;
  }

  function syncStateToURL() {
    const params = new URLSearchParams();
    if (state.search) params.set('search', state.search);
    if (state.category && state.category !== 'all') params.set('category', state.category);
    if (state.brands.length) params.set('brand', state.brands.join(','));
    if (state.min_price !== null && state.min_price > 0) params.set('min_price', state.min_price);
    if (state.max_price !== null && state.max_price < 15000000) params.set('max_price', state.max_price);
    if (state.power_tier.length) params.set('power_tier', state.power_tier.join(','));
    if (state.in_stock) params.set('in_stock', '1');
    if (state.sort && state.sort !== 'featured') params.set('sort', state.sort);
    if (state.page > 1) params.set('page', state.page);

    const newQuery = params.toString();
    const newRelativePathQuery = window.location.pathname + (newQuery ? '?' + newQuery : '');
    window.history.pushState(null, '', newRelativePathQuery);
  }

  function syncUIFromState() {
    // 1. Sync category pills
    categoryPills.forEach(pill => {
      const cat = pill.getAttribute('data-category');
      if (cat === state.category) {
        pill.classList.add('active');
        pill.setAttribute('aria-selected', 'true');
      } else {
        pill.classList.remove('active');
        pill.setAttribute('aria-selected', 'false');
      }
    });

    // 2. Sync category checkboxes
    const catCheckboxes = document.querySelectorAll('input[name="category"]');
    catCheckboxes.forEach(cb => {
      if (state.category === 'all') {
        cb.checked = (cb.value === 'all');
      } else {
        cb.checked = (cb.value === state.category);
      }
    });

    // 3. Sync search input
    if (searchInput) searchInput.value = state.search;

    // 4. Sync brand checkboxes
    const brandCheckboxes = document.querySelectorAll('input[name="brand"]');
    brandCheckboxes.forEach(cb => {
      cb.checked = state.brands.includes(cb.value);
    });

    // 5. Sync price inputs
    if (priceMinInput) priceMinInput.value = state.min_price || '';
    if (priceMaxInput) priceMaxInput.value = state.max_price || '';
    if (priceSlider) priceSlider.value = state.max_price || 15000000;

    // 6. Sync power tier checkboxes
    const powerCheckboxes = document.querySelectorAll('input[name="power_tier"]');
    powerCheckboxes.forEach(cb => {
      cb.checked = state.power_tier.includes(cb.value);
    });

    // 7. Sync in_stock
    const stockCheckbox = document.getElementById('avail-check-stock');
    if (stockCheckbox) stockCheckbox.checked = state.in_stock;

    // 8. Sync sort dropdown
    if (sortSelect) sortSelect.value = state.sort;
  }

  // =========================================================================
  // DATA FETCHING & RENDERING
  // =========================================================================
  async function fetchProducts() {
    renderLoadingState();

    try {
      const queryParams = new URLSearchParams();
      if (state.search) queryParams.set('search', state.search);
      if (state.category && state.category !== 'all') queryParams.set('category', state.category);
      if (state.brands.length) queryParams.set('brand', state.brands.join(','));
      if (state.min_price !== null) queryParams.set('min_price', state.min_price);
      if (state.max_price !== null) queryParams.set('max_price', state.max_price);
      if (state.power_tier.length) queryParams.set('power_tier', state.power_tier.join(','));
      if (state.in_stock) queryParams.set('in_stock', '1');
      if (state.sort) queryParams.set('sort', state.sort);
      queryParams.set('page', state.page);
      queryParams.set('per_page', state.per_page);

      const response = await fetch(`/api/products?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to retrieve products catalog');
      }

      renderProducts(data.products, data.total, data.page, data.perPage, data.totalPages);
      renderPagination(data.page, data.totalPages);
      updateCountLabel(data.products.length, data.total);
      syncStateToURL();

    } catch (err) {
      console.error('[CATALOGUE ERROR]:', err);
      renderErrorState(err.message);
    }
  }

  function renderLoadingState() {
    gridContainer.innerHTML = `
      <div class="loading-state-container" id="loading-state">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>Loading verified equipment catalogue...</p>
      </div>
    `;
  }

  function renderErrorState(errorMessage) {
    gridContainer.innerHTML = `
      <div class="error-state-box">
        <h3>Unable to load product catalogue</h3>
        <p>${errorMessage || 'A temporary connection error occurred while loading products.'}</p>
        <button type="button" class="btn-reset-filters" onclick="window.DEVICEPRO_RETRY()">Retry Loading</button>
      </div>
    `;
  }

  window.DEVICEPRO_RETRY = function () {
    fetchProducts();
  };

  function updateCountLabel(currentCount, total) {
    if (!countLabel) return;
    if (total === 0) {
      countLabel.textContent = 'Showing 0 of 0 products';
    } else {
      countLabel.textContent = `Showing ${currentCount} of ${total} products`;
    }
  }



  // Render Product Cards
  function renderProducts(products, total) {
    if (total === 0 || !products || products.length === 0) {
      gridContainer.innerHTML = `
        <div class="no-results-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" style="margin: 0 auto 12px;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3>No matching solar products found</h3>
          <p>Try clearing your active filters, adjusting the price slider, or searching with broader keywords.</p>
          <button type="button" class="btn-reset-filters" id="btn-no-results-reset">Clear All Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById('btn-no-results-reset');
      if (resetBtn) resetBtn.addEventListener('click', handleClearAll);
      return;
    }

    const cardsHtml = products.map(product => {
      const categoryBadge = product.category_label || 'Equipment';

      return `
        <article class="product-card hover-lift reveal-item" data-product-id="${product.id}" data-slug="${product.slug}">
          
          <!-- Top Row: Category Badge -->
          <div class="card-top-row">
            <span class="category-badge-pill">${categoryBadge}</span>
          </div>

          <!-- Product Image -->
          <div class="card-image-wrap hover-scale-wrapper">
            <a href="/products/${product.slug}" title="${product.name}" class="card-image-link">
              <img src="${product.image_url}" alt="${product.name}" class="card-product-img hover-scale-img" loading="lazy">
            </a>
          </div>

          <!-- Brand & Name -->
          <div class="card-brand">${product.brand}</div>
          <h3 class="card-title">
            <a href="/products/${product.slug}" title="${product.name}">${product.name}</a>
          </h3>

          <!-- Specifications -->
          <div class="card-specs">${product.specifications || ''}</div>

          <!-- Price & Availability -->
          <div class="card-bottom-row">
            <div class="card-price">₦${formatNaira(product.price_ngn)}</div>
            <div class="stock-indicator">
              <span class="stock-dot" aria-hidden="true"></span>
              <span>In Stock</span>
            </div>
          </div>

          <!-- Dual Buttons -->
          <div class="card-actions-row">
            <a href="/products/${product.slug}" class="btn-card-details">View Details</a>
            <button type="button" class="btn-card-cart" data-add-cart='${JSON.stringify({
              id: product.id,
              name: product.name,
              brand: product.brand,
              price: product.price_ngn,
              image: product.image_url
            })}'>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span>Add to Cart</span>
            </button>
          </div>

        </article>
      `;
    }).join('');

    gridContainer.innerHTML = cardsHtml;
    if (window.DeviceProAnimation && typeof window.DeviceProAnimation.refresh === 'function') {
      window.DeviceProAnimation.refresh();
    }
  }

  // Render Pagination Controls < 1 2 3 4 5 >
  function renderPagination(currentPage, totalPages) {
    if (!paginationNav) return;
    if (totalPages <= 1) {
      paginationNav.innerHTML = '';
      return;
    }

    let buttonsHtml = '';

    // Previous Arrow Button
    buttonsHtml += `
      <button type="button" class="page-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''} aria-label="Previous page">
        &lt;
      </button>
    `;

    // Page Numbers
    for (let p = 1; p <= totalPages; p++) {
      buttonsHtml += `
        <button type="button" class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}" ${p === currentPage ? 'aria-current="page"' : ''}>
          ${p}
        </button>
      `;
    }

    // Next Arrow Button
    buttonsHtml += `
      <button type="button" class="page-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''} aria-label="Next page">
        &gt;
      </button>
    `;

    paginationNav.innerHTML = buttonsHtml;
  }

  // =========================================================================
  // CART MANAGEMENT (LOCAL STORAGE PERSISTENCE)
  // =========================================================================
  function getCart() {
    if (window.DeviceProCart) {
      return window.DeviceProCart.getItems();
    }
    try {
      return JSON.parse(localStorage.getItem('dp_equipment_cart_v1')) || [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    if (window.DeviceProCart) {
      window.DeviceProCart.saveItems(cart);
      return;
    }
    localStorage.setItem('dp_equipment_cart_v1', JSON.stringify(cart));
    updateCartBadges();
    renderCartDrawerItems();
  }

  function addToCart(productItem) {
    if (window.DeviceProCart) {
      window.DeviceProCart.addItem({
        id: productItem.id,
        name: productItem.name,
        price: productItem.price_ngn || productItem.price,
        image: productItem.image_url || productItem.image,
        slug: productItem.slug
      });
      window.DeviceProCart.openDrawer();
      return;
    }
    const cart = getCart();
    const existingIndex = cart.findIndex(item => item.id === productItem.id);
    if (existingIndex > -1) {
      cart[existingIndex].qty = (cart[existingIndex].qty || 1) + 1;
    } else {
      cart.push({ ...productItem, qty: 1 });
    }
    saveCart(cart);
    showToast(`Added "${productItem.name}" to cart`);
  }

  function removeFromCart(productId) {
    if (window.DeviceProCart) {
      window.DeviceProCart.removeItem(productId);
      return;
    }
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
  }

  function updateCartBadges() {
    if (window.DeviceProCart) {
      window.DeviceProCart.updateBadge();
      return;
    }
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || item.qty || 1), 0);
    cartBadges.forEach(badge => {
      badge.textContent = totalItems;
      badge.setAttribute('aria-label', `${totalItems} items in cart`);
    });
  }

  function renderCartDrawerItems() {
    const drawerBody = document.getElementById('cart-drawer-body');
    const subtotalEl = document.getElementById('cart-subtotal-val');
    const checkoutBtn = document.getElementById('btn-cart-checkout');
    if (!drawerBody) return;

    const cart = getCart();
    if (cart.length === 0) {
      drawerBody.innerHTML = `
        <div class="cart-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <p class="empty-title">Your cart is currently empty</p>
          <p class="empty-desc">Explore our Tier-1 solar panels, inverters, and battery storage solutions.</p>
          <button type="button" class="btn-browse-equip" data-close-drawer>Browse Products →</button>
        </div>
      `;
      if (subtotalEl) subtotalEl.textContent = '₦0';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    let subtotal = 0;
    const itemsHtml = cart.map(item => {
      const itemTotal = (item.price || 0) * (item.qty || 1);
      subtotal += itemTotal;
      return `
        <div class="cart-item-row" data-cart-id="${item.id}">
          <img src="${item.image}" alt="${item.name}" class="cart-item-img">
          <div class="cart-item-info">
            <h4 class="cart-item-title">${item.name}</h4>
            <div class="cart-item-price">₦${formatNaira(item.price)} × ${item.qty}</div>
          </div>
          <button type="button" class="cart-item-remove" data-remove-id="${item.id}" aria-label="Remove item">Remove</button>
        </div>
      `;
    }).join('');

    drawerBody.innerHTML = itemsHtml;
    if (subtotalEl) subtotalEl.textContent = `₦${formatNaira(subtotal)}`;
    if (checkoutBtn) checkoutBtn.disabled = false;
  }

  // =========================================================================
  // EVENT LISTENERS & FILTER HANDLERS
  // =========================================================================

  // 1. Category Pills click handler
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const selectedCategory = pill.getAttribute('data-category');
      state.category = selectedCategory;
      state.page = 1;

      // Sync checkboxes
      const catCheckboxes = document.querySelectorAll('input[name="category"]');
      catCheckboxes.forEach(cb => {
        cb.checked = (cb.value === selectedCategory);
      });

      // Update pills visually
      categoryPills.forEach(p => {
        const isActive = (p.getAttribute('data-category') === selectedCategory);
        p.classList.toggle('active', isActive);
        p.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      fetchProducts();
    });
  });

  // 2. Sidebar category checkboxes
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[name="category"]')) {
      const targetVal = e.target.value;
      if (targetVal === 'all') {
        state.category = 'all';
      } else {
        // Single selection model aligned with category tabs
        state.category = e.target.checked ? targetVal : 'all';
      }
      state.page = 1;
      syncUIFromState();
      fetchProducts();
    }
  });

  // 3. Search input (debounced 350ms)
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => {
        state.search = e.target.value.trim();
        state.page = 1;
        fetchProducts();
      }, 350);
    });
  }

  // 4. Brand checkboxes
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[name="brand"]')) {
      const selectedBrands = Array.from(document.querySelectorAll('input[name="brand"]:checked'))
        .map(cb => cb.value);
      state.brands = selectedBrands;
      state.page = 1;
      fetchProducts();
    }
  });

  // 5. Price Min / Max inputs & Slider
  if (priceSlider) {
    priceSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (priceMaxInput) priceMaxInput.value = val;
      state.max_price = val;
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => {
        state.page = 1;
        fetchProducts();
      }, 400);
    });
  }

  if (priceMinInput) {
    priceMinInput.addEventListener('change', (e) => {
      const val = Number(e.target.value) || 0;
      state.min_price = val;
      state.page = 1;
      fetchProducts();
    });
  }

  if (priceMaxInput) {
    priceMaxInput.addEventListener('change', (e) => {
      const val = Number(e.target.value) || null;
      state.max_price = val;
      if (priceSlider && val) priceSlider.value = val;
      state.page = 1;
      fetchProducts();
    });
  }

  // 6. Power Tier checkboxes
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[name="power_tier"]')) {
      const selectedTiers = Array.from(document.querySelectorAll('input[name="power_tier"]:checked'))
        .map(cb => cb.value);
      state.power_tier = selectedTiers;
      state.page = 1;
      fetchProducts();
    }
  });

  // 7. In Stock checkbox
  const stockCheck = document.getElementById('avail-check-stock');
  if (stockCheck) {
    stockCheck.addEventListener('change', (e) => {
      state.in_stock = e.target.checked;
      state.page = 1;
      fetchProducts();
    });
  }

  // 8. Sorting dropdown
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sort = e.target.value;
      state.page = 1;
      fetchProducts();
    });
  }



  // 10. Clear All Filters handler
  function handleClearAll() {
    state.search = '';
    state.category = 'all';
    state.brands = [];
    state.min_price = null;
    state.max_price = null;
    state.power_tier = [];
    state.in_stock = false;
    state.sort = 'featured';
    state.page = 1;

    syncUIFromState();
    fetchProducts();
  }

  if (btnClearAll) {
    btnClearAll.addEventListener('click', handleClearAll);
  }

  // 11. Pagination clicks (event delegation)
  if (paginationNav) {
    paginationNav.addEventListener('click', (e) => {
      const btn = e.target.closest('.page-btn');
      if (!btn || btn.disabled) return;
      const targetPage = parseInt(btn.getAttribute('data-page'), 10);
      if (targetPage && targetPage !== state.page) {
        state.page = targetPage;
        fetchProducts();
        const mainCat = document.getElementById('main-catalogue');
        if (mainCat) {
          mainCat.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }

  // 12. Add-to-Cart clicks (event delegation)
  gridContainer.addEventListener('click', (e) => {
    // Add to Cart
    const cartBtn = e.target.closest('.btn-card-cart');
    if (cartBtn) {
      try {
        const productData = JSON.parse(cartBtn.getAttribute('data-add-cart'));
        addToCart(productData);
      } catch (err) {
        console.error('Failed to parse cart item payload:', err);
      }
    }
  });

  // 13. Cart Drawer Remove clicks
  const cartDrawerBody = document.getElementById('cart-drawer-body');
  if (cartDrawerBody) {
    cartDrawerBody.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.cart-item-remove');
      if (removeBtn) {
        const pid = parseInt(removeBtn.getAttribute('data-remove-id'), 10);
        removeFromCart(pid);
        showToast('Item removed from cart');
      }
    });
  }

  // 14. Collapsible sidebar filter groups
  document.querySelectorAll('.collapsible-group .filter-group-header').forEach(header => {
    header.addEventListener('click', () => {
      const group = header.closest('.collapsible-group');
      const isOpen = group.classList.toggle('open');
      header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

  // 15. Mobile Filter Drawer
  if (mobileFilterBtn && mobileFilterDrawer) {
    mobileFilterBtn.addEventListener('click', () => {
      // Clone sidebar form into mobile drawer if not already done
      if (mobileFiltersContent && !mobileFiltersContent.children.length && filterForm) {
        const clonedForm = filterForm.cloneNode(true);
        clonedForm.id = 'mobile-cloned-filters-form';
        mobileFiltersContent.appendChild(clonedForm);

        // Bind events on cloned inputs
        clonedForm.addEventListener('change', () => {
          // Sync state from cloned inputs
          const clonedSearch = clonedForm.querySelector('#sidebar-search-input');
          if (clonedSearch) state.search = clonedSearch.value.trim();

          const selectedCat = clonedForm.querySelector('input[name="category"]:checked');
          if (selectedCat) state.category = selectedCat.value;

          const selectedBrands = Array.from(clonedForm.querySelectorAll('input[name="brand"]:checked')).map(cb => cb.value);
          state.brands = selectedBrands;

          const minP = clonedForm.querySelector('#price-min');
          if (minP) state.min_price = Number(minP.value) || null;

          const maxP = clonedForm.querySelector('#price-max');
          if (maxP) state.max_price = Number(maxP.value) || null;

          const selectedTiers = Array.from(clonedForm.querySelectorAll('input[name="power_tier"]:checked')).map(cb => cb.value);
          state.power_tier = selectedTiers;

          const stockCb = clonedForm.querySelector('#avail-check-stock');
          if (stockCb) state.in_stock = stockCb.checked;
        });

        // Bind collapsible groups in cloned form
        clonedForm.querySelectorAll('.collapsible-group .filter-group-header').forEach(h => {
          h.addEventListener('click', () => {
            const grp = h.closest('.collapsible-group');
            grp.classList.toggle('open');
          });
        });
      }

      mobileFilterDrawer.classList.add('open');
    });

    if (closeMobileFilters) {
      closeMobileFilters.addEventListener('click', () => {
        mobileFilterDrawer.classList.remove('open');
      });
    }

    if (mobileClearFilters) {
      mobileClearFilters.addEventListener('click', () => {
        handleClearAll();
        mobileFilterDrawer.classList.remove('open');
      });
    }

    if (mobileApplyFiltersSubmit) {
      mobileApplyFiltersSubmit.addEventListener('click', () => {
        state.page = 1;
        syncUIFromState();
        fetchProducts();
        mobileFilterDrawer.classList.remove('open');
      });
    }
  }

  // 16. Modal Dialogs & Drawers Triggers (Search, Cart, Quote, Mobile Menu)
  document.querySelectorAll('[data-trigger-search]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dialog = document.getElementById('search-dialog');
      if (dialog && typeof dialog.showModal === 'function') {
        dialog.showModal();
        const input = document.getElementById('site-search-input');
        if (input) input.focus();
      }
    });
  });

  document.querySelectorAll('[data-trigger-cart]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.DeviceProCart) {
        window.DeviceProCart.openDrawer();
      } else {
        const drawer = document.getElementById('cart-drawer');
        if (drawer) {
          drawer.classList.add('open');
          renderCartDrawerItems();
        }
      }
    });
  });

  document.querySelectorAll('[data-trigger-quote]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = document.getElementById('quote-modal');
      if (modal && typeof modal.showModal === 'function') {
        modal.showModal();
      }
    });
  });

  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      const drawer = document.getElementById('mobile-nav-drawer');
      if (drawer) drawer.classList.add('open');
    });
  }

  // Close Drawers & Dialogs
  document.querySelectorAll('[data-close-drawer]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));
    });
  });

  document.querySelectorAll('[data-close-dialog]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dialog = btn.closest('dialog');
      if (dialog) dialog.close();
    });
  });

  // Global search dialog submission
  const globalSearchForm = document.getElementById('global-search-form');
  if (globalSearchForm) {
    globalSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('site-search-input');
      if (input && input.value.trim()) {
        state.search = input.value.trim();
        state.page = 1;
        syncUIFromState();
        fetchProducts();
        const dialog = document.getElementById('search-dialog');
        if (dialog) dialog.close();
      }
    });
  }

  // Search popular tags clicks
  document.querySelectorAll('.search-popular-tags .tag-btn').forEach(tagBtn => {
    tagBtn.addEventListener('click', () => {
      const tag = tagBtn.getAttribute('data-tag');
      state.search = tag;
      state.page = 1;
      syncUIFromState();
      fetchProducts();
      const dialog = document.getElementById('search-dialog');
      if (dialog) dialog.close();
    });
  });

  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    loadStateFromURL();
    syncUIFromState();
    fetchProducts();
  });

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  function init() {
    try {
      localStorage.removeItem('devicepro_cart');
    } catch (_) {}
    loadStateFromURL();
    syncUIFromState();
    updateCartBadges();
    fetchProducts();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
