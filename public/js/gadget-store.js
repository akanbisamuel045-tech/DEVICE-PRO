/**
 * DEVICE PRO — Modern Dark-First Gadget Storefront Controller (/gadget)
 * Powers Hero Slider, All Categories Dropdown, Header Search, Best Selling,
 * Trending, Hot Deals (4x2), Circular Collection List, Recommended 3x3 Tabs,
 * Full Catalogue Explorer, and Universal DeviceProCart -> /checkout handoff.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const Catalog = window.DeviceProGadgets;
    if (!Catalog) return;

    const allGadgets = Catalog.getAll();

    const state = {
      category: 'all',
      brand: 'all',
      search: '',
      priceRange: 'all',
      sort: 'featured',
      recTab: 'all'
    };

    // Hydrate from URL params if present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('category')) state.category = urlParams.get('category');
    if (urlParams.get('brand')) state.brand = urlParams.get('brand');
    if (urlParams.get('q')) state.search = urlParams.get('q');
    if (urlParams.get('sort')) state.sort = urlParams.get('sort');

    // Category Showcase Images for Circular Medallions
    const CAT_IMAGES = {
      smartphones: '/images/gadgets/phone-flagship-titanium.jpg',
      laptops: '/images/gadgets/laptop-ultrabook-silver.jpg',
      logitech: '/images/gadgets/logitech-mx-mouse.jpg',
      powerbanks: '/images/gadgets/powerbank-pd-digital.jpg',
      speakers: '/images/gadgets/speaker-bluetooth-navy.jpg',
      monitors: '/images/gadgets/monitor-4k-ultrasharp.jpg',
      printers: '/images/gadgets/printer-wireless-mfp.jpg',
      audio: '/images/gadgets/audio-headphones-anc.jpg',
      accessories: '/images/gadgets/accessories-gan-hub.jpg'
    };

    const CART_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';
    const PLUS_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';

    // Shared Add-to-Cart Helper -> Universal DeviceProCart -> /checkout
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

    // Reusable Sleek Dark Product Card Template
    function buildDarkCard(item) {
      const discount = Catalog.getDiscountPct(item.price, item.originalPrice);
      const url = `/gadget/${encodeURIComponent(item.slug)}`;
      return `
        <article class="gd-card">
          <div class="gd-card-stage">
            ${discount > 0 ? `<span class="gd-discount-tag">-${discount}%</span>` : ''}
            <a href="${url}" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;" aria-label="View ${item.name}">
              <img src="${item.image}" alt="${item.name}" loading="lazy">
            </a>
            <button type="button" class="gd-card-quick-add" data-add-slug="${item.slug}" title="Add to Cart" aria-label="Add ${item.name} to cart">
              ${CART_SVG}
            </button>
          </div>
          <span class="gd-card-brand">${item.brand}</span>
          <h3 class="gd-card-title">
            <a href="${url}">${item.name}</a>
          </h3>
          <div class="gd-card-price-row">
            <span class="gd-card-price">${Catalog.formatNaira(item.price)}</span>
            ${item.originalPrice > item.price ? `<span class="gd-card-old-price">${Catalog.formatNaira(item.originalPrice)}</span>` : ''}
          </div>
        </article>
      `;
    }

    function wireAddButtons(container) {
      if (!container) return;
      container.querySelectorAll('[data-add-slug]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          addToSharedCart(btn.getAttribute('data-add-slug'));
        });
      });
    }

    // =========================================================================
    // 1. HERO 3-SLIDE INTERACTIVE CAROUSEL
    // =========================================================================
    const slides = document.querySelectorAll('.gd-hero-slide');
    const dots = document.querySelectorAll('.gd-slider-dot');
    let activeSlide = 0;

    function goToSlide(idx) {
      activeSlide = (idx + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('active', i === activeSlide));
      dots.forEach((d, i) => d.classList.toggle('active', i === activeSlide));
    }

    dots.forEach(dot => {
      dot.addEventListener('click', () => goToSlide(parseInt(dot.getAttribute('data-dot'), 10) || 0));
    });

    if (slides.length > 1) {
      setInterval(() => goToSlide(activeSlide + 1), 6500);
    }

    // =========================================================================
    // 2. ALL CATEGORIES DROPDOWN
    // =========================================================================
    const allCatsBtn = document.getElementById('gd-all-cats-toggle');
    const allCatsDropdown = document.getElementById('gd-all-cats-dropdown');

    if (allCatsDropdown) {
      const cats = Catalog.getCategoriesWithCounts();
      allCatsDropdown.innerHTML = cats.map(c => `
        <button type="button" class="gd-dropdown-cat-item" data-drop-cat="${c.id}">
          <span>${c.label}</span>
          <span class="gd-dropdown-cat-count">${c.count}</span>
        </button>
      `).join('');

      allCatsDropdown.querySelectorAll('[data-drop-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          jumpToExplorer({ category: btn.getAttribute('data-drop-cat'), brand: 'all' });
          allCatsDropdown.classList.remove('open');
          if (allCatsBtn) allCatsBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    if (allCatsBtn && allCatsDropdown) {
      allCatsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = allCatsDropdown.classList.toggle('open');
        allCatsBtn.setAttribute('aria-expanded', String(isOpen));
      });
      document.addEventListener('click', (e) => {
        if (!allCatsDropdown.contains(e.target) && e.target !== allCatsBtn) {
          allCatsDropdown.classList.remove('open');
          allCatsBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // =========================================================================
    // 3. BEST SELLING PRODUCTS (HOT COLLECTION CARD + 4 PRODUCTS)
    // =========================================================================
    const bestSellingEl = document.getElementById('gd-bestselling-grid');
    if (bestSellingEl) {
      const bestSlugs = [
        'logitech-mx-master-3s-wireless-mouse',
        'anker-prime-27650mah-250w-powerbank',
        'jbl-charge-5-portable-bluetooth-speaker',
        'dell-ultrasharp-27-4k-usbc-hub-monitor'
      ];
      const bestItems = bestSlugs.map(s => Catalog.getBySlug(s)).filter(Boolean);

      const hotCollectionHtml = `
        <a href="/gadget/samsung-galaxy-s25-ultra-5g" class="gd-hot-collection-card">
          <div>
            <h3>Hot Collection</h3>
            <p>Flagship 5G phones, M3 laptops &amp; Logitech MX gear verified sealed in Lagos.</p>
            <span class="gd-hot-cta">Shop Now →</span>
          </div>
          <img src="/images/gadgets/phone-flagship-titanium.jpg" alt="Hot Collection Flagship Smartphones">
        </a>
      `;

      bestSellingEl.innerHTML = hotCollectionHtml + bestItems.map(buildDarkCard).join('');
      wireAddButtons(bestSellingEl);
    }

    // =========================================================================
    // 4. TRENDING THIS WEEK (5-COLUMN PRODUCT ROW)
    // =========================================================================
    const trendingEl = document.getElementById('gd-trending-grid');
    if (trendingEl) {
      const trendingSlugs = [
        'apple-iphone-16-pro-max',
        'apple-macbook-air-15-m3',
        'logitech-mx-keys-s-wireless-keyboard',
        'hp-laserjet-pro-mfp-4103fdw-wireless-printer',
        'sony-wh-1000xm5-wireless-anc-headphones'
      ];
      const trendingItems = trendingSlugs.map(s => Catalog.getBySlug(s)).filter(Boolean);
      trendingEl.innerHTML = trendingItems.map(buildDarkCard).join('');
      wireAddButtons(trendingEl);
    }

    // =========================================================================
    // 5. HOT DEALS (4x2 EIGHT-PRODUCT GRID NEXT TO TALL BANNER)
    // =========================================================================
    const hotDealsEl = document.getElementById('gd-hotdeals-grid');
    if (hotDealsEl) {
      const sortedDeals = allGadgets
        .slice()
        .sort((a, b) => Catalog.getDiscountPct(b.price, b.originalPrice) - Catalog.getDiscountPct(a.price, a.originalPrice))
        .slice(0, 8);
      hotDealsEl.innerHTML = sortedDeals.map(buildDarkCard).join('');
      wireAddButtons(hotDealsEl);
    }

    // =========================================================================
    // 6. COLLECTION LIST (CIRCULAR MEDALLIONS WITH SCROLL ARROWS)
    // =========================================================================
    const collectionStripEl = document.getElementById('gd-collection-strip');
    if (collectionStripEl) {
      const cats = Catalog.getCategoriesWithCounts().filter(c => c.id !== 'all');
      collectionStripEl.innerHTML = cats.map(c => `
        <button type="button" class="gd-circle-cat" data-circle-cat="${c.id}">
          <span class="gd-circle-orb">
            <img src="${CAT_IMAGES[c.id] || '/images/gadgets/logitech-mx-mouse.jpg'}" alt="${c.label}" loading="lazy">
          </span>
          <span class="gd-circle-name">${c.shortLabel || c.label}</span>
          <span class="gd-circle-count">${c.count} ${c.count === 1 ? 'item' : 'items'}</span>
        </button>
      `).join('');

      collectionStripEl.querySelectorAll('[data-circle-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          jumpToExplorer({ category: btn.getAttribute('data-circle-cat'), brand: 'all' });
        });
      });

      const prevBtn = document.getElementById('gd-circle-prev');
      const nextBtn = document.getElementById('gd-circle-next');
      if (prevBtn) prevBtn.addEventListener('click', () => collectionStripEl.scrollBy({ left: -340, behavior: 'smooth' }));
      if (nextBtn) nextBtn.addEventListener('click', () => collectionStripEl.scrollBy({ left: 340, behavior: 'smooth' }));
    }

    // =========================================================================
    // 7. RECOMMENDED FOR YOU (TABS + 3x3 COMPACT HORIZONTAL CARDS)
    // =========================================================================
    const recGridEl = document.getElementById('gd-rec-grid');
    const recTabsEl = document.getElementById('gd-rec-tabs');

    function renderRecommended() {
      if (!recGridEl) return;
      let list = allGadgets.slice();
      if (state.recTab === 'logitech') {
        list = list.filter(g => g.category === 'logitech');
      } else if (state.recTab === 'mobile') {
        list = list.filter(g => g.category === 'smartphones' || g.category === 'laptops');
      } else if (state.recTab === 'power') {
        list = list.filter(g => g.category === 'powerbanks' || g.category === 'accessories');
      } else if (state.recTab === 'desk') {
        list = list.filter(g => g.category === 'monitors' || g.category === 'printers' || g.category === 'speakers' || g.category === 'audio');
      }

      const slice = list.slice(0, 9);
      recGridEl.innerHTML = slice.map(item => {
        const url = `/gadget/${encodeURIComponent(item.slug)}`;
        const discount = Catalog.getDiscountPct(item.price, item.originalPrice);
        return `
          <div class="gd-rec-card">
            <a href="${url}" class="gd-rec-thumb" aria-label="${item.name}">
              <img src="${item.image}" alt="${item.name}" loading="lazy">
            </a>
            <div class="gd-rec-info">
              <a href="${url}" class="gd-rec-name" title="${item.name}">${item.name}</a>
              <div class="gd-rec-price">${Catalog.formatNaira(item.price)}</div>
              <span class="gd-rec-pill">${discount > 0 ? `Save ${discount}% • In Stock` : 'In Stock'}</span>
            </div>
            <button type="button" class="gd-rec-add-btn" data-add-slug="${item.slug}" title="Add to Cart" aria-label="Add ${item.name} to cart">
              ${PLUS_SVG}
            </button>
          </div>
        `;
      }).join('');

      wireAddButtons(recGridEl);
    }

    if (recTabsEl) {
      recTabsEl.querySelectorAll('[data-rec-tab]').forEach(tab => {
        tab.addEventListener('click', () => {
          recTabsEl.querySelectorAll('[data-rec-tab]').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          state.recTab = tab.getAttribute('data-rec-tab');
          renderRecommended();
        });
      });
    }
    renderRecommended();

    // =========================================================================
    // 8. FULL CATALOGUE EXPLORER (SEARCH + CATEGORY + BRAND + PRICE + SORT)
    // =========================================================================
    const explorerTitleEl = document.getElementById('gd-explorer-title');
    const explorerCountEl = document.getElementById('gd-explorer-count');
    const explorerGridEl = document.getElementById('gd-explorer-grid');
    const brandPillsEl = document.getElementById('gd-brand-pills');
    const priceSelect = document.getElementById('gd-price-select');
    const sortSelect = document.getElementById('gd-sort-select');
    const resetBtn = document.getElementById('gd-reset-filters-btn');
    const headerSearchForm = document.getElementById('gd-header-search-form');
    const headerSearchInput = document.getElementById('gd-header-search-input');
    const headerCatSelect = document.getElementById('gd-search-cat-select');

    if (headerSearchInput && state.search) headerSearchInput.value = state.search;
    if (headerCatSelect && state.category) headerCatSelect.value = state.category;
    if (sortSelect && state.sort) sortSelect.value = state.sort;

    function renderBrandPills() {
      if (!brandPillsEl) return;
      const brands = Catalog.getBrands();
      brandPillsEl.innerHTML = [
        `<button type="button" class="gd-brand-pill ${state.brand === 'all' ? 'active' : ''}" data-brand="all">All Brands</button>`,
        ...brands.map(b => `
          <button type="button" class="gd-brand-pill ${state.brand === b.name ? 'active' : ''}" data-brand="${b.name}">
            ${b.name} (${b.count})
          </button>
        `)
      ].join('');

      brandPillsEl.querySelectorAll('[data-brand]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.brand = btn.getAttribute('data-brand');
          renderBrandPills();
          renderExplorer();
        });
      });
    }

    function renderExplorer() {
      if (!explorerGridEl) return;
      let list = Catalog.getAll();

      if (state.category !== 'all') {
        list = list.filter(g => g.category === state.category);
      }
      if (state.brand !== 'all') {
        list = list.filter(g => g.brand.toLowerCase() === state.brand.toLowerCase());
      }
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
      if (explorerTitleEl) {
        let label = catObj && state.category !== 'all' ? catObj.label : 'Explore All Gadgets';
        if (state.brand !== 'all') label += ` • ${state.brand}`;
        if (state.search.trim()) label = `Search: "${state.search.trim()}"`;
        explorerTitleEl.textContent = label;
      }
      if (explorerCountEl) explorerCountEl.textContent = `${list.length} ${list.length === 1 ? 'item' : 'items'}`;

      const hasActive = state.category !== 'all' || state.brand !== 'all' || state.search.trim() !== '' || state.priceRange !== 'all';
      if (resetBtn) resetBtn.style.display = hasActive ? 'inline-flex' : 'none';

      if (list.length === 0) {
        explorerGridEl.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:36px 16px; color:#94A3B8;">
            <p style="margin:0 0 12px; color:#FFFFFF; font-size:1rem;">No matching gadgets found.</p>
            <button type="button" class="gd-btn-hero" id="gd-empty-reset">Show All 28 Gadgets</button>
          </div>
        `;
        const er = document.getElementById('gd-empty-reset');
        if (er) er.addEventListener('click', resetAllFilters);
        return;
      }

      explorerGridEl.innerHTML = list.map(buildDarkCard).join('');
      wireAddButtons(explorerGridEl);
    }

    function resetAllFilters() {
      state.category = 'all';
      state.brand = 'all';
      state.search = '';
      state.priceRange = 'all';
      state.sort = 'featured';
      if (headerSearchInput) headerSearchInput.value = '';
      if (headerCatSelect) headerCatSelect.value = 'all';
      if (priceSelect) priceSelect.value = 'all';
      if (sortSelect) sortSelect.value = 'featured';
      renderBrandPills();
      renderExplorer();
    }

    function jumpToExplorer(updates) {
      if (updates.category !== undefined) state.category = updates.category;
      if (updates.brand !== undefined) state.brand = updates.brand;
      if (updates.sort !== undefined) state.sort = updates.sort;
      if (headerCatSelect) headerCatSelect.value = state.category;
      if (sortSelect) sortSelect.value = state.sort;
      renderBrandPills();
      renderExplorer();
      const target = document.getElementById('gd-explorer-section');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Wire Header Search & Category Controls
    if (headerSearchForm) {
      headerSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.category = headerCatSelect ? headerCatSelect.value : 'all';
        state.search = headerSearchInput ? headerSearchInput.value : '';
        renderBrandPills();
        renderExplorer();
        const target = document.getElementById('gd-explorer-section');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    if (headerCatSelect) {
      headerCatSelect.addEventListener('change', () => {
        state.category = headerCatSelect.value;
        renderExplorer();
      });
    }

    if (priceSelect) priceSelect.addEventListener('change', () => { state.priceRange = priceSelect.value; renderExplorer(); });
    if (sortSelect) sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; renderExplorer(); });
    if (resetBtn) resetBtn.addEventListener('click', resetAllFilters);

    document.querySelectorAll('[data-jump-cat]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        jumpToExplorer({ category: el.getAttribute('data-jump-cat'), brand: 'all' });
      });
    });

    document.querySelectorAll('[data-jump-sort]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        jumpToExplorer({ category: 'all', brand: 'all', sort: el.getAttribute('data-jump-sort') });
      });
    });

    // Newsletter Feedback
    const newsletterForm = document.getElementById('gd-newsletter-form');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('gd-newsletter-email');
        if (input) input.value = '';
        if (window.DeviceProCart && typeof window.DeviceProCart.showToast === 'function') {
          window.DeviceProCart.showToast('Subscribed to DEVICE PRO Tech Drop Alerts!');
        } else {
          alert('Subscribed to DEVICE PRO Tech Drop Alerts!');
        }
      });
    }

    renderBrandPills();
    renderExplorer();

    // Auto-scroll to explorer if user arrived with ?category= or ?q=
    if (urlParams.get('category') || urlParams.get('q')) {
      const target = document.getElementById('gd-explorer-section');
      if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    }
  });
})();
