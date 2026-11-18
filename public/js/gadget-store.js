/**
 * DEVICE PRO — Gadget Storefront Landing Controller (/gadget)
 * Powers Category Dropdown, Dual Search -> /gadget/shop, Shop by Category Carousel,
 * Today's Great Deal (2x4 + Live Countdown), New Arrivals 3-Card Carousel,
 * Best Selling Bento, 4-Item Browse All Gadgets Preview (-> /gadget/shop) & DeviceProCart.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const Catalog = window.DeviceProGadgets;
    if (!Catalog) return;

    const state = {
      arrivalPage: 0
    };

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

    const CART_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';

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

    function buildProductCard(item, highlightCartBtn) {
      const url = `/gadget/${encodeURIComponent(item.slug)}`;
      const activeClass = highlightCartBtn ? ' active' : '';
      return `
        <article class="nv-prod-card">
          <div class="nv-prod-stage">
            <span class="nv-prod-cat-tag">${item.brand}</span>
            <button type="button" class="nv-prod-cart-icon${activeClass}" data-add-slug="${item.slug}" title="Add to Cart" aria-label="Add ${item.name} to cart">
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

    function goToShop(paramsObj) {
      const qs = new URLSearchParams();
      Object.entries(paramsObj || {}).forEach(([k, v]) => {
        if (v && v !== 'all') qs.set(k, v);
      });
      const qStr = qs.toString();
      window.location.href = qStr ? `/gadget/shop?${qStr}` : '/gadget/shop';
    }

    // =========================================================================
    // 1. ALL CATEGORY DROPDOWN (-> /gadget/shop)
    // =========================================================================
    const dropBtn = document.getElementById('nv-cat-drop-toggle');
    const dropMenu = document.getElementById('nv-cat-menu');

    if (dropMenu) {
      const cats = Catalog.getCategoriesWithCounts();
      dropMenu.innerHTML = cats.map(c => `
        <a href="${c.id === 'all' ? '/gadget/shop' : `/gadget/shop?category=${encodeURIComponent(c.id)}`}" class="nv-cat-menu-item">
          <span>${c.label}</span>
          <span class="nv-cat-menu-count">${c.count}</span>
        </a>
      `).join('');
    }

    if (dropBtn && dropMenu) {
      dropBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropMenu.classList.toggle('open');
        dropBtn.setAttribute('aria-expanded', String(isOpen));
      });
      document.addEventListener('click', (e) => {
        if (!dropMenu.contains(e.target) && !dropBtn.contains(e.target)) {
          dropMenu.classList.remove('open');
          dropBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // =========================================================================
    // 2. SHOP BY CATEGORY CAROUSEL (-> /gadget/shop?category=...)
    // =========================================================================
    const catStrip = document.getElementById('nv-cat-strip');
    if (catStrip) {
      const cats = Catalog.getCategoriesWithCounts().filter(c => c.id !== 'all');
      catStrip.innerHTML = cats.map(c => `
        <a href="/gadget/shop?category=${encodeURIComponent(c.id)}" class="nv-cat-card">
          <div class="nv-cat-card-top">
            <div>
              <span class="nv-cat-name">${c.label}</span>
              <span class="nv-cat-count">${c.count} ${c.count === 1 ? 'product' : 'products'}</span>
            </div>
            <span class="nv-cat-link">See All →</span>
          </div>
          <img src="${CAT_IMAGES[c.id] || '/images/gadgets/logitech-mx-mouse.jpg'}" alt="${c.label}" loading="lazy">
        </a>
      `).join('');

      const prevBtn = document.getElementById('nv-cat-prev');
      const nextBtn = document.getElementById('nv-cat-next');
      if (prevBtn) prevBtn.addEventListener('click', () => catStrip.scrollBy({ left: -320, behavior: 'smooth' }));
      if (nextBtn) nextBtn.addEventListener('click', () => catStrip.scrollBy({ left: 320, behavior: 'smooth' }));
    }

    // =========================================================================
    // 3. CHECK OUT TODAY'S GREAT DEAL (ROW 1 + LIVE COUNTDOWN + ROW 2)
    // =========================================================================
    const row1El = document.getElementById('nv-deals-row1');
    const row2El = document.getElementById('nv-deals-row2');

    if (row1El) {
      const slugs1 = [
        'logitech-mx-master-3s-wireless-mouse',
        'samsung-galaxy-s25-ultra-5g',
        'apple-airpods-pro-2-usbc',
        'jbl-charge-5-portable-bluetooth-speaker'
      ];
      row1El.innerHTML = slugs1
        .map(s => Catalog.getBySlug(s))
        .filter(Boolean)
        .map((item, idx) => buildProductCard(item, idx === 1))
        .join('');
      wireAddButtons(row1El);
    }

    if (row2El) {
      const slugs2 = [
        'apple-macbook-air-15-m3',
        'sandisk-extreme-portable-ssd-2tb',
        'dell-ultrasharp-27-4k-usbc-hub-monitor',
        'hp-laserjet-pro-mfp-4103fdw-wireless-printer'
      ];
      row2El.innerHTML = slugs2
        .map(s => Catalog.getBySlug(s))
        .filter(Boolean)
        .map(item => buildProductCard(item, false))
        .join('');
      wireAddButtons(row2El);
    }

    // Live Countdown Timer
    const daysEl = document.getElementById('nv-cd-days');
    const hoursEl = document.getElementById('nv-cd-hours');
    const minsEl = document.getElementById('nv-cd-mins');
    const secsEl = document.getElementById('nv-cd-secs');

    if (daysEl && hoursEl && minsEl && secsEl) {
      const targetTime = Date.now() + ((2 * 24 * 3600) + (14 * 3600) + (36 * 60) + 45) * 1000;
      const pad = n => String(Math.max(0, n)).padStart(2, '0');
      function updateTimer() {
        const diff = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
        daysEl.textContent = pad(Math.floor(diff / 86400));
        hoursEl.textContent = pad(Math.floor((diff % 86400) / 3600));
        minsEl.textContent = pad(Math.floor((diff % 3600) / 60));
        secsEl.textContent = pad(diff % 60);
      }
      updateTimer();
      setInterval(updateTimer, 1000);
    }

    // =========================================================================
    // 4. NEW ARRIVAL PRODUCTS (3-CARD OVERLAPPING CAROUSEL)
    // =========================================================================
    const arrivalsGrid = document.getElementById('nv-arrivals-grid');
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
      arrivalsGrid.innerHTML = slice.map(item => buildProductCard(item, false)).join('');
      wireAddButtons(arrivalsGrid);
      arrivalDots.forEach((d, idx) => d.classList.toggle('active', idx === state.arrivalPage));
    }

    arrivalDots.forEach(dot => {
      dot.addEventListener('click', () => {
        state.arrivalPage = parseInt(dot.getAttribute('data-arr-page'), 10) || 0;
        renderArrivals();
      });
    });

    const arrPrev = document.getElementById('nv-arr-prev');
    const arrNext = document.getElementById('nv-arr-next');
    if (arrPrev) arrPrev.addEventListener('click', () => { state.arrivalPage -= 1; renderArrivals(); });
    if (arrNext) arrNext.addEventListener('click', () => { state.arrivalPage += 1; renderArrivals(); });
    renderArrivals();

    // =========================================================================
    // 5. EXPLORE BEST SELLING PRODUCTS (ROW 2: ORANGE PROMO + 3 PRODUCT CARDS)
    // =========================================================================
    const bsRow2 = document.getElementById('nv-bestselling-row2');
    if (bsRow2) {
      const bsSlugs = [
        'oraimo-traveler-40000mah-65w-powerbank',
        'logitech-pebble-2-combo-keyboard-mouse',
        'ugreen-revodok-pro-9in1-usbc-docking-hub'
      ];
      const orangePromoCard = `
        <a href="/gadget/sony-srs-xg300-x-series-bluetooth-speaker" class="nv-orange-promo-card">
          <div>
            <small>Audio &amp; Wireless Deals</small>
            <h3>Save Up To 30% Off</h3>
          </div>
          <img src="/images/gadgets/speaker-bluetooth-navy.jpg" alt="Bluetooth Speakers Deal">
        </a>
      `;
      const cardsHtml = bsSlugs
        .map(s => Catalog.getBySlug(s))
        .filter(Boolean)
        .map(item => buildProductCard(item, false))
        .join('');
      bsRow2.innerHTML = orangePromoCard + cardsHtml;
      wireAddButtons(bsRow2);
    }

    // =========================================================================
    // 6. BROWSE ALL GADGETS PREVIEW (STRICTLY 4 ITEMS -> /gadget/shop)
    // =========================================================================
    const previewGrid = document.getElementById('nv-explorer-preview-grid');
    if (previewGrid) {
      const previewSlugs = [
        'apple-iphone-16-pro-max-256gb',
        'logitech-mx-keys-s-wireless-keyboard',
        'anker-737-powercore-24000mah-140w',
        'epson-ecotank-l3250-wifi-all-in-one-printer'
      ];
      const previewItems = previewSlugs
        .map(s => Catalog.getBySlug(s))
        .filter(Boolean)
        .slice(0, 4);

      previewGrid.innerHTML = previewItems.map(item => buildProductCard(item, false)).join('');
      wireAddButtons(previewGrid);
    }

    // =========================================================================
    // 7. SEARCH FORMS -> DIRECT TO /gadget/shop?q=...
    // =========================================================================
    const headerSearchForm = document.getElementById('nv-header-search-form');
    const headerSearchInput = document.getElementById('nv-header-search-input');
    const discoverSearchForm = document.getElementById('nv-discover-search-form');
    const discoverSearchInput = document.getElementById('nv-discover-search-input');

    if (headerSearchForm) {
      headerSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        goToShop({ q: (headerSearchInput?.value || '').trim() });
      });
    }
    if (discoverSearchForm) {
      discoverSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        goToShop({ q: (discoverSearchInput?.value || '').trim() });
      });
    }

    // Newsletter Feedback
    const nlForm = document.getElementById('nv-newsletter-form');
    if (nlForm) {
      nlForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('nv-newsletter-email');
        if (input) input.value = '';
        if (window.DeviceProCart && typeof window.DeviceProCart.showToast === 'function') {
          window.DeviceProCart.showToast('Subscribed to DEVICE PRO Tech Drop Alerts!');
        }
      });
    }

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
  });
})();
