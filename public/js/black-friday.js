/**
 * DEVICE PRO — Black Friday 2026 Interactive Engine
 * Handles Countdown Timer, Wattage Filtering, Quick Order Modal, and WhatsApp Dispatch
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. DATA DICTIONARY: THE 10 BLACK FRIDAY POWER STATION BUNDLES
  // =========================================================================
  const BLACK_FRIDAY_PACKAGES = [
    {
      id: 'bf-hicces-300',
      brand: 'Hicces',
      model: 'Hicces 300W Solar Power Station',
      rating: '300W Output Pure Sine Wave',
      tier: 'under-1000',
      battery: '1000Wh Battery Capacity',
      solar: '1 × 585W Tier-1 Monocrystalline Panel',
      solarWatts: '585W Solar Array Included',
      finalPrice: 324000,
      marketValue: 450000,
      savings: 126000,
      savingsPct: '28%',
      colorTheme: 'bg-teal',
      image: '/images/products/hicces-500w.jpg',
      badge: 'STARTER COMBO',
      powers: 'Laptops, Starlink Router, Phones, Lighting, LED TV, Clippers',
      runtime: 'Continuous day & night power for work essentials'
    },
    {
      id: 'bf-hicces-500',
      brand: 'Hicces',
      model: 'Hicces 500W Solar Power Station',
      rating: '500W Output Pure Sine Wave',
      tier: 'under-1000',
      battery: '1000Wh Battery Capacity',
      solar: '1 × 585W Tier-1 Monocrystalline Panel',
      solarWatts: '585W Solar Array Included',
      finalPrice: 372000,
      marketValue: 520000,
      savings: 148000,
      savingsPct: '28%',
      colorTheme: 'bg-crimson',
      image: '/images/products/hicces-500w.jpg',
      badge: 'TOP VALUE COMBO',
      powers: 'TV + Decoder + Standing Fans + Workstations + Blender',
      runtime: 'Full workday power station for remote professionals'
    },
    {
      id: 'bf-coloar-1000-pro',
      brand: 'Coloar Solar',
      model: 'Coloar 1000 Pro Solar Power Station',
      rating: '300W Output Pure Sine Wave',
      tier: 'under-1000',
      battery: '1000Wh LiFePO4 Battery Bank',
      solar: '1 × 585W Tier-1 Monocrystalline Panel',
      solarWatts: '585W Solar Array Included',
      finalPrice: 375000,
      marketValue: 535000,
      savings: 160000,
      savingsPct: '30%',
      colorTheme: 'bg-amber',
      image: '/images/products/colar-1000-pro.webp',
      badge: 'BESTSELLER COMBO',
      powers: 'Fans, Laptops, LED TV, Soundbar, Smart Home',
      runtime: 'Smooth quiet electricity with 1000Wh deep storage'
    },
    {
      id: 'bf-itel-500',
      brand: 'itel Energy',
      model: 'itel 500W PowerTank Station',
      rating: '500W Output Pure Sine Wave',
      tier: 'under-1000',
      battery: '1000Wh High-Capacity PowerTank',
      solar: '1 × 585W Tier-1 Monocrystalline Panel',
      solarWatts: '585W Solar Array Included',
      finalPrice: 388000,
      marketValue: 550000,
      savings: 162000,
      savingsPct: '29%',
      colorTheme: 'bg-navy',
      image: '/images/products/itel-powertank-500w.webp',
      badge: 'OFFICIAL ITEL COMBO',
      powers: '43" Smart TV + Decoder + 2 Standing Fans + Wi-Fi',
      runtime: 'Certified itel durability with 0dB silent operation'
    },
    {
      id: 'bf-coloar-1000-plus',
      brand: 'Coloar Solar',
      model: 'Coloar 1000 Plus Solar Power Station',
      rating: '500W Output Pure Sine Wave',
      tier: 'under-1000',
      battery: '1000Wh LiFePO4 Battery Bank',
      solar: '1 × 585W Tier-1 Monocrystalline Panel',
      solarWatts: '585W Solar Array Included',
      finalPrice: 392000,
      marketValue: 560000,
      savings: 168000,
      savingsPct: '30%',
      colorTheme: 'bg-purple',
      image: '/images/products/colar-1000.webp',
      badge: 'EXTENDED RUNTIME',
      powers: 'Home Entertainment + Lighting + 3 Standing Fans + Laptops',
      runtime: 'All-night uninterrupted fan and lighting support'
    },
    {
      id: 'bf-hithium-2-single',
      brand: 'Hithium',
      model: 'Hithium 2 Solar Kit (1-Panel)',
      rating: '1000W Output Pure Sine Wave',
      tier: 'over-1000',
      battery: '2000Wh EV-Grade LiFePO4 Capacity',
      solar: '1 × 585W Tier-1 Monocrystalline Panel',
      solarWatts: '585W High-Irradiance Solar Panel',
      finalPrice: 612000,
      marketValue: 850000,
      savings: 238000,
      savingsPct: '28%',
      colorTheme: 'bg-mint',
      image: '/images/products/hithium-hero-ee2.png',
      badge: 'EV-GRADE CELLS',
      powers: 'Double-Door Fridge + 55" TV + Blender + Desktop PC',
      runtime: 'Over 4,000 battery cycles (10+ years lifetime)'
    },
    {
      id: 'bf-hithium-2-dual',
      brand: 'Hithium',
      model: 'Hithium 2 Solar Kit (Dual-Panel Rapid)',
      rating: '1000W Output Pure Sine Wave',
      tier: 'over-1000',
      battery: '2000Wh EV-Grade LiFePO4 Capacity',
      solar: '2 × 585W Panels (1,170W Solar Array)',
      solarWatts: '1,170W Massive Dual Solar Array',
      finalPrice: 724000,
      marketValue: 1020000,
      savings: 296000,
      savingsPct: '29%',
      colorTheme: 'bg-amber',
      image: '/images/products/hithium-hero-ee2.png',
      badge: 'RAPID CHARGE COMBO',
      powers: 'Full Flat Lighting + TV + Fridge + Freezer + Workstations',
      runtime: 'Charges in under 90 minutes with 1,170W dual solar input'
    },
    {
      id: 'bf-hicces-1000',
      brand: 'Hicces',
      model: 'Hicces 1000W Solar Power Station',
      rating: '1000W Output Pure Sine Wave',
      tier: 'over-1000',
      battery: '2000Wh Battery Capacity',
      solar: '2 × 585W Panels (1,170W Solar Array)',
      solarWatts: '1,170W Dual Solar Array Included',
      finalPrice: 754000,
      marketValue: 1050000,
      savings: 296000,
      savingsPct: '28%',
      colorTheme: 'bg-teal',
      image: '/images/products/hicces-500w.jpg',
      badge: 'HEAVY ESSENTIALS',
      powers: 'Office Equipment, Deep Freezer, Sewing Machine, Sound',
      runtime: 'Reliable all-day power for SMEs and residential clinics'
    },
    {
      id: 'bf-coloar-2000',
      brand: 'Coloar Solar',
      model: 'Coloar 2000 Heavy-Duty Power Station',
      rating: '1000W Output Pure Sine Wave',
      tier: 'over-1000',
      battery: '2000Wh High-Capacity LiFePO4',
      solar: '2 × 585W Panels (1,170W Solar Array)',
      solarWatts: '1,170W Dual Monocrystalline Array',
      finalPrice: 782000,
      marketValue: 1100000,
      savings: 318000,
      savingsPct: '29%',
      colorTheme: 'bg-crimson',
      image: '/images/products/colar-2000.webp',
      badge: '🔥 FLASH DEAL HERO',
      powers: 'Freezer + TV + Fans + Laptops + Medical & Office Loads',
      runtime: 'Replaces noisy generator with 0dB silent solar power'
    },
    {
      id: 'bf-coloar-3600',
      brand: 'Coloar Solar',
      model: 'Coloar 3600 Ultimate Solar Powerhouse',
      rating: '1200W Output Pure Sine Wave',
      tier: 'over-1000',
      battery: '3600Wh Expandable LiFePO4 Storage',
      solar: '3 × 585W Panels (1,755W Mega Solar Array)',
      solarWatts: '1,755W Triple Solar Array Included',
      finalPrice: 1136000,
      marketValue: 1600000,
      savings: 464000,
      savingsPct: '29%',
      colorTheme: 'bg-navy',
      image: '/images/products/colar-3600.webp',
      badge: '👑 KING OF CAPACITY',
      powers: 'Pumps, Refrigerators, Multiple Rooms & Clinic Workstations',
      runtime: 'Massive 3600Wh energy storage for multi-day reliability'
    }
  ];

  // Helper: Format Naira
  function formatNgn(num) {
    return '₦' + Number(num).toLocaleString('en-NG');
  }

  // =========================================================================
  // 2. LIVE COUNTDOWN TIMER (DAYS, HOURS, MINUTES, SECONDS)
  // =========================================================================
  function initCountdown() {
    const daysEl = document.getElementById('bf-days');
    const hoursEl = document.getElementById('bf-hours');
    const minsEl = document.getElementById('bf-mins');
    const secsEl = document.getElementById('bf-secs');

    if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

    // Set countdown target to Friday midnight WAT (or 3 days from now)
    const now = new Date();
    let target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 23, 59, 59);

    function update() {
      const diff = target - new Date();
      if (diff <= 0) {
        daysEl.textContent = '00';
        hoursEl.textContent = '00';
        minsEl.textContent = '00';
        secsEl.textContent = '00';
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      daysEl.textContent = String(d).padStart(2, '0');
      hoursEl.textContent = String(h).padStart(2, '0');
      minsEl.textContent = String(m).padStart(2, '0');
      secsEl.textContent = String(s).padStart(2, '0');
    }

    update();
    setInterval(update, 1000);
  }

  // =========================================================================
  // 3. RENDER CATALOG CARDS & FILTER TABS
  // =========================================================================
  function renderProducts(filter) {
    const grid = document.getElementById('bf-products-grid');
    if (!grid) return;

    const filtered = filter === 'all'
      ? BLACK_FRIDAY_PACKAGES
      : BLACK_FRIDAY_PACKAGES.filter(p => p.tier === filter);

    grid.innerHTML = filtered.map(pkg => `
      <article class="bf-product-card" data-package-id="${pkg.id}">
        <!-- Top Visual Hero Block with Ripped Color Gradient -->
        <a href="/black-friday-detail.html?id=${pkg.id}" class="bf-card-hero ${pkg.colorTheme}" style="display:flex; align-items:center; justify-content:center; text-decoration:none;" title="View ${pkg.model} Full Specifications">
          <span class="bf-card-badge-save">SAVE ${pkg.savingsPct}</span>
          <span class="bf-card-badge-delivery">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.19M15 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3.19"/><path d="M23 13v3a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
            FREE DELIVERY
          </span>

          <img src="${pkg.image}" alt="${pkg.model}" class="bf-card-product-img" loading="lazy">

          <!-- Torn Edge SVG Divider -->
          <svg class="bf-card-torn-divider" viewBox="0 0 500 24" preserveAspectRatio="none">
            <path d="M0,0 L0,12 Q20,22 45,10 Q80,24 110,8 Q150,22 185,12 Q225,24 260,10 Q300,22 340,12 Q385,24 420,10 Q460,22 500,12 L500,24 L0,24 Z" />
          </svg>
        </a>

        <!-- Card Body -->
        <div class="bf-card-body">
          <div class="bf-card-brand-row">
            <span class="bf-card-brand-label">${pkg.brand}</span>
            <span class="bf-card-solar-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ${pkg.solar}
            </span>
          </div>

          <h3 class="bf-card-name">
            <a href="/black-friday-detail.html?id=${pkg.id}" style="color:inherit; text-decoration:none;" title="View ${pkg.model} Full Specifications">
              ${pkg.model}
            </a>
          </h3>

          <ul class="bf-card-specs-list">
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <strong>Rating:</strong> ${pkg.rating}
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <strong>Storage:</strong> ${pkg.battery}
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <strong>Loads:</strong> ${pkg.powers}
            </li>
          </ul>

          <!-- Pricing Box -->
          <div class="bf-pricing-box">
            <div class="bf-price-row-top">
              <span class="bf-price-label">Complete Solar Combo Price</span>
              <span class="bf-price-strikethrough">${formatNgn(pkg.marketValue)}</span>
            </div>
            <div class="bf-price-final-row">
              <span class="bf-price-main">${formatNgn(pkg.finalPrice)}</span>
              <span class="bf-delivery-included-tag">Free Lagos &amp; Ibadan Freight</span>
            </div>
            <div style="font-size: 0.75rem; color: #475569; margin-top: 6px; font-weight: 600;">
              ⚡ All-in-One: Power Station + ${pkg.solar}
            </div>
          </div>

          <!-- View Full Details Link -->
          <a href="/black-friday-detail.html?id=${pkg.id}" class="btn-card-view-details" style="display:flex; align-items:center; justify-content:center; gap:6px; width:100%; margin-bottom:10px; padding:9px 12px; background:#F8FAFC; border:1px solid #CBD5E1; border-radius:8px; color:#0F172A; font-weight:700; font-size:0.82rem; text-decoration:none; transition:all 0.2s ease;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0157A2" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            View Specs &amp; Details →
          </a>

          <!-- Actions -->
          <div class="bf-card-actions">
            <button type="button" class="btn-card-whatsapp" data-order-whatsapp="${pkg.id}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
              WhatsApp
            </button>
            <button type="button" class="btn-card-buy" data-open-modal="${pkg.id}">
              Order Now →
            </button>
          </div>
        </div>
      </article>
    `).join('');

    bindProductActions();
    observeNewCards();
  }

  // =========================================================================
  // 4. FILTER TABS HANDLER
  // =========================================================================
  function initFilterTabs() {
    const tabs = document.querySelectorAll('.bf-filter-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.getAttribute('data-filter') || 'all';
        renderProducts(filter);
      });
    });
  }

  // =========================================================================
  // 5. QUICK ORDER MODAL & WHATSAPP DISPATCH
  // =========================================================================
  const modal = document.getElementById('bf-order-modal');
  let currentSelectedPackage = null;

  function openModal(pkg) {
    if (!modal || !pkg) return;
    currentSelectedPackage = pkg;

    document.getElementById('bf-modal-title').textContent = `${pkg.model} Solar Combo`;
    document.getElementById('bf-modal-specs').innerHTML = `
      <div><strong>Output:</strong> ${pkg.rating} &bull; <strong>Storage:</strong> ${pkg.battery}</div>
      <div style="margin-top:4px;"><strong>Included Solar:</strong> ${pkg.solar}</div>
      <div style="color:#0052FF; font-weight:800; margin-top:6px; font-size:0.75rem; text-transform:uppercase;">
        ★ Complete Solar Combo Package (Sold as full bundle only)
      </div>
    `;
    document.getElementById('bf-modal-price').textContent = formatNgn(pkg.finalPrice);

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function sendWhatsAppOrder(pkg) {
    if (!pkg) return;
    const phone = '2348033882268';
    const message = `Hello DEVICE PRO! I want to order the Black Friday Solar Combo Deal:
*${pkg.model}*
- Output Rating: ${pkg.rating}
- Battery Capacity: ${pkg.battery}
- Solar Array Included: ${pkg.solar}
- Total Combo Price: ${formatNgn(pkg.finalPrice)} (Complete Package with Free Lagos & Ibadan Delivery)
Please confirm stock availability and send payment invoice for dispatch.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  }

  function bindProductActions() {
    // WhatsApp Direct Buttons on cards
    document.querySelectorAll('[data-order-whatsapp]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-order-whatsapp');
        const pkg = BLACK_FRIDAY_PACKAGES.find(p => p.id === id);
        if (pkg) sendWhatsAppOrder(pkg);
      });
    });

    // "Order Now" Modal Triggers
    document.querySelectorAll('[data-open-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-open-modal');
        const pkg = BLACK_FRIDAY_PACKAGES.find(p => p.id === id);
        if (pkg) openModal(pkg);
      });
    });
  }

  function initModalEvents() {
    if (!modal) return;

    // Close button
    const closeBtn = document.getElementById('bf-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });

    // Modal WhatsApp Button
    const modalWaBtn = document.getElementById('bf-modal-btn-wa');
    if (modalWaBtn) {
      modalWaBtn.addEventListener('click', () => {
        if (currentSelectedPackage) {
          sendWhatsAppOrder(currentSelectedPackage);
          closeModal();
        }
      });
    }

    // Modal Paystack / Direct Buy Button
    const modalPayBtn = document.getElementById('bf-modal-btn-pay');
    if (modalPayBtn) {
      modalPayBtn.addEventListener('click', () => {
        if (!currentSelectedPackage) return;

        // Try universal cart integration if cart.js is loaded
        if (typeof window.cart !== 'undefined' && typeof window.cart.addItem === 'function') {
          window.cart.addItem({
            id: currentSelectedPackage.id,
            name: `${currentSelectedPackage.model} (${currentSelectedPackage.solar})`,
            price: currentSelectedPackage.finalPrice,
            quantity: 1,
            image: currentSelectedPackage.image
          });
          closeModal();
          window.location.href = '/checkout';
        } else {
          // Direct to checkout with query param
          window.location.href = `/checkout?promo=blackfriday&item=${encodeURIComponent(currentSelectedPackage.model)}&price=${currentSelectedPackage.finalPrice}`;
        }
      });
    }
  }

  // =========================================================================
  // 6. SCROLL REVEAL & FADE-IN ENGINE
  // =========================================================================
  let scrollObserver = null;

  function initScrollAnimations() {
    const targetSelectors = [
      '.bf-hero-left',
      '.bf-hero-cutouts-wrap',
      '.bf-marquee-section',
      '.bf-catalog-section .bf-section-header',
      '.bf-filter-tabs',
      '.bf-flash-deal-container',
      '.bf-comparison-media',
      '.bf-comparison-content',
      '.bf-reviews-section .bf-section-header',
      '.bf-review-card',
      '.bf-footer-inner'
    ];

    const elements = document.querySelectorAll(targetSelectors.join(', '));

    // Fallback if IntersectionObserver is not supported
    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('is-revealed'));
      return;
    }

    if (scrollObserver) {
      scrollObserver.disconnect();
    }

    scrollObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.08,
      rootMargin: '0px 0px -30px 0px'
    });

    elements.forEach(el => {
      if (!el.classList.contains('bf-reveal')) {
        el.classList.add('bf-reveal');
      }
      scrollObserver.observe(el);
    });

    // Check viewport immediately on page load / refresh
    requestAnimationFrame(() => {
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('is-revealed');
        }
      });
    });
  }

  function observeNewCards() {
    const cards = document.querySelectorAll('.bf-product-card');
    cards.forEach((card, index) => {
      card.classList.add('bf-reveal');
      card.style.transitionDelay = `${(index % 3) * 0.1}s`;

      if (scrollObserver) {
        scrollObserver.observe(card);
      }

      // If already within visible viewport:
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setTimeout(() => {
          card.classList.add('is-revealed');
        }, (index % 3) * 80);
      }
    });
  }

  // =========================================================================
  // 7. INITIALIZATION
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    initCountdown();
    initScrollAnimations();
    renderProducts('all');
    initFilterTabs();
    initModalEvents();

    // Flash Deal Hero Button Click
    const flashHeroBtn = document.getElementById('btn-claim-flash-deal');
    if (flashHeroBtn) {
      flashHeroBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const heroPkg = BLACK_FRIDAY_PACKAGES.find(p => p.id === 'bf-coloar-2000');
        if (heroPkg) openModal(heroPkg);
      });
    }
  });

})();

