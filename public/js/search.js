/**
 * DEVICE PRO — Global Search & Autocomplete Controller
 * Provides spotlight-style Command Palette across all pages:
 * - Keyboard shortcuts (Ctrl/Cmd + K, '/')
 * - Debounced live querying across Equipment Products, Solar Packages, and Case Studies
 * - Arrow key navigation and direct Enter key submissions
 * - Self-injecting dialog container for universal page availability
 */

(function () {
  'use strict';

  let cachedPackages = null;
  let cachedCaseStudies = null;
  let debounceTimer = null;
  let activeIndex = -1;

  // Currency helper
  function formatNaira(num) {
    if (num === null || num === undefined || isNaN(num)) return '₦0';
    return '₦' + Number(num).toLocaleString('en-NG');
  }

  // Ensure search modal HTML exists in DOM
  function ensureSearchModal() {
    let dialog = document.getElementById('search-dialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'search-dialog';
    dialog.setAttribute('aria-labelledby', 'search-dialog-title');
    dialog.innerHTML = `
      <div class="search-dialog-inner">
        <div class="dialog-header-row">
          <h2 id="search-dialog-title">Search Solar Equipment &amp; Solutions</h2>
          <button type="button" class="modal-close-btn" data-close-dialog aria-label="Close search">✕</button>
        </div>

        <form id="global-search-form" onsubmit="event.preventDefault(); window.DeviceProSearch.submitSearch();">
          <div class="search-input-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="search" id="site-search-input" placeholder="Search solar panels, hybrid inverters, batteries, packages..." autocomplete="off" autofocus>
            <button type="button" class="btn-clear-search" id="btn-clear-search-input" aria-label="Clear search query">✕</button>
            <div class="search-input-shortcuts">
              <span class="kbd-badge">ESC</span>
            </div>
          </div>
        </form>

        <div class="search-popular-tags" id="search-popular-tags">
          <span>Popular:</span>
          <button type="button" class="tag-btn" data-tag="5kW Hybrid Inverter">5kVA Inverter</button>
          <button type="button" class="tag-btn" data-tag="Lithium Battery">LiFePO4 Battery</button>
          <button type="button" class="tag-btn" data-tag="Monocrystalline">550W Panels</button>
          <button type="button" class="tag-btn" data-tag="Executive Villa">Villa Packages</button>
          <button type="button" class="tag-btn" data-tag="Commercial">Commercial</button>
        </div>

        <div class="search-results-wrapper" id="search-results-wrapper" style="display: none;">
          <!-- Dynamically populated -->
        </div>

        <div class="search-dialog-footer">
          <span>Use <strong>↑</strong> <strong>↓</strong> to navigate, <strong>↵</strong> to select</span>
          <button type="button" class="btn-view-all-results" id="btn-view-all-search" style="display: none;">
            View all results in Catalogue →
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    bindModalEvents(dialog);
    return dialog;
  }

  // Open & Close Dialog
  function openSearchDialog(initialQuery = '') {
    const dialog = ensureSearchModal();
    if (!dialog) return;

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    const input = document.getElementById('site-search-input');
    if (input) {
      if (initialQuery) {
        input.value = initialQuery;
        performSearch(initialQuery);
      }
      setTimeout(() => input.focus(), 50);
    }
  }

  function closeSearchDialog() {
    const dialog = document.getElementById('search-dialog');
    if (!dialog) return;

    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    activeIndex = -1;
  }

  // Perform multi-entity search
  async function performSearch(rawQuery) {
    const query = (rawQuery || '').trim();
    const resultsWrapper = document.getElementById('search-results-wrapper');
    const popularTags = document.getElementById('search-popular-tags');
    const clearBtn = document.getElementById('btn-clear-search-input');
    const viewAllBtn = document.getElementById('btn-view-all-search');

    if (clearBtn) {
      clearBtn.style.display = query ? 'block' : 'none';
    }

    if (query.length < 2) {
      if (resultsWrapper) resultsWrapper.style.display = 'none';
      if (popularTags) popularTags.style.display = 'flex';
      if (viewAllBtn) viewAllBtn.style.display = 'none';
      activeIndex = -1;
      return;
    }

    if (popularTags) popularTags.style.display = 'none';
    if (resultsWrapper) {
      resultsWrapper.style.display = 'block';
      resultsWrapper.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: rgba(238,241,248,0.6); font-size: 0.85rem;">
          Searching hardware catalogue, solar packages &amp; projects...
        </div>
      `;
    }

    try {
      // 1. Fetch matching products
      const prodPromise = fetch(`/api/products?search=${encodeURIComponent(query)}&limit=6`)
        .then(r => r.json())
        .catch(() => ({ products: [] }));

      // 2. Fetch packages (cached)
      if (!cachedPackages) {
        try {
          const res = await fetch('/api/packages');
          const data = await res.json();
          cachedPackages = data.packages || [];
        } catch {
          cachedPackages = [];
        }
      }

      // 3. Fetch case studies (cached)
      if (!cachedCaseStudies) {
        try {
          const res = await fetch('/api/case-studies');
          const data = await res.json();
          cachedCaseStudies = data.caseStudies || [];
        } catch {
          cachedCaseStudies = [];
        }
      }

      const prodData = await prodPromise;
      const products = prodData.products || [];

      const qLower = query.toLowerCase();
      const matchedPackages = cachedPackages.filter(p =>
        (p.name && p.name.toLowerCase().includes(qLower)) ||
        (p.power_rating && p.power_rating.toLowerCase().includes(qLower)) ||
        (p.description && p.description.toLowerCase().includes(qLower)) ||
        (p.specifications && p.specifications.toLowerCase().includes(qLower))
      ).slice(0, 3);

      const matchedCases = cachedCaseStudies.filter(c =>
        (c.title && c.title.toLowerCase().includes(qLower)) ||
        (c.sector && c.sector.toLowerCase().includes(qLower)) ||
        (c.location && c.location.toLowerCase().includes(qLower))
      ).slice(0, 2);

      renderSearchResults({
        query,
        products,
        packages: matchedPackages,
        cases: matchedCases,
        totalProducts: prodData.total || products.length
      });
    } catch (err) {
      console.error('[SEARCH ERROR]:', err);
      if (resultsWrapper) {
        resultsWrapper.innerHTML = `
          <div class="search-empty-state">
            <p>An error occurred while querying the catalogue.</p>
            <small>Please check your internet connection or try again.</small>
          </div>
        `;
      }
    }
  }

  function renderSearchResults({ query, products, packages, cases, totalProducts }) {
    const resultsWrapper = document.getElementById('search-results-wrapper');
    const viewAllBtn = document.getElementById('btn-view-all-search');
    if (!resultsWrapper) return;

    const totalMatches = products.length + packages.length + cases.length;

    if (totalMatches === 0) {
      resultsWrapper.innerHTML = `
        <div class="search-empty-state">
          <p>No equipment, packages, or projects found matching <strong>"${escapeHtml(query)}"</strong></p>
          <small>Try checking your spelling or searching for broad terms like "inverter", "lithium", "panel", or "5kVA".</small>
        </div>
      `;
      if (viewAllBtn) viewAllBtn.style.display = 'none';
      return;
    }

    let html = '';

    // Section 1: Equipment Hardware
    if (products.length > 0) {
      html += `<div class="search-group-title">Equipment &amp; Hardware (${products.length})</div>`;
      html += `<ul class="search-results-list">`;
      products.forEach(p => {
        html += `
          <li>
            <a href="/products/${p.slug}" class="search-result-item" data-url="/products/${p.slug}">
              <div class="result-item-left">
                <img src="/${p.image_url || 'images/products/jinko-solar-panel.png'}" alt="${escapeHtml(p.name)}" class="result-thumb" onerror="this.src='/images/logo-mark.svg'">
                <div class="result-text-col">
                  <div class="result-title">${escapeHtml(p.name)}</div>
                  <div class="result-sub">${escapeHtml(p.brand || 'DEVICE PRO')} • ${escapeHtml(p.specifications || p.power_rating || '')}</div>
                </div>
              </div>
              <div class="result-item-right">
                <span class="result-price">${formatNaira(p.price_ngn)}</span>
                <span class="result-badge">${p.stock_status === 'in_stock' ? 'In Stock' : (p.stock_status || 'Available')}</span>
              </div>
            </a>
          </li>
        `;
      });
      html += `</ul>`;
    }

    // Section 2: Turnkey Solar Packages
    if (packages.length > 0) {
      html += `<div class="search-group-title">Turnkey Solar Packages (${packages.length})</div>`;
      html += `<ul class="search-results-list">`;
      packages.forEach(pkg => {
        html += `
          <li>
            <a href="/packages#${pkg.slug}" class="search-result-item" data-url="/packages#${pkg.slug}">
              <div class="result-item-left">
                <div class="result-icon-box">📦</div>
                <div class="result-text-col">
                  <div class="result-title">${escapeHtml(pkg.name)}</div>
                  <div class="result-sub">${escapeHtml(pkg.power_rating || 'Turnkey System')} • ${escapeHtml(pkg.specifications || '')}</div>
                </div>
              </div>
              <div class="result-item-right">
                <span class="result-price">${formatNaira(pkg.price_ngn)}</span>
                <span class="result-badge">Full Turnkey</span>
              </div>
            </a>
          </li>
        `;
      });
      html += `</ul>`;
    }

    // Section 3: Portfolio Case Studies
    if (cases.length > 0) {
      html += `<div class="search-group-title">Engineered Projects &amp; Case Studies (${cases.length})</div>`;
      html += `<ul class="search-results-list">`;
      cases.forEach(c => {
        html += `
          <li>
            <a href="/projects#${c.slug}" class="search-result-item" data-url="/projects#${c.slug}">
              <div class="result-item-left">
                <div class="result-icon-box">⚡</div>
                <div class="result-text-col">
                  <div class="result-title">${escapeHtml(c.title)}</div>
                  <div class="result-sub">${escapeHtml(c.location || 'Nigeria')} • ${c.capacity_kva || 0}kVA System</div>
                </div>
              </div>
              <div class="result-item-right">
                <span class="result-badge" style="background: rgba(1, 87, 162, 0.25); color: #60A5FA;">${escapeHtml(c.sector || 'Commercial')}</span>
              </div>
            </a>
          </li>
        `;
      });
      html += `</ul>`;
    }

    resultsWrapper.innerHTML = html;
    activeIndex = -1;

    // View All Button
    if (viewAllBtn) {
      viewAllBtn.style.display = 'inline-block';
      viewAllBtn.onclick = () => {
        window.location.href = `/products?search=${encodeURIComponent(query)}`;
      };
    }
  }

  // Keyboard navigation within results
  function handleKeyDown(e) {
    const dialog = document.getElementById('search-dialog');
    if (!dialog || !dialog.open) return;

    const items = dialog.querySelectorAll('.search-result-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length === 0) return;
      activeIndex = (activeIndex + 1) % items.length;
      updateActiveItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length === 0) return;
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      updateActiveItem(items);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        const targetUrl = items[activeIndex].getAttribute('data-url') || items[activeIndex].getAttribute('href');
        if (targetUrl) {
          window.location.href = targetUrl;
        }
      } else {
        // Submit search to catalogue
        e.preventDefault();
        submitSearch();
      }
    }
  }

  function updateActiveItem(items) {
    items.forEach((item, idx) => {
      if (idx === activeIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  function submitSearch() {
    const input = document.getElementById('site-search-input');
    const query = input ? input.value.trim() : '';
    if (query) {
      window.location.href = `/products?search=${encodeURIComponent(query)}`;
    }
  }

  // Bind dialog events
  function bindModalEvents(dialog) {
    const input = dialog.querySelector('#site-search-input');
    const clearBtn = dialog.querySelector('#btn-clear-search-input');
    const closeBtns = dialog.querySelectorAll('[data-close-dialog]');

    if (input) {
      input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          performSearch(e.target.value);
        }, 150);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (input) {
          input.value = '';
          input.focus();
          performSearch('');
        }
      });
    }

    closeBtns.forEach(btn => {
      btn.addEventListener('click', closeSearchDialog);
    });

    // Close on backdrop click
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        closeSearchDialog();
      }
    });

    // Popular tags click
    dialog.querySelectorAll('.tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag') || btn.textContent.trim();
        if (input) {
          input.value = tag;
          performSearch(tag);
        }
      });
    });
  }

  // Helper escape
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Global listeners
  function init() {
    // 1. Search Trigger buttons
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-trigger-search]');
      if (trigger) {
        e.preventDefault();
        openSearchDialog();
      }
    });

    // 2. Global Hotkeys: Ctrl/Cmd + K or '/'
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearchDialog();
        return;
      }

      // Single slash key '/' when not in input
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        openSearchDialog();
        return;
      }

      // Dialog navigation
      handleKeyDown(e);
    });

    // Check if dialog already in DOM
    const existingDialog = document.getElementById('search-dialog');
    if (existingDialog) {
      bindModalEvents(existingDialog);
    }
  }

  // Public API
  window.DeviceProSearch = {
    open: openSearchDialog,
    close: closeSearchDialog,
    submitSearch: submitSearch
  };

  // Run on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
