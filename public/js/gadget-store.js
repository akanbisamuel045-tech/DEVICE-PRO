/**
 * DEVICE PRO — Gadget & Tech Storefront Interactive Controller (/gadget)
 * Handles live search, category/brand/price filtering, sorting, URL sync,
 * and universal DeviceProCart handoff to /checkout.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const Catalog = window.DeviceProGadgets;
    if (!Catalog) {
      console.error('[GADGET STORE] DeviceProGadgets catalog module missing.');
      return;
    }

    const state = {
      category: 'all',
      brand: 'all',
      search: '',
      priceRange: 'all',
      sort: 'featured'
    };

    // Hydrate initial state from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('category')) state.category = urlParams.get('category');
    if (urlParams.get('brand')) state.brand = urlParams.get('brand');
    if (urlParams.get('q')) state.search = urlParams.get('q');
    if (urlParams.get('sort')) state.sort = urlParams.get('sort');

    // DOM Elements
    const categoryRailEl = document.getElementById('gd-category-rail');
    const brandRowEl = document.getElementById('gd-brand-filter-row');
    const productGridEl = document.getElementById('gd-product-grid');
    const resultsTitleEl = document.getElementById('gd-results-title');
    const resultsCountEl = document.getElementById('gd-results-count');
    const heroSearchInput = document.getElementById('gd-hero-search-input');
    const heroSearchForm = document.getElementById('gd-hero-search-form');
    const priceSelect = document.getElementById('gd-price-select');
    const sortSelect = document.getElementById('gd-sort-select');
    const resetBtn = document.getElementById('gd-reset-filters-btn');
    const spotlightSection = document.getElementById('gd-spotlight-section');

    if (heroSearchInput && state.search) heroSearchInput.value = state.search;
    if (sortSelect && state.sort) sortSelect.value = state.sort;

    // SVG Category Icons (crisp, zero external dependency lag)
    const CAT_ICONS = {
      'layout-grid': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
      'smartphone': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
      'laptop': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="20" x2="22" y2="20"></line></svg>',
      'battery-charging': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="18" height="12" rx="2" ry="2"></rect><line x1="23" y1="13" x2="23" y2="11"></line><polyline points="11 6 7 12 13 12 9 18"></polyline></svg>',
      'speaker': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><circle cx="12" cy="14" r="4"></circle><line x1="12" y1="6" x2="12.01" y2="6"></line></svg>',
      'monitor': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
      'printer': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>',
      'keyboard': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10"></path></svg>',
      'headphones': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>',
      'usb': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="1"></circle><circle cx="4" cy="20" r="1"></circle><path d="M4.7 19.3 19 5"></path><path d="m21 3-3 1 2 2Z"></path><path d="M9.26 7.68 5 12l2 5"></path><path d="m10 14 5 2 3.5-3.5"></path><path d="m18 12 1-1 1 1-1 1Z"></path></svg>'
    };

    function syncUrl() {
      try {
        const params = new URLSearchParams();
        if (state.category !== 'all') params.set('category', state.category);
        if (state.brand !== 'all') params.set('brand', state.brand);
        if (state.search.trim()) params.set('q', state.search.trim());
        if (state.sort !== 'featured') params.set('sort', state.sort);
        const query = params.toString();
        const newUrl = window.location.pathname + (query ? `?${query}` : '');
        window.history.replaceState({}, '', newUrl);
      } catch (_) {}
    }

    function renderCategoryRail() {
      if (!categoryRailEl) return;
      const cats = Catalog.getCategoriesWithCounts();
      categoryRailEl.innerHTML = cats.map(cat => `
        <button type="button"
          class="gd-cat-pill ${state.category === cat.id ? 'active' : ''}"
          data-cat="${cat.id}"
          aria-pressed="${state.category === cat.id}">
          ${CAT_ICONS[cat.icon] || ''}
          <span>${cat.label}</span>
          <span class="gd-cat-count">${cat.count}</span>
        </button>
      `).join('');

      categoryRailEl.querySelectorAll('.gd-cat-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          state.category = btn.getAttribute('data-cat');
          state.brand = 'all';
          renderCategoryRail();
          renderBrands();
          renderProducts();
          syncUrl();
        });
      });
    }

    function renderBrands() {
      if (!brandRowEl) return;
      const brands = Catalog.getBrands();
      const chipsHtml = [
        `<button type="button" class="gd-brand-chip ${state.brand === 'all' ? 'active' : ''}" data-brand="all">All Brands</button>`,
        ...brands.map(b => `
          <button type="button" class="gd-brand-chip ${state.brand === b.name ? 'active' : ''}" data-brand="${b.name}">
            ${b.name} (${b.count})
          </button>
        `)
      ].join('');

      brandRowEl.innerHTML = `<span class="gd-brand-label">Brands:</span>${chipsHtml}`;

      brandRowEl.querySelectorAll('.gd-brand-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          state.brand = btn.getAttribute('data-brand');
          renderBrands();
          renderProducts();
          syncUrl();
        });
      });
    }

    function filterAndSort() {
      let list = Catalog.getAll();

      if (state.category && state.category !== 'all') {
        list = list.filter(g => g.category === state.category);
      }

      if (state.brand && state.brand !== 'all') {
        list = list.filter(g => g.brand.toLowerCase() === state.brand.toLowerCase());
      }

      if (state.search && state.search.trim()) {
        const q = state.search.trim().toLowerCase();
        list = list.filter(g =>
          g.name.toLowerCase().includes(q) ||
          g.brand.toLowerCase().includes(q) ||
          g.categoryLabel.toLowerCase().includes(q) ||
          g.shortSpec.toLowerCase().includes(q) ||
          (g.description && g.description.toLowerCase().includes(q))
        );
      }

      if (state.priceRange && state.priceRange !== 'all') {
        if (state.priceRange === 'under-150k') list = list.filter(g => g.price < 150000);
        else if (state.priceRange === '150k-400k') list = list.filter(g => g.price >= 150000 && g.price <= 400000);
        else if (state.priceRange === '400k-1m') list = list.filter(g => g.price > 400000 && g.price <= 1000000);
        else if (state.priceRange === 'over-1m') list = list.filter(g => g.price > 1000000);
      }

      // Sort
      if (state.sort === 'price-asc') {
        list.sort((a, b) => a.price - b.price);
      } else if (state.sort === 'price-desc') {
        list.sort((a, b) => b.price - a.price);
      } else if (state.sort === 'rating') {
        list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      } else if (state.sort === 'discount') {
        list.sort((a, b) => Catalog.getDiscountPct(b.price, b.originalPrice) - Catalog.getDiscountPct(a.price, a.originalPrice));
      } else {
        list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      }

      return list;
    }

    function renderProducts() {
      if (!productGridEl) return;
      const items = filterAndSort();

      // Update header & reset button visibility
      const activeCat = Catalog.CATEGORIES.find(c => c.id === state.category);
      if (resultsTitleEl) {
        let heading = activeCat ? activeCat.label : 'All Gadgets';
        if (state.brand !== 'all') heading += ` • ${state.brand}`;
        if (state.search.trim()) heading = `Results for "${state.search.trim()}"`;
        resultsTitleEl.textContent = heading;
      }
      if (resultsCountEl) {
        resultsCountEl.textContent = `${items.length} ${items.length === 1 ? 'product' : 'products'}`;
      }

      const hasFilters = state.category !== 'all' || state.brand !== 'all' || state.search.trim() !== '' || state.priceRange !== 'all';
      if (resetBtn) {
        resetBtn.classList.toggle('visible', hasFilters);
      }

      // Show Logitech spotlight when browsing All or Logitech without search query
      if (spotlightSection) {
        spotlightSection.style.display = (!state.search.trim() && (state.category === 'all' || state.category === 'logitech')) ? '' : 'none';
      }

      if (items.length === 0) {
        productGridEl.innerHTML = `
          <div class="gd-empty-state">
            <h3>No matching gadgets found</h3>
            <p>Try clearing a filter or searching for another device like Logitech, iPhone, Powerbank, Monitor, or Printer.</p>
            <button type="button" class="gd-btn-gold" id="gd-empty-reset-btn">Show All Gadgets</button>
          </div>
        `;
        const emptyReset = document.getElementById('gd-empty-reset-btn');
        if (emptyReset) emptyReset.addEventListener('click', resetAllFilters);
        return;
      }

      productGridEl.innerHTML = items.map(item => {
        const discount = Catalog.getDiscountPct(item.price, item.originalPrice);
        const badgeClass = `gd-badge-${item.badgeTone || 'blue'}`;
        const detailUrl = `/gadget/${encodeURIComponent(item.slug)}`;

        return `
          <article class="gd-card" data-gadget-id="${item.id}">
            <a href="${detailUrl}" class="gd-card-media" aria-label="View ${item.name}">
              <div class="gd-card-badges">
                <span class="gd-badge ${badgeClass}">${item.badge}</span>
                ${discount > 0 ? `<span class="gd-discount-pill">-${discount}%</span>` : ''}
              </div>
              <img src="${item.image}" alt="${item.name}" class="gd-card-img" loading="lazy">
            </a>
            <div class="gd-card-body">
              <div class="gd-card-meta-row">
                <span class="gd-card-brand">${item.brand}</span>
                <span class="gd-card-rating" aria-label="Rated ${item.rating} out of 5">
                  <span class="star">★</span> ${item.rating.toFixed(1)} <span style="color:#94A3B8;font-weight:600;">(${item.reviewCount})</span>
                </span>
              </div>
              <h3 class="gd-card-title">
                <a href="${detailUrl}">${item.name}</a>
              </h3>
              <p class="gd-card-spec">${item.shortSpec}</p>
              <div class="gd-card-price-block">
                <div class="gd-price-row">
                  <span class="gd-price-now">${Catalog.formatNaira(item.price)}</span>
                  ${item.originalPrice > item.price ? `<span class="gd-price-old">${Catalog.formatNaira(item.originalPrice)}</span>` : ''}
                </div>
                <div class="gd-stock-line">
                  <span class="gd-stock-dot"></span> In Stock • Lagos Dispatch
                </div>
              </div>
              <div class="gd-card-actions">
                <button type="button" class="gd-btn-add" data-add-gadget="${item.slug}">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                  <span>Add to Cart</span>
                </button>
                <a href="${detailUrl}" class="gd-btn-view">Details</a>
              </div>
            </div>
          </article>
        `;
      }).join('');

      // Attach Add to Cart listeners -> Universal DeviceProCart -> /checkout
      productGridEl.querySelectorAll('[data-add-gadget]').forEach(btn => {
        btn.addEventListener('click', () => {
          const slug = btn.getAttribute('data-add-gadget');
          const gadget = Catalog.getBySlug(slug);
          if (!gadget) return;
          addGadgetToSharedCart(gadget);
        });
      });
    }

    function addGadgetToSharedCart(gadget) {
      if (window.DeviceProCart && typeof window.DeviceProCart.addItem === 'function') {
        window.DeviceProCart.addItem({
          id: gadget.id,
          slug: gadget.slug,
          name: gadget.name,
          brand: gadget.brand,
          category: gadget.categoryLabel,
          price: gadget.price,
          image: gadget.image,
          specifications: gadget.shortSpec,
          quantity: 1
        });
      } else {
        // Fallback direct localStorage handoff
        window.location.href = `/gadget/${encodeURIComponent(gadget.slug)}`;
      }
    }

    function resetAllFilters() {
      state.category = 'all';
      state.brand = 'all';
      state.search = '';
      state.priceRange = 'all';
      state.sort = 'featured';
      if (heroSearchInput) heroSearchInput.value = '';
      if (priceSelect) priceSelect.value = 'all';
      if (sortSelect) sortSelect.value = 'featured';
      renderCategoryRail();
      renderBrands();
      renderProducts();
      syncUrl();
    }

    // Event bindings
    if (heroSearchForm) {
      heroSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.search = heroSearchInput ? heroSearchInput.value : '';
        renderProducts();
        syncUrl();
        const catalogEl = document.getElementById('gd-catalog-section');
        if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    if (heroSearchInput) {
      let debounceTimer = null;
      heroSearchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          state.search = heroSearchInput.value;
          renderProducts();
          syncUrl();
        }, 180);
      });
    }

    if (priceSelect) {
      priceSelect.addEventListener('change', () => {
        state.priceRange = priceSelect.value;
        renderProducts();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        state.sort = sortSelect.value;
        renderProducts();
        syncUrl();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', resetAllFilters);
    }

    // Quick hero chips & Spotlight Logitech CTA
    document.querySelectorAll('[data-quick-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.category = btn.getAttribute('data-quick-cat');
        state.brand = 'all';
        state.search = '';
        if (heroSearchInput) heroSearchInput.value = '';
        renderCategoryRail();
        renderBrands();
        renderProducts();
        syncUrl();
        const catalogEl = document.getElementById('gd-catalog-section');
        if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Mobile Nav Drawer Wiring
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileDrawer = document.getElementById('mobile-nav-drawer');
    const mobileOverlay = document.getElementById('mobile-nav-overlay');
    const mobileCloseBtn = document.getElementById('mobile-nav-close');

    function closeMobileNav() {
      if (mobileDrawer) mobileDrawer.classList.remove('open');
      if (mobileOverlay) mobileOverlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    if (mobileMenuBtn && mobileDrawer) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileDrawer.classList.add('open');
        if (mobileOverlay) mobileOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    }
    if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', closeMobileNav);
    if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobileNav);

    // Header Search Focus
    document.querySelectorAll('[data-trigger-search]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (heroSearchInput) {
          heroSearchInput.focus();
          heroSearchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    // Initial Render
    renderCategoryRail();
    renderBrands();
    renderProducts();
  });
})();
