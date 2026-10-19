/**
 * DEVICE PRO — Solar Packages & Pricing Client Controller
 * Fetches /api/packages, renders interactive cards, handles filter tabs, cart additions, and quote submissions.
 */

(function () {
  'use strict';

  const STORAGE_CART_KEY = 'devicepro_cart';
  let allPackages = [];
  let currentFilter = 'all';

  // Format currency in NGN
  function formatNaira(num) {
    return '₦' + Number(num || 0).toLocaleString('en-NG');
  }

  // Toast feedback
  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Cart Badge & Drawer
  function updateCartBadges() {
    try {
      localStorage.removeItem('devicepro_cart');
      if (window.DeviceProCart) {
        window.DeviceProCart.updateBadge();
        return;
      }
      const cart = JSON.parse(localStorage.getItem('dp_equipment_cart_v1')) || [];
      const totalItems = cart.reduce((sum, item) => sum + (item.quantity || item.qty || 1), 0);
      document.querySelectorAll('.cart-badge').forEach(badge => {
        badge.textContent = totalItems;
        badge.setAttribute('aria-label', `${totalItems} items in cart`);
      });
      renderCartDrawer(cart);
    } catch {
      // ignore
    }
  }

  function renderCartDrawer(cart) {
    const drawerBody = document.getElementById('cart-drawer-body');
    const subtotalEl = document.getElementById('cart-subtotal-val');
    const checkoutBtn = document.getElementById('btn-cart-checkout');
    if (!drawerBody || !subtotalEl) return;

    if (!cart || cart.length === 0) {
      drawerBody.innerHTML = `
        <div style="text-align:center; padding: 3rem 1rem; color: #64748B;">
          <p style="font-size: 2.5rem; margin-bottom: 0.5rem;">🛒</p>
          <p style="font-weight: 700; color: #061C35;">Your cart is empty</p>
          <p style="font-size: 0.85rem; margin-top: 0.25rem;">Explore our turnkey solar packages or individual hardware.</p>
        </div>
      `;
      subtotalEl.textContent = '₦0';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    let subtotal = 0;
    drawerBody.innerHTML = cart.map((item, idx) => {
      const itemTotal = (item.price || 0) * (item.qty || 1);
      subtotal += itemTotal;
      return `
        <div class="cart-drawer-item" style="display:flex; gap:0.75rem; padding:0.85rem 0; border-bottom:1px solid #E2E8F0; align-items:center;">
          <img src="/${item.image || 'images/logo-mark.svg'}" alt="${item.name}" style="width:50px; height:50px; object-fit:cover; border-radius:6px; border:1px solid #E2E8F0;">
          <div style="flex-grow:1;">
            <div style="font-size:0.85rem; font-weight:700; color:#061C35;">${item.name}</div>
            <div style="font-size:0.8rem; color:#64748B;">${formatNaira(item.price)} × ${item.qty}</div>
          </div>
          <button type="button" class="cart-remove-btn" data-remove-idx="${idx}" style="background:none; border:none; color:#EF4444; font-size:1.1rem; cursor:pointer;" aria-label="Remove item">✕</button>
        </div>
      `;
    }).join('');

    subtotalEl.textContent = formatNaira(subtotal);
    if (checkoutBtn) checkoutBtn.disabled = false;

    drawerBody.querySelectorAll('[data-remove-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-remove-idx'), 10);
        cart.splice(idx, 1);
        localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
        updateCartBadges();
      });
    });
  }

  function addPackageToCart(pkg) {
    if (window.DeviceProCart) {
      window.DeviceProCart.addItem({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price_ngn,
        image: pkg.image_url,
        slug: pkg.slug
      });
      window.DeviceProCart.openDrawer();
      return;
    }
    try {
      const cart = JSON.parse(localStorage.getItem(STORAGE_CART_KEY)) || [];
      const existing = cart.find(i => i.id === pkg.id);
      if (existing) {
        existing.qty += 1;
      } else {
        cart.push({
          id: pkg.id,
          name: pkg.name,
          price: pkg.price_ngn,
          image: pkg.image_url,
          sku: pkg.sku,
          qty: 1
        });
      }
      localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
      updateCartBadges();
      showToast(`Added ${pkg.name} to equipment cart!`);
      const drawer = document.getElementById('cart-drawer');
      if (drawer) drawer.classList.add('open');
    } catch {
      // ignore
    }
  }

  // Render Package Cards
  function renderPackageCards() {
    const container = document.getElementById('packages-cards-container');
    if (!container) return;

    let filtered = allPackages;
    if (currentFilter === 'residential') {
      filtered = allPackages.filter(p => p.power_rating === '2kVA' || p.power_rating === '3.5kVA' || p.power_rating === '5kW' || p.power_rating === '7.5kW');
    } else if (currentFilter === 'executive') {
      filtered = allPackages.filter(p => p.power_rating === '10kW');
    } else if (currentFilter === 'commercial') {
      filtered = allPackages.filter(p => p.power_rating === '15kW');
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
          <p style="font-size: 1.1rem; color: #64748B;">No packages found in this category.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(pkg => {
      const d = pkg.details || {};
      const isFeatured = pkg.featured ? 'featured-card' : '';
      const waText = encodeURIComponent(`Hello DEVICE PRO, I would like to consult an engineer about the ${pkg.name} (${formatNaira(pkg.price_ngn)}).`);

      const loadsHtml = (d.supported_loads || []).map(load => `
        <li class="acc-load-item">
          <span class="acc-load-appliance">${load.appliance}</span>
          <span class="acc-load-time">${load.runtime}</span>
        </li>
      `).join('');

      return `
        <article class="package-card ${isFeatured}" data-pkg-id="${pkg.id}">
          <div class="package-card-header">
            <span class="pkg-type-badge">${d.system_type || 'Hybrid Solar'}</span>
            ${pkg.featured ? '<span class="pkg-featured-badge">★ Most Popular</span>' : ''}
          </div>

          <div class="package-img-wrap">
            <img src="/${pkg.image_url}" alt="${pkg.name}" class="package-img" loading="lazy">
            <div class="package-audience-strip">
              <span>🎯 ${d.intended_audience || 'Residential Power'}</span>
            </div>
          </div>

          <div class="package-card-body">
            <h3 class="package-title">${pkg.name}</h3>
            <div class="package-sku">SKU: ${pkg.sku || 'DP-SOLAR-PKG'}</div>
            ${pkg.description ? `<p class="package-description">${pkg.description}</p>` : ''}

            <div class="package-price-box">
              <div class="pkg-price-row">
                <span class="pkg-price-current">${formatNaira(pkg.price_ngn)}</span>
                ${pkg.previous_price_ngn ? `<span class="pkg-price-previous">${formatNaira(pkg.previous_price_ngn)}</span>` : ''}
              </div>
              <div class="pkg-price-tax-note">✓ Hardware + Certified Installation Included</div>
            </div>

            <!-- 4 Core Spec Chips -->
            <div class="package-spec-chips-grid">
              <div class="spec-chip">
                <span class="spec-chip-lbl">Inverter Power</span>
                <span class="spec-chip-val">${d.power_kw || pkg.power_rating}</span>
              </div>
              <div class="spec-chip">
                <span class="spec-chip-lbl">Battery Storage</span>
                <span class="spec-chip-val">${d.battery_kwh || 'LiFePO4'}</span>
              </div>
              <div class="spec-chip">
                <span class="spec-chip-lbl">Solar PV Array</span>
                <span class="spec-chip-val">${d.solar_kwp || 'Mono Bifacial'}</span>
              </div>
              <div class="spec-chip">
                <span class="spec-chip-lbl">Est. Daily Yield</span>
                <span class="spec-chip-val">${d.daily_yield || 'High Output'}</span>
              </div>
            </div>

            <!-- Internal Card Accordion -->
            <div class="package-accordion-group">
              
              <div class="card-accordion-item open">
                <button type="button" class="card-acc-btn" aria-expanded="true">
                  <span>🛠 Included Hardware</span>
                  <span class="card-acc-chevron">▾</span>
                </button>
                <div class="card-acc-panel">
                  <p><strong>Inverter:</strong> ${d.inverter_detail || 'Smart Hybrid Inverter'}</p>
                  <p><strong>Storage:</strong> ${d.battery_detail || 'LiFePO4 Lithium Battery'}</p>
                  <p><strong>Solar PV:</strong> ${d.panels_detail || 'Tier-1 Mono Bifacial Panels'}</p>
                  <p><strong>Protection:</strong> ${d.bos_detail || 'Complete Balance of System & DC SPD'}</p>
                </div>
              </div>

              <div class="card-accordion-item">
                <button type="button" class="card-acc-btn" aria-expanded="false">
                  <span>💡 Supported Loads &amp; Runtimes</span>
                  <span class="card-acc-chevron">▾</span>
                </button>
                <div class="card-acc-panel">
                  <ul class="acc-load-list">
                    ${loadsHtml}
                  </ul>
                  ${d.load_exclusions_note ? `<p class="acc-notice-text">⚠️ Note: ${d.load_exclusions_note}</p>` : ''}
                </div>
              </div>

              <div class="card-accordion-item">
                <button type="button" class="card-acc-btn" aria-expanded="false">
                  <span>🚚 Installation &amp; Warranty</span>
                  <span class="card-acc-chevron">▾</span>
                </button>
                <div class="card-acc-panel">
                  <p>${d.installation_scope || 'Certified turnkey rooftop installation included.'}</p>
                  <p style="margin-top:0.4rem; color:#16A34A; font-weight:700;">${d.warranty_terms || 'Comprehensive warranty guarantees.'}</p>
                </div>
              </div>

            </div>

            <!-- Card Action Row -->
            <div class="package-card-actions">
              <button type="button" class="btn-add-package-cart" data-cart-pkg="${pkg.id}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <span>Add Package to Cart</span>
              </button>

              <div class="package-sub-actions-row">
                <button type="button" class="btn-pkg-customize" data-pkg-select="${pkg.name}">
                  Request Proposal
                </button>
                <a href="https://wa.me/2348031234567?text=${waText}" target="_blank" rel="noopener" class="btn-pkg-wa">
                  <span>💬 WhatsApp</span>
                </a>
              </div>
            </div>

          </div>
        </article>
      `;
    }).join('');

    // Attach event listeners for internal card accordions
    container.querySelectorAll('.card-acc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.card-accordion-item');
        const isOpen = item.classList.toggle('open');
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });

    // Attach event listeners for Add to Cart
    container.querySelectorAll('[data-cart-pkg]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-cart-pkg'), 10);
        const pkg = allPackages.find(p => p.id === id);
        if (pkg) addPackageToCart(pkg);
      });
    });

    // Attach event listeners for Request Proposal
    container.querySelectorAll('[data-pkg-select]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pkgName = btn.getAttribute('data-pkg-select');
        selectPackageInForm(pkgName);
      });
    });
  }

  function selectPackageInForm(pkgName) {
    const select = document.getElementById('pkg-select');
    if (select && pkgName) {
      // Find matching option
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value.includes(pkgName) || pkgName.includes(select.options[i].value)) {
          select.selectedIndex = i;
          break;
        }
      }
    }
    const formSection = document.getElementById('consultation-form-section');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Fetch Packages from Server
  async function loadPackages() {
    try {
      const response = await fetch('/api/packages');
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.packages)) {
        allPackages = data.packages;
        renderPackageCards();
      } else {
        throw new Error(data.error || 'Failed to fetch packages');
      }
    } catch (err) {
      console.error('Error loading packages:', err);
      const container = document.getElementById('packages-cards-container');
      if (container) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: #DC2626;">
            <p style="font-weight: 700;">Could not load live packages. Please refresh or contact engineering support.</p>
          </div>
        `;
      }
    }
  }

  // Filter Buttons
  document.querySelectorAll('.package-filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.package-filter-pill').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      currentFilter = btn.getAttribute('data-filter') || 'all';
      renderPackageCards();
    });
  });

  // Comparison Matrix Select Buttons
  document.querySelectorAll('.comparison-table [data-pkg-select]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const pkgName = btn.getAttribute('data-pkg-select');
      selectPackageInForm(pkgName);
    });
  });

  // Package Quotation Form Submission
  const pkgForm = document.getElementById('packages-quote-form');
  const feedbackMsg = document.getElementById('pkg-form-feedback');
  const submitBtn = document.getElementById('btn-pkg-submit');

  if (pkgForm) {
    pkgForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('pkg-name').value.trim();
      const phone = document.getElementById('pkg-phone').value.trim();
      const email = document.getElementById('pkg-email').value.trim();
      const selectedPkg = document.getElementById('pkg-select').value;
      const location = document.getElementById('pkg-location').value.trim();
      const timeline = document.getElementById('pkg-timeline').value;
      const notes = document.getElementById('pkg-notes').value.trim();

      if (!name || !phone) {
        if (feedbackMsg) {
          feedbackMsg.className = 'form-feedback-msg error';
          feedbackMsg.textContent = 'Please provide your Full Name and WhatsApp phone number.';
          feedbackMsg.style.display = 'block';
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting Request...';
      }

      try {
        const response = await fetch('/api/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            phone,
            type: `${selectedPkg} (${location})`,
            notes: `Timeline: ${timeline}. Email: ${email}. Notes: ${notes}`
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (feedbackMsg) {
            feedbackMsg.className = 'form-feedback-msg success';
            feedbackMsg.innerHTML = `
              <strong>✓ Package Sizing Request Confirmed!</strong><br>
              Reference ID: <strong>${data.referenceId || 'DP-PKG'}</strong>. Our technical engineering team will review your roof and electrical requirements and contact your WhatsApp (${phone}) within 2 business hours with an official quotation.
            `;
            feedbackMsg.style.display = 'block';
          }
          pkgForm.reset();
        } else {
          throw new Error(data.error || 'Server error occurred');
        }
      } catch (err) {
        if (feedbackMsg) {
          feedbackMsg.className = 'form-feedback-msg error';
          feedbackMsg.textContent = 'Failed to submit request. Please reach us directly on WhatsApp (+234 803 123 4567).';
          feedbackMsg.style.display = 'block';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Package Sizing Request →';
        }
      }
    });
  }

  // FAQs Accordion
  document.querySelectorAll('.packages-faqs-section .faq-question-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

  // Modal & Drawer triggers
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
        if (drawer) drawer.classList.add('open');
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

  // Initialize
  updateCartBadges();
  loadPackages();

})();
