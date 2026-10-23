/**
 * DEVICE PRO Nigeria — Administrative & Engineering Operations Console
 * Client script for authentication, role-based view controls, commerce order management,
 * solar quote pipeline review, customer enquiries, catalogue management & audit trail.
 */

(function () {
  'use strict';

  // --- STATE ---
  let currentUser = null;
  let activeTab = 'overview';
  let cachedOrders = [];
  let cachedFulfillment = [];
  let cachedTickets = [];
  let cachedWarranties = [];
  let cachedQuotes = [];
  let cachedEnquiries = [];
  let cachedProducts = [];
  let productPagination = { page: 1, limit: 20, total: 0, totalPages: 1 };
  let currentEditingProductId = null;
  let currentArchiveProductId = null;
  let currentArchiveTargetState = true;
  let currentEditingOrderId = null;
  let currentEditingQuoteId = null;
  let currentEditingFulfillmentId = null;
  let currentEditingTicketId = null;

  // --- DOM ELEMENTS ---
  const authView = document.getElementById('admin-auth-view');
  const dashboardView = document.getElementById('admin-dashboard-view');
  const loginForm = document.getElementById('admin-login-form');
  const authErrorBox = document.getElementById('auth-error-alert');
  const btnLoginSubmit = document.getElementById('btn-login-submit');
  const btnLogout = document.getElementById('btn-admin-logout');
  const btnRefresh = document.getElementById('btn-refresh-data');
  const topbarTitle = document.getElementById('topbar-page-title');

  // Sidebar profile elements
  const avatarEl = document.getElementById('sidebar-user-avatar');
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');

  // Badges & KPI
  const badgeOrders = document.getElementById('badge-orders-count');
  const badgeFulfillment = document.getElementById('badge-fulfillment-count');
  const badgeSupport = document.getElementById('badge-support-count');
  const badgeQuotes = document.getElementById('badge-quotes-count');
  const badgeEnquiries = document.getElementById('badge-enquiries-count');
  const kpiRevenue = document.getElementById('kpi-total-revenue');
  const kpiOrders = document.getElementById('kpi-orders-count');
  const kpiPendingOrders = document.getElementById('kpi-pending-orders');
  const kpiOpenQuotes = document.getElementById('kpi-open-quotes');
  const kpiOpenEnquiries = document.getElementById('kpi-open-enquiries');
  const kpiProducts = document.getElementById('kpi-products-count');
  const kpiOpenTickets = document.getElementById('kpi-open-tickets');
  const kpiTotalTickets = document.getElementById('kpi-total-tickets');
  const kpiActiveWarranties = document.getElementById('kpi-active-warranties');

  // Modals
  const orderModal = document.getElementById('order-details-modal');
  const fulfillmentModal = document.getElementById('fulfillment-modal');
  const adminTicketModal = document.getElementById('admin-ticket-modal');
  const quoteModal = document.getElementById('quote-details-modal');
  const productEditModal = document.getElementById('product-edit-modal');
  const addProductModal = document.getElementById('add-product-modal');
  const productInspectModal = document.getElementById('product-inspect-modal');
  const productArchiveModal = document.getElementById('product-archive-modal');

  // Formatters
  function formatNaira(num) {
    if (num === null || num === undefined || isNaN(num)) return '₦0';
    return '₦' + Number(num).toLocaleString('en-NG');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  }

  // --- TOKEN UTILS ---
  function getToken() {
    return sessionStorage.getItem('dp_admin_token') || localStorage.getItem('dp_admin_token');
  }

  function setToken(token) {
    sessionStorage.setItem('dp_admin_token', token);
    localStorage.setItem('dp_admin_token', token);
  }

  function clearToken() {
    sessionStorage.removeItem('dp_admin_token');
    localStorage.removeItem('dp_admin_token');
  }

  // API Request Wrapper with Auth Header
  async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}) };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { credentials: 'omit', ...options, headers });
    if (response.status === 401) {
      clearToken();
      showAuthScreen();
      throw new Error('Session expired or unauthorized.');
    }
    return response;
  }

  // ==========================================================================
  // INITIALIZATION & AUTHENTICATION
  // ==========================================================================
  async function init() {
    setupEventListeners();
    const token = getToken();
    if (token) {
      try {
        const res = await apiFetch('/api/auth/me');
        const data = await res.json();
        if (data.success && data.user) {
          const allowedRoles = ['admin', 'superadmin', 'engineer', 'sales', 'staff'];
          if (allowedRoles.includes(data.user.role)) {
            currentUser = data.user;
            showDashboard();
            return;
          } else {
            clearToken();
            showAuthScreen();
            showAuthError('Access denied: Customer accounts do not have administrative console permissions.');
            return;
          }
        }
      } catch (err) {
        console.warn('[ADMIN AUTH VERIFICATION]: Session invalid', err);
      }
    }
    showAuthScreen();
  }

  // Stage 3: Authoritative Section Metadata Registry for all 16 navigation areas
  const SECTION_REGISTRY = {
    'overview': {
      title: 'Operational Overview',
      breadcrumb: 'Overview',
      panelId: 'panel-overview',
      roles: ['superadmin', 'admin', 'engineer', 'sales', 'staff']
    },
    'products': {
      title: 'Equipment Catalogue & Stock Control',
      breadcrumb: 'Products',
      panelId: 'panel-products',
      roles: ['superadmin', 'admin', 'engineer']
    },
    'supplier-imports': {
      title: 'Supplier Price List Importer',
      breadcrumb: 'Supplier Price Imports',
      panelId: 'panel-supplier-imports',
      roles: ['superadmin', 'admin']
    },
    'supplier-price-imports': {
      aliasOf: 'supplier-imports'
    },
    'categories': {
      title: 'Equipment Categories Architecture',
      breadcrumb: 'Categories',
      panelId: 'panel-categories',
      roles: ['superadmin', 'admin', 'engineer']
    },
    'brands': {
      title: 'Manufacturer & OEM Brands',
      breadcrumb: 'Brands',
      panelId: 'panel-brands',
      roles: ['superadmin', 'admin', 'engineer']
    },
    'solar-packages': {
      title: 'Turnkey Solar Package Configurator',
      breadcrumb: 'Solar Packages',
      panelId: 'panel-solar-packages',
      roles: ['superadmin', 'admin', 'engineer']
    },
    'content': {
      title: 'Website Content & Copy CMS',
      breadcrumb: 'Website Content',
      panelId: 'panel-content',
      roles: ['superadmin', 'admin']
    },
    'website-content': {
      aliasOf: 'content'
    },
    'images': {
      title: 'Image & Media Asset Manager',
      breadcrumb: 'Image Manager',
      panelId: 'panel-images',
      roles: ['superadmin', 'admin']
    },
    'image-manager': {
      aliasOf: 'images'
    },
    'orders': {
      title: 'Commerce Orders & Fulfillment Center',
      breadcrumb: 'Orders',
      panelId: 'panel-orders',
      roles: ['superadmin', 'admin', 'sales']
    },
    'customers': {
      title: 'Customer Directory & CRM',
      breadcrumb: 'Customers',
      panelId: 'panel-customers',
      roles: ['superadmin', 'admin', 'sales']
    },
    'quotes-enquiries': {
      title: 'Solar Engineering Quotes & Customer Enquiries',
      breadcrumb: 'Quotes & Enquiries',
      panelId: 'panel-quotes-enquiries',
      roles: ['superadmin', 'admin', 'sales', 'engineer']
    },
    'quotes': {
      aliasOf: 'quotes-enquiries'
    },
    'enquiries': {
      aliasOf: 'quotes-enquiries'
    },
    'projects': {
      title: 'Turnkey Projects Showcase & Case Studies',
      breadcrumb: 'Projects',
      panelId: 'panel-projects',
      roles: ['superadmin', 'admin', 'engineer']
    },
    'import-history': {
      title: 'Supplier Price Import History & Diffs',
      breadcrumb: 'Import History',
      panelId: 'panel-import-history',
      roles: ['superadmin', 'admin']
    },
    'audit-logs': {
      title: 'Immutable Security Audit Trail',
      breadcrumb: 'Audit Logs',
      panelId: 'panel-audit-logs',
      roles: ['superadmin']
    },
    'audit': {
      aliasOf: 'audit-logs'
    },
    'admin-users': {
      title: 'Administrator Accounts & RBAC Management',
      breadcrumb: 'Admin Users',
      panelId: 'panel-admin-users',
      roles: ['superadmin']
    },
    'settings': {
      title: 'Platform & Energy Benchmarks Settings',
      breadcrumb: 'Settings',
      panelId: 'panel-settings',
      roles: ['superadmin', 'admin']
    }
  };

  function resolveSection(sectionName) {
    if (!sectionName) return 'overview';
    const clean = sectionName.toLowerCase().trim();
    const entry = SECTION_REGISTRY[clean];
    if (entry && entry.aliasOf) return entry.aliasOf;
    if (entry) return clean;
    return 'overview';
  }

  function showAuthScreen() {
    currentUser = null;
    if (authView) authView.style.display = 'flex';
    if (dashboardView) dashboardView.style.display = 'none';
  }

  function showDashboard() {
    if (authView) authView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'flex';

    const displayName = currentUser.fullName || currentUser.username;
    const roleUpper = (currentUser.role || 'ADMIN').toUpperCase();
    const initials = displayName
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'DP';

    // Set sidebar profile info
    if (nameEl) nameEl.textContent = displayName;
    if (roleEl) {
      roleEl.textContent = roleUpper;
      roleEl.className = `user-role-badge ${currentUser.role}`;
    }
    if (avatarEl) avatarEl.textContent = initials;

    // Set topbar & user menu profile info
    const topbarAvatar = document.getElementById('topbar-user-avatar');
    const topbarName = document.getElementById('topbar-user-name');
    const topbarMenuName = document.getElementById('topbar-menu-user-fullname');
    const topbarMenuEmail = document.getElementById('topbar-menu-user-email');
    const topbarMenuRole = document.getElementById('topbar-menu-user-role');
    const overviewName = document.getElementById('overview-welcome-name');
    const liveClock = document.getElementById('overview-live-clock');

    if (topbarAvatar) topbarAvatar.textContent = initials;
    if (topbarName) topbarName.textContent = displayName;
    if (topbarMenuName) topbarMenuName.textContent = displayName;
    if (topbarMenuEmail) topbarMenuEmail.textContent = currentUser.email || `${currentUser.username}@devicepro.ng`;
    if (topbarMenuRole) {
      topbarMenuRole.textContent = roleUpper;
      topbarMenuRole.className = `user-role-badge ${currentUser.role}`;
    }
    if (overviewName) overviewName.textContent = displayName;
    if (liveClock) {
      try {
        liveClock.textContent = new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      } catch (e) {
        liveClock.textContent = 'October 2026';
      }
    }

    // Role-based navigation visibility
    const isSuperadmin = currentUser.role === 'superadmin';
    const isAdminOrSuper = ['superadmin', 'admin'].includes(currentUser.role);
    document.querySelectorAll('.superadmin-only').forEach(el => {
      el.style.display = isSuperadmin ? '' : 'none';
    });
    document.querySelectorAll('.superadmin-or-admin-only').forEach(el => {
      el.style.display = isAdminOrSuper ? '' : 'none';
    });

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const allowedRolesStr = btn.getAttribute('data-roles');
      if (allowedRolesStr) {
        const allowed = allowedRolesStr.split(',').map(r => r.trim());
        if (!allowed.includes(currentUser.role)) {
          btn.style.display = 'none';
        } else if (!btn.classList.contains('superadmin-only') || isSuperadmin) {
          btn.style.display = '';
        }
      }
    });

    // Hide navigation groups if all their items are hidden
    document.querySelectorAll('.nav-group').forEach(group => {
      const buttons = Array.from(group.querySelectorAll('.nav-tab-btn'));
      if (buttons.length > 0) {
        const anyVisible = buttons.some(b => b.style.display !== 'none');
        group.style.display = anyVisible ? '' : 'none';
      }
    });

    // Determine initial section from URL path or hash
    let initialSection = 'overview';
    const pathMatch = window.location.pathname.match(/^\/admin\/([a-zA-Z0-9_-]+)/);
    if (pathMatch && pathMatch[1]) {
      initialSection = resolveSection(pathMatch[1]);
    } else if (window.location.hash) {
      initialSection = resolveSection(window.location.hash.replace('#', ''));
    }

    // Check permission for initial section
    const secConfig = SECTION_REGISTRY[initialSection];
    if (secConfig && secConfig.roles && !secConfig.roles.includes(currentUser.role)) {
      initialSection = 'overview';
    }

    switchTab(initialSection, false);
    loadDashboardStats();
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================
  function setupEventListeners() {
    // Quick Demo Pills
    document.querySelectorAll('.demo-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = btn.getAttribute('data-user');
        const p = btn.getAttribute('data-pass');
        const userInput = document.getElementById('login-username');
        const passInput = document.getElementById('login-password');
        if (userInput) userInput.value = u;
        if (passInput) passInput.value = p;
        if (authErrorBox) authErrorBox.style.display = 'none';
      });
    });

    // Login Form Submit
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
          showAuthError('Please enter both your staff username and access password.');
          return;
        }

        if (btnLoginSubmit) {
          btnLoginSubmit.disabled = true;
          btnLoginSubmit.innerHTML = '<span>Verifying credentials...</span>';
        }

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Authentication rejected. Verify credentials.');
          }

          const allowedRoles = ['admin', 'superadmin', 'engineer', 'sales', 'staff'];
          if (!allowedRoles.includes(data.user.role)) {
            clearToken();
            throw new Error('Access denied: Customer accounts do not have administrative console permissions.');
          }

          setToken(data.token);
          currentUser = data.user;
          showDashboard();
        } catch (err) {
          showAuthError(err.message || 'Login failed.');
        } finally {
          if (btnLoginSubmit) {
            btnLoginSubmit.disabled = false;
            btnLoginSubmit.innerHTML = '<span>Authenticate & Launch Console</span><span class="arrow">→</span>';
          }
        }
      });
    }

    // Sidebar Sign Out Button
    if (btnLogout) {
      btnLogout.addEventListener('click', handleLogout);
    }

    // Topbar Sign Out Button
    const btnTopbarLogout = document.getElementById('btn-topbar-logout');
    if (btnTopbarLogout) {
      btnTopbarLogout.addEventListener('click', handleLogout);
    }

    async function handleLogout() {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {
        // ignore
      }
      clearToken();
      showAuthScreen();
    }

    // Refresh Live Data Button
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        loadDashboardStats();
        loadCurrentTab();
      });
    }

    // Collapsible Sidebar (Desktop)
    const collapseBtn = document.getElementById('btn-collapse-sidebar');
    const sidebar = document.getElementById('admin-sidebar');
    if (collapseBtn && sidebar) {
      const savedState = localStorage.getItem('dp_admin_sidebar_collapsed');
      if (savedState === 'true') {
        sidebar.classList.add('sidebar-collapsed');
      }
      collapseBtn.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.toggle('sidebar-collapsed');
        localStorage.setItem('dp_admin_sidebar_collapsed', isCollapsed ? 'true' : 'false');
      });
    }

    // Mobile Navigation Drawer (Hamburger & Close)
    const mobileToggleBtn = document.getElementById('sidebar-toggle-btn');
    const mobileCloseBtn = document.getElementById('sidebar-close-btn');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    
    const closeMobileSidebar = () => {
      if (sidebar) sidebar.classList.remove('mobile-open');
      if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
      if (mobileToggleBtn) mobileToggleBtn.setAttribute('aria-expanded', 'false');
    };

    if (mobileToggleBtn && sidebar) {
      mobileToggleBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('mobile-open');
        if (sidebarBackdrop) sidebarBackdrop.classList.toggle('active', isOpen);
        mobileToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }
    if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', closeMobileSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);

    // User Account Popover Dropdown
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userMenuDropdown = document.getElementById('user-menu-dropdown');
    if (userMenuBtn && userMenuDropdown) {
      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = userMenuDropdown.style.display === 'block';
        userMenuDropdown.style.display = isOpen ? 'none' : 'block';
        userMenuBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#user-account-menu')) {
          userMenuDropdown.style.display = 'none';
          userMenuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    const btnMenuSettings = document.getElementById('menu-btn-settings');
    if (btnMenuSettings) {
      btnMenuSettings.addEventListener('click', () => {
        if (userMenuDropdown) {
          userMenuDropdown.style.display = 'none';
          if (userMenuBtn) userMenuBtn.setAttribute('aria-expanded', 'false');
        }
        switchTab('settings');
      });
    }

    // Global Escape Key Listener for Accessible Overlay Dismissal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileSidebar();
        if (userMenuDropdown) {
          userMenuDropdown.style.display = 'none';
          if (userMenuBtn) userMenuBtn.setAttribute('aria-expanded', 'false');
        }
      }
    });

    // Navigation Tabs Event Listeners
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-section') || btn.getAttribute('data-tab');
        switchTab(target);
      });
    });

    // Return to Overview actions
    document.querySelectorAll('[data-action="go-overview"]').forEach(btn => {
      btn.addEventListener('click', () => switchTab('overview'));
    });

    // Quick navigation actions from cards
    document.querySelectorAll('[data-action-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sec = btn.getAttribute('data-action-nav');
        if (sec) switchTab(sec);
      });
    });

    // Topbar breadcrumb home link
    const breadcrumbHome = document.getElementById('breadcrumb-home-link');
    if (breadcrumbHome) {
      breadcrumbHome.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('overview');
      });
    }

    // Filter controls - Orders
    const ordersSearch = document.getElementById('orders-search-input');
    const ordersStatus = document.getElementById('orders-status-filter');
    if (ordersSearch) ordersSearch.addEventListener('input', debounce(() => renderOrdersTable(), 300));
    if (ordersStatus) ordersStatus.addEventListener('change', () => renderOrdersTable());

    // Filter controls - Fulfillment (Stage 16)
    const fulSearch = document.getElementById('fulfillment-search-input');
    const fulStatus = document.getElementById('fulfillment-status-filter');
    if (fulSearch) fulSearch.addEventListener('input', debounce(() => renderFulfillmentTable(), 300));
    if (fulStatus) fulStatus.addEventListener('change', () => renderFulfillmentTable());

    // Filter controls - Support (Stage 16)
    const supportStatus = document.getElementById('support-status-filter');
    if (supportStatus) supportStatus.addEventListener('change', () => renderSupportTicketsTable());

    // Filter controls - Quotes
    const quotesSearch = document.getElementById('quotes-search-input');
    const quotesStatus = document.getElementById('quotes-status-filter');
    if (quotesSearch) quotesSearch.addEventListener('input', debounce(() => renderQuotesTable(), 300));
    if (quotesStatus) quotesStatus.addEventListener('change', () => renderQuotesTable());

    // Filter controls - Enquiries
    const enquiriesSearch = document.getElementById('enquiries-search-input');
    const enquiriesStatus = document.getElementById('enquiries-status-filter');
    if (enquiriesSearch) enquiriesSearch.addEventListener('input', debounce(() => renderEnquiriesTable(), 300));
    if (enquiriesStatus) enquiriesStatus.addEventListener('change', () => renderEnquiriesTable());

    // Filter controls - Products
    const prodsSearch = document.getElementById('products-search-input');
    const prodsCategory = document.getElementById('products-category-filter');
    if (prodsSearch) prodsSearch.addEventListener('input', debounce(() => loadProducts(), 300));
    if (prodsCategory) prodsCategory.addEventListener('change', () => loadProducts());

    // Modal Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dialog = btn.closest('dialog');
        if (dialog) dialog.close();
      });
    });

    // Save Order Updates
    const btnSaveOrder = document.getElementById('btn-save-order-changes');
    if (btnSaveOrder) {
      btnSaveOrder.addEventListener('click', saveOrderUpdates);
    }

    // Save Fulfillment Updates (Stage 16)
    const btnSaveFulfillment = document.getElementById('btn-save-fulfillment-changes');
    if (btnSaveFulfillment) {
      btnSaveFulfillment.addEventListener('click', saveFulfillmentUpdates);
    }

    // Save Support Ticket Updates (Stage 16)
    const btnSaveTicket = document.getElementById('btn-save-ticket-changes');
    if (btnSaveTicket) {
      btnSaveTicket.addEventListener('click', saveTicketUpdates);
    }

    // Save Quote Updates
    const btnSaveQuote = document.getElementById('btn-save-quote-changes');
    if (btnSaveQuote) {
      btnSaveQuote.addEventListener('click', saveQuoteUpdates);
    }

    // Stage 4: Products Management Event Listeners
    const btnOpenAddProd = document.getElementById('btn-open-add-product') || document.getElementById('btn-add-product-modal');
    if (btnOpenAddProd && addProductModal) {
      btnOpenAddProd.addEventListener('click', () => {
        const form = document.getElementById('add-product-form');
        if (form) form.reset();
        document.getElementById('add-prod-error-alert').style.display = 'none';
        document.querySelectorAll('#add-product-modal .field-error-msg').forEach(el => el.style.display = 'none');
        document.querySelectorAll('#add-product-modal .form-input').forEach(el => el.classList.remove('input-error'));
        const preview = document.getElementById('add-prod-img-preview');
        if (preview) preview.src = '/images/logo-mark.svg';
        const marginEl = document.getElementById('add-prod-margin-preview');
        if (marginEl) marginEl.textContent = '—';
        addProductModal.showModal();
      });
    }

    // Products Search & Filters
    const prodSearch = document.getElementById('products-search-input');
    if (prodSearch) {
      prodSearch.addEventListener('input', debounce(() => {
        productPagination.page = 1;
        loadProducts(1);
      }, 300));
    }

    ['products-category-filter', 'products-brand-filter', 'products-stock-filter', 'products-status-filter', 'products-limit-select'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          if (id === 'products-limit-select') {
            productPagination.limit = parseInt(el.value, 10) || 20;
          }
          productPagination.page = 1;
          loadProducts(1);
        });
      }
    });

    const btnResetProdFilters = document.getElementById('btn-products-reset-filters');
    if (btnResetProdFilters) {
      btnResetProdFilters.addEventListener('click', () => {
        if (prodSearch) prodSearch.value = '';
        const catFilter = document.getElementById('products-category-filter');
        if (catFilter) catFilter.value = 'all';
        const brandFilter = document.getElementById('products-brand-filter');
        if (brandFilter) brandFilter.value = 'all';
        const stockFilter = document.getElementById('products-stock-filter');
        if (stockFilter) stockFilter.value = 'all';
        const statusFilter = document.getElementById('products-status-filter');
        if (statusFilter) statusFilter.value = 'all';
        productPagination.page = 1;
        loadProducts(1);
      });
    }

    // Products Pagination Buttons
    const btnProdPrev = document.getElementById('btn-prod-prev-page');
    if (btnProdPrev) {
      btnProdPrev.addEventListener('click', () => {
        if (productPagination.page > 1) {
          loadProducts(productPagination.page - 1);
        }
      });
    }

    const btnProdNext = document.getElementById('btn-prod-next-page');
    if (btnProdNext) {
      btnProdNext.addEventListener('click', () => {
        if (productPagination.page < productPagination.totalPages) {
          loadProducts(productPagination.page + 1);
        }
      });
    }

    // Real-time margin calculator helper
    function updateMarginDisplay(priceInputId, costInputId, displayId) {
      const priceVal = parseFloat(document.getElementById(priceInputId)?.value) || 0;
      const costVal = parseFloat(document.getElementById(costInputId)?.value) || 0;
      const displayEl = document.getElementById(displayId);
      if (!displayEl) return;

      if (priceVal <= 0 || costVal <= 0) {
        displayEl.textContent = '—';
        displayEl.className = '';
        return;
      }

      const grossProfit = priceVal - costVal;
      const marginPct = ((grossProfit / priceVal) * 100).toFixed(1);
      const pillClass = marginPct >= 15 ? 'healthy' : (marginPct >= 5 ? 'tight' : 'negative');
      displayEl.innerHTML = `<span class="margin-pill ${pillClass}">₦${grossProfit.toLocaleString()} (${marginPct}%)</span>`;
    }

    // Edit form pricing listeners
    const editPriceInput = document.getElementById('edit-prod-price');
    const editCostInput = document.getElementById('edit-prod-cost');
    if (editPriceInput) editPriceInput.addEventListener('input', () => updateMarginDisplay('edit-prod-price', 'edit-prod-cost', 'edit-prod-margin-preview'));
    if (editCostInput) editCostInput.addEventListener('input', () => updateMarginDisplay('edit-prod-price', 'edit-prod-cost', 'edit-prod-margin-preview'));

    // Add form pricing listeners
    const addPriceInput = document.getElementById('add-prod-price');
    const addCostInput = document.getElementById('add-prod-cost');
    if (addPriceInput) addPriceInput.addEventListener('input', () => updateMarginDisplay('add-prod-price', 'add-prod-cost', 'add-prod-margin-preview'));
    if (addCostInput) addCostInput.addEventListener('input', () => updateMarginDisplay('add-prod-price', 'add-prod-cost', 'add-prod-margin-preview'));

    // Image URL Live Previews
    const editImgInput = document.getElementById('edit-prod-image');
    if (editImgInput) {
      editImgInput.addEventListener('input', () => {
        const url = editImgInput.value.trim();
        const preview = document.getElementById('edit-prod-img-preview');
        if (preview) preview.src = url || '/images/logo-mark.svg';
      });
    }

    const addImgInput = document.getElementById('add-prod-image');
    if (addImgInput) {
      addImgInput.addEventListener('input', () => {
        const url = addImgInput.value.trim();
        const preview = document.getElementById('add-prod-img-preview');
        if (preview) preview.src = url || '/images/logo-mark.svg';
      });
    }

    // Form Submits
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
      addProductForm.addEventListener('submit', handleAddProductSubmit);
    }

    const editProductForm = document.getElementById('product-edit-form');
    if (editProductForm) {
      editProductForm.addEventListener('submit', handleEditProductSubmit);
    }

    // Inspect to Edit button
    const btnInspectToEdit = document.getElementById('btn-inspect-to-edit');
    if (btnInspectToEdit) {
      btnInspectToEdit.addEventListener('click', () => {
        if (productInspectModal) productInspectModal.close();
        if (currentEditingProductId) {
          window.adminOpenEditProductModal(currentEditingProductId);
        }
      });
    }

    // Archive confirmation
    const btnConfirmArchive = document.getElementById('btn-confirm-archive-action');
    if (btnConfirmArchive) {
      btnConfirmArchive.addEventListener('click', executeArchiveProduct);
    }

    // Export Database Backup Button
    const btnExportBackup = document.getElementById('btn-export-backup');
    if (btnExportBackup) {
      btnExportBackup.addEventListener('click', exportDatabaseBackup);
    }

    // Stage 5: Supplier Price Import Listeners
    setupPriceImportListeners();
  }

  // Handle popstate for browser back/forward buttons
  window.addEventListener('popstate', (e) => {
    if (currentUser) {
      let sec = 'overview';
      if (e.state && e.state.section) {
        sec = e.state.section;
      } else {
        const match = window.location.pathname.match(/^\/admin\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) sec = resolveSection(match[1]);
      }
      switchTab(sec, false);
    }
  });

  function showAuthError(msg) {
    if (authErrorBox) {
      authErrorBox.textContent = msg;
      authErrorBox.style.display = 'block';
    }
  }

  function switchTab(tabName, updateHistory = true) {
    const canonical = resolveSection(tabName);
    const secConfig = SECTION_REGISTRY[canonical] || SECTION_REGISTRY['overview'];

    // Role-based authorization gate
    if (currentUser && secConfig.roles && !secConfig.roles.includes(currentUser.role)) {
      alert(`Access restricted: Your role (${currentUser.role}) does not have permission to access ${secConfig.title}.`);
      return switchTab('overview', updateHistory);
    }

    activeTab = canonical;

    // Update active tab buttons and accessibility states
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const sec = btn.getAttribute('data-section') || btn.getAttribute('data-tab');
      const isMatch = resolveSection(sec) === canonical;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-current', isMatch ? 'page' : 'false');
    });

    // Update active tab panel
    document.querySelectorAll('.tab-panel').forEach(panel => {
      const isMatch = panel.id === secConfig.panelId;
      panel.classList.toggle('active', isMatch);
    });

    // Update Topbar Title & Breadcrumbs
    if (topbarTitle) topbarTitle.textContent = secConfig.title;
    const breadcrumbSection = document.getElementById('breadcrumb-current-section');
    if (breadcrumbSection) breadcrumbSection.textContent = secConfig.breadcrumb;

    // Close mobile drawer on navigation
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');

    // Update browser URL
    if (updateHistory && window.history && window.history.pushState) {
      const newPath = canonical === 'overview' ? '/admin' : `/admin/${canonical}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState({ section: canonical }, secConfig.title, newPath);
      }
    }

    loadCurrentTab();
  }

  function loadCurrentTab() {
    switch (activeTab) {
      case 'overview':
        loadOverviewData();
        break;
      case 'orders':
        loadOrders();
        break;
      case 'fulfillment':
        loadFulfillmentData();
        break;
      case 'support':
        loadSupportData();
        break;
      case 'quotes-enquiries':
      case 'quotes':
        loadQuotes();
        break;
      case 'enquiries':
        loadEnquiries();
        break;
      case 'products':
        loadProducts();
        break;
      case 'supplier-imports':
        loadSupplierImportsModule();
        break;
      case 'import-history':
        loadImportHistoryModule();
        break;
      case 'audit-logs':
      case 'audit':
        loadAuditLogs();
        break;
    }
  }

  // ==========================================================================
  // STATS & OVERVIEW DATA
  // ==========================================================================
  async function loadDashboardStats() {
    try {
      const res = await apiFetch('/api/admin/stats');
      const data = await res.json();
      if (!data.success) return;

      const stats = data.stats || {};
      if (kpiOrders) kpiOrders.textContent = `${stats.orders || 0} orders processed`;
      if (kpiOpenQuotes) kpiOpenQuotes.textContent = stats.quotes || 0;
      if (kpiOpenEnquiries) kpiOpenEnquiries.textContent = stats.enquiries || 0;
      if (kpiProducts) kpiProducts.textContent = stats.products || 48;

      if (badgeQuotes) badgeQuotes.textContent = stats.quotes || 0;
      if (badgeEnquiries) badgeEnquiries.textContent = stats.enquiries || 0;

      // Stage 16: Support & Warranty KPIs
      try {
        const tktRes = await apiFetch('/api/admin/support/tickets?limit=100');
        const tktData = await tktRes.json();
        if (tktData.success) {
          const tickets = tktData.tickets || [];
          const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
          if (badgeSupport) badgeSupport.textContent = openTickets;
          if (kpiOpenTickets) kpiOpenTickets.textContent = openTickets;
          if (kpiTotalTickets) kpiTotalTickets.textContent = tktData.total || tickets.length;
        }

        const warRes = await apiFetch('/api/admin/warranties?limit=100');
        const warData = await warRes.json();
        if (warData.success) {
          const wars = warData.warranties || [];
          const activeWars = wars.filter(w => w.status === 'active').length;
          if (kpiActiveWarranties) kpiActiveWarranties.textContent = activeWars;
        }
      } catch (e) {
        // Silent fallback
      }
    } catch (err) {
      console.error('[LOAD STATS ERROR]:', err);
    }
  }

  async function loadOverviewData() {
    loadDashboardStats();

    // Load recent orders for overview card
    try {
      const res = await apiFetch('/api/admin/orders?limit=5');
      const data = await res.json();
      if (data.success) {
        cachedOrders = data.orders || [];
        renderOverviewOrders(cachedOrders);

        // Compute revenue and pending count
        let totalRev = 0;
        let pendingCount = 0;
        data.orders.forEach(o => {
          totalRev += Number(o.total_ngn || 0);
          if (o.order_status === 'pending' || o.order_status === 'processing') {
            pendingCount++;
          }
        });
        if (kpiRevenue) kpiRevenue.textContent = formatNaira(totalRev);
        if (kpiPendingOrders) kpiPendingOrders.textContent = pendingCount;
        if (badgeOrders) badgeOrders.textContent = data.total || data.orders.length;
      }
    } catch (err) {
      console.error('[OVERVIEW ORDERS ERROR]:', err);
    }

    // Load recent quotes for overview card
    try {
      const res = await apiFetch('/api/admin/quotes?limit=5');
      const data = await res.json();
      if (data.success) {
        cachedQuotes = data.quotes || [];
        renderOverviewQuotes(cachedQuotes);
      }
    } catch (err) {
      console.error('[OVERVIEW QUOTES ERROR]:', err);
    }
  }

  function renderOverviewOrders(orders) {
    const tbody = document.getElementById('overview-recent-orders');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No commercial customer orders found yet.</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>${o.order_number}</strong></td>
        <td>${escapeHtml(o.customer_name)}</td>
        <td>${formatNaira(o.total_ngn)}</td>
        <td><span class="status-pill status-${o.order_status}">${o.order_status}</span></td>
        <td>
          <button type="button" class="btn-table-action" onclick="window.adminOpenOrderModal('${o.order_number}')">
            View
          </button>
        </td>
      </tr>
    `).join('');
  }

  function renderOverviewQuotes(quotes) {
    const tbody = document.getElementById('overview-recent-quotes');
    if (!tbody) return;

    if (!quotes || quotes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No solar consultation quotes submitted yet.</td></tr>';
      return;
    }

    tbody.innerHTML = quotes.map(q => `
      <tr>
        <td><strong>${q.reference_id}</strong></td>
        <td>${escapeHtml(q.name)}</td>
        <td>${escapeHtml(q.property_type || 'Residential')}</td>
        <td><span class="status-pill status-${q.status}">${q.status}</span></td>
        <td>
          <button type="button" class="btn-table-action" onclick="window.adminOpenQuoteModal('${q.reference_id}')">
            Review
          </button>
        </td>
      </tr>
    `).join('');
  }

  // ==========================================================================
  // TAB 2: ORDERS MANAGEMENT
  // ==========================================================================
  async function loadOrders() {
    const tbody = document.getElementById('orders-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Loading orders from database...</td></tr>';

    try {
      const res = await apiFetch('/api/admin/orders?limit=100');
      const data = await res.json();
      if (data.success) {
        cachedOrders = data.orders || [];
        if (badgeOrders) badgeOrders.textContent = data.total || cachedOrders.length;
        renderOrdersTable();
      } else {
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">Failed: ${data.error}</td></tr>`;
      }
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">Network error loading orders.</td></tr>`;
    }
  }

  function renderOrdersTable() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    const searchTerm = (document.getElementById('orders-search-input')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('orders-status-filter')?.value || '';

    let filtered = cachedOrders.filter(o => {
      const matchesSearch = !searchTerm ||
        o.order_number.toLowerCase().includes(searchTerm) ||
        o.customer_name.toLowerCase().includes(searchTerm) ||
        o.customer_phone.toLowerCase().includes(searchTerm);
      const matchesStatus = !statusFilter || o.order_status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No customer orders match the selected criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(o => `
      <tr>
        <td><strong>${o.order_number}</strong></td>
        <td>${formatDate(o.created_at)}</td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(o.customer_name)}</div>
          <div style="font-size: 0.72rem; color: rgba(238,241,248,0.6);">${escapeHtml(o.customer_phone)}</div>
        </td>
        <td>${escapeHtml(o.delivery_state)}</td>
        <td>
          <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">${o.payment_method}</span>
          <div style="font-size: 0.68rem; color: rgba(238,241,248,0.5);">${o.payment_status}</div>
        </td>
        <td><span class="status-pill status-${o.order_status}">${o.order_status}</span></td>
        <td style="text-align: right; font-weight: 700; color: #FFFFFF;">${formatNaira(o.total_ngn)}</td>
        <td style="text-align: center;">
          <button type="button" class="btn-table-action" onclick="window.adminOpenOrderModal('${o.order_number}')">
            View / Update
          </button>
        </td>
      </tr>
    `).join('');
  }

  window.adminOpenOrderModal = function (orderNumber) {
    const order = cachedOrders.find(o => o.order_number === orderNumber);
    if (!order || !orderModal) return;

    currentEditingOrderId = order.id;
    const titleEl = document.getElementById('modal-order-title');
    const bodyEl = document.getElementById('modal-order-body');

    if (titleEl) titleEl.textContent = `Order Fulfillment: ${order.order_number}`;

    let items = [];
    try {
      items = JSON.parse(order.items_json || '[]');
    } catch (e) {
      items = [];
    }

    const itemsHtml = items.map(item => `
      <div class="modal-item-row">
        <div>
          <span style="font-weight: 600; color: #FFFFFF;">${escapeHtml(item.name)}</span>
          <span style="font-size: 0.72rem; color: rgba(238,241,248,0.5); margin-left: 0.5rem;">Qty: ${item.quantity}</span>
        </div>
        <div style="font-weight: 700;">${formatNaira(item.subtotal || item.price * item.quantity)}</div>
      </div>
    `).join('');

    bodyEl.innerHTML = `
      <div class="modal-info-grid">
        <div class="detail-group">
          <span class="detail-label">Customer Name</span>
          <span class="detail-value">${escapeHtml(order.customer_name)}</span>
        </div>
        <div class="detail-group">
          <span class="detail-label">Phone & Email</span>
          <span class="detail-value">${escapeHtml(order.customer_phone)} ${order.customer_email ? '• ' + escapeHtml(order.customer_email) : ''}</span>
        </div>
        <div class="detail-group">
          <span class="detail-label">Delivery Destination</span>
          <span class="detail-value">${escapeHtml(order.delivery_address)}, ${escapeHtml(order.delivery_state)}</span>
        </div>
        <div class="detail-group">
          <span class="detail-label">Order Total & Delivery Fee</span>
          <span class="detail-value" style="color: var(--color-brand-yellow); font-size: 1rem;">${formatNaira(order.total_ngn)} (Fee: ${formatNaira(order.delivery_fee_ngn)})</span>
        </div>
      </div>

      <div style="margin-bottom: 0.5rem; font-weight: 700; font-size: 0.78rem; text-transform: uppercase; color: rgba(238,241,248,0.6);">
        Equipment Line Items (${items.length})
      </div>
      <div class="modal-items-list">
        ${itemsHtml || '<div style="padding: 1rem; text-align: center;">No items recorded.</div>'}
      </div>

      <div class="form-row-2" style="margin-top: 1.25rem;">
        <div class="form-group">
          <label class="form-label">Order Fulfillment Status</label>
          <select id="modal-order-status" class="form-select">
            <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>Pending (Awaiting Verification)</option>
            <option value="confirmed" ${order.order_status === 'confirmed' ? 'selected' : ''}>Confirmed (Payment Verified)</option>
            <option value="processing" ${order.order_status === 'processing' ? 'selected' : ''}>Processing (QC & Bench Testing)</option>
            <option value="dispatched" ${order.order_status === 'dispatched' ? 'selected' : ''}>Dispatched (In Transit / En Route)</option>
            <option value="completed" ${order.order_status === 'completed' ? 'selected' : ''}>Completed (Delivered & Commissioned)</option>
            <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Payment Status</label>
          <select id="modal-payment-status" class="form-select">
            <option value="pending" ${order.payment_status === 'pending' ? 'selected' : ''}>Pending Verification</option>
            <option value="verified" ${order.payment_status === 'verified' ? 'selected' : ''}>Verified (Funds Received)</option>
            <option value="failed" ${order.payment_status === 'failed' ? 'selected' : ''}>Failed / Declined</option>
            <option value="refunded" ${order.payment_status === 'refunded' ? 'selected' : ''}>Refunded</option>
          </select>
        </div>
      </div>

      <div class="form-group" style="margin-top: 1rem;">
        <label class="form-label">Staff Operational Notes</label>
        <textarea id="modal-order-notes" class="form-textarea" rows="2" placeholder="e.g. Bank transfer credited via Zenith Bank NIP at 14:30. Scheduled dispatch vehicle...">${escapeHtml(order.admin_notes || '')}</textarea>
      </div>
    `;

    orderModal.showModal();
  };

  async function saveOrderUpdates() {
    if (!currentEditingOrderId) return;
    const btn = document.getElementById('btn-save-order-changes');
    const orderStatus = document.getElementById('modal-order-status')?.value;
    const paymentStatus = document.getElementById('modal-payment-status')?.value;
    const notes = document.getElementById('modal-order-notes')?.value || '';

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving...';
    }

    try {
      const res = await apiFetch(`/api/admin/orders/${currentEditingOrderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ orderStatus, paymentStatus, notes })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update order');
      }

      orderModal.close();
      loadOrders();
      loadDashboardStats();
    } catch (err) {
      alert('Error saving order updates: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Save Order Updates';
      }
    }
  }

  // ==========================================================================
  // STAGE 16: FULFILLMENT & COMMISSIONING MANAGEMENT
  // ==========================================================================
  async function loadFulfillmentData() {
    const tbody = document.getElementById('fulfillment-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Loading fulfillment records from database...</td></tr>';

    try {
      const res = await apiFetch('/api/admin/orders?limit=100');
      const data = await res.json();
      if (data.success) {
        cachedFulfillment = data.orders || [];
        const pendingCount = cachedFulfillment.filter(o => o.order_status !== 'completed' && o.order_status !== 'cancelled').length;
        if (badgeFulfillment) badgeFulfillment.textContent = pendingCount;
        renderFulfillmentTable();
      } else {
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">Failed: ${escapeHtml(data.error)}</td></tr>`;
      }
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">Network error loading fulfillment records.</td></tr>`;
    }
  }

  function renderFulfillmentTable() {
    const tbody = document.getElementById('fulfillment-table-body');
    if (!tbody) return;

    const searchTerm = (document.getElementById('fulfillment-search-input')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('fulfillment-status-filter')?.value || '';

    let filtered = cachedFulfillment.filter(o => {
      const matchesSearch = !searchTerm ||
        (o.order_number && o.order_number.toLowerCase().includes(searchTerm)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(searchTerm)) ||
        (o.waybill_number && o.waybill_number.toLowerCase().includes(searchTerm)) ||
        (o.assigned_engineer && o.assigned_engineer.toLowerCase().includes(searchTerm)) ||
        (o.delivery_state && o.delivery_state.toLowerCase().includes(searchTerm));

      const matchesStatus = !statusFilter || o.order_status === statusFilter || (o.commissioning_status === statusFilter);
      return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No fulfillment records match the specified filters.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(o => {
      const commStatus = o.commissioning_status || 'pending';
      const courier = o.courier_partner || 'DEVICE PRO Fleet';
      const waybill = o.waybill_number ? `<code>${escapeHtml(o.waybill_number)}</code>` : '<span style="color: rgba(238,241,248,0.4);">Unassigned</span>';
      const engineer = o.assigned_engineer ? escapeHtml(o.assigned_engineer) : '<span style="color: rgba(238,241,248,0.4);">Unassigned</span>';
      const schedDate = o.installation_scheduled_date ? o.installation_scheduled_date : '—';
      const eta = o.estimated_delivery ? o.estimated_delivery : '—';

      return `
        <tr>
          <td><strong>${escapeHtml(o.order_number)}</strong></td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(o.customer_name)}</div>
            <div style="font-size: 0.72rem; color: rgba(238,241,248,0.6);">${escapeHtml(o.delivery_state || 'Nigeria')}</div>
          </td>
          <td>
            <div style="font-size: 0.8rem; font-weight: 500;">${escapeHtml(courier)}</div>
            <div style="font-size: 0.72rem;">${waybill}</div>
          </td>
          <td style="white-space: nowrap;">${eta}</td>
          <td>
            <div style="font-size: 0.82rem; font-weight: 600;">${engineer}</div>
            ${o.engineer_phone ? `<div style="font-size: 0.72rem; color: rgba(238,241,248,0.6);">${escapeHtml(o.engineer_phone)}</div>` : ''}
          </td>
          <td style="white-space: nowrap;">${schedDate}</td>
          <td>
            <span class="status-pill status-${commStatus}">${commStatus}</span>
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-table-action" onclick="window.adminOpenFulfillmentModal('${o.order_number}')">
              Manage Dispatch
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.adminOpenFulfillmentModal = function (orderNumber) {
    const order = cachedFulfillment.find(o => o.order_number === orderNumber) ||
                  cachedOrders.find(o => o.order_number === orderNumber);
    if (!order || !fulfillmentModal) return;

    currentEditingFulfillmentId = order.id;

    const titleEl = document.getElementById('modal-ful-title');
    if (titleEl) titleEl.textContent = `Dispatch & Commissioning: ${order.order_number}`;

    const numDisplay = document.getElementById('modal-ful-order-num-display');
    if (numDisplay) numDisplay.textContent = order.order_number;

    const clientDisplay = document.getElementById('modal-ful-client-display');
    if (clientDisplay) clientDisplay.textContent = `${order.customer_name} • ${order.delivery_state || 'Lagos'} (${order.delivery_address || ''})`;

    const courierEl = document.getElementById('modal-ful-courier');
    if (courierEl) courierEl.value = order.courier_partner || 'DEVICE PRO Dedicated Fleet';

    const waybillEl = document.getElementById('modal-ful-waybill');
    if (waybillEl) waybillEl.value = order.waybill_number || '';

    const etaEl = document.getElementById('modal-ful-eta');
    if (etaEl) etaEl.value = order.estimated_delivery || '';

    const statusEl = document.getElementById('modal-ful-order-status');
    if (statusEl) statusEl.value = order.order_status || 'processing';

    const engEl = document.getElementById('modal-ful-engineer');
    if (engEl) engEl.value = order.assigned_engineer || '';

    const phoneEl = document.getElementById('modal-ful-phone');
    if (phoneEl) phoneEl.value = order.engineer_phone || '';

    const dateEl = document.getElementById('modal-ful-date');
    if (dateEl) dateEl.value = order.installation_scheduled_date || '';

    const commStatusEl = document.getElementById('modal-ful-comm-status');
    if (commStatusEl) commStatusEl.value = order.commissioning_status || 'pending';

    // Parse safety tests
    let tests = {};
    try {
      tests = typeof order.commissioning_tests === 'string'
        ? JSON.parse(order.commissioning_tests)
        : (order.commissioning_tests || {});
    } catch (e) {
      tests = {};
    }

    const tEarthing = document.getElementById('modal-test-earthing');
    const tSpd = document.getElementById('modal-test-spd');
    const tSync = document.getElementById('modal-test-sync');
    const tBattery = document.getElementById('modal-test-battery');

    if (tEarthing) tEarthing.checked = tests.earthingResistancePassed !== false;
    if (tSpd) tSpd.checked = tests.dcSurgeProtectionVerified !== false;
    if (tSync) tSync.checked = tests.inverterSyncVerified !== false;
    if (tBattery) tBattery.checked = tests.cellBalancingVerified !== false;

    const certIdEl = document.getElementById('modal-ful-cert-id');
    if (certIdEl) certIdEl.value = order.commissioning_certificate_id || '';

    const notesEl = document.getElementById('modal-ful-notes');
    if (notesEl) notesEl.value = order.admin_notes || '';

    fulfillmentModal.showModal();
  };

  async function saveFulfillmentUpdates() {
    if (!currentEditingFulfillmentId) return;
    const btn = document.getElementById('btn-save-fulfillment-changes');

    const courierPartner = document.getElementById('modal-ful-courier')?.value;
    const waybillNumber = document.getElementById('modal-ful-waybill')?.value;
    const estimatedDelivery = document.getElementById('modal-ful-eta')?.value;
    const orderStatus = document.getElementById('modal-ful-order-status')?.value;

    const assignedEngineer = document.getElementById('modal-ful-engineer')?.value;
    const engineerPhone = document.getElementById('modal-ful-phone')?.value;
    const installationScheduledDate = document.getElementById('modal-ful-date')?.value;
    const commissioningStatus = document.getElementById('modal-ful-comm-status')?.value;
    const commissioningCertificateId = document.getElementById('modal-ful-cert-id')?.value;
    const notes = document.getElementById('modal-ful-notes')?.value;

    const commissioningTests = {
      earthingResistancePassed: document.getElementById('modal-test-earthing')?.checked ?? true,
      dcSurgeProtectionVerified: document.getElementById('modal-test-spd')?.checked ?? true,
      inverterSyncVerified: document.getElementById('modal-test-sync')?.checked ?? true,
      cellBalancingVerified: document.getElementById('modal-test-battery')?.checked ?? true
    };

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving Fulfillment...';
    }

    try {
      // 1. Update fulfillment & waybill
      const resFul = await apiFetch(`/api/admin/orders/${currentEditingFulfillmentId}/fulfillment`, {
        method: 'PATCH',
        body: JSON.stringify({
          waybillNumber,
          courierPartner,
          estimatedDelivery,
          orderStatus,
          notes
        })
      });
      const dataFul = await resFul.json();
      if (!resFul.ok || !dataFul.success) {
        throw new Error(dataFul.error || 'Failed to update logistics.');
      }

      // 2. Update commissioning & tests
      const resComm = await apiFetch(`/api/admin/orders/${currentEditingFulfillmentId}/commissioning`, {
        method: 'PATCH',
        body: JSON.stringify({
          assignedEngineer,
          engineerPhone,
          installationScheduledDate,
          commissioningStatus,
          commissioningTests,
          commissioningCertificateId,
          commissioningDate: commissioningStatus === 'commissioned' ? new Date().toISOString() : null,
          notes
        })
      });
      const dataComm = await resComm.json();
      if (!resComm.ok || !dataComm.success) {
        throw new Error(dataComm.error || 'Failed to update commissioning.');
      }

      fulfillmentModal.close();
      loadFulfillmentData();
      loadOrders();
      loadDashboardStats();
    } catch (err) {
      alert('Error updating fulfillment: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Save Fulfillment Updates';
      }
    }
  }

  // ==========================================================================
  // STAGE 16: SUPPORT TICKETS & DIGITAL WARRANTIES
  // ==========================================================================
  async function loadSupportData() {
    const tktTbody = document.getElementById('support-table-body');
    const warTbody = document.getElementById('warranties-table-body');

    if (tktTbody) tktTbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Loading support tickets...</td></tr>';
    if (warTbody) warTbody.innerHTML = '<tr><td colspan="7" class="empty-cell">Loading digital warranties...</td></tr>';

    try {
      const [tktRes, warRes] = await Promise.all([
        apiFetch('/api/admin/support/tickets?limit=100'),
        apiFetch('/api/admin/warranties?limit=100')
      ]);

      const tktData = await tktRes.json();
      const warData = await warRes.json();

      if (tktData.success) {
        cachedTickets = tktData.tickets || [];
        const openCount = cachedTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
        if (badgeSupport) badgeSupport.textContent = openCount;
        if (kpiOpenTickets) kpiOpenTickets.textContent = openCount;
        if (kpiTotalTickets) kpiTotalTickets.textContent = tktData.total || cachedTickets.length;
        renderSupportTicketsTable();
      }

      if (warData.success) {
        cachedWarranties = warData.warranties || [];
        const activeCount = cachedWarranties.filter(w => w.status === 'active').length;
        if (kpiActiveWarranties) kpiActiveWarranties.textContent = activeCount;
        renderWarrantiesTable();
      }
    } catch (err) {
      console.error('[LOAD SUPPORT ERROR]:', err);
      if (tktTbody) tktTbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Error loading support tickets.</td></tr>';
      if (warTbody) warTbody.innerHTML = '<tr><td colspan="7" class="empty-cell">Error loading warranties.</td></tr>';
    }
  }

  function renderSupportTicketsTable() {
    const tbody = document.getElementById('support-table-body');
    if (!tbody) return;

    const statusFilter = document.getElementById('support-status-filter')?.value || '';
    let filtered = cachedTickets.filter(t => !statusFilter || t.status === statusFilter);

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No customer support tickets found.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(t => `
      <tr>
        <td><strong>${escapeHtml(t.ticket_number)}</strong></td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(t.customer_name)}</div>
          <div style="font-size: 0.72rem; color: rgba(238,241,248,0.6);">${escapeHtml(t.customer_phone)}</div>
        </td>
        <td><span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 600; color: var(--color-brand-yellow);">${escapeHtml(t.issue_category)}</span></td>
        <td><span class="status-pill status-${t.priority}">${t.priority}</span></td>
        <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(t.subject)}">
          ${escapeHtml(t.subject)}
        </td>
        <td><span class="status-pill status-${t.status}">${t.status}</span></td>
        <td style="font-size: 0.8rem;">${escapeHtml(t.assigned_engineer || 'Unassigned')}</td>
        <td style="text-align: center;">
          <button type="button" class="btn-table-action" onclick="window.adminOpenTicketModal('${t.ticket_number}')">
            Review
          </button>
        </td>
      </tr>
    `).join('');
  }

  function renderWarrantiesTable() {
    const tbody = document.getElementById('warranties-table-body');
    if (!tbody) return;

    if (!cachedWarranties || cachedWarranties.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No registered equipment warranties found.</td></tr>';
      return;
    }

    tbody.innerHTML = cachedWarranties.map(w => {
      const years = (w.warranty_duration_months / 12).toFixed(0);
      const isExpired = new Date(w.expiry_date) < new Date();
      const statusText = isExpired ? 'expired' : w.status;

      return `
        <tr>
          <td><strong>${escapeHtml(w.warranty_code)}</strong></td>
          <td><code>${escapeHtml(w.serial_number)}</code></td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(w.product_name)}</div>
            <div style="font-size: 0.72rem; color: rgba(238,241,248,0.6);">${escapeHtml(w.brand || 'Tier-1 Certified')}</div>
          </td>
          <td>${escapeHtml(w.customer_name)}</td>
          <td>${w.warranty_duration_months} mo (${years} yrs)</td>
          <td style="white-space: nowrap;">${formatDate(w.expiry_date)}</td>
          <td><span class="status-pill status-${statusText}">${statusText}</span></td>
        </tr>
      `;
    }).join('');
  }

  window.adminOpenTicketModal = function (ticketNumber) {
    const ticket = cachedTickets.find(t => t.ticket_number === ticketNumber);
    if (!ticket || !adminTicketModal) return;

    currentEditingTicketId = ticket.id;

    const titleEl = document.getElementById('modal-tkt-title');
    if (titleEl) titleEl.textContent = `Support Ticket Review: ${ticket.ticket_number}`;

    const numDisplay = document.getElementById('modal-tkt-num-display');
    if (numDisplay) numDisplay.textContent = ticket.ticket_number;

    const catDisplay = document.getElementById('modal-tkt-cat-display');
    if (catDisplay) catDisplay.textContent = ticket.issue_category;

    const clientEl = document.getElementById('modal-tkt-client');
    if (clientEl) clientEl.textContent = ticket.customer_name;

    const phoneEl = document.getElementById('modal-tkt-phone');
    if (phoneEl) phoneEl.textContent = `${ticket.customer_phone} ${ticket.customer_email ? '(' + ticket.customer_email + ')' : ''}`;

    const subjEl = document.getElementById('modal-tkt-subj');
    if (subjEl) subjEl.textContent = ticket.subject;

    const descEl = document.getElementById('modal-tkt-desc');
    if (descEl) descEl.textContent = ticket.description;

    const statusSelect = document.getElementById('modal-tkt-status-select');
    if (statusSelect) statusSelect.value = ticket.status || 'open';

    const prioritySelect = document.getElementById('modal-tkt-priority-select');
    if (prioritySelect) prioritySelect.value = ticket.priority || 'normal';

    const engineerInput = document.getElementById('modal-tkt-engineer-input');
    if (engineerInput) engineerInput.value = ticket.assigned_engineer || '';

    const notesInput = document.getElementById('modal-tkt-notes-input');
    if (notesInput) notesInput.value = ticket.resolution_notes || '';

    adminTicketModal.showModal();
  };

  async function saveTicketUpdates() {
    if (!currentEditingTicketId) return;
    const btn = document.getElementById('btn-save-ticket-changes');

    const status = document.getElementById('modal-tkt-status-select')?.value;
    const priority = document.getElementById('modal-tkt-priority-select')?.value;
    const assignedEngineer = document.getElementById('modal-tkt-engineer-input')?.value;
    const resolutionNotes = document.getElementById('modal-tkt-notes-input')?.value;

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving Ticket...';
    }

    try {
      const res = await apiFetch(`/api/admin/support/tickets/${currentEditingTicketId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          priority,
          assignedEngineer,
          resolutionNotes
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update support ticket.');
      }

      adminTicketModal.close();
      loadSupportData();
      loadDashboardStats();
    } catch (err) {
      alert('Error saving ticket: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Save Ticket Updates';
      }
    }
  }

  // ==========================================================================
  // TAB 3: SOLAR QUOTES PIPELINE
  // ==========================================================================
  async function loadQuotes() {
    const tbody = document.getElementById('quotes-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Loading solar proposals...</td></tr>';

    try {
      const res = await apiFetch('/api/admin/quotes?limit=100');
      const data = await res.json();
      if (data.success) {
        cachedQuotes = data.quotes || [];
        if (badgeQuotes) badgeQuotes.textContent = data.total || cachedQuotes.length;
        renderQuotesTable();
      }
    } catch (err) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Network error loading quotes.</td></tr>';
    }
  }

  function renderQuotesTable() {
    const tbody = document.getElementById('quotes-table-body');
    if (!tbody) return;

    const searchTerm = (document.getElementById('quotes-search-input')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('quotes-status-filter')?.value || '';

    let filtered = cachedQuotes.filter(q => {
      const matchesSearch = !searchTerm ||
        q.reference_id.toLowerCase().includes(searchTerm) ||
        q.name.toLowerCase().includes(searchTerm) ||
        (q.phone && q.phone.toLowerCase().includes(searchTerm)) ||
        (q.property_type && q.property_type.toLowerCase().includes(searchTerm));
      const matchesStatus = !statusFilter || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No consultation quotes match current filters.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(q => `
      <tr>
        <td><strong>${q.reference_id}</strong></td>
        <td>${formatDate(q.created_at)}</td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(q.name)}</div>
          <div style="font-size: 0.72rem; color: rgba(238,241,248,0.6);">${escapeHtml(q.phone)} ${q.state ? '• ' + escapeHtml(q.state) : ''}</div>
        </td>
        <td>${escapeHtml(q.property_type || 'Residential')}</td>
        <td>${escapeHtml(q.package_name || 'Custom Sizing')}</td>
        <td>
          <div style="font-size: 0.75rem;">${q.indicative_inverter_kva ? q.indicative_inverter_kva + 'kVA Inverter' : '—'}</div>
          <div style="font-size: 0.7rem; color: rgba(238,241,248,0.5);">${q.indicative_battery_kwh ? q.indicative_battery_kwh + 'kWh Storage' : ''}</div>
        </td>
        <td><span class="status-pill status-${q.status}">${q.status}</span></td>
        <td style="text-align: center;">
          <button type="button" class="btn-table-action" onclick="window.adminOpenQuoteModal('${q.reference_id}')">
            Review Proposal
          </button>
        </td>
      </tr>
    `).join('');
  }

  window.adminOpenQuoteModal = function (referenceId) {
    const quote = cachedQuotes.find(q => q.reference_id === referenceId);
    if (!quote || !quoteModal) return;

    currentEditingQuoteId = quote.id;
    const titleEl = document.getElementById('modal-quote-title');
    const bodyEl = document.getElementById('modal-quote-body');

    if (titleEl) titleEl.textContent = `Solar Proposal: ${quote.reference_id} — ${escapeHtml(quote.name)}`;

    bodyEl.innerHTML = `
      <div class="modal-info-grid">
        <div class="detail-group">
          <span class="detail-label">Client Name & Phone</span>
          <span class="detail-value">${escapeHtml(quote.name)} (${escapeHtml(quote.phone)})</span>
        </div>
        <div class="detail-group">
          <span class="detail-label">Email & State</span>
          <span class="detail-value">${escapeHtml(quote.email || 'None provided')} • ${escapeHtml(quote.state || 'Lagos')}</span>
        </div>
        <div class="detail-group">
          <span class="detail-label">Property & Sector</span>
          <span class="detail-value">${escapeHtml(quote.property_type || 'Residential')} (${escapeHtml(quote.sector || 'Residential')})</span>
        </div>
        <div class="detail-group">
          <span class="detail-label">Selected System / Sizing</span>
          <span class="detail-value" style="color: var(--color-brand-yellow);">${escapeHtml(quote.package_name || 'Custom Calculated System')}</span>
        </div>
      </div>

      <div style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 1.25rem;">
        <span class="detail-label" style="display: block; margin-bottom: 0.5rem;">Reported Electrical Load / Survey Details</span>
        <div style="font-size: 0.85rem; line-height: 1.5; color: #EEF1F8;">
          ${escapeHtml(quote.load_details || 'Standard residential appliances: Air conditioners, refrigeration, water pumping, lighting.')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Engineering Pipeline Status</label>
        <select id="modal-quote-status" class="form-select">
          <option value="new" ${quote.status === 'new' ? 'selected' : ''}>New (Awaiting Review)</option>
          <option value="under_review" ${quote.status === 'under_review' ? 'selected' : ''}>Under Engineering Review</option>
          <option value="quoted" ${quote.status === 'quoted' ? 'selected' : ''}>Proposal Quoted / Sent</option>
          <option value="converted" ${quote.status === 'converted' ? 'selected' : ''}>Converted / Won (Ready for Install)</option>
          <option value="lost" ${quote.status === 'lost' ? 'selected' : ''}>Lost / Closed</option>
        </select>
      </div>

      <div class="form-group" style="margin-top: 1rem;">
        <label class="form-label">Engineering Notes / Sizing Feasibility</label>
        <textarea id="modal-quote-notes" class="form-textarea" rows="3" placeholder="e.g. Conducted phone survey with client. Roof orientation south-facing with capacity for 16 panels...">${escapeHtml(quote.admin_notes || '')}</textarea>
      </div>
    `;

    quoteModal.showModal();
  };

  async function saveQuoteUpdates() {
    if (!currentEditingQuoteId) return;
    const btn = document.getElementById('btn-save-quote-changes');
    const status = document.getElementById('modal-quote-status')?.value;
    const notes = document.getElementById('modal-quote-notes')?.value || '';

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Updating...';
    }

    try {
      const res = await apiFetch(`/api/admin/quotes/${currentEditingQuoteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update quote');
      }

      quoteModal.close();
      loadQuotes();
      loadDashboardStats();
    } catch (err) {
      alert('Error updating solar proposal: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Update Proposal Status';
      }
    }
  }

  // ==========================================================================
  // TAB 4: CUSTOMER INQUIRIES
  // ==========================================================================
  async function loadEnquiries() {
    const tbody = document.getElementById('enquiries-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">Loading inquiries...</td></tr>';

    try {
      const res = await apiFetch('/api/admin/enquiries?limit=100');
      const data = await res.json();
      if (data.success) {
        cachedEnquiries = data.enquiries || [];
        if (badgeEnquiries) badgeEnquiries.textContent = data.total || cachedEnquiries.length;
        renderEnquiriesTable();
      }
    } catch (err) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">Network error loading inquiries.</td></tr>';
    }
  }

  function renderEnquiriesTable() {
    const tbody = document.getElementById('enquiries-table-body');
    if (!tbody) return;

    const searchTerm = (document.getElementById('enquiries-search-input')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('enquiries-status-filter')?.value || '';

    let filtered = cachedEnquiries.filter(e => {
      const matchesSearch = !searchTerm ||
        e.reference_id.toLowerCase().includes(searchTerm) ||
        e.name.toLowerCase().includes(searchTerm) ||
        e.phone.toLowerCase().includes(searchTerm) ||
        (e.subject && e.subject.toLowerCase().includes(searchTerm));
      const matchesStatus = !statusFilter || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No inquiries match current filters.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(e => `
      <tr>
        <td><strong>${e.reference_id}</strong></td>
        <td>${formatDate(e.created_at)}</td>
        <td>${escapeHtml(e.name)}</td>
        <td>
          <div>${escapeHtml(e.phone)}</div>
          <div style="font-size: 0.72rem; color: rgba(238,241,248,0.5);">${escapeHtml(e.email || '')}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(e.subject || 'General Inquiry')}</div>
          <div style="font-size: 0.75rem; color: rgba(238,241,248,0.7); max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(e.message || '')}
          </div>
        </td>
        <td><span class="status-pill status-${e.status}">${e.status}</span></td>
        <td style="text-align: center;">
          <button type="button" class="btn-table-action" onclick="window.adminToggleEnquiryStatus(${e.id}, '${e.status}')">
            ${e.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
          </button>
        </td>
      </tr>
    `).join('');
  }

  window.adminToggleEnquiryStatus = async function (id, currentStatus) {
    const newStatus = currentStatus === 'resolved' ? 'in_progress' : 'resolved';
    try {
      const res = await apiFetch(`/api/admin/enquiries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, notes: `Status changed to ${newStatus} by ${currentUser.username}` })
      });
      const data = await res.json();
      if (data.success) {
        loadEnquiries();
        loadDashboardStats();
      }
    } catch (err) {
      alert('Failed to update inquiry status: ' + err.message);
    }
  };

  // ==========================================================================
  // ==========================================================================
  // STAGE 4: PRODUCT CATALOGUE & INVENTORY OPERATIONS
  // ==========================================================================
  async function loadProducts(page = 1) {
    const tbody = document.getElementById('products-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">Retrieving catalogue records from MongoDB Atlas...</td></tr>';

    const category = document.getElementById('products-category-filter')?.value || 'all';
    const brand = document.getElementById('products-brand-filter')?.value || 'all';
    const stockStatus = document.getElementById('products-stock-filter')?.value || 'all';
    const status = document.getElementById('products-status-filter')?.value || 'all';
    const search = document.getElementById('products-search-input')?.value.trim() || '';
    const limit = productPagination.limit || 20;

    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', page);
      queryParams.set('limit', limit);
      if (category && category !== 'all') queryParams.set('category', category);
      if (brand && brand !== 'all') queryParams.set('brand', brand);
      if (stockStatus && stockStatus !== 'all') queryParams.set('stockStatus', stockStatus);
      if (status && status !== 'all') queryParams.set('status', status);
      if (search) queryParams.set('search', search);

      const res = await apiFetch(`/api/admin/products?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        cachedProducts = data.products || [];
        productPagination.page = data.page || page;
        productPagination.limit = data.limit || limit;
        productPagination.total = data.total || 0;
        productPagination.totalPages = data.totalPages || Math.ceil((data.total || 0) / limit) || 1;

        renderProductsTable();
        renderProductsPagination();
      } else {
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="empty-cell">Error: ${escapeHtml(data.error || 'Failed to load products')}</td></tr>`;
      }
    } catch (err) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">Network error loading products from Atlas.</td></tr>';
    }
  }

  function renderProductsTable() {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;

    const canSeeCost = currentUser && ['superadmin', 'admin'].includes(currentUser.role);
    const canMutate = currentUser && ['superadmin', 'admin'].includes(currentUser.role);

    // Show or hide supplier cost header and notice
    document.querySelectorAll('.col-supplier-cost').forEach(el => {
      el.style.display = canSeeCost ? '' : 'none';
    });
    const costNotice = document.getElementById('products-supplier-cost-notice');
    if (costNotice) costNotice.style.display = canSeeCost ? 'inline-flex' : 'none';

    // Update summary text
    const summaryText = document.getElementById('products-summary-text');
    if (summaryText) {
      const start = productPagination.total === 0 ? 0 : (productPagination.page - 1) * productPagination.limit + 1;
      const end = Math.min(productPagination.total, productPagination.page * productPagination.limit);
      summaryText.textContent = `Showing ${start}–${end} of ${productPagination.total} inventory records`;
    }

    if (!cachedProducts || cachedProducts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">No equipment products match the selected criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = cachedProducts.map(p => {
      const rawPrice = Number(p.price_ngn) || 0;
      const rawCost = Number(p.cost_price_ngn) || 0;
      const hasCost = canSeeCost && p.cost_price_ngn !== undefined && rawCost > 0;
      const grossProfit = rawPrice - rawCost;
      const marginPct = (hasCost && rawPrice > 0) ? ((grossProfit / rawPrice) * 100).toFixed(1) : null;
      const marginClass = marginPct !== null ? (marginPct >= 15 ? 'healthy' : (marginPct >= 5 ? 'tight' : 'negative')) : '';

      const isArchived = p.published === 0;
      const stateBadge = isArchived
        ? '<span class="status-pill status-archived">Archived</span>'
        : '<span class="status-pill status-active">Live</span>';

      const stockBadge = `<span class="status-pill status-${p.stock_status || 'in_stock'}">${(p.stock_status || 'in_stock').replace('_', ' ')}</span>`;

      // Cost column HTML
      let costColHtml = '';
      if (canSeeCost) {
        costColHtml = `
          <td class="col-supplier-cost" style="text-align: right;">
            ${hasCost ? `
              <div style="font-weight: 600;">${formatNaira(rawCost)}</div>
              <div style="margin-top: 2px;"><span class="margin-pill ${marginClass}">${marginPct}%</span></div>
            ` : `<span style="color: rgba(238,241,248,0.4); font-size: 0.75rem;">—</span>`}
          </td>
        `;
      }

      // Actions
      const editBtn = `<button type="button" class="btn-table-action" onclick="window.adminOpenEditProductModal('${p.id || p._id}')" title="Edit specifications">Edit</button>`;
      const inspectBtn = `<button type="button" class="btn-table-action" onclick="window.adminInspectProduct('${p.id || p._id}')" title="Inspect full record">Inspect</button>`;
      const archiveBtn = canMutate ? `
        <button type="button" class="btn-table-action ${isArchived ? '' : 'delete'}" onclick="window.adminPromptArchive('${p.id || p._id}', ${p.published}, '${escapeHtml(p.name)}')" title="${isArchived ? 'Restore to live store' : 'Unpublish from store'}">
          ${isArchived ? 'Restore' : 'Archive'}
        </button>
      ` : '';

      const imgUrl = (p.image_url && (p.image_url.startsWith('http') || p.image_url.startsWith('/')))
        ? p.image_url
        : (p.image_url ? `/${p.image_url}` : '/images/products/jinko-solar-panel.png');

      return `
        <tr data-product-id="${p.id || p._id}">
          <td>
            <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(p.name)}" class="prod-table-thumb" onerror="this.src='/images/logo-mark.svg'">
          </td>
          <td><code>${escapeHtml(p.sku || 'N/A')}</code></td>
          <td>
            <div style="font-weight: 700; color: #FFFFFF;">${escapeHtml(p.name)}</div>
            <div style="font-size: 0.72rem; color: rgba(238,241,248,0.5); max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(p.specifications || '')}">
              ${escapeHtml(p.specifications || 'Standard specifications')}
            </div>
          </td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(p.brand || 'DEVICE PRO')}</div>
            <span style="font-size: 0.7rem; text-transform: uppercase; color: var(--color-brand-yellow);">${escapeHtml(p.category_label || p.category)}</span>
          </td>
          <td style="text-align: right;">
            <div style="font-weight: 800; color: #FFFFFF;">${formatNaira(p.price_ngn)}</div>
            ${p.previous_price_ngn ? `<div style="font-size: 0.7rem; color: rgba(238,241,248,0.4); text-decoration: line-through;">${formatNaira(p.previous_price_ngn)}</div>` : ''}
          </td>
          ${costColHtml}
          <td>
            ${stockBadge}
            <div style="font-size: 0.7rem; color: rgba(238,241,248,0.5); margin-top: 2px;">Qty: ${p.stock_quantity ?? 50}</div>
          </td>
          <td>${stateBadge}</td>
          <td style="text-align: center;">
            <div class="table-actions-cell">
              ${inspectBtn}
              ${editBtn}
              ${archiveBtn}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderProductsPagination() {
    const infoEl = document.getElementById('products-pagination-info');
    const prevBtn = document.getElementById('btn-prod-prev-page');
    const nextBtn = document.getElementById('btn-prod-next-page');
    const pagesContainer = document.getElementById('products-page-numbers');

    const { page, totalPages, total, limit } = productPagination;
    const start = total === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(total, page * limit);

    if (infoEl) infoEl.textContent = `Showing ${start}–${end} of ${total} products (Page ${page} of ${totalPages})`;
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;

    if (pagesContainer) {
      let html = '';
      const maxButtons = 5;
      let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
      let endPage = Math.min(totalPages, startPage + maxButtons - 1);
      if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        html += `<button type="button" class="pagination-btn ${i === page ? 'active' : ''}" onclick="window.adminGoToProductPage(${i})">${i}</button>`;
      }
      pagesContainer.innerHTML = html;
    }
  }

  window.adminGoToProductPage = function (pageNum) {
    if (pageNum >= 1 && pageNum <= productPagination.totalPages) {
      loadProducts(pageNum);
    }
  };

  // Inspect Modal
  window.adminInspectProduct = async function (id) {
    const prod = cachedProducts.find(p => String(p.id) === String(id) || String(p._id) === String(id));
    if (!prod || !productInspectModal) return;

    currentEditingProductId = prod.id || prod._id;
    const titleEl = document.getElementById('modal-inspect-prod-title');
    const bodyEl = document.getElementById('modal-inspect-prod-body');

    if (titleEl) titleEl.textContent = `${prod.name} (${prod.sku})`;

    const canSeeCost = currentUser && ['superadmin', 'admin'].includes(currentUser.role);
    const rawPrice = Number(prod.price_ngn) || 0;
    const rawCost = Number(prod.cost_price_ngn) || 0;
    const grossProfit = rawPrice - rawCost;
    const marginPct = (canSeeCost && rawCost > 0 && rawPrice > 0) ? ((grossProfit / rawPrice) * 100).toFixed(1) : null;

    const imgUrl = (prod.image_url && (prod.image_url.startsWith('http') || prod.image_url.startsWith('/')))
      ? prod.image_url
      : (prod.image_url ? `/${prod.image_url}` : '/images/products/jinko-solar-panel.png');

    bodyEl.innerHTML = `
      <div style="display: flex; gap: 1.25rem; align-items: flex-start; margin-bottom: 1.25rem;">
        <div class="image-preview-box" style="width: 100px; height: 100px;">
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(prod.name)}" onerror="this.src='/images/logo-mark.svg'">
        </div>
        <div style="flex-grow: 1;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span class="user-role-badge" style="background: rgba(255,185,12,0.15); color: var(--color-brand-yellow);">${escapeHtml(prod.brand || 'DEVICE PRO')}</span>
            <span style="font-size: 0.75rem; text-transform: uppercase; color: rgba(238,241,248,0.6);">${escapeHtml(prod.category_label || prod.category)}</span>
            <span class="status-pill status-${prod.stock_status || 'in_stock'}">${(prod.stock_status || 'in_stock').replace('_', ' ')}</span>
            ${prod.published === 0 ? '<span class="status-pill status-archived">Archived</span>' : '<span class="status-pill status-active">Active</span>'}
          </div>
          <h4 style="font-size: 1.15rem; font-weight: 800; color: #FFFFFF; margin: 0 0 0.5rem 0;">${escapeHtml(prod.name)}</h4>
          <div style="font-size: 0.8rem; color: rgba(238,241,248,0.7);">
            <strong>SKU:</strong> <code>${escapeHtml(prod.sku)}</code> • <strong>ID:</strong> ${prod.id || prod._id}
          </div>
        </div>
      </div>

      <div class="modal-info-grid">
        <div class="detail-group">
          <span class="detail-label">Retail Selling Price</span>
          <span class="detail-value" style="font-size: 1.1rem; font-weight: 800; color: #FFFFFF;">${formatNaira(prod.price_ngn)}</span>
          ${prod.previous_price_ngn ? `<div style="font-size: 0.72rem; color: rgba(238,241,248,0.4); text-decoration: line-through;">List: ${formatNaira(prod.previous_price_ngn)}</div>` : ''}
        </div>
        ${canSeeCost ? `
          <div class="detail-group">
            <span class="detail-label">Supplier Wholesale Cost &amp; Margin</span>
            <span class="detail-value">${rawCost > 0 ? formatNaira(rawCost) : 'Not specified'}</span>
            ${marginPct !== null ? `<div style="margin-top: 3px;"><span class="margin-pill ${marginPct >= 15 ? 'healthy' : 'tight'}">₦${grossProfit.toLocaleString()} (${marginPct}% gross margin)</span></div>` : ''}
          </div>
        ` : `
          <div class="detail-group">
            <span class="detail-label">Commercial Authorization</span>
            <span class="detail-value" style="font-size: 0.75rem; color: #93C5FD;">Cost details restricted to administrative finance roles</span>
          </div>
        `}
        <div class="detail-group">
          <span class="detail-label">Inventory &amp; Stock</span>
          <span class="detail-value">${prod.stock_quantity ?? 50} units on hand (${(prod.stock_status || 'in_stock').replace('_', ' ')})</span>
        </div>
        <div class="detail-group">
          <span class="detail-label">Manufacturer Warranty</span>
          <span class="detail-value">${prod.warranty_years || 5} Years Certified Warranty</span>
        </div>
        <div class="detail-group">
          <span class="detail-label">Power Rating / Specs</span>
          <span class="detail-value">${escapeHtml(prod.power_rating || 'Standard')} (${escapeHtml(prod.power_tier || 'standard')})</span>
        </div>
        <div class="detail-group">
          <span class="detail-label">Database Record Timestamps</span>
          <span class="detail-value" style="font-size: 0.75rem;">Created: ${formatDate(prod.created_at)}<br>Updated: ${formatDate(prod.updated_at)}</span>
        </div>
      </div>

      <div style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 1rem;">
        <span class="detail-label" style="display: block; margin-bottom: 0.4rem;">Engineering Specifications</span>
        <div style="font-size: 0.82rem; line-height: 1.5; color: #EEF1F8;">
          ${escapeHtml(prod.specifications || 'No technical specifications provided.')}
        </div>
      </div>

      ${prod.description ? `
        <div style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
          <span class="detail-label" style="display: block; margin-bottom: 0.4rem;">Commercial Description</span>
          <div style="font-size: 0.82rem; line-height: 1.5; color: rgba(238,241,248,0.8);">
            ${escapeHtml(prod.description)}
          </div>
        </div>
      ` : ''}
    `;

    productInspectModal.showModal();
  };

  // Open Edit Modal
  window.adminOpenEditProductModal = function (id) {
    const prod = cachedProducts.find(p => String(p.id) === String(id) || String(p._id) === String(id));
    if (!prod || !productEditModal) return;

    currentEditingProductId = prod.id || prod._id;
    document.getElementById('edit-prod-error-alert').style.display = 'none';
    document.querySelectorAll('#product-edit-modal .field-error-msg').forEach(el => el.style.display = 'none');
    document.querySelectorAll('#product-edit-modal .form-input').forEach(el => el.classList.remove('input-error'));

    document.getElementById('edit-prod-id').value = prod.id || prod._id;
    document.getElementById('edit-prod-name').value = prod.name || '';
    document.getElementById('edit-prod-sku').value = prod.sku || '';
    document.getElementById('edit-prod-brand').value = prod.brand || 'DEVICE PRO';
    document.getElementById('edit-prod-category').value = prod.category || 'inverters';
    document.getElementById('edit-prod-price').value = prod.price_ngn !== undefined ? prod.price_ngn : '';
    document.getElementById('edit-prod-prev-price').value = prod.previous_price_ngn || '';
    document.getElementById('edit-prod-cost').value = prod.cost_price_ngn !== undefined ? prod.cost_price_ngn : '';
    document.getElementById('edit-prod-stock').value = prod.stock_status || 'in_stock';
    document.getElementById('edit-prod-stock-qty').value = prod.stock_quantity ?? 50;
    document.getElementById('edit-prod-power-rating').value = prod.power_rating || '';
    document.getElementById('edit-prod-warranty').value = prod.warranty_years || 5;
    document.getElementById('edit-prod-image').value = prod.image_url || '';
    document.getElementById('edit-prod-specs').value = prod.specifications || '';
    document.getElementById('edit-prod-desc').value = prod.description || '';

    // Image preview
    const preview = document.getElementById('edit-prod-img-preview');
    if (preview) {
      const img = prod.image_url || '/images/logo-mark.svg';
      preview.src = (img.startsWith('http') || img.startsWith('/')) ? img : `/${img}`;
    }

    // Role-based Price Permissions
    const canEditPrice = currentUser && ['superadmin', 'admin'].includes(currentUser.role);
    const priceInput = document.getElementById('edit-prod-price');
    const prevPriceInput = document.getElementById('edit-prod-prev-price');
    const costGroup = document.getElementById('edit-cost-group');
    const engineerNotice = document.getElementById('edit-engineer-price-notice');

    if (priceInput) priceInput.disabled = !canEditPrice;
    if (prevPriceInput) prevPriceInput.disabled = !canEditPrice;
    if (costGroup) costGroup.style.display = canEditPrice ? 'grid' : 'none';
    if (engineerNotice) engineerNotice.style.display = canEditPrice ? 'none' : 'block';

    // Calculate initial margin
    if (canEditPrice) {
      const priceVal = parseFloat(prod.price_ngn) || 0;
      const costVal = parseFloat(prod.cost_price_ngn) || 0;
      const marginEl = document.getElementById('edit-prod-margin-preview');
      if (marginEl) {
        if (priceVal > 0 && costVal > 0) {
          const grossProfit = priceVal - costVal;
          const marginPct = ((grossProfit / priceVal) * 100).toFixed(1);
          const pillClass = marginPct >= 15 ? 'healthy' : (marginPct >= 5 ? 'tight' : 'negative');
          marginEl.innerHTML = `<span class="margin-pill ${pillClass}">₦${grossProfit.toLocaleString()} (${marginPct}%)</span>`;
        } else {
          marginEl.textContent = '—';
        }
      }
    }

    const titleEl = document.getElementById('modal-product-title');
    if (titleEl) titleEl.textContent = `Edit SKU: ${prod.sku} (${prod.brand})`;

    productEditModal.showModal();
  };

  async function handleEditProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-prod-id').value;
    const name = document.getElementById('edit-prod-name').value.trim();
    const sku = document.getElementById('edit-prod-sku').value.trim().toUpperCase();
    const brand = document.getElementById('edit-prod-brand').value.trim();
    const category = document.getElementById('edit-prod-category').value;
    const priceRaw = document.getElementById('edit-prod-price').value;
    const prevPriceRaw = document.getElementById('edit-prod-prev-price').value;
    const costRaw = document.getElementById('edit-prod-cost').value;
    const stock_status = document.getElementById('edit-prod-stock').value;
    const stock_quantity = parseInt(document.getElementById('edit-prod-stock-qty').value, 10);
    const power_rating = document.getElementById('edit-prod-power-rating').value.trim();
    const warranty_years = parseInt(document.getElementById('edit-prod-warranty').value, 10);
    const image_url = document.getElementById('edit-prod-image').value.trim();
    const specifications = document.getElementById('edit-prod-specs').value.trim();
    const description = document.getElementById('edit-prod-desc').value.trim();

    const errBox = document.getElementById('edit-prod-error-alert');
    errBox.style.display = 'none';

    // Client-side validations
    let hasClientErrors = false;
    function flagError(inputId, errId, msg) {
      hasClientErrors = true;
      const input = document.getElementById(inputId);
      const errEl = document.getElementById(errId);
      if (input) input.classList.add('input-error');
      if (errEl) {
        if (msg) errEl.textContent = msg;
        errEl.style.display = 'block';
      }
    }

    document.querySelectorAll('#product-edit-modal .field-error-msg').forEach(el => el.style.display = 'none');
    document.querySelectorAll('#product-edit-modal .form-input').forEach(el => el.classList.remove('input-error'));

    if (!name) flagError('edit-prod-name', 'error-edit-name', 'Product name is required.');
    if (!sku) flagError('edit-prod-sku', 'error-edit-sku', 'SKU is required.');
    if (!brand) flagError('edit-prod-brand', 'error-edit-brand', 'Brand is required.');

    const canEditPrice = currentUser && ['superadmin', 'admin'].includes(currentUser.role);
    if (canEditPrice) {
      if (priceRaw === '' || isNaN(priceRaw) || Number(priceRaw) < 0) {
        flagError('edit-prod-price', 'error-edit-price', 'Valid non-negative selling price is required.');
      }
      if (prevPriceRaw && (isNaN(prevPriceRaw) || Number(prevPriceRaw) < 0)) {
        flagError('edit-prod-prev-price', 'error-edit-prev-price', 'Previous price must be non-negative.');
      }
      if (costRaw && (isNaN(costRaw) || Number(costRaw) < 0)) {
        flagError('edit-prod-cost', 'error-edit-cost', 'Supplier cost must be non-negative.');
      }
    }

    if (image_url) {
      const isAllowedScheme = image_url.startsWith('http://') || image_url.startsWith('https://') || image_url.startsWith('/images/') || image_url.startsWith('/');
      if (!isAllowedScheme) {
        flagError('edit-prod-image', 'error-edit-image', 'Image URL must use http://, https://, or /images/ path.');
      }
    }

    if (hasClientErrors) return;

    const btnSubmit = document.getElementById('btn-edit-prod-submit');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Saving changes...';
    }

    const payload = {
      name,
      sku,
      brand,
      category,
      stock_status,
      stock_quantity: isNaN(stock_quantity) ? 50 : stock_quantity,
      power_rating,
      warranty_years: isNaN(warranty_years) ? 5 : warranty_years,
      image_url: image_url || undefined,
      specifications,
      description
    };

    if (canEditPrice) {
      payload.price_ngn = Math.round(Number(priceRaw));
      if (prevPriceRaw !== '') payload.previous_price_ngn = Math.round(Number(prevPriceRaw));
      if (costRaw !== '') payload.cost_price_ngn = Math.round(Number(costRaw));
    }

    try {
      const res = await apiFetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update equipment SKU.');
      }

      productEditModal.close();
      loadProducts(productPagination.page);
      loadDashboardStats();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Save SKU Changes';
      }
    }
  }

  async function handleAddProductSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('add-prod-name').value.trim();
    const sku = document.getElementById('add-prod-sku').value.trim().toUpperCase();
    const brand = document.getElementById('add-prod-brand').value.trim();
    const category = document.getElementById('add-prod-category').value;
    const priceRaw = document.getElementById('add-prod-price').value;
    const prevPriceRaw = document.getElementById('add-prod-prev-price').value;
    const costRaw = document.getElementById('add-prod-cost').value;
    const stock_status = document.getElementById('add-prod-stock').value;
    const stock_quantity = parseInt(document.getElementById('add-prod-stock-qty').value, 10);
    const power_rating = document.getElementById('add-prod-power-rating').value.trim();
    const warranty_years = parseInt(document.getElementById('add-prod-warranty').value, 10);
    const image_url = document.getElementById('add-prod-image').value.trim();
    const specifications = document.getElementById('add-prod-specs').value.trim();
    const description = document.getElementById('add-prod-desc').value.trim();

    const errBox = document.getElementById('add-prod-error-alert');
    errBox.style.display = 'none';

    let hasClientErrors = false;
    function flagError(inputId, errId, msg) {
      hasClientErrors = true;
      const input = document.getElementById(inputId);
      const errEl = document.getElementById(errId);
      if (input) input.classList.add('input-error');
      if (errEl) {
        if (msg) errEl.textContent = msg;
        errEl.style.display = 'block';
      }
    }

    document.querySelectorAll('#add-product-modal .field-error-msg').forEach(el => el.style.display = 'none');
    document.querySelectorAll('#add-product-modal .form-input').forEach(el => el.classList.remove('input-error'));

    if (!name) flagError('add-prod-name', 'error-add-name', 'Product name is required.');
    if (!sku) flagError('add-prod-sku', 'error-add-sku', 'SKU is required.');
    if (!brand) flagError('add-prod-brand', 'error-add-brand', 'Brand is required.');
    if (priceRaw === '' || isNaN(priceRaw) || Number(priceRaw) < 0) {
      flagError('add-prod-price', 'error-add-price', 'Valid non-negative selling price is required.');
    }
    if (prevPriceRaw && (isNaN(prevPriceRaw) || Number(prevPriceRaw) < 0)) {
      flagError('add-prod-prev-price', 'error-add-prev-price', 'Previous price must be non-negative.');
    }
    if (costRaw && (isNaN(costRaw) || Number(costRaw) < 0)) {
      flagError('add-prod-cost', 'error-add-cost', 'Supplier cost must be non-negative.');
    }

    if (image_url) {
      const isAllowedScheme = image_url.startsWith('http://') || image_url.startsWith('https://') || image_url.startsWith('/images/') || image_url.startsWith('/');
      if (!isAllowedScheme) {
        flagError('add-prod-image', 'error-add-image', 'Image URL must use http://, https://, or /images/ path.');
      }
    }

    if (hasClientErrors) return;

    const btnSubmit = document.getElementById('btn-add-prod-submit');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Publishing...';
    }

    const payload = {
      name,
      sku,
      brand,
      category,
      price_ngn: Math.round(Number(priceRaw)),
      previous_price_ngn: prevPriceRaw ? Math.round(Number(prevPriceRaw)) : null,
      cost_price_ngn: costRaw ? Math.round(Number(costRaw)) : 0,
      stock_status,
      stock_quantity: isNaN(stock_quantity) ? 50 : stock_quantity,
      power_rating,
      warranty_years: isNaN(warranty_years) ? 5 : warranty_years,
      image_url: image_url || undefined,
      specifications,
      description
    };

    try {
      const res = await apiFetch('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish new equipment SKU');
      }

      addProductModal.close();
      loadProducts(1);
      loadDashboardStats();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Publish to Catalogue';
      }
    }
  }

  // Archive / Restore flow
  window.adminPromptArchive = function (id, currentPublished, name) {
    const isCurrentlyPublished = Number(currentPublished) === 1;
    currentArchiveProductId = id;
    currentArchiveTargetState = isCurrentlyPublished; // true = archive (unpublish), false = restore

    const modal = productArchiveModal;
    if (!modal) return;

    const titleEl = document.getElementById('modal-archive-title');
    const bodyEl = document.getElementById('modal-archive-body');
    const confirmBtn = document.getElementById('btn-confirm-archive-action');

    const actionWord = isCurrentlyPublished ? 'Archive & Unpublish' : 'Restore & Publish';
    if (titleEl) titleEl.textContent = `${actionWord} Product`;
    if (confirmBtn) {
      confirmBtn.textContent = actionWord;
      confirmBtn.className = isCurrentlyPublished ? 'btn-secondary' : 'btn-primary-yellow';
      if (isCurrentlyPublished) {
        confirmBtn.style.background = '#EF4444';
        confirmBtn.style.color = '#FFFFFF';
        confirmBtn.style.borderColor = '#DC2626';
      } else {
        confirmBtn.style.background = '';
        confirmBtn.style.color = '';
        confirmBtn.style.borderColor = '';
      }
    }

    bodyEl.innerHTML = `
      <p style="font-size: 0.9rem; line-height: 1.5; color: #EEF1F8; margin-bottom: 1rem;">
        Are you sure you want to <strong>${isCurrentlyPublished ? 'unpublish/archive' : 'reactivate and restore'}</strong>:
      </p>
      <div style="background: rgba(255,255,255,0.03); padding: 0.85rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 1rem;">
        <div style="font-weight: 700; color: #FFFFFF;">${escapeHtml(name)}</div>
        <div style="font-size: 0.75rem; color: rgba(238,241,248,0.6); margin-top: 2px;">Record ID: ${id}</div>
      </div>
      <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; padding: 0.75rem; font-size: 0.78rem; color: #93C5FD; line-height: 1.4;">
        🔒 <strong>Database Integrity Guarantee:</strong> Historical customer orders and invoices referencing this product remain intact and authoritative. Archiving only removes the item from new catalog checkout.
      </div>
    `;

    modal.showModal();
  };

  async function executeArchiveProduct() {
    if (!currentArchiveProductId) return;
    const btn = document.getElementById('btn-confirm-archive-action');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Processing...';
    }

    try {
      const res = await apiFetch(`/api/admin/products/${currentArchiveProductId}/archive`, {
        method: 'POST',
        body: JSON.stringify({ archive: currentArchiveTargetState })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to toggle product archive state.');
      }

      if (productArchiveModal) productArchiveModal.close();
      loadProducts(productPagination.page);
      loadDashboardStats();
    } catch (err) {
      alert('Archive operation error: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Confirm Action';
      }
    }
  }

  // ==========================================================================
  // TAB 6: AUDIT TRAIL & BACKUP
  // ==========================================================================
  async function loadAuditLogs() {
    const tbody = document.getElementById('audit-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Retrieving tamper-evident audit logs...</td></tr>';

    try {
      const res = await apiFetch('/api/admin/audit-logs?limit=50');
      const data = await res.json();
      if (data.success) {
        renderAuditLogs(data.logs || []);
      } else {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">Restricted: ${data.error}</td></tr>`;
      }
    } catch (err) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Failed to retrieve audit logs.</td></tr>';
    }
  }

  function renderAuditLogs(logs) {
    const tbody = document.getElementById('audit-table-body');
    if (!tbody) return;

    if (!logs || logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No staff audit actions recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(l => `
      <tr>
        <td style="white-space: nowrap;">${formatDate(l.created_at)}</td>
        <td>
          <span style="font-weight: 600; color: #FFFFFF;">${escapeHtml(l.username || 'System / Customer')}</span>
        </td>
        <td><code>${escapeHtml(l.action)}</code></td>
        <td><span style="text-transform: uppercase; font-size: 0.72rem;">${escapeHtml(l.entity_type)}</span></td>
        <td><strong>${escapeHtml(l.entity_id || '—')}</strong></td>
        <td style="font-size: 0.78rem; color: rgba(238,241,248,0.7);">${escapeHtml(l.details || '')}</td>
      </tr>
    `).join('');
  }

  async function exportDatabaseBackup() {
    const btn = document.getElementById('btn-export-backup');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Creating verified backup snapshot...</span>';
    }

    try {
      const res = await apiFetch('/api/admin/backup');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Backup creation failed');
      }

      const backupInfo = data.backup || {};
      const blob = new Blob([JSON.stringify(backupInfo, null, 2)], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `device-pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      alert(`Database verified backup created successfully!\nFile: ${backupInfo.backupFile}\nSize: ${(backupInfo.sizeBytes / 1024).toFixed(1)} KB`);
    } catch (err) {
      alert('Error creating database backup: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span>Download Live Backup</span>';
      }
    }
  }

  // ==========================================================================
  // STAGE 5: SUPPLIER PRICE IMPORT INFRASTRUCTURE CLIENT LOGIC
  // ==========================================================================
  let currentImportFile = null;
  let currentAnalysisData = null;
  let previewFilterState = { search: '', status: 'all', page: 1, limit: 25 };
  let importHistoryState = { search: '', format: '', status: '', page: 1, limit: 20, totalPages: 1 };

  function setupPriceImportListeners() {
    const dropzone = document.getElementById('import-dropzone');
    const fileInput = document.getElementById('price-import-file-input');
    const btnCancelSelection = document.getElementById('btn-cancel-file-selection');
    const btnParseUpload = document.getElementById('btn-parse-upload-file');
    const btnCancelMapping = document.getElementById('btn-cancel-mapping');
    const btnApplyMapping = document.getElementById('btn-apply-custom-mapping');
    const btnEditMappingToggle = document.getElementById('btn-edit-mapping-toggle');
    const previewSearch = document.getElementById('preview-search-input');
    const previewStatus = document.getElementById('preview-status-filter');
    const btnPrevPreview = document.getElementById('btn-prev-preview-page');
    const btnNextPreview = document.getElementById('btn-next-preview-page');
    const btnResetAll = document.getElementById('btn-reset-import-all');
    const btnSaveRecord = document.getElementById('btn-save-import-record');

    // History panel filters
    const historySearch = document.getElementById('history-search-input');
    const historyFormat = document.getElementById('history-format-filter');
    const historyStatus = document.getElementById('history-status-filter');
    const btnHistoryRefresh = document.getElementById('btn-history-refresh');
    const btnHistoryPrev = document.getElementById('btn-history-prev');
    const btnHistoryNext = document.getElementById('btn-history-next');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handlePriceImportFileSelected(e.dataTransfer.files[0]);
        }
      });
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handlePriceImportFileSelected(e.target.files[0]);
        }
      });
    }

    if (btnCancelSelection) {
      btnCancelSelection.addEventListener('click', resetPriceImportWorkflow);
    }

    if (btnParseUpload) {
      btnParseUpload.addEventListener('click', () => parseAndAnalyzePriceImport());
    }

    if (btnCancelMapping) {
      btnCancelMapping.addEventListener('click', resetPriceImportWorkflow);
    }

    if (btnApplyMapping) {
      btnApplyMapping.addEventListener('click', () => {
        const customMapping = gatherCustomMappingFromUI();
        parseAndAnalyzePriceImport(customMapping);
      });
    }

    if (btnEditMappingToggle) {
      btnEditMappingToggle.addEventListener('click', () => {
        const mappingCard = document.getElementById('import-mapping-card');
        if (mappingCard) {
          const isShown = mappingCard.style.display !== 'none';
          mappingCard.style.display = isShown ? 'none' : 'block';
          btnEditMappingToggle.textContent = isShown ? 'Adjust Mapping' : 'Hide Mapping';
        }
      });
    }

    if (previewSearch) {
      previewSearch.addEventListener('input', debounce(() => {
        previewFilterState.search = previewSearch.value.trim();
        previewFilterState.page = 1;
        renderPreviewRows();
      }, 250));
    }

    if (previewStatus) {
      previewStatus.addEventListener('change', () => {
        previewFilterState.status = previewStatus.value;
        previewFilterState.page = 1;
        renderPreviewRows();
      });
    }

    if (btnPrevPreview) {
      btnPrevPreview.addEventListener('click', () => {
        if (previewFilterState.page > 1) {
          previewFilterState.page--;
          renderPreviewRows();
        }
      });
    }

    if (btnNextPreview) {
      btnNextPreview.addEventListener('click', () => {
        previewFilterState.page++;
        renderPreviewRows();
      });
    }

    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => {
        if (confirm('Discard current supplier import analysis? Any unsaved preview data will be lost.')) {
          resetPriceImportWorkflow();
        }
      });
    }

    if (btnSaveRecord) {
      btnSaveRecord.addEventListener('click', saveImportAnalysisRecord);
    }

    if (historySearch) {
      historySearch.addEventListener('input', debounce(() => {
        importHistoryState.search = historySearch.value.trim();
        importHistoryState.page = 1;
        loadImportHistoryModule(1);
      }, 300));
    }

    if (historyFormat) {
      historyFormat.addEventListener('change', () => {
        importHistoryState.format = historyFormat.value;
        importHistoryState.page = 1;
        loadImportHistoryModule(1);
      });
    }

    if (historyStatus) {
      historyStatus.addEventListener('change', () => {
        importHistoryState.status = historyStatus.value;
        importHistoryState.page = 1;
        loadImportHistoryModule(1);
      });
    }

    if (btnHistoryRefresh) {
      btnHistoryRefresh.addEventListener('click', () => loadImportHistoryModule(importHistoryState.page));
    }

    if (btnHistoryPrev) {
      btnHistoryPrev.addEventListener('click', () => {
        if (importHistoryState.page > 1) {
          loadImportHistoryModule(importHistoryState.page - 1);
        }
      });
    }

    if (btnHistoryNext) {
      btnHistoryNext.addEventListener('click', () => {
        if (importHistoryState.page < importHistoryState.totalPages) {
          loadImportHistoryModule(importHistoryState.page + 1);
        }
      });
    }
  }

  function handlePriceImportFileSelected(file) {
    const errorBox = document.getElementById('import-upload-error');
    if (errorBox) errorBox.style.display = 'none';

    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'csv'].includes(ext)) {
      if (errorBox) {
        errorBox.textContent = `Unsupported file format ".${ext}". Please upload a Microsoft Excel (.xlsx) or CSV (.csv) price sheet.`;
        errorBox.style.display = 'block';
      }
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      if (errorBox) {
        errorBox.textContent = `File size exceeds the 4MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB). Please upload a smaller file.`;
        errorBox.style.display = 'block';
      }
      return;
    }

    currentImportFile = file;

    // Display selected file card
    const dropzone = document.getElementById('import-dropzone');
    const selectedFileCard = document.getElementById('import-selected-file-card');
    const nameEl = document.getElementById('selected-file-name');
    const metaEl = document.getElementById('selected-file-meta');
    const badgeEl = document.getElementById('selected-file-format-badge');

    if (dropzone) dropzone.style.display = 'none';
    if (selectedFileCard) selectedFileCard.style.display = 'flex';
    if (nameEl) nameEl.textContent = file.name;
    if (metaEl) metaEl.textContent = `${(file.size / 1024).toFixed(1)} KB • Ready for analysis`;
    if (badgeEl) badgeEl.textContent = ext.toUpperCase();
  }

  function resetPriceImportWorkflow() {
    currentImportFile = null;
    currentAnalysisData = null;
    previewFilterState = { search: '', status: 'all', page: 1, limit: 25 };

    const fileInput = document.getElementById('price-import-file-input');
    if (fileInput) fileInput.value = '';

    const dropzone = document.getElementById('import-dropzone');
    const selectedFileCard = document.getElementById('import-selected-file-card');
    const loadingState = document.getElementById('import-loading-state');
    const mappingCard = document.getElementById('import-mapping-card');
    const previewCard = document.getElementById('import-preview-card');
    const errorBox = document.getElementById('import-upload-error');

    if (dropzone) dropzone.style.display = 'block';
    if (selectedFileCard) selectedFileCard.style.display = 'none';
    if (loadingState) loadingState.style.display = 'none';
    if (mappingCard) mappingCard.style.display = 'none';
    if (previewCard) previewCard.style.display = 'none';
    if (errorBox) errorBox.style.display = 'none';
  }

  async function parseAndAnalyzePriceImport(customMapping = null) {
    if (!currentImportFile) return;

    const errorBox = document.getElementById('import-upload-error');
    const selectedFileCard = document.getElementById('import-selected-file-card');
    const loadingState = document.getElementById('import-loading-state');
    const mappingCard = document.getElementById('import-mapping-card');
    const previewCard = document.getElementById('import-preview-card');
    const supplierInput = document.getElementById('import-supplier-name-input');

    if (errorBox) errorBox.style.display = 'none';
    if (selectedFileCard) selectedFileCard.style.display = 'none';
    if (loadingState) loadingState.style.display = 'block';

    try {
      const formData = new FormData();
      formData.append('file', currentImportFile);
      if (supplierInput && supplierInput.value) {
        formData.append('supplierName', supplierInput.value.trim());
      }
      if (customMapping) {
        formData.append('mapping', JSON.stringify(customMapping));
      }

      const res = await apiFetch('/api/admin/price-imports/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze supplier price file');
      }

      currentAnalysisData = data;
      if (loadingState) loadingState.style.display = 'none';

      // Render Step 2: Mapping card
      renderMappingControls(data.availableColumns, data.mappingConfig);
      if (mappingCard) mappingCard.style.display = customMapping ? 'none' : 'block';

      // Render Step 3: Preview card & KPIs
      renderPreviewKpis(data.summary);
      previewFilterState.page = 1;
      renderPreviewRows();
      if (previewCard) previewCard.style.display = 'block';

    } catch (err) {
      if (loadingState) loadingState.style.display = 'none';
      if (selectedFileCard) selectedFileCard.style.display = 'flex';
      if (errorBox) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
      }
    }
  }

  function renderMappingControls(availableColumns = [], mappingConfig = {}) {
    const container = document.getElementById('mapping-selectors-container');
    if (!container) return;

    const fields = [
      { key: 'sku', label: 'Supplier SKU *', required: true, desc: 'Unique manufacturer or supplier part identifier' },
      { key: 'cost', label: 'Supplier Cost / Price (₦) *', required: true, desc: 'Net supplier wholesale acquisition cost in NGN' },
      { key: 'name', label: 'Product / Model Name', required: false, desc: 'Equipment name or title' },
      { key: 'brand', label: 'Manufacturer Brand', required: false, desc: 'e.g. Sungrow, Growatt, Deye, Felicity' },
      { key: 'category', label: 'Equipment Category', required: false, desc: 'e.g. Inverters, Batteries, Solar PV Panels' },
      { key: 'currency', label: 'Currency Field', required: false, desc: 'Source currency indicator (must be NGN)' },
      { key: 'stock', label: 'Stock / Availability', required: false, desc: 'Inventory status or warehouse quantities' },
      { key: 'supplier_ref', label: 'Supplier Reference / Code', required: false, desc: 'Distributor internal tracking tag' }
    ];

    container.innerHTML = fields.map(f => {
      const selectedCol = mappingConfig[f.key] || '';
      const isAuto = Boolean(selectedCol);
      const optionsHtml = ['<option value="">-- None / Not in File --</option>']
        .concat(availableColumns.map(col => {
          const isSel = col === selectedCol ? 'selected' : '';
          return `<option value="${escapeHtml(col)}" ${isSel}>${escapeHtml(col)}</option>`;
        }))
        .join('');

      return `
        <div class="mapping-item">
          <div class="mapping-header-row">
            <span class="mapping-label">${escapeHtml(f.label)}</span>
            <span class="mapping-badge ${isAuto ? 'auto' : 'manual'}">${isAuto ? 'Auto-Mapped' : 'Optional'}</span>
          </div>
          <select class="form-select mapping-select" data-mapping-key="${f.key}" ${f.required ? 'required' : ''}>
            ${optionsHtml}
          </select>
          <div class="field-hint">${escapeHtml(f.desc)}</div>
        </div>
      `;
    }).join('');
  }

  function gatherCustomMappingFromUI() {
    const mapping = {};
    document.querySelectorAll('.mapping-select').forEach(sel => {
      const key = sel.getAttribute('data-mapping-key');
      const val = sel.value;
      if (key && val) {
        mapping[key] = val;
      }
    });
    return mapping;
  }

  function renderPreviewKpis(summary = {}) {
    const totalEl = document.getElementById('kpi-import-total');
    const validEl = document.getElementById('kpi-import-valid');
    const matchedEl = document.getElementById('kpi-import-matched');
    const unmatchedEl = document.getElementById('kpi-import-unmatched');
    const dupEl = document.getElementById('kpi-import-dup-file');
    const invalidEl = document.getElementById('kpi-import-invalid');
    const reviewEl = document.getElementById('kpi-import-review');

    if (totalEl) totalEl.textContent = summary.total_rows || 0;
    if (validEl) validEl.textContent = summary.valid_rows || 0;
    if (matchedEl) matchedEl.textContent = summary.matched_rows || 0;
    if (unmatchedEl) unmatchedEl.textContent = summary.unmatched_rows || 0;
    if (dupEl) dupEl.textContent = summary.duplicate_in_file_rows || 0;
    if (invalidEl) invalidEl.textContent = summary.invalid_rows || 0;
    if (reviewEl) reviewEl.textContent = summary.requires_review_rows || 0;
  }

  function renderPreviewRows() {
    if (!currentAnalysisData || !Array.isArray(currentAnalysisData.rowsPreview)) return;

    const tbody = document.getElementById('import-preview-tbody');
    const filterCountEl = document.getElementById('preview-filter-count');
    const pageLabel = document.getElementById('preview-current-page-label');
    const paginationInfo = document.getElementById('preview-pagination-info');
    const btnPrev = document.getElementById('btn-prev-preview-page');
    const btnNext = document.getElementById('btn-next-preview-page');

    if (!tbody) return;

    let filtered = currentAnalysisData.rowsPreview.filter(row => {
      // Status filter
      if (previewFilterState.status !== 'all') {
        if (previewFilterState.status === 'matched' && row.status !== 'matched') return false;
        if (previewFilterState.status === 'unmatched' && row.status !== 'unmatched') return false;
        if (previewFilterState.status === 'duplicate_in_file' && row.status !== 'duplicate_in_file') return false;
        if (previewFilterState.status === 'invalid' && !['invalid_row', 'missing_sku', 'invalid_price', 'unsupported_currency'].includes(row.status)) return false;
        if (previewFilterState.status === 'review' && row.status !== 'requires_manual_review') return false;
      }
      // Search filter
      if (previewFilterState.search) {
        const q = previewFilterState.search.toLowerCase();
        const sku = String(row.raw_sku || '').toLowerCase();
        const name = String(row.raw_name || '').toLowerCase();
        const matched = String(row.matched_product_name || '').toLowerCase();
        if (!sku.includes(q) && !name.includes(q) && !matched.includes(q)) return false;
      }
      return true;
    });

    const totalFiltered = filtered.length;
    const limit = previewFilterState.limit;
    const totalPages = Math.ceil(totalFiltered / limit) || 1;
    previewFilterState.page = Math.min(Math.max(1, previewFilterState.page), totalPages);

    const startIndex = (previewFilterState.page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalFiltered);
    const pageRows = filtered.slice(startIndex, endIndex);

    if (filterCountEl) filterCountEl.textContent = `Showing ${pageRows.length} of ${totalFiltered} rows (${currentAnalysisData.rowsPreview.length} total)`;
    if (pageLabel) pageLabel.textContent = `Page ${previewFilterState.page} of ${totalPages}`;
    if (paginationInfo) paginationInfo.textContent = `Showing ${totalFiltered === 0 ? 0 : startIndex + 1}–${endIndex} of ${totalFiltered} filtered rows`;
    if (btnPrev) btnPrev.disabled = previewFilterState.page <= 1;
    if (btnNext) btnNext.disabled = previewFilterState.page >= totalPages;

    if (pageRows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No supplier rows match the current filter criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = pageRows.map(row => {
      let statusBadgeClass = 'badge-unmatched';
      let statusLabel = row.status.toUpperCase().replace(/_/g, ' ');

      if (row.status === 'matched') {
        statusBadgeClass = 'badge-matched';
      } else if (row.status === 'duplicate_in_file') {
        statusBadgeClass = 'badge-duplicate';
        statusLabel = 'FILE DUPLICATE';
      } else if (['invalid_row', 'missing_sku', 'invalid_price', 'unsupported_currency'].includes(row.status)) {
        statusBadgeClass = 'badge-invalid';
      } else if (row.status === 'requires_manual_review') {
        statusBadgeClass = 'badge-review';
        statusLabel = 'MANUAL REVIEW';
      }

      const issues = (row.validation_errors || []).concat(row.warnings || []);
      const issuesHtml = issues.length > 0
        ? issues.map(iss => `<div style="font-size:0.73rem; color:#FCA5A5; margin-top:2px;">• ${escapeHtml(iss)}</div>`).join('')
        : '<span style="color:#34D399; font-size:0.75rem;">✓ Valid</span>';

      const matchedDesc = row.matched_product_name
        ? `<div style="font-weight:700; color:#FFFFFF; font-size:0.82rem;">${escapeHtml(row.matched_product_name)}</div>
           <div style="font-size:0.72rem; color:var(--color-d-text-muted);">SKU: ${escapeHtml(row.matched_product_sku)} • Cat ID: #${row.matched_product_id}</div>`
        : '<span style="color:var(--color-d-text-subtle); font-size:0.78rem;">— No active catalog match —</span>';

      return `
        <tr>
          <td style="color:var(--color-d-text-muted); font-size:0.75rem;">${row.row_number}</td>
          <td>
            <strong style="color:var(--color-brand-yellow); font-family:monospace; font-size:0.82rem;">${escapeHtml(row.raw_sku || '—')}</strong>
          </td>
          <td>
            <div style="font-weight:600; color:#FFFFFF; font-size:0.84rem;">${escapeHtml(row.raw_name || '—')}</div>
            <div style="font-size:0.72rem; color:var(--color-d-text-muted);">${escapeHtml(row.raw_brand || '')} ${escapeHtml(row.raw_category ? '• ' + row.raw_category : '')}</div>
          </td>
          <td>
            <strong style="color:#FFFFFF; font-size:0.84rem;">${row.normalized_cost_ngn ? formatNaira(row.normalized_cost_ngn) : '—'}</strong>
            <div style="font-size:0.7rem; color:var(--color-d-text-muted);">${escapeHtml(row.currency || 'NGN')} (Raw: ${escapeHtml(String(row.raw_cost || '—'))})</div>
          </td>
          <td>${matchedDesc}</td>
          <td style="font-size:0.75rem; color:var(--color-d-text-muted);">${escapeHtml(row.matching_method || '—')}</td>
          <td>
            <span class="badge-status ${statusBadgeClass}">${statusLabel}</span>
          </td>
          <td>${issuesHtml}</td>
        </tr>
      `;
    }).join('');
  }

  async function saveImportAnalysisRecord() {
    if (!currentAnalysisData) return;

    const confirmMsg = 'Confirm saving this supplier price analysis record?\n\n' +
      '• Filename: ' + currentAnalysisData.filename + '\n' +
      '• Total Rows: ' + currentAnalysisData.summary.total_rows + '\n' +
      '• Matched SKUs: ' + currentAnalysisData.summary.matched_rows + '\n\n' +
      'CRITICAL NOTICE: Stage 5 analyses and records import data only. NO live product prices, costs, or inventory stock will be changed.';

    if (!confirm(confirmMsg)) return;

    const btn = document.getElementById('btn-save-import-record');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving Record...';
    }

    try {
      const payload = {
        filename: currentAnalysisData.filename,
        supplier_name: currentAnalysisData.supplierName,
        file_format: currentAnalysisData.format,
        mapping_config: currentAnalysisData.mappingConfig,
        summary: currentAnalysisData.summary,
        rows_preview: currentAnalysisData.rowsPreview,
        notes: `Analysed via admin console on ${new Date().toISOString()}`
      };

      const res = await apiFetch('/api/admin/price-imports', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save import analysis record');
      }

      alert('Import analysed successfully. No live product prices or supplier costs have been changed.\n\nAnalysis record saved to MongoDB Atlas history.');
      resetPriceImportWorkflow();
      loadRecentImportsSummary();
    } catch (err) {
      alert('Error saving import record: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Save Import Analysis';
      }
    }
  }

  async function loadSupplierImportsModule() {
    loadRecentImportsSummary();
  }

  async function loadRecentImportsSummary() {
    const tbody = document.getElementById('recent-imports-tbody');
    if (!tbody) return;

    try {
      const res = await apiFetch('/api/admin/price-imports?limit=5');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      const imports = data.imports || [];
      if (imports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">No supplier price imports recorded yet. Upload a file above to begin analysis.</td></tr>';
        return;
      }

      function getImportActionHtml(item) {
        const id = item._id || item.id;
        const st = item.status || 'analysed';
        if (st === 'analysed' || st === 'awaiting_approval') {
          return `<button type="button" class="btn-table-action" onclick="window.adminOpenReview('${id}')">Review &amp; Approve</button>`;
        }
        if (st === 'approved_for_application') {
          return `<button type="button" class="btn-table-action btn-apply-action" onclick="window.adminOpenReview('${id}')">Apply Prices</button>`;
        }
        if (st === 'partially_applied') {
          return `<button type="button" class="btn-table-action" style="border-color:#FB923C; color:#FB923C;" onclick="window.adminOpenReview('${id}')">Review &amp; Retry</button>`;
        }
        return `<button type="button" class="btn-table-action" onclick="window.adminOpenReview('${id}')">View Details</button>`;
      }

      tbody.innerHTML = imports.map(item => `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--color-brand-yellow);">#IMP-${item.id || item._id.slice(-6)}</td>
          <td style="font-weight:700; color:#FFFFFF;">${escapeHtml(item.filename)}</td>
          <td><span class="status-pill" style="font-size:0.7rem;">${escapeHtml((item.file_format || '').toUpperCase())}</span></td>
          <td style="color:var(--color-d-text-muted);">${escapeHtml(item.supplier_name || 'Generic')}</td>
          <td style="font-size:0.78rem;">${escapeHtml(item.uploaded_by_email || 'staff@devicepro.ng')}</td>
          <td style="font-size:0.78rem; color:var(--color-d-text-muted);">${formatDate(item.created_at)}</td>
          <td>
            <div style="font-size:0.78rem; font-weight:600; color:#FFFFFF;">${item.summary ? item.summary.total_rows : 0} rows</div>
            <div style="font-size:0.7rem; color:#34D399;">${item.summary ? item.summary.matched_rows : 0} matched active SKUs</div>
          </td>
          <td>
            <span class="badge-status badge-${item.status || 'analysed'}" title="Status: ${item.status}">${(item.status || 'analysed').replace(/_/g, ' ').toUpperCase()}</span>
          </td>
          <td>
            ${getImportActionHtml(item)}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-cell text-rose">Error loading recent imports: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  async function loadImportHistoryModule(page = 1) {
    importHistoryState.page = page;
    const tbody = document.getElementById('history-table-tbody');
    const paginationInfo = document.getElementById('history-pagination-info');
    const pageNumbersEl = document.getElementById('history-page-numbers');
    const btnPrev = document.getElementById('btn-history-prev');
    const btnNext = document.getElementById('btn-history-next');

    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">Loading import records from MongoDB Atlas...</td></tr>';

    try {
      const q = new URLSearchParams({
        page: importHistoryState.page,
        limit: importHistoryState.limit,
        search: importHistoryState.search,
        format: importHistoryState.format,
        status: importHistoryState.status
      });

      const res = await apiFetch(`/api/admin/price-imports?${q.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      const imports = data.imports || [];
      const total = data.total || 0;
      const totalPages = data.totalPages || 1;
      importHistoryState.totalPages = totalPages;

      if (paginationInfo) {
        const start = total === 0 ? 0 : (importHistoryState.page - 1) * importHistoryState.limit + 1;
        const end = Math.min(start + imports.length - 1, total);
        paginationInfo.textContent = `Showing ${start}–${end} of ${total} imports`;
      }

      if (btnPrev) btnPrev.disabled = importHistoryState.page <= 1;
      if (btnNext) btnNext.disabled = importHistoryState.page >= totalPages;

      if (pageNumbersEl) {
        pageNumbersEl.innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1)
          .slice(0, 5)
          .map(p => `
            <button type="button" class="pagination-btn ${p === importHistoryState.page ? 'active' : ''}" onclick="window.adminGoHistoryPage(${p})">${p}</button>
          `).join('');
      }

      if (imports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">No supplier price imports found.</td></tr>';
        return;
      }

      function getHistoryActionHtml(item) {
        const id = item._id || item.id;
        const st = item.status || 'analysed';
        if (st === 'analysed' || st === 'awaiting_approval') {
          return `<button type="button" class="btn-table-action" onclick="window.adminOpenReview('${id}')">Review &amp; Approve</button>`;
        }
        if (st === 'approved_for_application') {
          return `<button type="button" class="btn-table-action btn-apply-action" onclick="window.adminOpenReview('${id}')">Apply Prices</button>`;
        }
        if (st === 'partially_applied') {
          return `<button type="button" class="btn-table-action" style="border-color:#FB923C; color:#FB923C;" onclick="window.adminOpenReview('${id}')">Review &amp; Retry</button>`;
        }
        return `<button type="button" class="btn-table-action" onclick="window.adminOpenReview('${id}')">View Details</button>`;
      }

      tbody.innerHTML = imports.map(item => `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--color-brand-yellow);">#IMP-${item.id || item._id.slice(-6)}</td>
          <td style="font-weight:700; color:#FFFFFF;">${escapeHtml(item.filename)}</td>
          <td><span class="status-pill" style="font-size:0.7rem;">${escapeHtml((item.file_format || '').toUpperCase())}</span></td>
          <td style="color:var(--color-d-text-muted);">${escapeHtml(item.supplier_name || 'Generic')}</td>
          <td style="font-size:0.78rem;">${escapeHtml(item.uploaded_by_email || 'staff@devicepro.ng')}</td>
          <td style="font-size:0.78rem; color:var(--color-d-text-muted);">${formatDate(item.created_at)}</td>
          <td>
            <div style="font-size:0.78rem; font-weight:600; color:#FFFFFF;">${item.summary ? item.summary.total_rows : 0} rows</div>
            <div style="font-size:0.7rem; color:#34D399;">${item.summary ? item.summary.matched_rows : 0} matched active SKUs</div>
          </td>
          <td>
            <span class="badge-status badge-${item.status || 'analysed'}" title="Status: ${item.status}">${(item.status || 'analysed').replace(/_/g, ' ').toUpperCase()}</span>
          </td>
          <td>
            ${getHistoryActionHtml(item)}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-cell text-rose">Error loading import history: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // =========================================================================
  // STAGE 6: SUPPLIER PRICE REVIEW, APPROVAL & CONTROLLED APPLICATION UI
  // =========================================================================

  let activeReviewState = {
    importId: null,
    importDoc: null,
    selectedRowNumbers: new Set(),
    currentFilter: 'all',
    acknowledgeHighVariance: false
  };

  async function openImportReviewModal(importId) {
    const modal = document.getElementById('price-import-review-modal');
    const bodyEl = document.getElementById('review-import-body');
    const titleEl = document.getElementById('review-import-title');
    const subEl = document.getElementById('review-import-subtitle');
    const statusBadge = document.getElementById('review-import-status-badge');

    if (!modal || !bodyEl) return;

    activeReviewState.importId = importId;
    activeReviewState.selectedRowNumbers.clear();
    activeReviewState.acknowledgeHighVariance = false;
    activeReviewState.currentFilter = 'all';

    bodyEl.innerHTML = '<div style="padding:3rem 1rem; text-align:center;"><div class="loading-spinner" style="margin:0 auto 1rem;"></div><div style="color:#FFF; font-weight:700;">Opening price review console...</div><p style="font-size:0.8rem; color:var(--color-d-text-muted); margin-top:0.35rem;">Computing live catalog cost diffs, variance thresholds, and row eligibility.</p></div>';
    modal.showModal();

    try {
      const res = await apiFetch(`/api/admin/price-imports/${importId}/review`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      const item = data.importRecord;
      activeReviewState.importDoc = item;

      if (titleEl) titleEl.textContent = `Supplier Price Review: ${item.filename}`;
      if (subEl) subEl.textContent = `Supplier: ${item.supplier_name || 'Generic'} • Uploaded by ${item.uploaded_by_email} on ${formatDate(item.created_at)}`;
      if (statusBadge) {
        statusBadge.className = `badge-status badge-${item.status}`;
        statusBadge.textContent = (item.status || 'analysed').replace(/_/g, ' ').toUpperCase();
      }

      // Pre-select rows: if already approved, select approved rows; if awaiting/analysed, select all eligible rows
      const rows = item.rows_preview || [];
      const eligibleRows = rows.filter(r => r.is_eligible_for_approval);
      const approvedPendingRows = rows.filter(r => r.approval_status === 'approved' && r.application_status !== 'applied');

      if (approvedPendingRows.length > 0) {
        approvedPendingRows.forEach(r => activeReviewState.selectedRowNumbers.add(r.row_number));
      } else {
        eligibleRows.forEach(r => activeReviewState.selectedRowNumbers.add(r.row_number));
      }

      renderReviewModalView();
    } catch (err) {
      bodyEl.innerHTML = `<div class="auth-error-box" style="margin:1.5rem 0;">Failed to load import review: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderReviewModalView() {
    const bodyEl = document.getElementById('review-import-body');
    const item = activeReviewState.importDoc;
    if (!bodyEl || !item) return;

    const rows = item.rows_preview || [];
    const sum = item.summary || {};

    const totalRows = rows.length;
    const eligibleCount = rows.filter(r => r.is_eligible_for_approval).length;
    const approvedCount = rows.filter(r => r.approval_status === 'approved').length;
    const appliedCount = rows.filter(r => r.application_status === 'applied').length;
    const highVarianceCount = rows.filter(r => r.variance_warning && r.variance_warning !== 'NONE').length;
    const ineligibleCount = rows.filter(r => !r.is_eligible_for_approval).length;

    // Filter rows according to active filter
    let displayedRows = rows;
    if (activeReviewState.currentFilter === 'eligible') {
      displayedRows = rows.filter(r => r.is_eligible_for_approval);
    } else if (activeReviewState.currentFilter === 'approved') {
      displayedRows = rows.filter(r => r.approval_status === 'approved');
    } else if (activeReviewState.currentFilter === 'high-variance') {
      displayedRows = rows.filter(r => r.variance_warning && r.variance_warning !== 'NONE');
    } else if (activeReviewState.currentFilter === 'ineligible') {
      displayedRows = rows.filter(r => !r.is_eligible_for_approval);
    }

    // Calculate net cost difference across selected rows with valid comparison
    let selectedCostSumDiff = 0;
    let selectedValidComparisonCount = 0;
    rows.forEach(r => {
      if (activeReviewState.selectedRowNumbers.has(r.row_number) && r.normalized_cost_ngn && r.matched_current_cost_ngn) {
        selectedCostSumDiff += (r.normalized_cost_ngn - r.matched_current_cost_ngn);
        selectedValidComparisonCount++;
      }
    });

    const isTerminal = item.status === 'successfully_applied' || item.status === 'cancelled';
    const isApplying = item.status === 'applying';

    bodyEl.innerHTML = `
      <!-- KPI Ribbon -->
      <div class="import-kpi-strip" style="border-radius:8px; border:1px solid rgba(255,255,255,0.08); margin-bottom:1rem;">
        <div class="kpi-mini-card"><span class="kpi-mini-label">TOTAL ROWS</span><span class="kpi-mini-val">${totalRows}</span></div>
        <div class="kpi-mini-card"><span class="kpi-mini-label">ELIGIBLE</span><span class="kpi-mini-val text-emerald">${eligibleCount}</span></div>
        <div class="kpi-mini-card"><span class="kpi-mini-label">SELECTED</span><span class="kpi-mini-val text-amber" id="kpi-val-selected">${activeReviewState.selectedRowNumbers.size}</span></div>
        <div class="kpi-mini-card"><span class="kpi-mini-label">APPROVED</span><span class="kpi-mini-val text-emerald">${approvedCount}</span></div>
        <div class="kpi-mini-card"><span class="kpi-mini-label">APPLIED</span><span class="kpi-mini-val text-emerald">${appliedCount}</span></div>
        <div class="kpi-mini-card"><span class="kpi-mini-label">HIGH VARIANCE</span><span class="kpi-mini-val ${highVarianceCount > 0 ? 'text-amber' : 'text-slate'}">${highVarianceCount}</span></div>
        <div class="kpi-mini-card"><span class="kpi-mini-label">INELIGIBLE</span><span class="kpi-mini-val text-rose">${ineligibleCount}</span></div>
      </div>

      <!-- Governance Assurance Banner -->
      <div class="import-gov-notice" style="background: rgba(14, 165, 233, 0.08); border: 1px solid rgba(14, 165, 233, 0.3); border-radius: 8px; padding: 0.85rem 1.15rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <strong style="color: #38BDF8; font-size: 0.82rem; display: block; margin-bottom: 0.15rem;">
            STAGE 6 GOVERNANCE: CANONICAL SUPPLIER COST (cost_price_ngn) APPLICATION ONLY
          </strong>
          <span style="font-size: 0.76rem; color: rgba(238, 241, 248, 0.85); line-height: 1.4;">
            Approval and application update purchasing costs ONLY. Retail selling prices (<code>price_ngn</code>), active inventory, and archived products are 100% protected and remain unchanged.
          </span>
        </div>
        <div style="text-align: right; font-size: 0.8rem; background: rgba(0,0,0,0.3); padding: 0.4rem 0.85rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
          <div style="font-size: 0.65rem; color: var(--color-d-text-subtle); text-transform: uppercase; font-weight: 700;">Est. Selected Net Cost Shift</div>
          <strong style="color: ${selectedCostSumDiff >= 0 ? '#F87171' : '#34D399'}; font-family: monospace; font-size: 0.95rem;">
            ${selectedCostSumDiff >= 0 ? '+' : ''}${formatNaira(selectedCostSumDiff)}
          </strong>
        </div>
      </div>

      <!-- Action & Filter Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem;">
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <button type="button" id="btn-select-all-eligible" class="btn-table-action" style="padding: 0.4rem 0.75rem; font-size: 0.76rem;" ${isTerminal || isApplying ? 'disabled' : ''}>
            Select All Eligible (${eligibleCount})
          </button>
          <button type="button" id="btn-deselect-all" class="btn-table-action" style="padding: 0.4rem 0.75rem; font-size: 0.76rem;" ${isTerminal || isApplying ? 'disabled' : ''}>
            Deselect All
          </button>
        </div>

        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <label for="select-review-filter" style="font-size: 0.76rem; color: var(--color-d-text-muted);">Filter View:</label>
          <select id="select-review-filter" class="form-input" style="padding: 0.35rem 0.75rem; font-size: 0.76rem; width: auto; background:#0B1324;">
            <option value="all" ${activeReviewState.currentFilter === 'all' ? 'selected' : ''}>All Rows (${totalRows})</option>
            <option value="eligible" ${activeReviewState.currentFilter === 'eligible' ? 'selected' : ''}>Eligible for Approval (${eligibleCount})</option>
            <option value="approved" ${activeReviewState.currentFilter === 'approved' ? 'selected' : ''}>Approved Rows (${approvedCount})</option>
            <option value="high-variance" ${activeReviewState.currentFilter === 'high-variance' ? 'selected' : ''}>High Variance &gt;30% (${highVarianceCount})</option>
            <option value="ineligible" ${activeReviewState.currentFilter === 'ineligible' ? 'selected' : ''}>Ineligible / Inactive (${ineligibleCount})</option>
          </select>
        </div>
      </div>

      <!-- Review Rows Table -->
      <div class="table-responsive" style="max-height: 400px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
        <table class="data-table" style="font-size: 0.8rem;">
          <thead>
            <tr>
              <th style="width: 38px; text-align: center;">
                <input type="checkbox" id="header-select-all-check" class="review-checkbox" title="Toggle all eligible rows" ${isTerminal || isApplying ? 'disabled' : ''}>
              </th>
              <th style="width: 40px;">#</th>
              <th>Product &amp; SKU Match</th>
              <th>Current Cost</th>
              <th>Proposed Cost</th>
              <th>Absolute Diff</th>
              <th>% Diff</th>
              <th>Retail Selling Price</th>
              <th>Approval</th>
              <th>Application</th>
            </tr>
          </thead>
          <tbody id="review-rows-tbody">
            ${displayedRows.map(r => {
              const isChecked = activeReviewState.selectedRowNumbers.has(r.row_number);
              const isEligible = r.is_eligible_for_approval;
              const isApplied = r.application_status === 'applied';
              const hasHighVariance = r.variance_warning && r.variance_warning !== 'NONE';

              let rowClass = '';
              if (!isEligible) rowClass = 'tr-ineligible';
              else if (isApplied) rowClass = 'tr-applied';
              else if (r.approval_status === 'approved') rowClass = 'tr-approved';
              else if (hasHighVariance) rowClass = 'tr-high-variance';

              let diffPill = '<span class="diff-pill diff-neutral">₦0</span>';
              if (r.cost_diff_ngn !== null && r.cost_diff_ngn !== undefined) {
                if (r.cost_diff_ngn > 0) {
                  diffPill = `<span class="diff-pill diff-increase">+${formatNaira(r.cost_diff_ngn)}</span>`;
                } else if (r.cost_diff_ngn < 0) {
                  diffPill = `<span class="diff-pill diff-decrease">-${formatNaira(Math.abs(r.cost_diff_ngn))}</span>`;
                }
              }

              let percentPill = '<span class="diff-pill diff-neutral">0%</span>';
              if (r.cost_diff_percent !== null && r.cost_diff_percent !== undefined) {
                const pSign = r.cost_diff_percent > 0 ? '+' : '';
                percentPill = `<span class="diff-pill ${r.cost_diff_percent > 0 ? 'diff-increase' : (r.cost_diff_percent < 0 ? 'diff-decrease' : 'diff-neutral')}">${pSign}${r.cost_diff_percent}%</span>`;
              }

              return `
                <tr class="${rowClass}">
                  <td style="text-align: center;">
                    <input type="checkbox" class="review-checkbox row-select-checkbox" data-row-number="${r.row_number}" ${isChecked ? 'checked' : ''} ${!isEligible || isApplied || isTerminal || isApplying ? 'disabled' : ''}>
                  </td>
                  <td style="color: var(--color-d-text-muted); font-size: 0.75rem;">${r.row_number}</td>
                  <td>
                    <div style="font-weight: 700; color: #FFFFFF; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(r.matched_product_name || r.raw_name || '—')}">
                      ${escapeHtml(r.matched_product_name || r.raw_name || '—')}
                    </div>
                    <div style="display: flex; gap: 0.4rem; font-size: 0.72rem; align-items: center; margin-top: 0.15rem;">
                      ${r.matched_product_sku ? `<span style="color: #34D399; font-family: monospace; font-weight: 600;">SKU: ${escapeHtml(r.matched_product_sku)}</span>` : '<span style="color: #F87171;">Unmatched</span>'}
                      <span style="color: var(--color-d-text-subtle);">• In File: ${escapeHtml(r.raw_sku || '—')}</span>
                    </div>
                  </td>
                  <td style="color: var(--color-d-text-muted); font-family: monospace;">
                    ${r.matched_current_cost_ngn ? formatNaira(r.matched_current_cost_ngn) : '—'}
                  </td>
                  <td style="font-weight: 800; color: #FFFFFF; font-family: monospace;">
                    ${r.normalized_cost_ngn ? formatNaira(r.normalized_cost_ngn) : '—'}
                  </td>
                  <td>${diffPill}</td>
                  <td>
                    <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                      ${percentPill}
                      ${hasHighVariance ? `<span class="badge-variance-warning">⚠ ${escapeHtml(r.variance_warning)}</span>` : ''}
                    </div>
                  </td>
                  <td>
                    <div style="font-family: monospace; color: #FFFFFF; font-size: 0.78rem;">
                      ${r.matched_selling_price_ngn ? formatNaira(r.matched_selling_price_ngn) : '—'}
                    </div>
                    <span style="font-size: 0.65rem; color: #38BDF8;">Unchanged</span>
                  </td>
                  <td>
                    <span class="badge-status badge-${r.approval_status || 'unapproved'}">
                      ${(r.approval_status || 'unapproved').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span class="badge-status badge-${r.application_status || 'pending'}">
                      ${(r.application_status || 'pending').toUpperCase()}
                    </span>
                    ${r.application_error ? `<div style="font-size:0.68rem; color:#F87171; margin-top:0.2rem; max-width:180px;">${escapeHtml(r.application_error)}</div>` : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- High Variance Acknowledgment Container -->
      <div id="review-variance-ack-container" class="variance-ack-box" style="display: none;">
        <input type="checkbox" id="check-ack-high-variance" class="review-checkbox" style="margin-top: 0.15rem;">
        <div>
          <strong style="color: #FBBF24; font-size: 0.85rem; display: block; margin-bottom: 0.2rem;">
            Elevated Variance Acknowledgment Required (&gt; 30% Cost Change)
          </strong>
          <span style="font-size: 0.78rem; color: rgba(238, 241, 248, 0.88); line-height: 1.45;">
            One or more selected rows involve significant supplier cost shifts exceeding 30%. I confirm that I have verified distributor wholesale pricing and explicitly authorize approval of these high-variance items.
          </span>
        </div>
      </div>
    `;

    // Hook filter dropdown
    const filterSelect = document.getElementById('select-review-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        activeReviewState.currentFilter = e.target.value;
        renderReviewModalView();
      });
    }

    // Hook Select All / Deselect All buttons
    const btnSelectAll = document.getElementById('btn-select-all-eligible');
    if (btnSelectAll) {
      btnSelectAll.addEventListener('click', () => {
        rows.filter(r => r.is_eligible_for_approval && r.application_status !== 'applied').forEach(r => activeReviewState.selectedRowNumbers.add(r.row_number));
        renderReviewModalView();
      });
    }

    const btnDeselectAll = document.getElementById('btn-deselect-all');
    if (btnDeselectAll) {
      btnDeselectAll.addEventListener('click', () => {
        activeReviewState.selectedRowNumbers.clear();
        renderReviewModalView();
      });
    }

    // Hook Header Checkbox
    const headerCheck = document.getElementById('header-select-all-check');
    if (headerCheck) {
      const eligiblePending = rows.filter(r => r.is_eligible_for_approval && r.application_status !== 'applied');
      headerCheck.checked = eligiblePending.length > 0 && eligiblePending.every(r => activeReviewState.selectedRowNumbers.has(r.row_number));
      headerCheck.addEventListener('change', (e) => {
        if (e.target.checked) {
          eligiblePending.forEach(r => activeReviewState.selectedRowNumbers.add(r.row_number));
        } else {
          activeReviewState.selectedRowNumbers.clear();
        }
        renderReviewModalView();
      });
    }

    // Hook Individual Row Checkboxes
    const rowCheckboxes = bodyEl.querySelectorAll('.row-select-checkbox');
    rowCheckboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        const rowNum = Number(e.target.dataset.rowNumber);
        if (e.target.checked) {
          activeReviewState.selectedRowNumbers.add(rowNum);
        } else {
          activeReviewState.selectedRowNumbers.delete(rowNum);
        }
        updateReviewFooterUI();
      });
    });

    updateReviewFooterUI();
  }

  function updateReviewFooterUI() {
    const item = activeReviewState.importDoc;
    if (!item) return;

    const rows = item.rows_preview || [];
    const eligibleCount = rows.filter(r => r.is_eligible_for_approval).length;
    const selectedCount = activeReviewState.selectedRowNumbers.size;

    // Update KPI & Summary text
    const kpiVal = document.getElementById('kpi-val-selected');
    if (kpiVal) kpiVal.textContent = selectedCount;

    const sumEl = document.getElementById('review-selection-summary');
    if (sumEl) sumEl.textContent = `${selectedCount} of ${eligibleCount} eligible rows selected`;

    // Check for high variance in currently selected rows
    let selectedHasHighVariance = false;
    rows.forEach(r => {
      if (activeReviewState.selectedRowNumbers.has(r.row_number) && r.variance_warning && r.variance_warning !== 'NONE') {
        selectedHasHighVariance = true;
      }
    });

    const ackContainer = document.getElementById('review-variance-ack-container');
    if (ackContainer) {
      ackContainer.style.display = selectedHasHighVariance ? 'flex' : 'none';
    }

    const isTerminal = item.status === 'successfully_applied' || item.status === 'cancelled';
    const isApplying = item.status === 'applying';

    // Button: Approve Selected Rows
    const btnApprove = document.getElementById('btn-review-approve-selected');
    if (btnApprove) {
      btnApprove.disabled = selectedCount === 0 || isTerminal || isApplying;
      btnApprove.onclick = handleReviewApproveAction;
    }

    // Button: Apply Approved Prices
    const btnApply = document.getElementById('btn-review-apply-approved');
    const approvedPendingCount = rows.filter(r => r.approval_status === 'approved' && r.application_status !== 'applied').length;
    if (btnApply) {
      btnApply.disabled = approvedPendingCount === 0 || isTerminal || isApplying;
      btnApply.onclick = () => openApplyConfirmModal(approvedPendingCount);
    }

    // Button: Cancel Import
    const btnCancel = document.getElementById('btn-review-cancel-import');
    if (btnCancel) {
      btnCancel.disabled = isTerminal || isApplying;
      btnCancel.onclick = handleReviewCancelAction;
    }
  }

  async function handleReviewApproveAction() {
    const item = activeReviewState.importDoc;
    if (!item) return;

    const btnApprove = document.getElementById('btn-review-approve-selected');
    const selectedArray = Array.from(activeReviewState.selectedRowNumbers);

    if (selectedArray.length === 0) {
      alert('Please select at least one eligible row to approve.');
      return;
    }

    // Check variance acknowledgement
    const rows = item.rows_preview || [];
    const hasHighVariance = rows.some(r => activeReviewState.selectedRowNumbers.has(r.row_number) && r.variance_warning && r.variance_warning !== 'NONE');
    const ackCheckbox = document.getElementById('check-ack-high-variance');
    const acknowledged = ackCheckbox ? ackCheckbox.checked : false;

    if (hasHighVariance && !acknowledged) {
      alert('High variance (>30%) detected on selected rows. Please review and check the elevated variance acknowledgment box before approving.');
      if (ackCheckbox) ackCheckbox.focus();
      return;
    }

    if (btnApprove) {
      btnApprove.disabled = true;
      btnApprove.innerHTML = '<div class="loading-spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:0.4rem;"></div> Approving...';
    }

    try {
      const res = await apiFetch(`/api/admin/price-imports/${item._id || item.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedRowNumbers: selectedArray,
          acknowledgeHighVariance: acknowledged,
          notes: `Explicit administrator approval for ${selectedArray.length} items.`
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve rows');
      }

      // Re-load review state to refresh fresh row statuses
      await openImportReviewModal(item._id || item.id);
      loadRecentImportsSummary();
      loadImportHistoryModule(importHistoryState.page);
    } catch (err) {
      alert(`Approval error: ${err.message}`);
      if (btnApprove) {
        btnApprove.disabled = false;
        btnApprove.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>Approve Selected Rows</span>';
      }
    }
  }

  function openApplyConfirmModal(approvedCount) {
    const confirmModal = document.getElementById('price-import-apply-confirm-modal');
    const countEl = document.getElementById('apply-confirm-count');
    const btnExecute = document.getElementById('btn-execute-apply-confirmed');

    if (!confirmModal) return;
    if (countEl) countEl.textContent = `${approvedCount} product(s)`;

    if (btnExecute) {
      btnExecute.disabled = false;
      btnExecute.textContent = 'Execute Application →';
      btnExecute.onclick = () => executeApplication();
    }

    confirmModal.showModal();
  }

  async function executeApplication() {
    const item = activeReviewState.importDoc;
    const confirmModal = document.getElementById('price-import-apply-confirm-modal');
    const btnExecute = document.getElementById('btn-execute-apply-confirmed');

    if (!item) return;

    if (btnExecute) {
      btnExecute.disabled = true;
      btnExecute.innerHTML = '<div class="loading-spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:0.4rem;"></div> Applying supplier costs...';
    }

    try {
      const res = await apiFetch(`/api/admin/price-imports/${item._id || item.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply supplier prices');
      }

      if (confirmModal) confirmModal.close();

      // Refresh view with updated state
      await openImportReviewModal(item._id || item.id);
      loadRecentImportsSummary();
      loadImportHistoryModule(importHistoryState.page);

      alert(`Application Complete!\nSuccessfully applied: ${data.appliedCount} product(s).\nFailed: ${data.failedCount} product(s).\n\nRetail selling prices and inventory stock remain strictly unchanged.`);
    } catch (err) {
      alert(`Application error: ${err.message}`);
      if (btnExecute) {
        btnExecute.disabled = false;
        btnExecute.textContent = 'Execute Application →';
      }
    }
  }

  async function handleReviewCancelAction() {
    const item = activeReviewState.importDoc;
    if (!item) return;

    const reason = prompt(`Cancel supplier price import "${item.filename}"?\nPlease enter a cancellation reason:`, 'Administrative decision / superseded price list');
    if (reason === null) return; // User cancelled prompt

    try {
      const res = await apiFetch(`/api/admin/price-imports/${item._id || item.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Cancelled by administrator' })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel import');
      }

      await openImportReviewModal(item._id || item.id);
      loadRecentImportsSummary();
      loadImportHistoryModule(importHistoryState.page);
    } catch (err) {
      alert(`Cancellation error: ${err.message}`);
    }
  }

  // Global hooks for inline event handlers
  window.adminOpenReview = openImportReviewModal;
  window.adminInspectImport = openImportReviewModal;
  window.adminGoHistoryPage = (p) => loadImportHistoryModule(p);

  // Utilities
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Run on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
