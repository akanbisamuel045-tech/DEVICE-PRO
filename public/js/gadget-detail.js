/**
 * DEVICE PRO — Gadget Product Detail Controller (/gadget/:slug)
 * Hydrates dynamic specs, interactive variants, multi-image gallery,
 * related gadgets, and direct checkout handoff to /checkout via DeviceProCart.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const Catalog = window.DeviceProGadgets;
    if (!Catalog) return;

    function resolveSlug() {
      const params = new URLSearchParams(window.location.search);
      if (params.get('slug')) return params.get('slug');
      if (params.get('id')) return params.get('id');

      const pathParts = window.location.pathname.split('/').filter(Boolean);
      // Matches /gadget/<slug> or /gadgets/<slug>
      if (pathParts.length >= 2 && (pathParts[0] === 'gadget' || pathParts[0] === 'gadgets')) {
        return decodeURIComponent(pathParts[1]);
      }
      return Catalog.GADGETS[0].slug;
    }

    const slug = resolveSlug();
    const product = Catalog.getBySlug(slug) || Catalog.GADGETS[0];

    let selectedVariantIndex = 0;
    let quantity = 1;

    function getActiveVariant() {
      if (!product.variants || product.variants.length === 0) return null;
      return product.variants[selectedVariantIndex] || product.variants[0];
    }

    function getUnitPrice() {
      const v = getActiveVariant();
      return Math.max(0, product.price + (v ? (v.priceDelta || 0) : 0));
    }

    function getUnitOriginalPrice() {
      const v = getActiveVariant();
      if (!product.originalPrice) return 0;
      return Math.max(0, product.originalPrice + (v ? (v.priceDelta || 0) : 0));
    }

    // Update page SEO title
    document.title = `${product.name} | DEVICE PRO Gadgets Nigeria`;

    // Breadcrumbs
    const bcCat = document.getElementById('gd-bc-cat');
    const bcName = document.getElementById('gd-bc-name');
    if (bcCat) {
      bcCat.textContent = product.categoryLabel;
      bcCat.href = `/gadget?category=${encodeURIComponent(product.category)}`;
    }
    if (bcName) bcName.textContent = product.name;

    // Gallery
    const mainImg = document.getElementById('gd-gallery-main-img');
    const thumbsWrap = document.getElementById('gd-gallery-thumbs');
    const galleryBadge = document.getElementById('gd-gallery-badge');
    const images = (product.images && product.images.length > 0) ? product.images : [product.image];

    if (mainImg) {
      mainImg.src = images[0];
      mainImg.alt = product.name;
    }
    if (galleryBadge) {
      galleryBadge.textContent = product.badge || 'Genuine Sealed';
      galleryBadge.className = `gd-badge gd-badge-${product.badgeTone || 'gold'}`;
    }

    if (thumbsWrap) {
      thumbsWrap.innerHTML = images.map((src, idx) => `
        <button type="button" class="gd-thumb-btn ${idx === 0 ? 'active' : ''}" data-thumb-src="${src}" aria-label="Product angle ${idx + 1}">
          <img src="${src}" alt="${product.name} view ${idx + 1}">
        </button>
      `).join('');

      thumbsWrap.querySelectorAll('.gd-thumb-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          thumbsWrap.querySelectorAll('.gd-thumb-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (mainImg) mainImg.src = btn.getAttribute('data-thumb-src');
        });
      });
    }

    // Header Info
    const brandPill = document.getElementById('gd-detail-brand');
    const catPill = document.getElementById('gd-detail-cat');
    const titleEl = document.getElementById('gd-detail-title');
    const ratingEl = document.getElementById('gd-detail-rating-text');
    const stockEl = document.getElementById('gd-detail-stock-text');
    const warrantyEl = document.getElementById('gd-detail-warranty-text');

    if (brandPill) brandPill.textContent = product.brand;
    if (catPill) catPill.textContent = product.categoryLabel;
    if (titleEl) titleEl.textContent = product.name;
    if (ratingEl) ratingEl.textContent = `${product.rating.toFixed(1)} (${product.reviewCount} verified reviews)`;
    if (stockEl) stockEl.textContent = `In Stock (${product.stockCount || 10} units ready in Lagos)`;
    if (warrantyEl) warrantyEl.textContent = product.warranty;

    // Variants
    const variantBlock = document.getElementById('gd-variant-block');
    const variantOptionsWrap = document.getElementById('gd-variant-options');

    function renderVariants() {
      if (!variantBlock || !variantOptionsWrap) return;
      if (!product.variants || product.variants.length === 0) {
        variantBlock.style.display = 'none';
        return;
      }
      variantBlock.style.display = 'block';
      variantOptionsWrap.innerHTML = product.variants.map((v, idx) => `
        <button type="button" class="gd-variant-btn ${idx === selectedVariantIndex ? 'active' : ''}" data-variant-idx="${idx}">
          ${v.label}
        </button>
      `).join('');

      variantOptionsWrap.querySelectorAll('.gd-variant-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedVariantIndex = parseInt(btn.getAttribute('data-variant-idx'), 10) || 0;
          renderVariants();
          updatePricingUI();
        });
      });
    }

    // Pricing & WhatsApp UI updater
    const priceValEl = document.getElementById('gd-detail-price-val');
    const priceOldEl = document.getElementById('gd-detail-price-old');
    const savePillEl = document.getElementById('gd-detail-save-pill');
    const qtyDisplayEl = document.getElementById('gd-qty-val');
    const buyNowBtn = document.getElementById('gd-btn-buy-now');
    const addCartBtn = document.getElementById('gd-btn-add-cart');
    const waBtn = document.getElementById('gd-btn-whatsapp');
    const stickyPriceEl = document.getElementById('gd-mobile-sticky-price');
    const stickyBuyBtn = document.getElementById('gd-mobile-sticky-buy');

    function updatePricingUI() {
      const unitPrice = getUnitPrice();
      const unitOrig = getUnitOriginalPrice();
      const total = unitPrice * quantity;
      const savings = unitOrig > unitPrice ? (unitOrig - unitPrice) * quantity : 0;

      if (priceValEl) priceValEl.textContent = Catalog.formatNaira(unitPrice);
      if (priceOldEl) {
        if (unitOrig > unitPrice) {
          priceOldEl.textContent = Catalog.formatNaira(unitOrig);
          priceOldEl.style.display = 'inline';
        } else {
          priceOldEl.style.display = 'none';
        }
      }
      if (savePillEl) {
        if (savings > 0) {
          savePillEl.textContent = `Save ${Catalog.formatNaira(savings)}`;
          savePillEl.style.display = 'inline-block';
        } else {
          savePillEl.style.display = 'none';
        }
      }
      if (qtyDisplayEl) qtyDisplayEl.textContent = String(quantity);
      if (buyNowBtn) {
        buyNowBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <span>Buy Now — Proceed to Checkout (${Catalog.formatNaira(total)})</span>
        `;
      }
      if (stickyPriceEl) stickyPriceEl.textContent = Catalog.formatNaira(total);

      if (waBtn) {
        const variant = getActiveVariant();
        const variantStr = variant ? `\nConfiguration: ${variant.label}` : '';
        const msg = encodeURIComponent(
          `Hello DEVICE PRO! I'd like to order:\n` +
          `Product: ${product.name}${variantStr}\n` +
          `Quantity: ${quantity}\n` +
          `Total: ${Catalog.formatNaira(total)}\n` +
          `Link: ${window.location.href}`
        );
        waBtn.href = `https://wa.me/2348033882268?text=${msg}`;
      }
    }

    function buildCartPayload() {
      const variant = getActiveVariant();
      const unitPrice = getUnitPrice();
      const variantSuffix = variant ? ` (${variant.label})` : '';
      return {
        id: `${product.id}-v${selectedVariantIndex}`,
        slug: product.slug,
        name: `${product.name}${variantSuffix}`,
        brand: product.brand,
        category: product.categoryLabel,
        price: unitPrice,
        image: product.image,
        specifications: product.shortSpec,
        quantity: quantity
      };
    }

    function handleAddToCart(openDrawerAfter) {
      const payload = buildCartPayload();
      if (window.DeviceProCart) {
        if (openDrawerAfter) {
          window.DeviceProCart.addItem(payload);
        } else {
          // Silent add for immediate redirect to main /checkout page
          const items = window.DeviceProCart.getItems();
          const existing = items.find(i => String(i.id) === String(payload.id));
          if (existing) {
            existing.quantity += payload.quantity;
          } else {
            items.push(payload);
          }
          window.DeviceProCart.saveItems(items);
        }
      } else {
        // Safe localStorage fallback directly matching DeviceProCart STORAGE_KEY
        const key = 'dp_equipment_cart_v1';
        let items = [];
        try { items = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
        const existing = items.find(i => String(i.id) === String(payload.id));
        if (existing) existing.quantity += payload.quantity;
        else items.push(payload);
        localStorage.setItem(key, JSON.stringify(items));
      }
    }

    // Stepper Controls
    const qtyMinus = document.getElementById('gd-qty-minus');
    const qtyPlus = document.getElementById('gd-qty-plus');
    if (qtyMinus) {
      qtyMinus.addEventListener('click', () => {
        if (quantity > 1) {
          quantity -= 1;
          updatePricingUI();
        }
      });
    }
    if (qtyPlus) {
      qtyPlus.addEventListener('click', () => {
        if (quantity < 20) {
          quantity += 1;
          updatePricingUI();
        }
      });
    }

    // Buy Now -> Direct redirect to main DEVICE PRO /checkout
    function proceedToMainCheckout() {
      handleAddToCart(false);
      window.location.href = '/checkout';
    }

    if (buyNowBtn) buyNowBtn.addEventListener('click', proceedToMainCheckout);
    if (stickyBuyBtn) stickyBuyBtn.addEventListener('click', proceedToMainCheckout);
    if (addCartBtn) addCartBtn.addEventListener('click', () => handleAddToCart(true));

    // Render Overview & Highlights Tab
    const overviewDescEl = document.getElementById('gd-overview-desc');
    const highlightsWrap = document.getElementById('gd-highlights-grid');
    if (overviewDescEl) overviewDescEl.textContent = product.description;
    if (highlightsWrap && product.highlights) {
      highlightsWrap.innerHTML = product.highlights.map(text => `
        <div class="gd-highlight-pill">
          <svg class="gd-highlight-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>${text}</span>
        </div>
      `).join('');
    }

    // Render Full Specs Table
    const specsTbody = document.getElementById('gd-spec-tbody');
    if (specsTbody && product.specs) {
      specsTbody.innerHTML = product.specs.map(row => `
        <tr>
          <th>${row.key}</th>
          <td>${row.val}</td>
        </tr>
      `).join('');
    }

    // Render Box Contents
    const boxGrid = document.getElementById('gd-box-grid');
    if (boxGrid && product.boxContents) {
      boxGrid.innerHTML = product.boxContents.map((item, idx) => `
        <div class="gd-box-item">
          <span class="gd-box-num">${idx + 1}</span>
          <span>${item}</span>
        </div>
      `).join('');
    }

    // Tab Switcher
    const tabBtns = document.querySelectorAll('.gd-tab-btn');
    const tabPanes = document.querySelectorAll('.gd-tab-pane');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const pane = document.getElementById(target);
        if (pane) pane.classList.add('active');
      });
    });

    // Render Related Gadgets (Minimalist White Editorial Card Styling matching /gadget)
    const relatedGrid = document.getElementById('gd-related-grid');
    if (relatedGrid) {
      const related = Catalog.getRelated(product, 4);
      const CART_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';
      relatedGrid.innerHTML = related.map(item => {
        const detailUrl = `/gadget/${encodeURIComponent(item.slug)}`;
        return `
          <article class="gd-editorial-card">
            <div class="gd-ed-stage">
              <span class="gd-ed-tag">${item.brand}</span>
              <button type="button" class="gd-ed-cart-btn" data-rel-add="${item.slug}" title="Add to Cart" aria-label="Add ${item.name} to cart">
                ${CART_SVG}
              </button>
              <a href="${detailUrl}" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;" aria-label="View ${item.name}">
                <img src="${item.image}" alt="${item.name}" loading="lazy">
              </a>
            </div>
            <div class="gd-ed-price-row">
              <span class="gd-ed-price">${Catalog.formatNaira(item.price)}</span>
              ${item.originalPrice > item.price ? `<span class="gd-ed-old-price">${Catalog.formatNaira(item.originalPrice)}</span>` : ''}
            </div>
            <h3 class="gd-ed-title"><a href="${detailUrl}">${item.name}</a></h3>
            <div class="gd-ed-rating">
              <span class="gd-ed-stars" aria-hidden="true">★★★★★</span>
              <span>${item.rating.toFixed(1)} (${item.reviewCount})</span>
            </div>
          </article>
        `;
      }).join('');

      relatedGrid.querySelectorAll('[data-rel-add]').forEach(btn => {
        btn.addEventListener('click', () => {
          const g = Catalog.getBySlug(btn.getAttribute('data-rel-add'));
          if (g && window.DeviceProCart) {
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
          }
        });
      });
    }

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

    // Init
    renderVariants();
    updatePricingUI();
  });
})();
