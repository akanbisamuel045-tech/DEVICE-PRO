/**
 * DEVICE PRO — Dedicated Logitech Brand Store Controller (/gadget/logitech)
 * Showcases only official Logitech products (MX Master, Keyboards, G PRO, Webcams).
 * Interactive sub-categories, price filter, sorting, instant search,
 * 1-click MX Executive Desk Suite bundle, and direct checkout via DeviceProCart.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const Catalog = window.DeviceProGadgets;
    if (!Catalog) return;

    const logitechProducts = (typeof Catalog.getLogitech === 'function')
      ? Catalog.getLogitech()
      : Catalog.getAll().filter(g => g.brand.toLowerCase() === 'logitech' || g.category === 'logitech');

    const state = {
      subcat: 'all',
      priceRange: 'all',
      sort: 'featured',
      search: ''
    };

    const CART_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';

    const gridEl = document.getElementById('nv-logi-grid');
    const countEl = document.getElementById('nv-logi-count');
    const headingEl = document.getElementById('nv-logi-heading');
    const priceSelect = document.getElementById('nv-logi-price');
    const sortSelect = document.getElementById('nv-logi-sort');
    const resetBtn = document.getElementById('nv-logi-reset');
    const searchForm = document.getElementById('nv-logi-search-form');
    const searchInput = document.getElementById('nv-logi-search-input');
    const subcatTabs = document.querySelectorAll('[data-subcat]');
    const scrollBtn = document.getElementById('btn-scroll-catalogue');
    const bundleBtn = document.getElementById('btn-add-mx-bundle');

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

    function buyProductNow(slug) {
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
        window.location.href = '/checkout';
      } else {
        window.location.href = `/gadget/${encodeURIComponent(g.slug)}`;
      }
    }

    function buildLogitechCard(item) {
      const url = `/gadget/${encodeURIComponent(item.slug)}`;
      const discount = Catalog.getDiscountPct(item.price, item.originalPrice);
      const stockBadgeText = item.stockCount ? `${item.stockCount} in Stock` : 'In Stock';
      const tagStyle = 'background:#ECFDF5; color:#047857; border:1px solid #A7F3D0;';

      return `
        <article class="nv-prod-card" data-slug="${item.slug}">
          <div class="nv-prod-stage">
            <span class="nv-prod-cat-tag" style="${tagStyle}">${item.badge || 'Logitech Official'}</span>
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
            ${discount > 0 ? `<span style="font-size:0.75rem; font-weight:800; color:#00B8FC; background:rgba(0,184,252,0.12); padding:2px 7px; border-radius:4px;">-${discount}%</span>` : ''}
          </div>
          <h3 class="nv-prod-title"><a href="${url}">${item.name}</a></h3>
          <p style="font-size:0.80rem; color:#6B7280; margin:0 0 6px; line-height:1.4; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;">${item.shortSpec || ''}</p>
          <div class="nv-prod-rating">
            <span class="nv-stars" aria-hidden="true">★★★★★</span>
            <span>${item.rating.toFixed(1)} (${item.reviewCount})</span>
            <span style="margin-left:auto; font-size:0.76rem; color:#16A34A; font-weight:700;">${stockBadgeText}</span>
          </div>
          <div class="nv-prod-action-row">
            <button type="button" class="nv-prod-buy-btn" data-buy-slug="${item.slug}" aria-label="Buy ${item.name} now">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
              <span>Buy Now</span>
            </button>
          </div>
        </article>
      `;
    }

    function matchesSubcat(item, subcat) {
      if (subcat === 'all') return true;
      const s = item.slug.toLowerCase();
      const name = item.name.toLowerCase();
      const spec = (item.shortSpec || '').toLowerCase();
      const sub = (item.subCategory || '').toLowerCase();

      if (subcat === 'instock') {
        return (item.stockCount && item.stockCount > 0) || item.inStock !== false;
      }
      if (subcat === 'mice') {
        return (sub === 'corded' || sub === 'wireless' || sub === 'bluetooth' || sub === 'silent' || sub === 'performance' || sub.includes('mouse') || sub.includes('mice') || s.includes('mouse') || name.includes('mouse') || s.includes('m650') || s.includes('m170') || s.includes('m171') || s.includes('m185') || s.includes('m196') || s.includes('m220') || s.includes('m240') || s.includes('m350s') || s.includes('b100') || s.includes('m90') || s.includes('m100') || s.includes('g502') || s.includes('g102') || s.includes('superlight') || s.includes('lift') || s.includes('anywhere')) && !s.includes('mousepad') && !name.includes('mousepad') && !name.includes('combo') && !s.includes('combo');
      }
      if (subcat === 'keyboards') {
        return s.includes('keyboard') || s.includes('keys') || s.includes('combo') || name.includes('keyboard') || name.includes('combo') || s.includes('k120') || s.includes('k250') || s.includes('mk120') || s.includes('mk235') || s.includes('mk270') || s.includes('mk295') || s.includes('mk330') || s.includes('mk345') || s.includes('mk540') || s.includes('g413');
      }
      if (subcat === 'headsets') {
        return sub === 'headsets' || s.includes('headset') || name.includes('headset') || s.includes('h390') || s.includes('h110') || s.includes('zone') || s.includes('g321') || s.includes('g522');
      }
      if (subcat === 'webcams') {
        return sub === 'webcams' || s.includes('webcam') || s.includes('brio') || s.includes('c920') || s.includes('c270') || name.includes('webcam');
      }
      if (subcat === 'gaming') {
        return sub === 'gaming' || s.includes('gaming') || name.includes('gaming') || s.includes('g-pro') || s.includes('g502') || s.includes('g102') || s.includes('g413') || s.includes('g321') || s.includes('g522') || s.includes('g240') || name.includes('esports');
      }
      if (subcat === 'mx') {
        return s.includes('mx') || name.includes('mx') || sub.includes('mx');
      }
      if (subcat === 'presenter') {
        return s.includes('presenter') || s.includes('r400') || s.includes('mousepad') || s.includes('g240') || name.includes('presenter');
      }
      if (subcat === 'corded') {
        return sub === 'corded' || spec.includes('cord') || name.includes('b100') || name.includes('m90') || name.includes('m100') || name.includes('k120') || name.includes('mk120');
      }
      if (subcat === 'wireless') {
        return (sub === 'wireless' || sub === 'bluetooth' || sub === 'silent' || s.includes('wireless') || s.includes('bluetooth') || name.includes('wireless') || name.includes('bluetooth') || s.includes('lightspeed')) && !name.includes('combo') && !name.includes('keyboard') && !name.includes('headset');
      }
      if (subcat === 'ergo') {
        return s.includes('lift') || s.includes('ergo') || s.includes('m650') || name.includes('ergonomic') || spec.includes('ergonomic');
      }
      return true;
    }

    function renderProducts() {
      if (!gridEl) return;
      let list = logitechProducts.slice();

      if (state.subcat !== 'all') {
        list = list.filter(item => matchesSubcat(item, state.subcat));
      }

      if (state.search.trim()) {
        const q = state.search.trim().toLowerCase();
        list = list.filter(item =>
          item.name.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q) ||
          (item.shortSpec || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
        );
      }

      if (state.priceRange !== 'all') {
        if (state.priceRange === 'under-20k') list = list.filter(g => g.price < 20000);
        else if (state.priceRange === '20k-50k') list = list.filter(g => g.price >= 20000 && g.price <= 50000);
        else if (state.priceRange === '50k-150k') list = list.filter(g => g.price > 50000 && g.price <= 150000);
        else if (state.priceRange === 'over-150k') list = list.filter(g => g.price > 150000);
        else if (state.priceRange === 'under-150k') list = list.filter(g => g.price < 150000);
        else if (state.priceRange === '150k-200k') list = list.filter(g => g.price >= 150000 && g.price <= 200000);
        else if (state.priceRange === 'over-200k') list = list.filter(g => g.price > 200000);
      }

      if (state.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
      else if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
      else if (state.sort === 'rating') list.sort((a, b) => b.rating - a.rating);
      else if (state.sort === 'discount') list.sort((a, b) => Catalog.getDiscountPct(b.price, b.originalPrice) - Catalog.getDiscountPct(a.price, a.originalPrice));

      const subcatLabels = {
        all: 'All In-Stock Logitech Products',
        instock: 'Lagos Warehouse Verified Stock',
        mice: 'Logitech Corded, Wireless & Silent Mice',
        keyboards: 'Logitech Keyboards & Desktop Combos',
        headsets: 'Logitech USB, Stereo & Wireless Headsets',
        webcams: 'Logitech HD & 4K Ultra HD Webcams',
        gaming: 'Logitech G Esports Gaming Peripherals',
        presenter: 'Logitech Wireless Presenters & Gaming Accessories',
        corded: 'Logitech Corded USB Office Mice',
        wireless: 'Logitech Wireless & Bluetooth Mice'
      };

      let heading = subcatLabels[state.subcat] || 'Logitech Gear';
      if (state.search.trim()) heading = `Search Results for "${state.search.trim()}"`;

      if (headingEl) headingEl.textContent = heading;
      if (countEl) countEl.textContent = `${list.length} ${list.length === 1 ? 'item' : 'items'}`;

      const hasActiveFilters = state.subcat !== 'all' || state.priceRange !== 'all' || state.sort !== 'featured' || state.search.trim() !== '';
      if (resetBtn) resetBtn.style.display = hasActiveFilters ? 'inline-flex' : 'none';

      if (list.length === 0) {
        gridEl.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:48px 16px; color:#6B7280;">
            <p style="margin:0 0 14px; color:#111111; font-size:1rem; font-weight:700;">No matching Logitech products found.</p>
            <button type="button" class="nv-logi-pill-btn" id="nv-logi-empty-reset" style="margin:0 auto;">
              <span>Reset &amp; Show All 36 In-Stock Logitech Items</span>
              <span class="nv-circle-arrow">→</span>
            </button>
          </div>
        `;
        const er = document.getElementById('nv-logi-empty-reset');
        if (er) er.addEventListener('click', resetAll);
        return;
      }

      gridEl.innerHTML = list.map(buildLogitechCard).join('');
      gridEl.querySelectorAll('[data-add-slug]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          addToSharedCart(btn.getAttribute('data-add-slug'));
        });
      });
      gridEl.querySelectorAll('[data-buy-slug]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          buyProductNow(btn.getAttribute('data-buy-slug'));
        });
      });
    }

    function resetAll() {
      state.subcat = 'all';
      state.priceRange = 'all';
      state.sort = 'featured';
      state.search = '';
      if (searchInput) searchInput.value = '';
      if (priceSelect) priceSelect.value = 'all';
      if (sortSelect) sortSelect.value = 'featured';
      subcatTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-subcat') === 'all'));
      renderProducts();
    }

    subcatTabs.forEach(tab => {
      const sc = tab.getAttribute('data-subcat');
      if (sc) {
        const cnt = sc === 'all' ? logitechProducts.length : logitechProducts.filter(item => matchesSubcat(item, sc)).length;
        const baseText = tab.textContent.replace(/\s*\(\d+\)/, '').trim();
        tab.textContent = `${baseText} (${cnt})`;
      }
      tab.addEventListener('click', () => {
        state.subcat = tab.getAttribute('data-subcat') || 'all';
        subcatTabs.forEach(t => t.classList.toggle('active', t === tab));
        renderProducts();
      });
    });

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
      });
    }

    if (resetBtn) resetBtn.addEventListener('click', resetAll);

    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.search = searchInput ? searchInput.value : '';
        renderProducts();
      });
    }
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.search = searchInput.value;
        renderProducts();
      });
    }

    document.querySelectorAll('[data-quick-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.subcat = btn.getAttribute('data-quick-filter') || 'all';
        subcatTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-subcat') === state.subcat));
        renderProducts();
        const catSection = document.getElementById('logitech-catalogue');
        if (catSection) catSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    document.querySelectorAll('[data-quick-sort]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.sort = btn.getAttribute('data-quick-sort');
        if (sortSelect) sortSelect.value = state.sort;
        renderProducts();
        const catSection = document.getElementById('logitech-catalogue');
        if (catSection) catSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    if (scrollBtn) {
      scrollBtn.addEventListener('click', () => {
        const catSection = document.getElementById('logitech-catalogue');
        if (catSection) catSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // 1-Click Executive Bundle Add
    if (bundleBtn) {
      bundleBtn.addEventListener('click', () => {
        const keyboard = Catalog.getBySlug('logitech-mx-keys-s-combo');
        const mouse = Catalog.getBySlug('logitech-signature-m650-l-wireless-mouse');

        if (window.DeviceProCart) {
          const items = window.DeviceProCart.getItems();
          if (keyboard) {
            const exK = items.find(i => String(i.id) === String(keyboard.id));
            if (exK) exK.quantity += 1;
            else items.push({
              id: keyboard.id,
              slug: keyboard.slug,
              name: keyboard.name,
              brand: keyboard.brand,
              category: keyboard.categoryLabel,
              price: keyboard.price,
              image: keyboard.image,
              specifications: keyboard.shortSpec,
              quantity: 1
            });
          }
          if (mouse) {
            const exM = items.find(i => String(i.id) === String(mouse.id));
            if (exM) exM.quantity += 1;
            else items.push({
              id: mouse.id,
              slug: mouse.slug,
              name: mouse.name,
              brand: mouse.brand,
              category: mouse.categoryLabel,
              price: mouse.price,
              image: mouse.image,
              specifications: mouse.shortSpec,
              quantity: 1
            });
          }
          window.DeviceProCart.saveItems(items);
          window.DeviceProCart.showToast('Added Logitech MX Keys S Executive Suite to cart!');
          window.DeviceProCart.openDrawer();
        } else {
          window.location.href = '/checkout';
        }
      });
    }

    // Newsletter Feedback
    const nlForm = document.getElementById('nv-logi-newsletter');
    if (nlForm) {
      nlForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('nv-logi-email');
        if (input) input.value = '';
        if (window.DeviceProCart && typeof window.DeviceProCart.showToast === 'function') {
          window.DeviceProCart.showToast('Subscribed to Logitech Drop Alerts!');
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

    
    // =========================================================================
    // HERO SLIDE CARD & HERO CARDS CONTROLLER
    // =========================================================================
    (function initHeroCarousel() {
      const carouselEl = document.getElementById('nv-hero-carousel');
      if (!carouselEl) return;

      const slides = carouselEl.querySelectorAll('.nv-hero-slide');
      const dots = carouselEl.querySelectorAll('.nv-hero-dot');
      const prevBtn = document.getElementById('nv-hero-prev');
      const nextBtn = document.getElementById('nv-hero-next');
      const curCounter = carouselEl.querySelector('#nv-hero-counter .cur');
      const totCounter = carouselEl.querySelector('#nv-hero-counter .tot');

      if (!slides.length) return;
      if (totCounter) totCounter.textContent = String(slides.length).padStart(2, '0');

      let current = 0;
      let timer = null;

      function goToSlide(idx) {
        current = (idx + slides.length) % slides.length;
        slides.forEach((s, i) => s.classList.toggle('active', i === current));
        dots.forEach((d, i) => d.classList.toggle('active', i === current));
        if (curCounter) curCounter.textContent = String(current + 1).padStart(2, '0');
      }

      function nextSlide() {
        goToSlide(current + 1);
      }

      function prevSlide() {
        goToSlide(current - 1);
      }

      function startAutoPlay() {
        stopAutoPlay();
        timer = setInterval(nextSlide, 5000);
      }

      function stopAutoPlay() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.preventDefault();
          nextSlide();
          startAutoPlay();
        });
      }

      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.preventDefault();
          prevSlide();
          startAutoPlay();
        });
      }

      dots.forEach((dot, idx) => {
        dot.addEventListener('click', (e) => {
          e.preventDefault();
          goToSlide(idx);
          startAutoPlay();
        });
      });

      carouselEl.addEventListener('mouseenter', stopAutoPlay);
      carouselEl.addEventListener('mouseleave', startAutoPlay);

      // Touch Swipe Support
      let touchStartX = 0;
      let touchEndX = 0;

      carouselEl.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        stopAutoPlay();
      }, { passive: true });

      carouselEl.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 40) {
          if (diff < 0) nextSlide();
          else prevSlide();
        }
        startAutoPlay();
      }, { passive: true });

      // Quick scroll links inside slides
      document.querySelectorAll('[data-scroll-catalogue]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const catSection = document.getElementById('logitech-catalogue');
          if (catSection) catSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

      startAutoPlay();
    })();

    renderProducts();
  });
})();
