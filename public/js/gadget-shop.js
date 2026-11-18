/**
 * DEVICE PRO — Full Gadget Product Listing Controller (/gadget/shop)
 * Interactive Category, Brand, Price, Sort, Live Search & DeviceProCart handoff.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const Catalog = window.DeviceProGadgets;
    if (!Catalog) return;

    const urlParams = new URLSearchParams(window.location.search);
    const state = {
      category: urlParams.get('category') || 'all',
      brand: urlParams.get('brand') || 'all',
      search: urlParams.get('q') || '',
      priceRange: urlParams.get('price') || 'all',
      sort: urlParams.get('sort') || 'featured'
    };

    const CART_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';

    const titleEl = document.getElementById('nv-shop-title');
    const bcEl = document.getElementById('nv-shop-bc-label');
    const countEl = document.getElementById('nv-shop-count');
    const catPillsEl = document.getElementById('nv-shop-cat-pills');
    const brandRowEl = document.getElementById('nv-shop-brand-row');
    const gridEl = document.getElementById('nv-shop-grid');
    const priceSelect = document.getElementById('nv-shop-price');
    const sortSelect = document.getElementById('nv-shop-sort');
    const resetBtn = document.getElementById('nv-shop-reset');
    const searchForm = document.getElementById('nv-shop-search-form');
    const searchInput = document.getElementById('nv-shop-search-input');

    if (searchInput && state.search) searchInput.value = state.search;
    if (priceSelect && state.priceRange) priceSelect.value = state.priceRange;
    if (sortSelect && state.sort) sortSelect.value = state.sort;

    function syncUrl() {
      const qs = new URLSearchParams();
      if (state.category !== 'all') qs.set('category', state.category);
      if (state.brand !== 'all') qs.set('brand', state.brand);
      if (state.search.trim()) qs.set('q', state.search.trim());
      if (state.priceRange !== 'all') qs.set('price', state.priceRange);
      if (state.sort !== 'featured') qs.set('sort', state.sort);
      const qStr = qs.toString();
      const nextUrl = qStr ? `/gadget/shop?${qStr}` : '/gadget/shop';
      window.history.replaceState(null, '', nextUrl);
    }

    function addToSharedCart(slug) {
      const g = Catalog.getBySlug(slug);
      if (!g) return;
      if (window.DeviceProCart && typeof window.DeviceProCart.addItem === 'function') {
        window.DeviceProCart.addItem({
          id: g.id,
          slug: g.slug,
          name: g.name,
          brand: g.brand,
          category: g.categoryLabel,
          price: g.price,
          image: g.image,
          specifications: g.shortSpec,
          quantity: 1
        });
      } else {
        window.location.href = `/gadget/${encodeURIComponent(g.slug)}`;
      }
    }

    function buildProductCard(item) {
      const url = `/gadget/${encodeURIComponent(item.slug)}`;
      return `
        <article class="nv-prod-card">
          <div class="nv-prod-stage">
            <span class="nv-prod-cat-tag">${item.brand}</span>
            <button type="button" class="nv-prod-cart-icon" data-add-slug="${item.slug}" title="Add to Cart" aria-label="Add ${item.name} to cart">
              ${CART_ICON}
            </button>
            <a href="${url}" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;" aria-label="View ${item.name}">
              <img src="${item.image}" alt="${item.name}" loading="lazy">
            </a>
          </div>
          <div class="nv-prod-prices">
            <span class="nv-prod-price">${Catalog.formatNaira(item.price)}</span>
            ${item.originalPrice > item.price ? `<span class="nv-prod-old">${Catalog.formatNaira(item.originalPrice)}</span>` : ''}
          </div>
          <h3 class="nv-prod-title"><a href="${url}">${item.name}</a></h3>
          <div class="nv-prod-rating">
            <span class="nv-stars" aria-hidden="true">★★★★★</span>
            <span>${item.rating.toFixed(1)} (${item.reviewCount})</span>
          </div>
        </article>
      `;
    }

    function renderCategoryPills() {
      if (!catPillsEl) return;
      const cats = Catalog.getCategoriesWithCounts();
      catPillsEl.innerHTML = cats.map(c => `
        <button type="button" class="nv-cat-pill ${state.category === c.id ? 'active' : ''}" data-cat="${c.id}">
          ${c.label} (${c.count})
        </button>
      `).join('');

      catPillsEl.querySelectorAll('[data-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.category = btn.getAttribute('data-cat');
          renderCategoryPills();
          renderProducts();
          syncUrl();
        });
      });
    }

    function renderBrands() {
      if (!brandRowEl) return;
      const brands = Catalog.getBrands();
      brandRowEl.innerHTML = [
        `<button type="button" class="nv-brand-chip ${state.brand === 'all' ? 'active' : ''}" data-brand="all">All Brands</button>`,
        ...brands.map(b => `
          <button type="button" class="nv-brand-chip ${state.brand.toLowerCase() === b.name.toLowerCase() ? 'active' : ''}" data-brand="${b.name}">
            ${b.name} (${b.count})
          </button>
        `)
      ].join('');

      brandRowEl.querySelectorAll('[data-brand]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.brand = btn.getAttribute('data-brand');
          renderBrands();
          renderProducts();
          syncUrl();
        });
      });
    }

    function resetFilters() {
      state.category = 'all';
      state.brand = 'all';
      state.search = '';
      state.priceRange = 'all';
      state.sort = 'featured';
      if (searchInput) searchInput.value = '';
      if (priceSelect) priceSelect.value = 'all';
      if (sortSelect) sortSelect.value = 'featured';
      renderCategoryPills();
      renderBrands();
      renderProducts();
      syncUrl();
    }

    function renderProducts() {
      if (!gridEl) return;
      let list = Catalog.getAll();

      if (state.category !== 'all') list = list.filter(g => g.category === state.category);
      if (state.brand !== 'all') list = list.filter(g => g.brand.toLowerCase() === state.brand.toLowerCase());
      if (state.search.trim()) {
        const q = state.search.trim().toLowerCase();
        list = list.filter(g =>
          g.name.toLowerCase().includes(q) ||
          g.brand.toLowerCase().includes(q) ||
          g.categoryLabel.toLowerCase().includes(q) ||
          g.shortSpec.toLowerCase().includes(q)
        );
      }
      if (state.priceRange !== 'all') {
        if (state.priceRange === 'under-150k') list = list.filter(g => g.price < 150000);
        else if (state.priceRange === '150k-400k') list = list.filter(g => g.price >= 150000 && g.price <= 400000);
        else if (state.priceRange === '400k-1m') list = list.filter(g => g.price > 400000 && g.price <= 1000000);
        else if (state.priceRange === 'over-1m') list = list.filter(g => g.price > 1000000);
      }

      if (state.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
      else if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
      else if (state.sort === 'rating') list.sort((a, b) => b.rating - a.rating);
      else if (state.sort === 'discount') list.sort((a, b) => Catalog.getDiscountPct(b.price, b.originalPrice) - Catalog.getDiscountPct(a.price, a.originalPrice));

      const catObj = Catalog.CATEGORIES.find(c => c.id === state.category);
      let heading = catObj && state.category !== 'all' ? catObj.label : 'All Gadgets & Tech';
      if (state.brand !== 'all') heading += ` • ${state.brand}`;
      if (state.search.trim()) heading = `Search: "${state.search.trim()}"`;

      if (titleEl) titleEl.textContent = heading;
      if (bcEl) bcEl.textContent = heading;
      if (countEl) countEl.textContent = `${list.length} ${list.length === 1 ? 'item' : 'items'}`;
      document.title = `${heading} | DEVICE PRO Gadgets Nigeria`;

      const hasActive = state.category !== 'all' || state.brand !== 'all' || state.search.trim() !== '' || state.priceRange !== 'all' || state.sort !== 'featured';
      if (resetBtn) resetBtn.style.display = hasActive ? 'inline-flex' : 'none';

      if (list.length === 0) {
        gridEl.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:48px 16px; color:#6B7280;">
            <p style="margin:0 0 16px; color:#111111; font-size:1rem; font-weight:700;">No matching gadgets found for your filters.</p>
            <button type="button" class="nv-pill-btn solid-orange" id="nv-shop-empty-reset">
              <span>Show All 28 Gadgets</span>
              <span class="nv-circle-arrow">→</span>
            </button>
          </div>
        `;
        const er = document.getElementById('nv-shop-empty-reset');
        if (er) er.addEventListener('click', resetFilters);
        return;
      }

      gridEl.innerHTML = list.map(buildProductCard).join('');
      gridEl.querySelectorAll('[data-add-slug]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          addToSharedCart(btn.getAttribute('data-add-slug'));
        });
      });
    }

    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.search = searchInput ? searchInput.value : '';
        renderProducts();
        syncUrl();
      });
    }
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.search = searchInput.value;
        renderProducts();
        syncUrl();
      });
    }
    if (priceSelect) {
      priceSelect.addEventListener('change', () => {
        state.priceRange = priceSelect.value;
        renderProducts();
        syncUrl();
      });
    }
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        state.sort = sortSelect.value;
        renderProducts();
        syncUrl();
      });
    }
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);

    document.querySelectorAll('[data-quick-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.category = btn.getAttribute('data-quick-cat');
        state.brand = 'all';
        renderCategoryPills();
        renderBrands();
        renderProducts();
        syncUrl();
      });
    });

    document.querySelectorAll('[data-quick-sort]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.sort = btn.getAttribute('data-quick-sort');
        if (sortSelect) sortSelect.value = state.sort;
        renderProducts();
        syncUrl();
      });
    });

    // Mobile Nav Drawer + Backdrop Wiring
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileDrawer = document.getElementById('mobile-nav-drawer');
    const mobileCloseBtn = document.getElementById('mobile-nav-close');
    const backdrop = document.getElementById('modal-backdrop');

    function closeMobileNav() {
      if (mobileDrawer) {
        mobileDrawer.classList.remove('open');
        mobileDrawer.setAttribute('aria-hidden', 'true');
      }
      if (backdrop && !document.getElementById('cart-drawer')?.classList.contains('open')) {
        backdrop.classList.remove('open');
      }
      document.body.style.overflow = '';
    }

    if (mobileMenuBtn && mobileDrawer) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileDrawer.classList.add('open');
        mobileDrawer.setAttribute('aria-hidden', 'false');
        if (backdrop) backdrop.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    }
    if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', closeMobileNav);
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        closeMobileNav();
        if (window.DeviceProCart) window.DeviceProCart.closeDrawer();
      });
    }

    window.refreshLucideIcons = function () {
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    };

    renderCategoryPills();
    renderBrands();
    renderProducts();
  });
})();
