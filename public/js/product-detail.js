/**
 * DEVICE PRO — Product Detail Page Client Controller
 * Dynamically fetches product records from /api/products/:slug,
 * manages gallery views, specs rendering, cart additions, quantity steppers, and related items.
 */

(function () {
  'use strict';

  const STORAGE_WISHLIST_KEY = 'devicepro_wishlist';
  const STORAGE_CART_KEY = 'devicepro_cart';

  // Format Naira Currency
  function formatNaira(amount) {
    if (typeof amount !== 'number') amount = Number(amount) || 0;
    return new Intl.NumberFormat('en-NG').format(amount);
  }

  // Toast Notification
  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFC400" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Cart LocalStorage Helpers
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
    updateCartBadges();
    renderCartDrawerItems();
  }

  function addToCart(productItem, quantity = 1) {
    if (window.DeviceProCart) {
      window.DeviceProCart.addItem({
        id: productItem.id,
        name: productItem.name,
        price: productItem.price_ngn || productItem.price,
        image: productItem.image_url || productItem.image,
        slug: productItem.slug,
        quantity: quantity
      });
      window.DeviceProCart.openDrawer();
      return;
    }
    const cart = getCart();
    const existingIndex = cart.findIndex(item => item.id === productItem.id);
    if (existingIndex > -1) {
      cart[existingIndex].qty = (cart[existingIndex].qty || 1) + quantity;
    } else {
      cart.push({ ...productItem, qty: quantity });
    }
    saveCart(cart);
    showToast(`Added ${quantity}× "${productItem.name}" to cart`);
  }

  function removeFromCart(productId) {
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
    document.querySelectorAll('.cart-badge').forEach(badge => {
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
          <a href="/products" class="btn-browse-equip" data-close-drawer>Browse Products →</a>
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

  // Wishlist Helpers
  function getWishlist() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_WISHLIST_KEY)) || [];
    } catch {
      return [];
    }
  }

  function toggleWishlist(productId) {
    const list = getWishlist();
    const index = list.indexOf(productId);
    let added = false;
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(productId);
      added = true;
    }
    localStorage.setItem(STORAGE_WISHLIST_KEY, JSON.stringify(list));
    return added;
  }

  // Determine current slug or identifier from URL
  function getProductSlug() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    let slug = pathParts[pathParts.length - 1];

    if (!slug || slug === 'products' || slug === 'product-detail' || slug === 'product-detail.html') {
      const urlParams = new URLSearchParams(window.location.search);
      slug = urlParams.get('slug') || urlParams.get('id') || 'jinko-monocrystalline-solar-panel-550w';
    }
    return slug;
  }

  // Generate category-specific specs rows
  function generateSpecsRows(product) {
    const specs = [];
    specs.push({ label: 'Manufacturer / Brand', value: product.brand });
    specs.push({ label: 'Model / SKU', value: product.sku || 'N/A' });
    specs.push({ label: 'Category', value: product.category_label || 'Solar Equipment' });

    if (product.power_rating) {
      specs.push({ label: 'Rated Capacity / Power', value: product.power_rating });
    }

    if (product.category === 'solar-panels') {
      specs.push({ label: 'Cell Type', value: 'Grade-A Monocrystalline Silicon' });
      specs.push({ label: 'Module Efficiency', value: '21.3% – 22.8%' });
      specs.push({ label: 'Maximum Power Voltage (Vmp)', value: '41.95 V' });
      specs.push({ label: 'Maximum Power Current (Imp)', value: '13.12 A' });
      specs.push({ label: 'Open Circuit Voltage (Voc)', value: '49.80 V' });
      specs.push({ label: 'Short Circuit Current (Isc)', value: '13.98 A' });
      specs.push({ label: 'Dimensions', value: '2278 × 1134 × 35 mm' });
      specs.push({ label: 'Weight', value: '28.0 kg' });
      specs.push({ label: 'Output Terminals', value: 'MC4 Compatible (4.0mm² / 12 AWG)' });
      specs.push({ label: 'Warranty', value: '12-Year Product Workmanship • 25-Year Linear Power' });
    } else if (product.category === 'inverters') {
      specs.push({ label: 'Continuous Output Power', value: product.power_rating || '5,000 W' });
      specs.push({ label: 'Waveform', value: 'Pure Sine Wave (<3% THD)' });
      specs.push({ label: 'Max Surge Output', value: '10,000 VA (5 seconds)' });
      specs.push({ label: 'Battery Input Voltage', value: '48V DC' });
      specs.push({ label: 'MPPT Operating Voltage', value: '120V – 450V DC' });
      specs.push({ label: 'Max PV Array Power', value: '6,000 W' });
      specs.push({ label: 'Peak Efficiency', value: '97.6%' });
      specs.push({ label: 'Communication Ports', value: 'RS485 / CAN / WiFi Telemetry Module' });
      specs.push({ label: 'Warranty', value: '5-Year Manufacturer Warranty' });
    } else if (product.category === 'batteries') {
      specs.push({ label: 'Battery Chemistry', value: 'Lithium Iron Phosphate (LiFePO4)' });
      specs.push({ label: 'Nominal Voltage', value: '48 V' });
      specs.push({ label: 'Rated Capacity', value: '100 Ah (4.8 kWh)' });
      specs.push({ label: 'Usable Energy Capacity', value: '4.56 kWh (95% DoD)' });
      specs.push({ label: 'Cycle Life', value: '6,000+ Cycles @ 80% Depth of Discharge (25°C)' });
      specs.push({ label: 'Max Continuous Discharge', value: '50A (Recommended) / 100A (Peak)' });
      specs.push({ label: 'BMS Protection', value: 'Over-charge, Over-discharge, Thermal, Short-Circuit' });
      specs.push({ label: 'Warranty', value: '10-Year Manufacturer Warranty' });
    } else if (product.category === 'portable-power') {
      specs.push({ label: 'Battery Chemistry', value: 'LFP (LiFePO4) Long-Life Battery' });
      specs.push({ label: 'AC Output Rating', value: '1,800W (Surge 2,700W)' });
      specs.push({ label: 'Storage Capacity', value: product.power_rating || '1,024 Wh' });
      specs.push({ label: 'Fast Charge Time', value: '0 – 80% in 50 minutes (AC Wall Outlet)' });
      specs.push({ label: 'Solar Input Port', value: 'Up to 500W Solar Charging (11-60V 15A Max)' });
      specs.push({ label: 'Outputs', value: '4× AC Outlets, 2× USB-C (100W PD), 4× USB-A, 1× 12V Car Port' });
      specs.push({ label: 'Warranty', value: '3-Year Replacement Warranty' });
    } else {
      specs.push({ label: 'Material', value: 'Corrosion-Resistant Anodized Aluminium AL6005-T5 & SUS304' });
      specs.push({ label: 'Standards & Ratings', value: 'UV Resistant, Halogen-Free, IP67 Waterproof' });
      specs.push({ label: 'Operating Temperature', value: '-40°C to +90°C' });
      specs.push({ label: 'Warranty', value: '10-Year Hardware Guarantee' });
    }

    return specs.map(s => `
      <tr>
        <th>${s.label}</th>
        <td>${s.value}</td>
      </tr>
    `).join('');
  }

  // Generate category-specific compatibility guide
  function generateCompatContent(product) {
    if (product.category === 'solar-panels') {
      return `
        <h3 class="pane-title">System Compatibility Guidelines</h3>
        <p class="pane-subtitle">Engineered to integrate seamlessly with standard residential and commercial MPPT solar configurations.</p>
        <div class="compat-grid-rules">
          <div class="compat-rule-card">
            <h4>Inverter Compatibility</h4>
            <p>Compatible with all major 48V hybrid and off-grid inverters (Growatt, Deye, Victron, Felicity, SRNE). Ensure array Voc matches inverter MPPT ceiling.</p>
          </div>
          <div class="compat-rule-card">
            <h4>Recommended Cabling</h4>
            <p>Standard 4mm² or 6mm² cross-linked solar PV cable with genuine MC4 locking connectors to minimize voltage drops across string lengths.</p>
          </div>
          <div class="compat-rule-card">
            <h4>Mounting Structures</h4>
            <p>Direct fit for pitched tin/tile roof mounting rails, concrete rooftop ballast structures, and commercial carport canopy clamps.</p>
          </div>
        </div>
      `;
    } else if (product.category === 'inverters') {
      return `
        <h3 class="pane-title">Inverter Integration &amp; Storage Sizing</h3>
        <p class="pane-subtitle">Certified for grid-tied, hybrid, and full off-grid backup duty cycles across Nigeria.</p>
        <div class="compat-grid-rules">
          <div class="compat-rule-card">
            <h4>Battery Bank Pairing</h4>
            <p>Direct plug-and-play BMS communication with Pylontech, Felicity, and Deye 48V LiFePO4 rack batteries via CANbus/RS485 protocol.</p>
          </div>
          <div class="compat-rule-card">
            <h4>Generator Synchronization</h4>
            <p>Features dry-contact automatic generator start (ATS) for seamless diesel/petrol generator integration during prolonged cloudy weather.</p>
          </div>
          <div class="compat-rule-card">
            <h4>Surge Protection</h4>
            <p>Integrated Type-II DC and AC surge arresters. External DC circuit breakers (125A–250A) recommended for code compliance.</p>
          </div>
        </div>
      `;
    } else {
      return `
        <h3 class="pane-title">Storage Compatibility &amp; Scalability</h3>
        <p class="pane-subtitle">Engineered for modular expansion from single-family homes to high-capacity commercial mini-grids.</p>
        <div class="compat-grid-rules">
          <div class="compat-rule-card">
            <h4>Parallel Expansion</h4>
            <p>Supports up to 16 units in parallel without external combiner hubs for up to 76.8kWh total capacity.</p>
          </div>
          <div class="compat-rule-card">
            <h4>Inverter Interfacing</h4>
            <p>Pre-programmed protocols for Growatt, Victron Energy, Deye, and Solis power electronics.</p>
          </div>
          <div class="compat-rule-card">
            <h4>Installation Standards</h4>
            <p>Rack-mountable or wall-hung in well-ventilated indoor battery enclosures with dedicated DC isolators.</p>
          </div>
        </div>
      `;
    }
  }

  // Generate category FAQs
  function generateFaqs(product) {
    const faqs = [
      {
        q: 'Does DEVICE PRO provide certified installation in my state?',
        a: 'Yes. DEVICE PRO has certified solar engineers and technicians across Lagos, Ogun, Oyo, Abuja (FCT), Rivers (Port Harcourt), Kano, and other major states. Turnkey installation includes site assessment, DC/AC protection wiring, earthing, and commissioning.'
      },
      {
        q: 'Is this hardware covered by an authentic manufacturer warranty?',
        a: 'Every item sold by DEVICE PRO is 100% genuine Tier-1 hardware imported through authorized channels with serial tracking. Warranty repairs, replacements, and technical support are handled locally through our service center.'
      },
      {
        q: 'How quickly will my order be dispatched after confirmation?',
        a: 'Lagos orders confirmed before noon are dispatched same-day or next-day. Regional deliveries across South-West, Abuja, and Port Harcourt take 2 to 4 business days via insured freight carriers.'
      },
      {
        q: 'Can I inspect the equipment before final installation?',
        a: 'Absolutely. All shipments undergo warehouse testing and come with inspection seals. Customers and certified installers inspect hardware serials upon delivery.'
      }
    ];

    return faqs.map((f, i) => `
      <div class="faq-item ${i === 0 ? 'open' : ''}">
        <button type="button" class="faq-question-btn" aria-expanded="${i === 0 ? 'true' : 'false'}">
          <span>${f.q}</span>
          <span class="faq-chevron" aria-hidden="true">▾</span>
        </button>
        <div class="faq-answer">
          <p>${f.a}</p>
        </div>
      </div>
    `).join('');
  }

  // Render Related Products Cards
  function renderRelatedCards(relatedList) {
    const container = document.getElementById('related-products-grid');
    if (!container || !relatedList || !relatedList.length) {
      const section = document.getElementById('related-products-section');
      if (section) section.style.display = 'none';
      return;
    }

    const wishlist = getWishlist();

    const cardsHtml = relatedList.map(item => {
      const isWishlisted = wishlist.includes(item.id);
      return `
        <article class="product-card" data-product-id="${item.id}">
          <div class="card-top-row">
            <span class="category-badge-pill">${item.category_label || 'Equipment'}</span>
            <button type="button" class="btn-wishlist ${isWishlisted ? 'active' : ''}" data-wishlist-id="${item.id}" aria-label="Save to wishlist">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="${isWishlisted ? '#EF4444' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>
          <div class="card-image-wrap">
            <a href="/products/${item.slug}" title="${item.name}" class="card-image-link">
              <img src="/${item.image_url}" alt="${item.name}" class="card-product-img" loading="lazy">
            </a>
          </div>
          <div class="card-brand">${item.brand}</div>
          <h3 class="card-title">
            <a href="/products/${item.slug}">${item.name}</a>
          </h3>
          <div class="card-specs">${item.specifications || ''}</div>
          <div class="card-bottom-row">
            <div class="card-price">₦${formatNaira(item.price_ngn)}</div>
            <div class="stock-indicator">
              <span class="stock-dot"></span> In Stock
            </div>
          </div>
          <div class="card-actions-row">
            <a href="/products/${item.slug}" class="btn-card-details">View Details</a>
            <button type="button" class="btn-card-cart" data-add-cart='${JSON.stringify({
              id: item.id,
              name: item.name,
              brand: item.brand,
              price: item.price_ngn,
              image: '/' + item.image_url
            })}'>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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

    container.innerHTML = cardsHtml;
    const section = document.getElementById('related-products-section');
    if (section) section.style.display = 'block';
  }

  // Load and Render Product Detail
  async function loadProductDetail() {
    const slug = getProductSlug();
    const loadingState = document.getElementById('detail-loading-state');
    const errorState = document.getElementById('detail-error-state');
    const showcaseSection = document.getElementById('product-showcase-section');
    const tabsSection = document.getElementById('product-tabs-section');

    try {
      const response = await fetch(`/api/products/${slug}`);
      if (!response.ok) {
        throw new Error('Product not found');
      }

      const data = await response.json();
      if (!data.success || !data.product) {
        throw new Error('Failed to load product');
      }

      const product = data.product;

      // Update Head Metadata
      document.title = `${product.name} — ${product.brand} | DEVICE PRO Nigeria`;
      const headTitle = document.getElementById('page-head-title');
      if (headTitle) headTitle.textContent = `${product.name} — ${product.brand} | DEVICE PRO Nigeria`;

      // Breadcrumbs
      const catBreadcrumb = document.getElementById('breadcrumb-category');
      const nameBreadcrumb = document.getElementById('breadcrumb-product-name');
      if (catBreadcrumb) {
        catBreadcrumb.innerHTML = `<a href="/products?category=${product.category}" class="breadcrumb-link">${product.category_label}</a>`;
      }
      if (nameBreadcrumb) {
        nameBreadcrumb.textContent = product.name;
      }

      // Badge & Wishlist
      const badgeCat = document.getElementById('detail-badge-category');
      if (badgeCat) badgeCat.textContent = product.category_label || 'Equipment';

      const wishlistBtn = document.getElementById('btn-detail-wishlist');
      const wishlist = getWishlist();
      const isWishlisted = wishlist.includes(product.id);
      if (wishlistBtn) {
        wishlistBtn.classList.toggle('active', isWishlisted);
        const svg = wishlistBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', isWishlisted ? '#EF4444' : 'none');
        wishlistBtn.onclick = () => {
          const added = toggleWishlist(product.id);
          wishlistBtn.classList.toggle('active', added);
          if (svg) svg.setAttribute('fill', added ? '#EF4444' : 'none');
          showToast(added ? 'Added to wishlist' : 'Removed from wishlist');
        };
      }

      // Main Image & Thumbnails
      const mainImg = document.getElementById('main-product-img');
      const imgPath = product.image_url.startsWith('/') ? product.image_url : '/' + product.image_url;
      if (mainImg) {
        mainImg.src = imgPath;
        mainImg.alt = product.name;
      }

      // Setup Thumbnails
      for (let i = 1; i <= 3; i++) {
        const thumbImg = document.getElementById(`thumb-img-${i}`);
        if (thumbImg) {
          thumbImg.src = imgPath;
          thumbImg.parentElement.setAttribute('data-img', imgPath);
        }
      }

      // Brand, Title, SKU
      const brandEl = document.getElementById('buybox-brand');
      if (brandEl) brandEl.textContent = product.brand;

      const titleEl = document.getElementById('buybox-title');
      if (titleEl) titleEl.textContent = product.name;

      const skuEl = document.getElementById('buybox-sku');
      if (skuEl) skuEl.textContent = `SKU: ${product.sku || 'DP-' + product.id}`;

      // Price block
      const priceEl = document.getElementById('buybox-price');
      if (priceEl) priceEl.textContent = `₦${formatNaira(product.price_ngn)}`;

      const prevPriceEl = document.getElementById('buybox-prev-price');
      const discountEl = document.getElementById('buybox-discount');
      if (product.previous_price_ngn && product.previous_price_ngn > product.price_ngn) {
        if (prevPriceEl) {
          prevPriceEl.textContent = `₦${formatNaira(product.previous_price_ngn)}`;
          prevPriceEl.style.display = 'inline-block';
        }
        if (discountEl) {
          const savings = product.previous_price_ngn - product.price_ngn;
          discountEl.textContent = `Save ₦${formatNaira(savings)}`;
          discountEl.style.display = 'inline-block';
        }
      } else {
        if (prevPriceEl) prevPriceEl.style.display = 'none';
        if (discountEl) discountEl.style.display = 'none';
      }

      // Description
      const descEl = document.getElementById('buybox-description');
      if (descEl) descEl.textContent = product.description || '';

      // Highlights grid
      const highlightsEl = document.getElementById('buybox-highlights');
      if (highlightsEl) {
        const specItems = (product.specifications || '').split('•').map(s => s.trim()).filter(Boolean);
        highlightsEl.innerHTML = specItems.map(item => `
          <div class="highlight-chip">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <div class="highlight-chip-text">
              <strong>${item}</strong>
              <span>Verified Specification</span>
            </div>
          </div>
        `).join('');
      }

      // WhatsApp consultation link
      const waBtn = document.getElementById('btn-whatsapp-consult');
      if (waBtn) {
        const msg = encodeURIComponent(`Hello DEVICE PRO, I would like to inquire about ${product.name} (SKU: ${product.sku || product.id}) priced at ₦${formatNaira(product.price_ngn)}.`);
        waBtn.href = `https://wa.me/2348031234567?text=${msg}`;
      }

      // Quantity controls
      const qtyInput = document.getElementById('product-qty-input');
      const decBtn = document.getElementById('qty-decrement');
      const incBtn = document.getElementById('qty-increment');
      if (decBtn && qtyInput) {
        decBtn.onclick = () => {
          let val = parseInt(qtyInput.value, 10) || 1;
          if (val > 1) qtyInput.value = val - 1;
        };
      }
      if (incBtn && qtyInput) {
        incBtn.onclick = () => {
          let val = parseInt(qtyInput.value, 10) || 1;
          if (val < 99) qtyInput.value = val + 1;
        };
      }

      // Add to Cart Action
      const addCartBtn = document.getElementById('btn-add-to-cart');
      if (addCartBtn) {
        addCartBtn.onclick = () => {
          const qty = parseInt(qtyInput ? qtyInput.value : 1, 10) || 1;
          addToCart({
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price_ngn,
            image: imgPath
          }, qty);
        };
      }

      // Technical Specs Table
      const specsTable = document.getElementById('product-specs-table');
      if (specsTable) {
        specsTable.innerHTML = generateSpecsRows(product);
      }

      // Compatibility Tab Content
      const compatBox = document.getElementById('compat-content-box');
      if (compatBox) {
        compatBox.innerHTML = generateCompatContent(product);
      }

      // FAQs Tab Content
      const faqsList = document.getElementById('faqs-accordion-list');
      if (faqsList) {
        faqsList.innerHTML = generateFaqs(product);
        // Bind accordion clicks
        faqsList.querySelectorAll('.faq-question-btn').forEach(btn => {
          btn.onclick = () => {
            const item = btn.closest('.faq-item');
            const isOpen = item.classList.toggle('open');
            btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          };
        });
      }

      // Related Products Grid
      if (data.related && data.related.length) {
        renderRelatedCards(data.related);
      }

      // Reveal content, hide loading
      if (loadingState) loadingState.style.display = 'none';
      if (showcaseSection) showcaseSection.style.display = 'block';
      if (tabsSection) tabsSection.style.display = 'block';

    } catch (err) {
      console.error('[PRODUCT DETAIL LOAD ERROR]:', err);
      if (loadingState) loadingState.style.display = 'none';
      if (errorState) errorState.style.display = 'block';
    }
  }

  // Gallery Thumbnail switching
  document.addEventListener('click', (e) => {
    const thumb = e.target.closest('.thumb-btn');
    if (thumb) {
      document.querySelectorAll('.thumb-btn').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const imgUrl = thumb.getAttribute('data-img');
      const mainImg = document.getElementById('main-product-img');
      if (mainImg && imgUrl) {
        mainImg.src = imgUrl;
      }
    }
  });

  // Tab switching logic
  document.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-nav-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-pane').forEach(p => {
        p.classList.remove('active');
        p.setAttribute('hidden', '');
      });

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetPaneId = btn.getAttribute('aria-controls');
      const targetPane = document.getElementById(targetPaneId);
      if (targetPane) {
        targetPane.classList.add('active');
        targetPane.removeAttribute('hidden');
      }
    });
  });

  // Related products wishlist & add-to-cart clicks
  const relatedGrid = document.getElementById('related-products-grid');
  if (relatedGrid) {
    relatedGrid.addEventListener('click', (e) => {
      const wishBtn = e.target.closest('.btn-wishlist');
      if (wishBtn) {
        const pid = parseInt(wishBtn.getAttribute('data-wishlist-id'), 10);
        const added = toggleWishlist(pid);
        wishBtn.classList.toggle('active', added);
        const svg = wishBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', added ? '#EF4444' : 'none');
        showToast(added ? 'Added product to your wishlist' : 'Removed product from wishlist');
        return;
      }

      const cartBtn = e.target.closest('.btn-card-cart');
      if (cartBtn) {
        try {
          const itemData = JSON.parse(cartBtn.getAttribute('data-add-cart'));
          addToCart(itemData, 1);
        } catch (err) {
          console.error('Failed to parse cart payload:', err);
        }
      }
    });
  }

  // Drawers and Modal triggers
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

  // Cart Drawer Remove clicks
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

  // Init
  function init() {
    updateCartBadges();
    loadProductDetail();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
