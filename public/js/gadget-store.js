/**
 * DEVICE PRO — Modern White Editorial Gadget Storefront Controller (/gadget)
 * Powers Category Dropdown, Dual Search Forms, Shop by Category Carousel,
 * Today's Great Deals (2x4 + Live Countdown), New Arrivals 3-Card Carousel,
 * Best Selling Bento, Full 28-Product Explorer, Partner Filters & DeviceProCart.
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
      arrivalPage: 0
    };

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('category')) state.category = urlParams.get('category');
    if (urlParams.get('brand')) state.brand = urlParams.get('brand');
    if (urlParams.get('q')) state.search = urlParams.get('q');
    if (urlParams.get('sort')) state.sort = urlParams.get('sort');

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

    const CART_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';

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

    function buildEditorialCard(item) {
      const url = `/gadget/${encodeURIComponent(item.slug)}`;
      return `
        <article class="gd-editorial-card">
          <div class="gd-ed-stage">
            <span class="gd-ed-tag">${item.brand}</span>
            <button type="button" class="gd-ed-cart-btn" data-add-slug="${item.slug}" title="Add to Cart" aria-label="Add ${item.name} to cart">
              ${CART_ICON}
            </button>
            <a href="${url}" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;" aria-label="View ${item.name}">
              <img src="${item.image}" alt="${item.name}" loading="lazy">
            </a>
          </div>
          <div class="gd-ed-price-row">
            <span class="gd-ed-price">${Catalog.formatNaira(item.price)}</span>
            ${item.originalPrice > item.price ? `<span class="gd-ed-old-price">${Catalog.formatNaira(item.originalPrice)}</span>` : ''}
          </div>
          <h3 class="gd-ed-title"><a href="${url}">${item.name}</a></h3>
          <div class="gd-ed-rating">
            <span class="gd-ed-stars" aria-hidden="true">★★★★★</span>
            <span>${item.rating.toFixed(1)} (${item.reviewCount})</span>
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
    // 1. ALL CATEGORY DROPDOWN
    // =========================================================================
    const dropBtn = document.getElementById('gd-cat-drop-toggle');
    const dropMenu = document.getElementById('gd-cat-dropdown');

    if (dropMenu) {
      const cats = Catalog.getCategoriesWithCounts();
      dropMenu.innerHTML = cats.map(c => `
        <button type="button" class="gd-drop-item" data-drop-cat="${c.id}">
          <span>${c.label}</span>
          <span class="gd-drop-count">${c.count}</span>
        </button>
      `).join('');

      dropMenu.querySelectorAll('[data-drop-cat]').forEach(item => {
        item.addEventListener('click', () => {
          jumpToExplorer({ category: item.getAttribute('data-drop-cat'), brand: 'all' });
          dropMenu.classList.remove('open');
          if (dropBtn) dropBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    if (dropBtn && dropMenu) {
      dropBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropMenu.classList.toggle('open');
        dropBtn.setAttribute('aria-expanded', String(isOpen));
      });
      document.addEventListener('click', (e) => {
        if (!dropMenu.contains(e.target) && e.target !== dropBtn) {
          dropMenu.classList.remove('open');
          dropBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // =========================================================================
    // 2. SHOP BY CATEGORY CAROUSEL (4 ROUNDED CARDS + < / > ARROWS)
    // =========================================================================
    const catStrip = document.getElementById('gd-cat-strip');
    if (catStrip) {
      const cats = Catalog.getCategoriesWithCounts().filter(c => c.id !== 'all');
      catStrip.innerHTML = cats.map(c => `
        <button type="button" class="gd-cat-card" data-cat-card="${c.id}">
          <div class="gd-cat-card-top">
            <div style="text-align:left;">
              <span class="gd-cat-card-name">${c.label}</span>
              <span class="gd-cat-card-count">${c.count} ${c.count === 1 ? 'product' : 'products'}</span>
            </div>
            <span class="gd-cat-card-link">See All →</span>
          </div>
          <img src="${CAT_IMAGES[c.id] || '/images/gadgets/logitech-mx-mouse.jpg'}" alt="${c.label}" loading="lazy">
        </button>
      `).join('');

      catStrip.querySelectorAll('[data-cat-card]').forEach(card => {
        card.addEventListener('click', () => {
          jumpToExplorer({ category: card.getAttribute('data-cat-card'), brand: 'all' });
        });
      });

      const prevBtn = document.getElementById('gd-cat-prev');
      const nextBtn = document.getElementById('gd-cat-next');
      if (prevBtn) prevBtn.addEventListener('click', () => catStrip.scrollBy({ left: -340, behavior: 'smooth' }));
      if (nextBtn) nextBtn.addEventListener('click', () => catStrip.scrollBy({ left: 340, behavior: 'smooth' }));
    }

    // =========================================================================
    // 3. CHECK OUT TODAY'S GREAT DEAL (ROW 1 + LIVE COUNTDOWN + ROW 2)
    // =========================================================================
    const row1El = document.getElementById('gd-deals-row1');
    const row2El = document.getElementById('gd-deals-row2');

    if (row1El) {
      const slugs1 = [
        'logitech-mx-master-3s-wireless-mouse',
        'samsung-galaxy-s25-ultra-5g',
        'apple-airpods-pro-2-usbc',
        'jbl-charge-5-portable-bluetooth-speaker'
      ];
      row1El.innerHTML = slugs1.map(s => Catalog.getBySlug(s)).filter(Boolean).map(buildEditorialCard).join('');
      wireAddButtons(row1El);
    }

    if (row2El) {
      const slugs2 = [
        'apple-macbook-air-15-m3',
        'sandisk-extreme-portable-ssd-2tb',
        'dell-ultrasharp-27-4k-usbc-hub-monitor',
        'hp-laserjet-pro-mfp-4103fdw-wireless-printer'
      ];
      row2El.innerHTML = slugs2.map(s => Catalog.getBySlug(s)).filter(Boolean).map(buildEditorialCard).join('');
      wireAddButtons(row2El);
    }

    // Live Ticking Countdown Timer (Persists a 2d 14h rolling promo window)
    const daysEl = document.getElementById('gd-cd-days');
    const hoursEl = document.getElementById('gd-cd-hours');
    const minsEl = document.getElementById('gd-cd-mins');
    const secsEl = document.getElementById('gd-cd-secs');

    if (daysEl && hoursEl && minsEl && secsEl) {
      const targetTime = Date.now() + ((2 * 24 * 3600) + (14 * 3600) + (36 * 60) + 45) * 1000;
      const pad = n => String(Math.max(0, n)).padStart(2, '0');
      function updateTimer() {
        const diff = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
        const d = Math.floor(diff / 86400);
        const h = Math.floor((diff % 86400) / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        daysEl.textContent = pad(d);
        hoursEl.textContent = pad(h);
        minsEl.textContent = pad(m);
        secsEl.textContent = pad(s);
      }
      updateTimer();
      setInterval(updateTimer, 1000);
    }

    // =========================================================================
    // 4. NEW ARRIVAL PRODUCTS (3-CARD OVERLAPPING CAROUSEL)
    // =========================================================================
    const arrivalsGrid = document.getElementById('gd-arrivals-grid');
    const arrivalDots = document.querySelectorAll('[data-arr-page]');
    const arrivalPool = [
      'sony-wh-1000xm5-wireless-anc-headphones',
      'hp-elitebook-840-g10-core-i7',
      'logitech-mx-keys-s-wireless-keyboard',
      'lg-ultragear-27-qhd-165hz-gaming-monitor',
      'anker-prime-100w-gan-3-port-charger',
      'lenovo-thinkpad-x1-carbon-gen-11',
      'epson-ecotank-l3250-wifi-all-in-one-printer',
      'logitech-g-pro-x-superlight-2-gaming-mouse',
      'samsung-smart-monitor-m8-32-4k'
    ].map(s => Catalog.getBySlug(s)).filter(Boolean);

    function renderArrivals() {
      if (!arrivalsGrid) return;
      const totalPages = Math.ceil(arrivalPool.length / 3);
      state.arrivalPage = (state.arrivalPage + totalPages) % totalPages;
      const start = state.arrivalPage * 3;
      const slice = arrivalPool.slice(start, start + 3);
      arrivalsGrid.innerHTML = slice.map(buildEditorialCard).join('');
      wireAddButtons(arrivalsGrid);
      arrivalDots.forEach((d, idx) => d.classList.toggle('active', idx === state.arrivalPage));
    }

    arrivalDots.forEach(dot => {
      dot.addEventListener('click', () => {
        state.arrivalPage = parseInt(dot.getAttribute('data-arr-page'), 10) || 0;
        renderArrivals();
      });
    });

    const arrPrev = document.getElementById('gd-arr-prev');
    const arrNext = document.getElementById('gd-arr-next');
    if (arrPrev) arrPrev.addEventListener('click', () => { state.arrivalPage -= 1; renderArrivals(); });
    if (arrNext) arrNext.addEventListener('click', () => { state.arrivalPage += 1; renderArrivals(); });
    renderArrivals();

    // =========================================================================
    // 5. EXPLORE BEST SELLING PRODUCTS (ROW 2: GOLD PROMO + 3 EDITORIAL CARDS)
    // =========================================================================
    const bsRow2 = document.getElementById('gd-bestselling-row2');
    if (bsRow2) {
      const bsSlugs = [
        'oraimo-traveler-40000mah-65w-powerbank',
        'logitech-pebble-2-combo-keyboard-mouse',
        'ugreen-revodok-pro-9in1-usbc-docking-hub'
      ];
      const goldCard = `
        <a href="/gadget/sony-srs-xg300-x-series-bluetooth-speaker" class="gd-gold-promo-card">
          <div>
            <small>Audio &amp; Bass Deals</small>
            <h3>Save Up To 20% Off</h3>
          </div>
          <img src="/images/gadgets/speaker-bluetooth-navy.jpg" alt="Bluetooth Speakers Deal">
        </a>
      `;
      const cardsHtml = bsSlugs.map(s => Catalog.getBySlug(s)).filter(Boolean).map(buildEditorialCard).join('');
      bsRow2.innerHTML = goldCard + cardsHtml;
      wireAddButtons(bsRow2);
    }

    // =========================================================================
    // 6. FULL CATALOGUE EXPLORER (28 PRODUCTS + SEARCH + BRAND + PRICE + SORT)
    // =========================================================================
    const explorerTitleEl = document.getElementById('gd-explorer-title');
    const explorerCountEl = document.getElementById('gd-explorer-count');
    const explorerGridEl = document.getElementById('gd-explorer-grid');
    const brandRowEl = document.getElementById('gd-brand-row');
    const priceSelect = document.getElementById('gd-price-select');
    const sortSelect = document.getElementById('gd-sort-select');
    const resetBtn = document.getElementById('gd-reset-filters-btn');
    const headerSearchForm = document.getElementById('gd-header-search-form');
    const headerSearchInput = document.getElementById('gd-header-search-input');
    const discoverSearchForm = document.getElementById('gd-discover-search-form');
    const discoverSearchInput = document.getElementById('gd-discover-search-input');

    if (headerSearchInput && state.search) headerSearchInput.value = state.search;
    if (sortSelect && state.sort) sortSelect.value = state.sort;

    function renderBrands() {
      if (!brandRowEl) return;
      const brands = Catalog.getBrands();
      brandRowEl.innerHTML = [
        `<button type="button" class="gd-brand-chip ${state.brand === 'all' ? 'active' : ''}" data-brand="all">All Brands</button>`,
        ...brands.map(b => `
          <button type="button" class="gd-brand-chip ${state.brand === b.name ? 'active' : ''}" data-brand="${b.name}">
            ${b.name} (${b.count})
          </button>
        `)
      ].join('');

      brandRowEl.querySelectorAll('[data-brand]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.brand = btn.getAttribute('data-brand');
          renderBrands();
          renderExplorer();
        });
      });
    }

    function renderExplorer() {
      if (!explorerGridEl) return;
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
      if (explorerTitleEl) {
        let label = catObj && state.category !== 'all' ? catObj.label : 'Browse All Gadgets';
        if (state.brand !== 'all') label += ` • ${state.brand}`;
        if (state.search.trim()) label = `Results for "${state.search.trim()}"`;
        explorerTitleEl.textContent = label;
      }
      if (explorerCountEl) explorerCountEl.textContent = `${list.length} ${list.length === 1 ? 'item' : 'items'}`;

      const hasActive = state.category !== 'all' || state.brand !== 'all' || state.search.trim() !== '' || state.priceRange !== 'all';
      if (resetBtn) resetBtn.style.display = hasActive ? 'inline-flex' : 'none';

      if (list.length === 0) {
        explorerGridEl.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:36px 16px; color:#475569;">
            <p style="margin:0 0 14px; color:#061C35; font-size:1rem;">No matching gadgets found.</p>
            <button type="button" class="gd-pill-cta gold-cta" id="gd-empty-reset"><span>Show All 28 Gadgets</span><span class="gd-cta-circle">→</span></button>
          </div>
        `;
        const er = document.getElementById('gd-empty-reset');
        if (er) er.addEventListener('click', resetAllFilters);
        return;
      }

      explorerGridEl.innerHTML = list.map(buildEditorialCard).join('');
      wireAddButtons(explorerGridEl);
    }

    function resetAllFilters() {
      state.category = 'all';
      state.brand = 'all';
      state.search = '';
      state.priceRange = 'all';
      state.sort = 'featured';
      if (headerSearchInput) headerSearchInput.value = '';
      if (discoverSearchInput) discoverSearchInput.value = '';
      if (priceSelect) priceSelect.value = 'all';
      if (sortSelect) sortSelect.value = 'featured';
      renderBrands();
      renderExplorer();
    }

    function jumpToExplorer(updates) {
      if (updates.category !== undefined) state.category = updates.category;
      if (updates.brand !== undefined) state.brand = updates.brand;
      if (updates.search !== undefined) state.search = updates.search;
      if (updates.sort !== undefined) state.sort = updates.sort;
      if (sortSelect) sortSelect.value = state.sort;
      renderBrands();
      renderExplorer();
      const target = document.getElementById('gd-explorer-section');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Wire Search Forms
    if (headerSearchForm) {
      headerSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        jumpToExplorer({ search: headerSearchInput ? headerSearchInput.value : '', category: 'all', brand: 'all' });
      });
    }
    if (discoverSearchForm) {
      discoverSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = discoverSearchInput ? discoverSearchInput.value : '';
        if (headerSearchInput) headerSearchInput.value = q;
        jumpToExplorer({ search: q, category: 'all', brand: 'all' });
      });
    }

    if (priceSelect) priceSelect.addEventListener('change', () => { state.priceRange = priceSelect.value; renderExplorer(); });
    if (sortSelect) sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; renderExplorer(); });
    if (resetBtn) resetBtn.addEventListener('click', resetAllFilters);

    document.querySelectorAll('[data-jump-cat]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        jumpToExplorer({ category: el.getAttribute('data-jump-cat'), brand: 'all', search: '' });
      });
    });

    document.querySelectorAll('[data-jump-sort]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        jumpToExplorer({ category: 'all', brand: 'all', sort: el.getAttribute('data-jump-sort') });
      });
    });

    document.querySelectorAll('[data-partner-brand]').forEach(btn => {
      btn.addEventListener('click', () => {
        jumpToExplorer({ category: 'all', brand: btn.getAttribute('data-partner-brand'), search: '' });
      });
    });

    // Newsletter Feedback
    const nlForm = document.getElementById('gd-newsletter-form');
    if (nlForm) {
      nlForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('gd-newsletter-email');
        if (input) input.value = '';
        if (window.DeviceProCart && typeof window.DeviceProCart.showToast === 'function') {
          window.DeviceProCart.showToast('Subscribed to DEVICE PRO Tech Drop Alerts!');
        }
      });
    }

    renderBrands();
    renderExplorer();

    if (urlParams.get('category') || urlParams.get('q') || urlParams.get('brand')) {
      const target = document.getElementById('gd-explorer-section');
      if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    }
  });
})();
