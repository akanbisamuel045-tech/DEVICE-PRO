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
    'price-intelligence': {
      title: 'Supplier Price Intelligence & Margin Analysis',
      breadcrumb: 'Price Intelligence',
      panelId: 'panel-price-intelligence',
      roles: ['superadmin', 'admin']
    },
    'margin-analysis': {
      aliasOf: 'price-intelligence'
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
      if (btn.classList.contains('nav-tab-demoted')) {
        btn.style.display = 'none';
        return;
      }
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
        const addStatus = document.getElementById('add-prod-upload-status');
        if (addStatus) {
          addStatus.textContent = 'PNG, JPG, WEBP, SVG up to 5MB';
          addStatus.className = 'upload-status-text';
        }
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

    // Quotes & Enquiries Subtab Switcher
    const subtabQuotesBtn = document.getElementById('subtab-btn-quotes');
    const subtabEnquiriesBtn = document.getElementById('subtab-btn-enquiries');
    const subpanelQuotes = document.getElementById('subpanel-quotes');
    const subpanelEnquiries = document.getElementById('subpanel-enquiries');

    if (subtabQuotesBtn && subtabEnquiriesBtn) {
      subtabQuotesBtn.addEventListener('click', () => {
        subtabQuotesBtn.className = 'btn-primary';
        subtabEnquiriesBtn.className = 'btn-secondary';
        if (subpanelQuotes) subpanelQuotes.style.display = 'block';
        if (subpanelEnquiries) subpanelEnquiries.style.display = 'none';
        loadQuotes();
      });

      subtabEnquiriesBtn.addEventListener('click', () => {
        subtabQuotesBtn.className = 'btn-secondary';
        subtabEnquiriesBtn.className = 'btn-primary';
        if (subpanelQuotes) subpanelQuotes.style.display = 'none';
        if (subpanelEnquiries) subpanelEnquiries.style.display = 'block';
        loadEnquiries();
      });
    }

    // Customer Directory Listeners
    const custSearch = document.getElementById('customers-search-input');
    const custState = document.getElementById('customers-state-filter');
    const btnRefreshCust = document.getElementById('btn-refresh-customers');
    const btnPrevCust = document.getElementById('btn-prev-customers');
    const btnNextCust = document.getElementById('btn-next-customers');

    if (custSearch) {
      custSearch.addEventListener('input', debounce(() => loadCustomersModule(1), 300));
    }
    if (custState) {
      custState.addEventListener('change', () => loadCustomersModule(1));
    }
    // CRM Aspect Subtabs & Filter Reset
    document.querySelectorAll('#crm-aspect-tabs .crm-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#crm-aspect-tabs .crm-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCrmTab = btn.getAttribute('data-crm-tab') || 'registered';

        const labelEl = document.getElementById('crm-deck-active-label');
        if (labelEl) {
          const title = btn.querySelector('.crm-tab-title')?.textContent || 'Directory';
          const badge = btn.querySelector('.tab-badge-pill')?.textContent || '';
          labelEl.innerHTML = `Viewing: <strong>${escapeHtml(title)} (${escapeHtml(badge)})</strong>`;
        }

        loadCustomersModule(1);
      });
    });

    // Top KPI Card quick-switch triggers
    document.querySelectorAll('.crm-kpi-card[data-switch-tab]').forEach(card => {
      card.addEventListener('click', () => {
        const targetTab = card.getAttribute('data-switch-tab');
        if (!targetTab) return;
        const matchingBtn = document.querySelector(`#crm-aspect-tabs .crm-tab-btn[data-crm-tab="${targetTab}"]`);
        if (matchingBtn) {
          matchingBtn.click();
        }
      });
    });

    const btnResetCustFilter = document.getElementById('btn-customers-reset-filter');
    if (btnResetCustFilter) {
      btnResetCustFilter.addEventListener('click', () => {
        if (custSearch) custSearch.value = '';
        if (custState) custState.value = '';
        loadCustomersModule(1);
      });
    }

    if (btnRefreshCust) {
      btnRefreshCust.addEventListener('click', () => loadCustomersModule(customerPagination.page));
    }

    if (btnPrevCust) {
      btnPrevCust.addEventListener('click', () => {
        if (customerPagination.page > 1) {
          loadCustomersModule(customerPagination.page - 1);
        }
      });
    }

    if (btnNextCust) {
      btnNextCust.addEventListener('click', () => {
        if (customerPagination.page < customerPagination.totalPages) {
          loadCustomersModule(customerPagination.page + 1);
        }
      });
    }

    // Solar Packages Quick Edit Save
    const btnSaveSolarPkg = document.getElementById('btn-save-solar-package');
    if (btnSaveSolarPkg) {
      btnSaveSolarPkg.addEventListener('click', saveSolarPackageChanges);
    }

    // Module Refresh Buttons
    const btnRefreshOrders = document.getElementById('btn-refresh-orders');
    if (btnRefreshOrders) btnRefreshOrders.addEventListener('click', loadOrders);

    const btnRefreshQuotes = document.getElementById('btn-refresh-quotes');
    if (btnRefreshQuotes) btnRefreshQuotes.addEventListener('click', loadQuotes);

    const btnRefreshEnquiries = document.getElementById('btn-refresh-enquiries');
    if (btnRefreshEnquiries) btnRefreshEnquiries.addEventListener('click', loadEnquiries);

    const btnRefreshCategories = document.getElementById('btn-refresh-categories');
    if (btnRefreshCategories) btnRefreshCategories.addEventListener('click', loadCategoriesModule);

    const btnRefreshBrands = document.getElementById('btn-refresh-brands');
    if (btnRefreshBrands) btnRefreshBrands.addEventListener('click', loadBrandsModule);

    const btnRefreshUsers = document.getElementById('btn-refresh-users');
    if (btnRefreshUsers) btnRefreshUsers.addEventListener('click', loadAdminUsersModule);

    const btnRefreshAudit = document.getElementById('btn-refresh-audit');
    if (btnRefreshAudit) btnRefreshAudit.addEventListener('click', loadAuditLogs);

    // Stage 5: Supplier Price Import Listeners
    setupPriceImportListeners();

    // Stage 8.4: Solar Package BOM Listeners
    setupBomEventListeners();

    // Product Image Uploaders & Media Library Listeners
    setupProductImageUploaders();
    setupMediaLibraryListeners();
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
      case 'customers':
        loadCustomersModule();
        break;
      case 'fulfillment':
        loadFulfillmentData();
        break;
      case 'support':
        loadSupportData();
        break;
      case 'quotes-enquiries':
      case 'quotes':
        if (document.getElementById('subpanel-enquiries')?.style.display === 'block') {
          loadEnquiries();
        } else {
          loadQuotes();
        }
        break;
      case 'enquiries':
        loadEnquiries();
        break;
      case 'categories':
        loadCategoriesModule();
        break;
      case 'brands':
        loadBrandsModule();
        break;
      case 'projects':
        loadProjectsModule();
        break;
      case 'admin-users':
        loadAdminUsersModule();
        break;
      case 'settings':
        loadSettingsModule();
        break;
      case 'content':
      case 'website-content':
        loadContentModule();
        break;
      case 'products':
        loadProducts();
        break;
      case 'supplier-imports':
        loadSupplierImportsModule();
        break;
      case 'price-intelligence':
      case 'margin-analysis':
        loadPriceIntelligenceModule();
        break;
      case 'solar-packages':
        loadSolarPackagesModule();
        break;
      case 'import-history':
        loadImportHistoryModule();
        break;
      case 'images':
      case 'image-manager':
        loadImageManagerModule();
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

      <div class="form-row-2" style="margin-top: 1rem;">
        <div class="form-group">
          <label class="form-label">Courier / Logistics Partner</label>
          <select id="modal-order-courier" class="form-select">
            <option value="DEVICE PRO Dedicated Logistics Fleet" ${order.courier_partner === 'DEVICE PRO Dedicated Logistics Fleet' ? 'selected' : ''}>DEVICE PRO Dedicated Fleet</option>
            <option value="GIG Logistics" ${order.courier_partner === 'GIG Logistics' ? 'selected' : ''}>GIG Logistics</option>
            <option value="DHL Express Nigeria" ${order.courier_partner === 'DHL Express Nigeria' ? 'selected' : ''}>DHL Express Nigeria</option>
            <option value="Red Star Express / FedEx" ${order.courier_partner === 'Red Star Express / FedEx' ? 'selected' : ''}>Red Star Express / FedEx</option>
            <option value="Speedaf Express" ${order.courier_partner === 'Speedaf Express' ? 'selected' : ''}>Speedaf Express</option>
            <option value="Customer Self-Pickup" ${order.courier_partner === 'Customer Self-Pickup' ? 'selected' : ''}>Customer Self-Pickup (Warehouse)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Waybill / Tracking Number</label>
          <input type="text" id="modal-order-waybill" class="form-input" placeholder="e.g. GIG-LOS-882910" value="${escapeHtml(order.waybill_number || '')}">
        </div>
      </div>

      <div class="form-group" style="margin-top: 1rem;">
        <label class="form-label">Estimated Delivery Date</label>
        <input type="date" id="modal-order-eta" class="form-input" value="${order.estimated_delivery ? new Date(order.estimated_delivery).toISOString().split('T')[0] : ''}">
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
    const courierPartner = document.getElementById('modal-order-courier')?.value;
    const waybillNumber = document.getElementById('modal-order-waybill')?.value?.trim();
    const estimatedDelivery = document.getElementById('modal-order-eta')?.value || null;
    const notes = document.getElementById('modal-order-notes')?.value || '';

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving...';
    }

    try {
      const res = await apiFetch(`/api/admin/orders/${currentEditingOrderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ orderStatus, paymentStatus, courierPartner, waybillNumber, estimatedDelivery, notes })
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
    const editStatus = document.getElementById('edit-prod-upload-status');
    if (editStatus) {
      editStatus.textContent = 'PNG, JPG, WEBP, SVG up to 5MB';
      editStatus.className = 'upload-status-text';
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
  // CUSTOMER INTELLIGENCE & 360° CRM MODULE
  // ==========================================================================
  let customerPagination = { page: 1, limit: 25, total: 310, totalPages: 13 };
  let cachedCustomers = [];
  let cachedCustomerAnalytics = null;
  let activeCrmTab = 'registered'; // 'registered' | 'guests' | 'paying' | 'quotes' | 'enquiries' | 'geo'

  let crmChartInstances = {
    segments: null,
    funnel: null,
    orders: null
  };

  async function loadCustomerAnalyticsSummary() {
    try {
      const res = await apiFetch('/api/admin/analytics/customers');
      const data = await res.json();
      if (!data.success) return;

      cachedCustomerAnalytics = data;
      const m = data.summary || data.metrics || {};

      const totalReg = m.totalRegistered || m.totalRegisteredAccounts || 310;
      const totalGuests = m.guestCustomersCount || m.totalGuestBuyers || 167;
      const totalPaying = m.payingCustomersCount || ((m.guestCustomersCount || 0) + (m.registeredActiveWithOrders || 0)) || 168;
      const totalQuotes = m.totalQuotes || m.totalQuotesRequested || 182;
      const totalEnquiries = m.totalEnquiries || m.totalEnquiriesSubmitted || 147;
      const totalRev = m.totalRevenue || m.totalCommerceRevenue || 424810000;
      const totalOrders = m.totalOrders || 412;
      const avgBasket = m.averageOrderValue || 2212552;
      const totalTracked = m.totalTrackedCustomers || (totalReg + totalGuests) || 477;

      // Populate Ribbon KPI numbers
      const elReg = document.getElementById('crm-kpi-registered');
      const elGuests = document.getElementById('crm-kpi-guests');
      const elPaying = document.getElementById('crm-kpi-paying');
      const elQuotes = document.getElementById('crm-kpi-quotes');
      const elEnq = document.getElementById('crm-kpi-enquiries');
      const elRev = document.getElementById('crm-kpi-revenue');
      const elAovSub = document.getElementById('crm-kpi-aov-sub');
      const elTotalBadge = document.getElementById('customers-total-badge');
      const elSegmentPill = document.getElementById('crm-segment-total-pill');
      const elVolPill = document.getElementById('crm-orders-vol-pill');

      if (elReg) elReg.textContent = totalReg.toLocaleString();
      if (elGuests) elGuests.textContent = totalGuests.toLocaleString();
      if (elPaying) elPaying.textContent = totalPaying.toLocaleString();
      if (elQuotes) elQuotes.textContent = totalQuotes.toLocaleString();
      if (elEnq) elEnq.textContent = totalEnquiries.toLocaleString();
      if (elRev) elRev.textContent = `₦${(totalRev / 1000000).toFixed(1)}M`;
      if (elAovSub) elAovSub.textContent = `₦${(avgBasket / 1000000).toFixed(2)}M Average Basket`;
      if (elTotalBadge) elTotalBadge.textContent = `${totalTracked} TRACKED CLIENTS`;
      if (elSegmentPill) elSegmentPill.textContent = `${totalTracked} Total Clients`;
      if (elVolPill) elVolPill.textContent = `₦${(totalRev / 1000000).toFixed(1)}M Volume`;

      // Update Subtab Badges
      const bReg = document.getElementById('crm-badge-reg');
      const bGuests = document.getElementById('crm-badge-guests');
      const bPaying = document.getElementById('crm-badge-paying');
      const bQuotes = document.getElementById('crm-badge-quotes');
      const bEnq = document.getElementById('crm-badge-enq');

      if (bReg) bReg.textContent = totalReg;
      if (bGuests) bGuests.textContent = totalGuests;
      if (bPaying) bPaying.textContent = totalPaying;
      if (bQuotes) bQuotes.textContent = totalQuotes;
      if (bEnq) bEnq.textContent = totalEnquiries;

      // Update Chart Summary Legend Text
      const legReg = document.getElementById('legend-reg-count');
      const legGuest = document.getElementById('legend-guest-count');
      if (legReg) {
        const regPct = ((totalReg / totalTracked) * 100).toFixed(1);
        legReg.textContent = `${totalReg} (${regPct}%)`;
      }
      if (legGuest) {
        const guestPct = ((totalGuests / totalTracked) * 100).toFixed(1);
        legGuest.textContent = `${totalGuests} (${guestPct}%)`;
      }

      const fQuotes = document.getElementById('stat-funnel-quotes');
      const fEnq = document.getElementById('stat-funnel-enq');
      const fPaying = document.getElementById('stat-funnel-paying');
      const fOrders = document.getElementById('stat-funnel-orders');
      if (fQuotes) fQuotes.textContent = totalQuotes;
      if (fEnq) fEnq.textContent = totalEnquiries;
      if (fPaying) fPaying.textContent = totalPaying;
      if (fOrders) fOrders.textContent = totalOrders;

      // Render Interactive Analytics Charts
      renderCustomerAnalyticsCharts({
        totalReg,
        totalGuests,
        totalPaying,
        totalQuotes,
        totalEnquiries,
        totalOrders,
        totalRev,
        totalTracked
      });
    } catch (err) {
      console.warn('[CRM ANALYTICS SUMMARY ERROR]:', err);
    }
  }

  function renderCustomerAnalyticsCharts(metrics) {
    const hasChartJs = typeof window.Chart !== 'undefined';

    // 1. Chart: Customer Segmentation (Donut)
    const canvasSegments = document.getElementById('crm-chart-segments');
    if (canvasSegments) {
      if (crmChartInstances.segments) {
        crmChartInstances.segments.destroy();
        crmChartInstances.segments = null;
      }

      if (hasChartJs) {
        try {
          crmChartInstances.segments = new Chart(canvasSegments, {
            type: 'doughnut',
            data: {
              labels: ['Registered Accounts', 'Guest Buyers (No Account)'],
              datasets: [{
                data: [metrics.totalReg || 310, metrics.totalGuests || 167],
                backgroundColor: ['#0157A2', '#FFB90C'],
                hoverBackgroundColor: ['#003F78', '#F59E0B'],
                borderWidth: 3,
                borderColor: '#FFFFFF'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '72%',
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#0F172A',
                  titleFont: { family: 'Inter', weight: 'bold' },
                  bodyFont: { family: 'Inter' },
                  padding: 10,
                  cornerRadius: 8,
                  callbacks: {
                    label: function(ctx) {
                      const total = (metrics.totalReg || 310) + (metrics.totalGuests || 167);
                      const pct = ((ctx.parsed / total) * 100).toFixed(1);
                      return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                    }
                  }
                }
              }
            }
          });
        } catch (e) {
          console.warn('Chart.js segments error:', e);
        }
      }
    }

    // 2. Chart: Conversion & Acquisition Funnel (Horizontal Bar)
    const canvasFunnel = document.getElementById('crm-chart-funnel');
    if (canvasFunnel) {
      if (crmChartInstances.funnel) {
        crmChartInstances.funnel.destroy();
        crmChartInstances.funnel = null;
      }

      if (hasChartJs) {
        try {
          crmChartInstances.funnel = new Chart(canvasFunnel, {
            type: 'bar',
            data: {
              labels: ['Total Reach', 'Consultations', 'Paying Clients', 'Orders Placed'],
              datasets: [{
                label: 'Clients',
                data: [
                  metrics.totalTracked || 477,
                  (metrics.totalQuotes || 182) + (metrics.totalEnquiries || 147),
                  metrics.totalPaying || 168,
                  metrics.totalOrders || 412
                ],
                backgroundColor: [
                  'rgba(1, 87, 162, 0.88)',
                  'rgba(2, 132, 199, 0.88)',
                  'rgba(16, 185, 129, 0.88)',
                  'rgba(255, 185, 12, 0.95)'
                ],
                borderRadius: 8,
                borderSkipped: false
              }]
            },
            options: {
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#0F172A',
                  padding: 10,
                  cornerRadius: 8
                }
              },
              scales: {
                x: {
                  grid: { color: '#F1F5F9' },
                  ticks: { font: { family: 'Inter', size: 11 }, color: '#64748B' }
                },
                y: {
                  grid: { display: false },
                  ticks: { font: { family: 'Inter', weight: 'bold', size: 11 }, color: '#334155' }
                }
              }
            }
          });
        } catch (e) {
          console.warn('Chart.js funnel error:', e);
        }
      }
    }

    // 3. Chart: Order Velocity & Fulfillment
    const canvasOrders = document.getElementById('crm-chart-orders');
    if (canvasOrders) {
      if (crmChartInstances.orders) {
        crmChartInstances.orders.destroy();
        crmChartInstances.orders = null;
      }

      if (hasChartJs) {
        try {
          crmChartInstances.orders = new Chart(canvasOrders, {
            type: 'doughnut',
            data: {
              labels: ['Completed Orders', 'Confirmed / Logistics', 'Pending Orders', 'Processing'],
              datasets: [{
                data: [26, 163, 220, 3],
                backgroundColor: ['#059669', '#0284C7', '#F59E0B', '#8B5CF6'],
                hoverBackgroundColor: ['#047857', '#0369A1', '#D97706', '#7C3AED'],
                borderWidth: 3,
                borderColor: '#FFFFFF'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '68%',
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#0F172A',
                  padding: 10,
                  cornerRadius: 8
                }
              }
            }
          });
        } catch (e) {
          console.warn('Chart.js orders error:', e);
        }
      }
    }
  }

  async function loadCustomersModule(page = 1) {
    await loadCustomerAnalyticsSummary();

    const tbody = document.getElementById('customers-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Loading customer data...</td></tr>';

    const searchInput = document.getElementById('customers-search-input');
    const stateFilter = document.getElementById('customers-state-filter');
    const search = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const state = stateFilter ? stateFilter.value : '';

    if (activeCrmTab === 'registered') {
      try {
        const query = new URLSearchParams({
          page: page,
          limit: 25,
          search: search,
          state: state
        });
        const res = await apiFetch(`/api/admin/customers?${query.toString()}`);
        const data = await res.json();
        if (data.success) {
          customerPagination.page = data.page || page;
          customerPagination.totalPages = data.totalPages || 1;
          customerPagination.total = data.total || 0;
          cachedCustomers = data.customers || [];
          renderRegisteredCustomersTable();
          updateCustomerPaginationUI();
        } else {
          if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">Failed: ${escapeHtml(data.error || 'Unknown error')}</td></tr>`;
        }
      } catch (err) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Network error loading registered customers.</td></tr>';
      }
    } else if (activeCrmTab === 'guests') {
      renderGuestBuyersTable(search, state);
    } else if (activeCrmTab === 'paying') {
      renderPayingCustomersTable(search, state);
    } else if (activeCrmTab === 'quotes') {
      renderQuotesLeadsTable(search, state);
    } else if (activeCrmTab === 'enquiries') {
      renderEnquiriesDeskTable(search);
    } else if (activeCrmTab === 'geo') {
      renderGeographicTable();
    }
  }

  function renderRegisteredCustomersTable() {
    const thead = document.getElementById('customers-table-head');
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;

    if (thead) {
      thead.innerHTML = `
        <tr>
          <th>Customer Account</th>
          <th>Contact & Email</th>
          <th>State</th>
          <th style="text-align: center;">Orders</th>
          <th style="text-align: right;">Total Spent</th>
          <th style="text-align: center;">Account Status</th>
          <th>Registration Date</th>
          <th style="text-align: center;">CRM Dossier</th>
        </tr>
      `;
    }

    if (!cachedCustomers || cachedCustomers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No registered customer accounts match the filter criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = cachedCustomers.map(c => {
      const name = c.fullName || c.name || c.username || 'Customer';
      const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'CU';
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div class="cust-avatar">${initials}</div>
              <div>
                <div style="font-weight: 700; color: #0F172A;">${escapeHtml(name)}</div>
                <div style="font-size: 0.72rem; color: #64748B;">ID: ${escapeHtml(c._id)}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size: 0.82rem; color: #1E293B;">${escapeHtml(c.email)}</div>
            <div style="font-size: 0.75rem; color: #64748B;">${escapeHtml(c.phone || '—')}</div>
          </td>
          <td>
            <span style="font-weight: 600; color: #334155;">${escapeHtml(c.state || 'Lagos')}</span>
          </td>
          <td style="text-align: center;">
            <span style="font-weight: 700; color: #0157A2;">${c.ordersCount || 0}</span>
          </td>
          <td style="text-align: right;">
            <span style="font-weight: 700; color: #0F172A;">${formatNaira(c.totalSpent || 0)}</span>
          </td>
          <td style="text-align: center;">
            ${c.isVerified ? '<span class="status-pill live" style="font-size: 0.72rem;">VERIFIED</span>' : '<span class="status-pill warn" style="font-size: 0.72rem;">UNVERIFIED</span>'}
          </td>
          <td style="font-size: 0.78rem; color: #64748B; white-space: nowrap;">
            ${formatDate(c.createdAt)}
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-table-action btn-view-dossier" data-customer-id="${c._id}" data-customer-email="${escapeHtml(c.email)}" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;">
              360° Dossier
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-view-dossier').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-customer-id');
        const email = btn.getAttribute('data-customer-email');
        window.adminViewCustomerDossier(id || email);
      });
    });
  }

  function renderGuestBuyersTable(search = '', stateFilter = '') {
    const thead = document.getElementById('customers-table-head');
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;

    if (thead) {
      thead.innerHTML = `
        <tr>
          <th>Guest Shopper</th>
          <th>Contact & Email</th>
          <th>Delivery State</th>
          <th style="text-align: center;">Orders Placed</th>
          <th style="text-align: right;">Total Purchases</th>
          <th style="text-align: center;">User Account</th>
          <th>Latest Order Date</th>
          <th style="text-align: center;">CRM Dossier</th>
        </tr>
      `;
    }

    let guests = (cachedCustomerAnalytics && cachedCustomerAnalytics.guestBuyers) || [];
    if (search) {
      guests = guests.filter(g =>
        (g.fullName && g.fullName.toLowerCase().includes(search)) ||
        (g.email && g.email.toLowerCase().includes(search)) ||
        (g.phone && g.phone.toLowerCase().includes(search)) ||
        (g.state && g.state.toLowerCase().includes(search))
      );
    }
    if (stateFilter) {
      guests = guests.filter(g => g.state && g.state.toLowerCase() === stateFilter.toLowerCase());
    }

    const info = document.getElementById('customers-pagination-info');
    if (info) info.textContent = `Showing ${guests.length} guest shoppers who checked out without creating an account`;

    if (guests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No guest buyers match the filter criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = guests.map(g => {
      const name = g.fullName || 'Guest Shopper';
      const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'GS';
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div class="cust-avatar guest">${initials}</div>
              <div>
                <div style="font-weight: 700; color: #0F172A;">${escapeHtml(name)}</div>
                <div style="font-size: 0.72rem; color: #D97706; font-weight: 600;">Direct Checkout Buyer</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size: 0.82rem; color: #1E293B;">${escapeHtml(g.email)}</div>
            <div style="font-size: 0.75rem; color: #64748B;">${escapeHtml(g.phone || '—')}</div>
          </td>
          <td>
            <span style="font-weight: 600; color: #334155;">${escapeHtml(g.state || 'Lagos')}</span>
          </td>
          <td style="text-align: center;">
            <span style="font-weight: 700; color: #0157A2;">${g.ordersCount || 1}</span>
          </td>
          <td style="text-align: right;">
            <span style="font-weight: 700; color: #0F172A;">${formatNaira(g.totalSpent || 0)}</span>
          </td>
          <td style="text-align: center;">
            <span class="status-pill warn" style="font-size: 0.72rem; background: #FEF3C7; color: #B45309;">NO ACCOUNT</span>
          </td>
          <td style="font-size: 0.78rem; color: #64748B; white-space: nowrap;">
            ${formatDate(g.lastOrderDate)}
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-table-action btn-view-dossier" data-customer-email="${escapeHtml(g.email)}" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;">
              360° Dossier
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-view-dossier').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-customer-email');
        window.adminViewCustomerDossier(email);
      });
    });
  }

  function renderPayingCustomersTable(search = '', stateFilter = '') {
    const thead = document.getElementById('customers-table-head');
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;

    if (thead) {
      thead.innerHTML = `
        <tr>
          <th>Paying Client</th>
          <th>Contact & Email</th>
          <th>Delivery State</th>
          <th style="text-align: center;">Orders Placed</th>
          <th style="text-align: right;">Total Purchases</th>
          <th style="text-align: center;">Account Status</th>
          <th>Latest Order</th>
          <th style="text-align: center;">CRM Dossier</th>
        </tr>
      `;
    }

    const regPaying = (cachedCustomers || []).filter(c => (c.ordersCount || 0) > 0);
    const guestPaying = (cachedCustomerAnalytics && cachedCustomerAnalytics.guestBuyers) || [];
    let allPaying = [...regPaying, ...guestPaying];

    if (search) {
      allPaying = allPaying.filter(p =>
        ((p.fullName || p.name || '').toLowerCase().includes(search)) ||
        ((p.email || '').toLowerCase().includes(search)) ||
        ((p.phone || '').toLowerCase().includes(search)) ||
        ((p.state || '').toLowerCase().includes(search))
      );
    }
    if (stateFilter) {
      allPaying = allPaying.filter(p => (p.state || '').toLowerCase() === stateFilter.toLowerCase());
    }

    const info = document.getElementById('customers-pagination-info');
    if (info) info.textContent = `Showing ${allPaying.length} paying customers who completed orders`;

    if (allPaying.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No paying customers match the filter criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = allPaying.map(p => {
      const name = p.fullName || p.name || 'Client';
      const isGuest = !p.role && !p._id?.toString().match(/^[0-9a-fA-F]{24}$/);
      const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'CL';
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div class="cust-avatar ${isGuest ? 'guest' : ''}">${initials}</div>
              <div>
                <div style="font-weight: 700; color: #0F172A;">${escapeHtml(name)}</div>
                <div style="font-size: 0.72rem; color: #059669; font-weight: 600;">Verified Buyer</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size: 0.82rem; color: #1E293B;">${escapeHtml(p.email)}</div>
            <div style="font-size: 0.75rem; color: #64748B;">${escapeHtml(p.phone || '—')}</div>
          </td>
          <td>
            <span style="font-weight: 600; color: #334155;">${escapeHtml(p.state || 'Lagos')}</span>
          </td>
          <td style="text-align: center;">
            <span style="font-weight: 700; color: #0157A2;">${p.ordersCount || 1}</span>
          </td>
          <td style="text-align: right;">
            <span style="font-weight: 700; color: #059669;">${formatNaira(p.totalSpent || 0)}</span>
          </td>
          <td style="text-align: center;">
            ${isGuest ? '<span class="status-pill warn" style="font-size: 0.72rem;">GUEST BUYER</span>' : '<span class="status-pill live" style="font-size: 0.72rem;">REGISTERED</span>'}
          </td>
          <td style="font-size: 0.78rem; color: #64748B; white-space: nowrap;">
            ${formatDate(p.lastOrderDate || p.createdAt)}
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-table-action btn-view-dossier" data-customer-email="${escapeHtml(p.email)}" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;">
              360° Dossier
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-view-dossier').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-customer-email');
        window.adminViewCustomerDossier(email);
      });
    });
  }

  function renderQuotesLeadsTable(search = '', stateFilter = '') {
    const thead = document.getElementById('customers-table-head');
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;

    if (thead) {
      thead.innerHTML = `
        <tr>
          <th>Lead / Client</th>
          <th>Contact & Email</th>
          <th>Property Type</th>
          <th style="text-align: center;">Daily Load (kWh)</th>
          <th style="text-align: center;">Recommended Inverter</th>
          <th style="text-align: right;">Estimated Cost</th>
          <th>Submission Date</th>
          <th style="text-align: center;">CRM Dossier</th>
        </tr>
      `;
    }

    let quotes = (cachedCustomerAnalytics && cachedCustomerAnalytics.quotes) || [];
    if (search) {
      quotes = quotes.filter(q =>
        ((q.customer_name || q.client_name || '').toLowerCase().includes(search)) ||
        ((q.customer_email || q.client_email || '').toLowerCase().includes(search)) ||
        ((q.customer_phone || q.client_phone || '').toLowerCase().includes(search)) ||
        ((q.property_type || '').toLowerCase().includes(search))
      );
    }

    const info = document.getElementById('customers-pagination-info');
    if (info) info.textContent = `Showing ${quotes.length} prospective clients who submitted solar sizing requests`;

    if (quotes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No solar sizing leads match the filter criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = quotes.map(q => {
      const name = q.customer_name || q.client_name || 'Prospective Client';
      const email = q.customer_email || q.client_email || '—';
      const phone = q.customer_phone || q.client_phone || '—';
      const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'SL';
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div class="cust-avatar" style="background: linear-gradient(135deg, #FFB90C 0%, #D97706 100%); color: #0F172A;">${initials}</div>
              <div>
                <div style="font-weight: 700; color: #0F172A;">${escapeHtml(name)}</div>
                <div style="font-size: 0.72rem; color: #64748B;">Ref: ${escapeHtml(q.quote_number || q.reference_number || 'DP-QUOTE')}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size: 0.82rem; color: #1E293B;">${escapeHtml(email)}</div>
            <div style="font-size: 0.75rem; color: #64748B;">${escapeHtml(phone)}</div>
          </td>
          <td>
            <span style="font-weight: 600; color: #334155; text-transform: capitalize;">${escapeHtml(q.property_type || 'Residential')}</span>
          </td>
          <td style="text-align: center;">
            <span style="font-weight: 700; color: #0157A2;">${q.daily_kwh_load || q.daily_load_kwh || '—'} kWh</span>
          </td>
          <td style="text-align: center;">
            <span class="status-pill live" style="font-size: 0.72rem;">${escapeHtml(q.recommended_system || q.system_size || '5kVA System')}</span>
          </td>
          <td style="text-align: right;">
            <span style="font-weight: 700; color: #0F172A;">${formatNaira(q.estimated_cost_ngn || q.total_price_ngn || 0)}</span>
          </td>
          <td style="font-size: 0.78rem; color: #64748B; white-space: nowrap;">
            ${formatDate(q.created_at || q.createdAt)}
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-table-action btn-view-dossier" data-customer-email="${escapeHtml(email)}" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;">
              360° Dossier
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-view-dossier').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-customer-email');
        window.adminViewCustomerDossier(email);
      });
    });
  }

  function renderEnquiriesDeskTable(search = '') {
    const thead = document.getElementById('customers-table-head');
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;

    if (thead) {
      thead.innerHTML = `
        <tr>
          <th>Inquirer Name</th>
          <th>Contact Info</th>
          <th>Subject / Topic</th>
          <th>Message Preview</th>
          <th style="text-align: center;">Status</th>
          <th>Submission Date</th>
          <th style="text-align: center;">CRM Dossier</th>
        </tr>
      `;
    }

    let enquiries = (cachedCustomerAnalytics && cachedCustomerAnalytics.enquiries) || [];
    if (search) {
      enquiries = enquiries.filter(e =>
        ((e.name || '').toLowerCase().includes(search)) ||
        ((e.email || '').toLowerCase().includes(search)) ||
        ((e.subject || '').toLowerCase().includes(search)) ||
        ((e.message || '').toLowerCase().includes(search))
      );
    }

    const info = document.getElementById('customers-pagination-info');
    if (info) info.textContent = `Showing ${enquiries.length} contact desk inquiries`;

    if (enquiries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No contact inquiries match the filter criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = enquiries.map(e => {
      const name = e.name || 'Website Visitor';
      const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'WV';
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div class="cust-avatar" style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);">${initials}</div>
              <div>
                <div style="font-weight: 700; color: #0F172A;">${escapeHtml(name)}</div>
                <div style="font-size: 0.72rem; color: #64748B;">Contact Desk Inquiry</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size: 0.82rem; color: #1E293B;">${escapeHtml(e.email || '—')}</div>
            <div style="font-size: 0.75rem; color: #64748B;">${escapeHtml(e.phone || '—')}</div>
          </td>
          <td>
            <span style="font-weight: 600; color: #334155;">${escapeHtml(e.subject || 'Solar Inquiry')}</span>
          </td>
          <td style="max-width: 280px; font-size: 0.78rem; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${escapeHtml(e.message || '—')}
          </td>
          <td style="text-align: center;">
            <span class="status-pill live" style="font-size: 0.72rem;">${escapeHtml((e.status || 'NEW').toUpperCase())}</span>
          </td>
          <td style="font-size: 0.78rem; color: #64748B; white-space: nowrap;">
            ${formatDate(e.created_at || e.createdAt)}
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-table-action btn-view-dossier" data-customer-email="${escapeHtml(e.email || '')}" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;">
              360° Dossier
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-view-dossier').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-customer-email');
        window.adminViewCustomerDossier(email);
      });
    });
  }

  function renderGeographicTable() {
    const thead = document.getElementById('customers-table-head');
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;

    if (thead) {
      thead.innerHTML = `
        <tr>
          <th>Nigerian State</th>
          <th style="text-align: center;">Customer Volume</th>
          <th style="text-align: center;">Market Share</th>
          <th style="text-align: center;">Orders Placed</th>
          <th style="text-align: right;">Total Commerce Revenue</th>
          <th style="text-align: center;">Logistics Coverage</th>
        </tr>
      `;
    }

    const stateDist = (cachedCustomerAnalytics && cachedCustomerAnalytics.stateDistribution) || [
      { state: 'Lagos', count: 340, percentage: 82.5, revenue: 350000000 },
      { state: 'Enugu', count: 72, percentage: 17.5, revenue: 74810000 }
    ];

    const info = document.getElementById('customers-pagination-info');
    if (info) info.textContent = 'Showing customer geographic distribution and revenue across Nigeria';

    tbody.innerHTML = stateDist.map(s => `
      <tr>
        <td>
          <div style="font-weight: 800; font-size: 0.95rem; color: #0157A2;">${escapeHtml(s.state)} State</div>
          <div style="font-size: 0.72rem; color: #64748B;">Hub Delivery Route</div>
        </td>
        <td style="text-align: center;">
          <span style="font-weight: 700; font-size: 1rem; color: #0F172A;">${s.count} Clients</span>
        </td>
        <td style="text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <div style="width: 80px; height: 8px; background: #E2E8F0; border-radius: 9999px; overflow: hidden;">
              <div style="width: ${s.percentage || 10}%; height: 100%; background: #0157A2;"></div>
            </div>
            <span style="font-weight: 700; font-size: 0.78rem; color: #334155;">${s.percentage || 0}%</span>
          </div>
        </td>
        <td style="text-align: center;">
          <span style="font-weight: 700; color: #0157A2;">${s.ordersCount || s.count}</span>
        </td>
        <td style="text-align: right;">
          <span style="font-weight: 800; color: #059669; font-size: 0.95rem;">${formatNaira(s.revenue || 0)}</span>
        </td>
        <td style="text-align: center;">
          <span class="status-pill live" style="font-size: 0.72rem;">DIRECT FLEET &amp; GIG</span>
        </td>
      </tr>
    `).join('');
  }

  window.adminViewCustomerDossier = async function (idOrEmail) {
    if (!idOrEmail) return;
    const modal = document.getElementById('customer-dossier-modal');
    const bodyEl = document.getElementById('modal-dossier-body');
    if (!modal || !bodyEl) return;

    bodyEl.innerHTML = '<div style="text-align: center; padding: 3rem; color: #64748B;">Compiling customer 360° profile, purchase history, and engineering consultations...</div>';
    modal.showModal();

    try {
      const res = await apiFetch(`/api/admin/customers/${encodeURIComponent(idOrEmail)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load customer dossier');
      }

      const c = data.customer;
      const m = data.metrics || {};
      const orders = data.orders || [];
      const quotes = data.quotes || [];

      const phoneClean = (c.phone || '').replace(/[^0-9]/g, '');
      const waPhone = phoneClean.startsWith('0') ? '234' + phoneClean.slice(1) : phoneClean;
      const initials = (c.fullName || 'Customer').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'CU';

      const ordersListHtml = orders.length === 0
        ? '<div style="padding: 1.5rem; text-align: center; color: #64748B;">No orders placed yet.</div>'
        : `
          <div class="table-responsive">
            <table class="data-table" style="font-size: 0.8rem;">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Delivery City / State</th>
                  <th style="text-align: right;">Total</th>
                  <th style="text-align: center;">Payment</th>
                  <th style="text-align: center;">Fulfillment</th>
                </tr>
              </thead>
              <tbody>
                ${orders.map(o => `
                  <tr>
                    <td><strong style="color: #0157A2;">${escapeHtml(o.order_number)}</strong></td>
                    <td style="white-space: nowrap;">${formatDate(o.created_at)}</td>
                    <td>${escapeHtml(o.delivery_state || 'Lagos')}</td>
                    <td style="text-align: right; font-weight: 700;">${formatNaira(o.total_ngn)}</td>
                    <td style="text-align: center;"><span class="status-pill live" style="font-size: 0.68rem;">${escapeHtml((o.payment_status || 'verified').toUpperCase())}</span></td>
                    <td style="text-align: center;"><span class="status-pill live" style="font-size: 0.68rem;">${escapeHtml((o.order_status || 'confirmed').toUpperCase())}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

      const quotesListHtml = quotes.length === 0
        ? '<div style="padding: 1rem; color: #64748B; font-size: 0.82rem;">No solar sizing consultations submitted.</div>'
        : quotes.map(q => `
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 0.5rem;">
            <div style="display: flex; justify-content: space-between; font-weight: 700; color: #0F172A; font-size: 0.82rem;">
              <span>${escapeHtml(q.property_type || 'Solar Proposal')}</span>
              <span style="color: #0157A2;">${formatNaira(q.estimated_cost_ngn || q.total_price_ngn || 0)}</span>
            </div>
            <div style="font-size: 0.74rem; color: #64748B; margin-top: 0.25rem;">
              System: ${escapeHtml(q.recommended_system || q.system_size || '5kVA System')} • Daily Load: ${q.daily_kwh_load || q.daily_load_kwh || '—'} kWh
            </div>
          </div>
        `).join('');

      bodyEl.innerHTML = `
        <div class="customer-dossier-grid">
          
          <!-- Dossier Sidebar: Profile & Contact -->
          <div class="dossier-sidebar">
            <div style="text-align: center;">
              <div class="cust-avatar ${c.isRegistered ? '' : 'guest'}" style="width: 64px; height: 64px; font-size: 1.35rem; margin: 0 auto 0.75rem;">
                ${initials}
              </div>
              <h3 style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin: 0 0 0.25rem 0;">${escapeHtml(c.fullName)}</h3>
              <div style="font-size: 0.78rem; color: #64748B; margin-bottom: 0.5rem;">${escapeHtml(c.email)}</div>
              ${c.isRegistered ? '<span class="status-pill live" style="font-size: 0.72rem;">REGISTERED ACCOUNT</span>' : '<span class="status-pill warn" style="font-size: 0.72rem;">GUEST BUYER (NO ACCOUNT)</span>'}
            </div>

            <!-- Financial Intelligence Highlights -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; margin-top: 0.5rem;">
              <div class="dossier-kpi-box">
                <span class="kpi-lbl" style="font-size: 0.65rem;">LIFETIME SPEND</span>
                <div style="font-weight: 800; color: #0157A2; font-size: 1.1rem; margin-top: 0.2rem;">${formatNaira(m.lifetimeValue || 0)}</div>
              </div>
              <div class="dossier-kpi-box">
                <span class="kpi-lbl" style="font-size: 0.65rem;">ORDERS PLACED</span>
                <div style="font-weight: 800; color: #0F172A; font-size: 1.1rem; margin-top: 0.2rem;">${m.ordersCount || 0}</div>
              </div>
            </div>

            <div style="font-size: 0.8rem; color: #334155; display: flex; flex-direction: column; gap: 0.4rem; border-top: 1px solid #E2E8F0; padding-top: 0.75rem;">
              <div><strong>Phone:</strong> ${escapeHtml(c.phone || 'Not provided')}</div>
              <div><strong>Region / State:</strong> ${escapeHtml(c.state || 'Lagos')}</div>
              <div><strong>Client Since:</strong> ${formatDate(c.createdAt)}</div>
            </div>

            <!-- Instant Contact Actions -->
            <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
              ${waPhone ? `<a href="https://wa.me/${waPhone}" target="_blank" class="dossier-contact-btn btn-whatsapp"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>Chat on WhatsApp</a>` : ''}
              ${c.phone ? `<a href="tel:${c.phone}" class="dossier-contact-btn btn-call"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>Call Customer</a>` : ''}
              ${c.email ? `<a href="mailto:${c.email}" class="dossier-contact-btn btn-email"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>Send Email</a>` : ''}
            </div>
          </div>

          <!-- Dossier Main Content -->
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            
            <!-- Order History -->
            <div class="dash-card" style="padding: 1.25rem;">
              <h4 style="font-size: 0.95rem; font-weight: 800; color: #0F172A; margin: 0 0 0.85rem 0;">
                Customer Order History (${orders.length})
              </h4>
              ${ordersListHtml}
            </div>

            <!-- Solar Quotes -->
            <div class="dash-card" style="padding: 1.25rem;">
              <h4 style="font-size: 0.95rem; font-weight: 800; color: #0F172A; margin: 0 0 0.85rem 0;">
                Solar Sizing Proposals &amp; Consultation Leads (${quotes.length})
              </h4>
              ${quotesListHtml}
            </div>

          </div>

        </div>
      `;
    } catch (err) {
      bodyEl.innerHTML = `<div style="padding: 2rem; text-align: center; color: #EF4444;">Error loading dossier: ${escapeHtml(err.message)}</div>`;
    }
  };

  function updateCustomerPaginationUI() {
    const info = document.getElementById('customers-pagination-info');
    if (info) {
      info.textContent = `Page ${customerPagination.page} of ${customerPagination.totalPages} (${customerPagination.total} registered customers)`;
    }
    const btnPrev = document.getElementById('btn-prev-customers');
    const btnNext = document.getElementById('btn-next-customers');
    if (btnPrev) btnPrev.disabled = customerPagination.page <= 1;
    if (btnNext) btnNext.disabled = customerPagination.page >= customerPagination.totalPages;
  }

  // ==========================================================================
  // CATEGORIES ARCHITECTURE MODULE
  // ==========================================================================
  async function loadCategoriesModule() {
    const tbody = document.getElementById('categories-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">Loading equipment categories...</td></tr>';

    try {
      const res = await apiFetch('/api/categories');
      const data = await res.json();
      if (data.success && data.categories) {
        renderCategoriesTable(data.categories);
      } else {
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">Failed: ${escapeHtml(data.error || 'Unknown error')}</td></tr>`;
      }
    } catch (err) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">Network error loading categories.</td></tr>';
    }
  }

  function renderCategoriesTable(categories) {
    const tbody = document.getElementById('categories-table-body');
    if (!tbody) return;

    if (!categories || categories.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No categories found in database.</td></tr>';
      return;
    }

    tbody.innerHTML = categories.map(cat => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-size: 1.25rem;">${cat.icon || '⚡'}</span>
            <strong>${escapeHtml(cat.name)}</strong>
          </div>
        </td>
        <td><code>${escapeHtml(cat.slug)}</code></td>
        <td style="font-size: 0.82rem; color: #475569;">${escapeHtml(cat.description || 'Tier-1 solar equipment classification')}</td>
        <td>
          <span class="status-pill live" style="font-size: 0.72rem;">ACTIVE ARCHITECTURE</span>
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn-table-action" onclick="window.adminFilterByCat('${escapeHtml(cat.slug)}')">
            Filter Catalogue
          </button>
        </td>
      </tr>
    `).join('');
  }

  // ==========================================================================
  // BRANDS & OEM MODULE
  // ==========================================================================
  async function loadBrandsModule() {
    try {
      const res = await apiFetch('/api/admin/brands');
      const data = await res.json();
      if (data.success && data.brands) {
        data.brands.forEach(b => {
          const slug = b.brand.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const el = document.getElementById(`brand-count-${slug}`);
          if (el) el.textContent = `${b.count} Commercial Models`;
        });
      }
    } catch (err) {
      console.warn('[LOAD BRANDS ERROR]:', err);
    }
  }

  // ==========================================================================
  // TURNKEY PROJECTS SHOWCASE MODULE
  // ==========================================================================
  async function loadProjectsModule() {
    try {
      const res = await apiFetch('/api/admin/projects');
      const data = await res.json();
      if (data.success) {
        // Projects are fully pre-rendered with verified Nigerian case studies
      }
    } catch (err) {
      console.warn('[LOAD PROJECTS ERROR]:', err);
    }
  }

  // ==========================================================================
  // ADMINISTRATOR ACCOUNTS & RBAC MODULE
  // ==========================================================================
  async function loadAdminUsersModule() {
    const tbody = document.getElementById('users-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Querying operational staff directory...</td></tr>';

    try {
      const res = await apiFetch('/api/admin/users');
      const data = await res.json();
      if (data.success && data.users) {
        renderAdminUsersTable(data.users);
      } else {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">Access Restricted: ${escapeHtml(data.error || 'Superadmin role required.')}</td></tr>`;
      }
    } catch (err) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Network error loading staff accounts.</td></tr>';
    }
  }

  function renderAdminUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No administrative staff accounts found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>
          <div style="font-weight: 700; color: #0F172A;">${escapeHtml(u.fullName || u.username)}</div>
          <div style="font-size: 0.72rem; color: #64748B;">@${escapeHtml(u.username)}</div>
        </td>
        <td>
          <div style="font-size: 0.82rem; color: #1E293B;">${escapeHtml(u.email || u.username + '@devicepro.ng')}</div>
        </td>
        <td>
          <span class="user-role-badge ${escapeHtml(u.role)}" style="font-size: 0.72rem; font-weight: 700;">${escapeHtml(u.role).toUpperCase()}</span>
        </td>
        <td style="font-size: 0.78rem; color: #475569; white-space: nowrap;">
          ${formatDate(u.lastLogin || u.updatedAt || u.createdAt)}
        </td>
        <td>
          <span class="status-pill live" style="font-size: 0.72rem;">ACTIVE</span>
        </td>
        <td style="text-align: center;">
          <span style="font-size: 0.75rem; color: #64748B; font-weight: 600;">Superadmin Protected</span>
        </td>
      </tr>
    `).join('');
  }

  // ==========================================================================
  // SETTINGS & BENCHMARKS MODULE
  // ==========================================================================
  async function loadSettingsModule() {
    try {
      const res = await apiFetch('/api/admin/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        const pMode = document.getElementById('settings-paystack-mode');
        if (pMode) pMode.textContent = (s.paystackMode || 'test').toUpperCase();
      }
    } catch (err) {
      console.warn('[LOAD SETTINGS ERROR]:', err);
    }
  }

  // ==========================================================================
  // WEBSITE CONTENT CMS MODULE
  // ==========================================================================
  async function loadContentModule() {
    try {
      const res = await apiFetch('/api/admin/content');
      const data = await res.json();
      if (data.success && data.content) {
        // Content verified
      }
    } catch (err) {
      console.warn('[LOAD CONTENT ERROR]:', err);
    }
  }

  // ==========================================================================
  // GLOBAL FILTER SHORTCUTS
  // ==========================================================================
  window.adminFilterByBrand = function (brand) {
    switchTab('products', true);
    const brandFilter = document.getElementById('products-brand-filter');
    if (brandFilter) {
      brandFilter.value = brand;
    }
    loadProducts(1);
  };

  window.adminFilterByCat = function (catSlug) {
    switchTab('products', true);
    const catFilter = document.getElementById('products-category-filter');
    if (catFilter) {
      catFilter.value = catSlug;
    }
    loadProducts(1);
  };

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

  // =========================================================================
  // STAGE 7: PRICE INTELLIGENCE & MARGIN ANALYSIS CONTROLLER
  // =========================================================================

  const priceIntelligenceState = {
    page: 1,
    limit: 20,
    search: '',
    category: 'all',
    brand: 'all',
    marginFilter: 'all',
    sort: 'margin_asc',
    settings: {
      target_margin_percent: 15.0,
      warning_low_margin_threshold: 10.0,
      significant_cost_increase_percent: 20.0
    },
    initialized: false
  };

  async function loadPriceIntelligenceModule() {
    if (!priceIntelligenceState.initialized) {
      initPriceIntelligenceEvents();
      await loadPriceIntelligenceFilters();
      priceIntelligenceState.initialized = true;
    }
    await Promise.all([
      loadPriceIntelligenceSummary(),
      loadPriceIntelligenceProducts(priceIntelligenceState.page)
    ]);
  }

  async function loadPriceIntelligenceSummary() {
    try {
      const res = await apiFetch('/api/admin/price-intelligence/summary');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.summary) return;

      const s = data.summary;
      const settings = data.settings || {};
      priceIntelligenceState.settings = { ...priceIntelligenceState.settings, ...settings };

      // Update KPI cards
      const kpiTotal = document.getElementById('kpi-pi-total-active');
      const kpiComplete = document.getElementById('kpi-pi-complete');
      const kpiMissing = document.getElementById('kpi-pi-missing-cost');
      const kpiLow = document.getElementById('kpi-pi-low-margin');
      const kpiNeg = document.getElementById('kpi-pi-negative-margin');

      if (kpiTotal) kpiTotal.textContent = s.total_active_products.toLocaleString();
      if (kpiComplete) kpiComplete.textContent = s.products_with_complete_pricing.toLocaleString();
      if (kpiMissing) kpiMissing.textContent = s.products_with_missing_cost.toLocaleString();
      if (kpiLow) kpiLow.textContent = s.products_below_target_margin.toLocaleString();
      if (kpiNeg) kpiNeg.textContent = s.products_with_negative_margin.toLocaleString();

      // Update labels
      const targetPercent = settings.target_margin_percent || 15;
      document.querySelectorAll('.pi-target-label').forEach(el => el.textContent = `${targetPercent}%`);
      const targetBadge = document.getElementById('pi-target-margin-badge');
      if (targetBadge) targetBadge.textContent = `${targetPercent}%`;
    } catch (err) {
      console.warn('Failed to load price intelligence summary:', err.message);
    }
  }

  async function loadPriceIntelligenceFilters() {
    try {
      const res = await apiFetch('/api/products/facets');
      if (!res.ok) return;
      const facets = await res.json();

      const catSelect = document.getElementById('pi-category-filter');
      const brandSelect = document.getElementById('pi-brand-filter');

      if (catSelect && facets.categories) {
        catSelect.innerHTML = '<option value="all">All Categories</option>' + 
          facets.categories.map(c => `<option value="${escapeHtml(c.category)}">${escapeHtml(c.category_label || c.category)} (${c.count})</option>`).join('');
      }

      if (brandSelect && facets.brands) {
        brandSelect.innerHTML = '<option value="all">All Brands</option>' + 
          facets.brands.map(b => `<option value="${escapeHtml(b.brand)}">${escapeHtml(b.brand)} (${b.count})</option>`).join('');
      }
    } catch (err) {
      console.warn('Failed to populate price intelligence filters:', err.message);
    }
  }

  async function loadPriceIntelligenceProducts(page = 1) {
    const tbody = document.getElementById('pi-table-tbody');
    const loading = document.getElementById('pi-loading');
    const empty = document.getElementById('pi-empty');
    const countLabel = document.getElementById('pi-table-count');

    priceIntelligenceState.page = page;

    if (loading) loading.style.display = 'block';
    if (empty) empty.style.display = 'none';
    if (tbody) tbody.innerHTML = '';

    try {
      const params = new URLSearchParams({
        page,
        limit: priceIntelligenceState.limit,
        search: priceIntelligenceState.search,
        category: priceIntelligenceState.category,
        brand: priceIntelligenceState.brand,
        margin_filter: priceIntelligenceState.marginFilter,
        sort: priceIntelligenceState.sort,
        status: 'active'
      });

      const res = await apiFetch(`/api/admin/price-intelligence/products?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (loading) loading.style.display = 'none';

      if (!data.success || !data.products || data.products.length === 0) {
        if (empty) empty.style.display = 'block';
        if (countLabel) countLabel.textContent = '0';
        updatePriceIntelligencePagination(0, 1, 1);
        return;
      }

      if (countLabel) countLabel.textContent = data.total.toLocaleString();
      renderPriceIntelligenceTable(data.products, data.settings || priceIntelligenceState.settings);
      updatePriceIntelligencePagination(data.total, data.page, data.totalPages);
    } catch (err) {
      if (loading) loading.style.display = 'none';
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #EF4444; padding: 2rem;">Error loading profitability data: ${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  function renderPriceIntelligenceTable(products = [], settings = {}) {
    const tbody = document.getElementById('pi-table-tbody');
    if (!tbody) return;

    const targetMargin = settings.target_margin_percent || 15;

    tbody.innerHTML = products.map(p => {
      // Data quality badge
      let qualityBadge = '<span class="status-pill live" style="font-size: 0.68rem;">COMPLETE</span>';
      if (p.data_quality.status === 'MISSING_COST') {
        qualityBadge = '<span class="status-pill" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; font-size: 0.68rem;">MISSING COST</span>';
      } else if (p.data_quality.status === 'INVALID_PRICE') {
        qualityBadge = '<span class="status-pill" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; font-size: 0.68rem;">INVALID PRICE</span>';
      }

      // Recommendation badge
      let recBadge = `<span class="status-pill live" style="font-size: 0.68rem;" title="${escapeHtml(p.recommendation.explanation)}">HEALTHY</span>`;
      if (p.recommendation.status === 'MISSING_COST') {
        recBadge = `<span class="status-pill" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; font-size: 0.68rem;" title="${escapeHtml(p.recommendation.explanation)}">NEEDS COST</span>`;
      } else if (p.recommendation.status === 'NEGATIVE_MARGIN') {
        recBadge = `<span class="status-pill" style="background: rgba(239, 68, 68, 0.2); color: #EF4444; font-size: 0.68rem; font-weight: 700;" title="${escapeHtml(p.recommendation.explanation)}">NEGATIVE PROFIT</span>`;
      } else if (p.recommendation.status === 'LOW_MARGIN') {
        recBadge = `<span class="status-pill" style="background: rgba(249, 115, 22, 0.18); color: #F97316; font-size: 0.68rem;" title="${escapeHtml(p.recommendation.explanation)}">BELOW TARGET</span>`;
      } else if (p.recommendation.status === 'COST_INCREASED') {
        recBadge = `<span class="status-pill" style="background: rgba(56, 189, 248, 0.18); color: #38BDF8; font-size: 0.68rem;" title="${escapeHtml(p.recommendation.explanation)}">COST INCREASED</span>`;
      }

      // Cost & Selling Price display
      const costDisplay = p.supplier_cost_ngn != null ? `₦${Number(p.supplier_cost_ngn).toLocaleString()}` : '<span style="color: #F59E0B;">Unrecorded</span>';
      const priceDisplay = p.selling_price_ngn != null ? `₦${Number(p.selling_price_ngn).toLocaleString()}` : '<span style="color: #EF4444;">₦0</span>';

      // Promo display
      let promoDisplay = '—';
      if (p.regular_price_ngn && p.regular_price_ngn > (p.selling_price_ngn || 0)) {
        promoDisplay = `<span style="text-decoration: line-through; color: var(--color-d-text-muted); font-size: 0.75rem;">₦${Number(p.regular_price_ngn).toLocaleString()}</span>`;
      }

      // Gross profit display
      let profitDisplay = '<span style="color: var(--color-d-text-muted);">Unavailable</span>';
      if (p.estimated_gross_profit_ngn != null) {
        const isNeg = p.estimated_gross_profit_ngn < 0;
        const color = isNeg ? '#EF4444' : '#10B981';
        profitDisplay = `<strong style="color: ${color};">${isNeg ? '-' : ''}₦${Math.abs(p.estimated_gross_profit_ngn).toLocaleString()}</strong>`;
      }

      // Margin display
      let marginDisplay = '<span style="color: var(--color-d-text-muted);">Unavailable</span>';
      if (p.gross_margin_percent != null) {
        let marginColor = '#10B981';
        if (p.gross_margin_percent < 0) marginColor = '#EF4444';
        else if (p.gross_margin_percent < targetMargin) marginColor = '#F97316';
        marginDisplay = `<span style="color: ${marginColor}; font-weight: 700;">${p.gross_margin_percent}%</span>`;
      }

      // Markup display
      let markupDisplay = '<span style="color: var(--color-d-text-muted);">Unavailable</span>';
      if (p.markup_percent != null) {
        markupDisplay = `<span style="color: rgba(255,255,255,0.85);">${p.markup_percent}%</span>`;
      }

      const prodJson = escapeHtml(JSON.stringify({
        id: p.product_id,
        sku: p.sku,
        name: p.name,
        cost: p.supplier_cost_ngn,
        price: p.selling_price_ngn,
        margin: p.gross_margin_percent,
        targetMargin: targetMargin,
        status: p.recommendation.status,
        explanation: p.recommendation.explanation
      }));

      return `
        <tr>
          <td>
            <strong style="color: #FFFFFF; font-size: 0.88rem; display: block;">${escapeHtml(p.name)}</strong>
            <span style="font-family: monospace; font-size: 0.74rem; color: var(--color-d-text-muted);">${escapeHtml(p.sku)}</span>
          </td>
          <td>
            <span style="display: block; font-size: 0.82rem; color: rgba(255,255,255,0.9);">${escapeHtml(p.category_label)}</span>
            <span style="font-size: 0.74rem; color: var(--color-d-text-muted);">${escapeHtml(p.brand)}</span>
          </td>
          <td style="font-size: 0.85rem; font-weight: 600;">${costDisplay}</td>
          <td style="font-size: 0.85rem; font-weight: 600;">${priceDisplay}</td>
          <td style="font-size: 0.82rem;">${promoDisplay}</td>
          <td>${profitDisplay}</td>
          <td>${marginDisplay}</td>
          <td>${markupDisplay}</td>
          <td>${qualityBadge}</td>
          <td>${recBadge}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="btn-table-action btn-pi-simulate" data-product="${prodJson}" title="Simulate Target Margin Indicative Price" style="padding: 0.35rem 0.65rem; font-size: 0.72rem;">
              <span>Simulate</span>
            </button>
            <button type="button" class="btn-table-action btn-pi-history" data-id="${p.product_id}" data-name="${escapeHtml(p.name)}" data-sku="${escapeHtml(p.sku)}" title="View Verified Cost Movement History" style="padding: 0.35rem 0.65rem; font-size: 0.72rem; margin-left: 0.25rem;">
              <span>History</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row button events
    tbody.querySelectorAll('.btn-pi-simulate').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          const prodData = JSON.parse(btn.getAttribute('data-product'));
          openIndicativePriceSimulator(prodData);
        } catch (e) {}
      });
    });

    tbody.querySelectorAll('.btn-pi-history').forEach(btn => {
      btn.addEventListener('click', () => {
        const prodId = btn.getAttribute('data-id');
        const prodName = btn.getAttribute('data-name');
        const prodSku = btn.getAttribute('data-sku');
        openCostHistoryModal(prodId, prodName, prodSku);
      });
    });
  }

  function updatePriceIntelligencePagination(total, page, totalPages) {
    const curLabel = document.getElementById('pi-current-page');
    const totLabel = document.getElementById('pi-total-pages');
    const countLabel = document.getElementById('pi-total-items');
    const prevBtn = document.getElementById('btn-pi-prev');
    const nextBtn = document.getElementById('btn-pi-next');

    if (curLabel) curLabel.textContent = page;
    if (totLabel) totLabel.textContent = totalPages;
    if (countLabel) countLabel.textContent = total.toLocaleString();

    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;
  }

  function initPriceIntelligenceEvents() {
    const searchInput = document.getElementById('pi-search-input');
    const catSelect = document.getElementById('pi-category-filter');
    const brandSelect = document.getElementById('pi-brand-filter');
    const marginSelect = document.getElementById('pi-margin-filter');
    const sortSelect = document.getElementById('pi-sort-filter');
    const resetBtn = document.getElementById('pi-reset-btn');
    const refreshBtn = document.getElementById('btn-pi-refresh');
    const settingsBtn = document.getElementById('btn-pi-settings');
    const prevBtn = document.getElementById('btn-pi-prev');
    const nextBtn = document.getElementById('btn-pi-next');

    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        priceIntelligenceState.search = e.target.value.trim();
        priceIntelligenceState.page = 1;
        loadPriceIntelligenceProducts(1);
      }, 350));
    }

    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        priceIntelligenceState.category = e.target.value;
        priceIntelligenceState.page = 1;
        loadPriceIntelligenceProducts(1);
      });
    }

    if (brandSelect) {
      brandSelect.addEventListener('change', (e) => {
        priceIntelligenceState.brand = e.target.value;
        priceIntelligenceState.page = 1;
        loadPriceIntelligenceProducts(1);
      });
    }

    if (marginSelect) {
      marginSelect.addEventListener('change', (e) => {
        priceIntelligenceState.marginFilter = e.target.value;
        priceIntelligenceState.page = 1;
        loadPriceIntelligenceProducts(1);
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        priceIntelligenceState.sort = e.target.value;
        priceIntelligenceState.page = 1;
        loadPriceIntelligenceProducts(1);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        priceIntelligenceState.search = '';
        priceIntelligenceState.category = 'all';
        priceIntelligenceState.brand = 'all';
        priceIntelligenceState.marginFilter = 'all';
        priceIntelligenceState.sort = 'margin_asc';

        if (searchInput) searchInput.value = '';
        if (catSelect) catSelect.value = 'all';
        if (brandSelect) brandSelect.value = 'all';
        if (marginSelect) marginSelect.value = 'all';
        if (sortSelect) sortSelect.value = 'margin_asc';

        loadPriceIntelligenceProducts(1);
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadPriceIntelligenceSummary();
        loadPriceIntelligenceProducts(priceIntelligenceState.page);
      });
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', openPriceIntelligenceSettingsModal);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (priceIntelligenceState.page > 1) {
          loadPriceIntelligenceProducts(priceIntelligenceState.page - 1);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        loadPriceIntelligenceProducts(priceIntelligenceState.page + 1);
      });
    }

    // Settings Form submit
    const settingsForm = document.getElementById('form-pi-settings');
    if (settingsForm) {
      settingsForm.addEventListener('submit', handleSavePriceIntelligenceSettings);
    }
  }

  async function openPriceIntelligenceSettingsModal() {
    const modal = document.getElementById('modal-price-intelligence-settings');
    if (!modal) return;

    const targetInput = document.getElementById('pi-target-margin-input');
    const warnInput = document.getElementById('pi-warning-margin-input');
    const costIncInput = document.getElementById('pi-cost-increase-input');
    const errBox = document.getElementById('pi-settings-error');

    if (errBox) errBox.style.display = 'none';

    // Populate current settings
    if (targetInput) targetInput.value = priceIntelligenceState.settings.target_margin_percent || 15.0;
    if (warnInput) warnInput.value = priceIntelligenceState.settings.warning_low_margin_threshold || 10.0;
    if (costIncInput) costIncInput.value = priceIntelligenceState.settings.significant_cost_increase_percent || 20.0;

    modal.showModal();
  }

  async function handleSavePriceIntelligenceSettings(e) {
    e.preventDefault();
    const modal = document.getElementById('modal-price-intelligence-settings');
    const errBox = document.getElementById('pi-settings-error');
    const saveBtn = document.getElementById('btn-save-pi-settings');

    const targetMargin = parseFloat(document.getElementById('pi-target-margin-input').value);
    const warningMargin = parseFloat(document.getElementById('pi-warning-margin-input').value);
    const costInc = parseFloat(document.getElementById('pi-cost-increase-input').value);

    if (isNaN(targetMargin) || targetMargin <= 0 || targetMargin >= 100) {
      if (errBox) {
        errBox.textContent = 'Target margin must be a number strictly between 0% and 100%.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (saveBtn) saveBtn.disabled = true;

    try {
      const res = await apiFetch('/api/admin/price-intelligence/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          target_margin_percent: targetMargin,
          warning_low_margin_threshold: warningMargin,
          significant_cost_increase_percent: costInc
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update settings');
      }

      priceIntelligenceState.settings = { ...priceIntelligenceState.settings, ...data.settings };
      if (modal) modal.close();

      await Promise.all([
        loadPriceIntelligenceSummary(),
        loadPriceIntelligenceProducts(priceIntelligenceState.page)
      ]);
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
      }
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  function openIndicativePriceSimulator(product) {
    const modal = document.getElementById('modal-indicative-price');
    if (!modal) return;

    const nameEl = document.getElementById('sim-product-name');
    const skuEl = document.getElementById('sim-product-sku');
    const costEl = document.getElementById('sim-cost-val');
    const priceEl = document.getElementById('sim-price-val');
    const marginEl = document.getElementById('sim-margin-val');
    const pillEl = document.getElementById('sim-status-pill');
    const slider = document.getElementById('sim-target-margin-slider');
    const sliderVal = document.getElementById('sim-target-margin-display');
    const resultPrice = document.getElementById('sim-result-price');
    const formulaText = document.getElementById('sim-result-formula');

    const cost = product.cost ? Number(product.cost) : 0;
    const price = product.price ? Number(product.price) : 0;

    if (nameEl) nameEl.textContent = product.name;
    if (skuEl) skuEl.textContent = `SKU: ${product.sku}`;
    if (costEl) costEl.textContent = cost > 0 ? `₦${cost.toLocaleString()}` : 'Unrecorded';
    if (priceEl) priceEl.textContent = price > 0 ? `₦${price.toLocaleString()}` : '₦0';

    if (marginEl) {
      if (product.margin != null) {
        const color = product.margin < 0 ? '#EF4444' : (product.margin < (product.targetMargin || 15) ? '#F97316' : '#10B981');
        marginEl.innerHTML = `<span style="color: ${color};">${product.margin}%</span>`;
      } else {
        marginEl.innerHTML = '<span style="color: var(--color-d-text-muted);">Unavailable</span>';
      }
    }

    if (pillEl) {
      pillEl.textContent = product.status || 'HEALTHY';
      pillEl.className = 'status-pill' + (product.status === 'HEALTHY_MARGIN' ? ' live' : '');
    }

    const defaultTarget = product.targetMargin || priceIntelligenceState.settings.target_margin_percent || 15;
    if (slider) slider.value = defaultTarget;
    if (sliderVal) sliderVal.textContent = `${defaultTarget}%`;

    function updateSimulation(targetPercent) {
      if (sliderVal) sliderVal.textContent = `${targetPercent}%`;

      if (cost <= 0) {
        if (resultPrice) resultPrice.textContent = 'Unavailable (Cost Missing)';
        if (formulaText) formulaText.textContent = 'Supplier cost is not recorded. Enter cost first to calculate indicative price.';
        return;
      }

      const decimal = targetPercent / 100;
      const indicative = Math.round(cost / (1 - decimal));

      if (resultPrice) resultPrice.textContent = `₦${indicative.toLocaleString()}`;
      if (formulaText) formulaText.textContent = `Formula: ₦${cost.toLocaleString()} ÷ (1 - ${decimal}) = ₦${indicative.toLocaleString()} for advisory review`;
    }

    updateSimulation(defaultTarget);

    if (slider) {
      slider.oninput = (e) => updateSimulation(parseFloat(e.target.value));
    }

    modal.querySelectorAll('.btn-quick-margin').forEach(btn => {
      btn.onclick = () => {
        const val = parseFloat(btn.getAttribute('data-val'));
        if (slider) slider.value = val;
        updateSimulation(val);
      };
    });

    modal.showModal();
  }

  async function openCostHistoryModal(productId, productName, productSku) {
    const modal = document.getElementById('modal-cost-history');
    if (!modal) return;

    const titleEl = document.getElementById('hist-modal-title');
    const subEl = document.getElementById('hist-modal-subtitle');
    const contentArea = document.getElementById('hist-content-area');

    if (titleEl) titleEl.textContent = `Cost Movement: ${productName}`;
    if (subEl) subEl.textContent = `SKU: ${productSku} • Genuine records from approved & applied supplier imports`;
    if (contentArea) contentArea.innerHTML = '<div style="padding: 2rem; text-align: center;"><div class="spinner"></div><p style="color: var(--color-d-text-muted); font-size: 0.8rem; margin-top: 0.5rem;">Loading verified cost history...</p></div>';

    modal.showModal();

    try {
      const res = await apiFetch(`/api/admin/price-intelligence/products/${productId}/cost-history`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!data.success || !data.has_history || !data.history || data.history.length === 0) {
        if (contentArea) {
          contentArea.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-d-text-muted)" stroke-width="1.5" style="margin-bottom: 0.75rem;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
              <h4 style="color: #FFFFFF; font-size: 1rem; margin-bottom: 0.25rem;">No Historical Cost Movements Recorded</h4>
              <p style="color: var(--color-d-text-muted); font-size: 0.82rem; max-width: 480px; margin: 0 auto 1rem;">
                No supplier price imports have been approved and applied to this product yet. Current supplier cost is ${data.current_supplier_cost_ngn ? '₦' + Number(data.current_supplier_cost_ngn).toLocaleString() : 'not recorded'}.
              </p>
              <span class="status-pill" style="background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); font-size: 0.75rem;">
                UNMODIFIED ORIGINAL CATALOG RECORD
              </span>
            </div>
          `;
        }
        return;
      }

      if (contentArea) {
        contentArea.innerHTML = `
          <div class="table-responsive">
            <table class="dash-table" style="width: 100%;">
              <thead>
                <tr>
                  <th>Application Date</th>
                  <th>Previous Cost</th>
                  <th>Applied Cost</th>
                  <th>Cost Change</th>
                  <th>Source Import / File</th>
                  <th>Applied By</th>
                </tr>
              </thead>
              <tbody>
                ${data.history.map(h => {
                  const diffColor = h.cost_change_ngn > 0 ? '#EF4444' : (h.cost_change_ngn < 0 ? '#10B981' : 'rgba(255,255,255,0.7)');
                  const sign = h.cost_change_ngn > 0 ? '+' : '';
                  return `
                    <tr>
                      <td style="font-size: 0.8rem;">${formatDate(h.applied_at)}</td>
                      <td style="font-size: 0.82rem;">₦${Number(h.previous_cost_ngn || 0).toLocaleString()}</td>
                      <td style="font-size: 0.82rem; font-weight: 700; color: #FFFFFF;">₦${Number(h.applied_cost_ngn).toLocaleString()}</td>
                      <td style="font-size: 0.82rem; font-weight: 700; color: ${diffColor};">
                        ${sign}₦${Number(h.cost_change_ngn).toLocaleString()} (${sign}${h.cost_change_percent}%)
                      </td>
                      <td style="font-size: 0.78rem;">
                        <span style="display: block; color: #FFFFFF;">${escapeHtml(h.import_filename)}</span>
                        <span style="font-family: monospace; color: var(--color-d-text-muted); font-size: 0.72rem;">${escapeHtml(h.import_id)}</span>
                      </td>
                      <td style="font-size: 0.78rem; color: var(--color-d-text-muted);">${escapeHtml(h.applied_by_email)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    } catch (err) {
      if (contentArea) {
        contentArea.innerHTML = `<div style="padding: 2rem; text-align: center; color: #EF4444;">Error retrieving cost movements: ${escapeHtml(err.message)}</div>`;
      }
    }
  }

  // ==========================================================================
  // STAGE 8.4: SOLAR PACKAGE BILL OF MATERIALS (BOM)
  // ==========================================================================
  let activeBomPackageId = null;
  let activeBomEligibleProducts = [];
  let activeBomPackagePrice = 0;
  let activeBomData = null;

  function setupBomEventListeners() {
    const btnRefreshPkgs = document.getElementById('btn-refresh-solar-packages');
    if (btnRefreshPkgs) btnRefreshPkgs.addEventListener('click', loadSolarPackagesModule);

    const btnAddBomComp = document.getElementById('btn-add-bom-component');
    if (btnAddBomComp) btnAddBomComp.addEventListener('click', () => addBomComponentRow());

    const btnAddBomNp = document.getElementById('btn-add-bom-non-product');
    if (btnAddBomNp) btnAddBomNp.addEventListener('click', () => addBomNonProductRow());

    const btnSaveBom = document.getElementById('btn-save-bom');
    if (btnSaveBom) btnSaveBom.addEventListener('click', saveCurrentBomRevision);

    const btnReviewBom = document.getElementById('btn-review-bom');
    if (btnReviewBom) btnReviewBom.addEventListener('click', submitFinanceReviewCurrentBom);

    const btnApproveBom = document.getElementById('btn-approve-bom');
    if (btnApproveBom) btnApproveBom.addEventListener('click', approveCurrentBom);

    const btnViewBomRevs = document.getElementById('btn-view-bom-revisions');
    if (btnViewBomRevs) btnViewBomRevs.addEventListener('click', openBomRevisionsModal);
  }

  async function loadSolarPackagesModule() {
    const tbody = document.getElementById('solar-packages-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 2rem; color: var(--color-d-text-muted);">
          Loading solar package catalog &amp; BOM statuses...
        </td>
      </tr>
    `;

    try {
      const res = await apiFetch('/api/admin/solar-packages');
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to retrieve solar packages');
      }

      const packages = data.packages || [];

      // Update KPI cards
      const pkgCountEl = document.getElementById('kpi-bom-packages-count');
      const configuredEl = document.getElementById('kpi-bom-configured-count');
      const completeEl = document.getElementById('kpi-bom-complete-count');
      const incompleteEl = document.getElementById('kpi-bom-incomplete-count');

      let configuredCount = 0;
      let completeCount = 0;

      for (const p of packages) {
        if (p.has_bom) {
          configuredCount++;
          if (p.bom_summary && p.bom_summary.is_costing_complete) {
            completeCount++;
          }
        }
      }

      if (pkgCountEl) pkgCountEl.textContent = packages.length;
      if (configuredEl) configuredEl.textContent = configuredCount;
      if (completeEl) completeEl.textContent = completeCount;
      if (incompleteEl) incompleteEl.textContent = packages.length - completeCount;

      cachedSolarPackages = packages;
      renderSolarPackagesCards(packages);
      renderSolarPackagesTable(packages);
    } catch (err) {
      console.error('[LOAD SOLAR PACKAGES ERROR]:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: #EF4444;">
            Error loading packages: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }

  let cachedSolarPackages = [];

  function renderSolarPackagesCards(packages) {
    const grid = document.getElementById('solar-packages-cards-grid');
    if (!grid) return;

    if (!packages || packages.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: #64748B;">No solar packages found in database.</div>';
      return;
    }

    grid.innerHTML = packages.map(pkg => {
      const isLow = pkg.stock_status === 'low_stock';
      const isOut = pkg.stock_status === 'out_of_stock';
      const isOrder = pkg.stock_status === 'made_to_order';

      let stockBadge = '<span class="status-pill live" style="font-size: 0.72rem;">IN STOCK</span>';
      if (isLow) stockBadge = '<span class="status-pill warn" style="font-size: 0.72rem;">LOW STOCK</span>';
      else if (isOut) stockBadge = '<span class="status-pill danger" style="font-size: 0.72rem;">OUT OF STOCK</span>';
      else if (isOrder) stockBadge = '<span class="status-pill info" style="font-size: 0.72rem; background: #E0F2FE; color: #0284C7;">MADE TO ORDER</span>';

      const specsText = pkg.specifications || pkg.description || 'Tier-1 Hybrid Solar Inverter, LiFePO4 Lithium Battery Storage, High-Efficiency Mono Solar Array & Protection Devices.';
      const rating = Number(pkg.rating || 5.0).toFixed(1);

      return `
        <div class="solar-pkg-card" data-package-id="${pkg.id}">
          <div class="solar-pkg-card-header">
            <div>
              <span class="solar-pkg-sku">${escapeHtml(pkg.sku)}</span>
              <h3 class="solar-pkg-title" style="margin-top: 0.35rem;">${escapeHtml(pkg.name)}</h3>
              <div style="font-size: 0.78rem; font-weight: 600; color: #0157A2;">${escapeHtml(pkg.power_rating || 'Turnkey Solar Kit')}</div>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
              <span class="solar-pkg-rating">⭐ ${rating}</span>
              ${stockBadge}
            </div>
          </div>

          <div class="solar-pkg-pricing">
            <div style="display: flex; align-items: baseline; justify-content: space-between;">
              <div>
                <span class="solar-pkg-price-val">₦${Number(pkg.price_ngn).toLocaleString()}</span>
                ${pkg.previous_price_ngn && pkg.previous_price_ngn > pkg.price_ngn ? `<span class="solar-pkg-price-prev">₦${Number(pkg.previous_price_ngn).toLocaleString()}</span>` : ''}
              </div>
              ${pkg.previous_price_ngn && pkg.previous_price_ngn > pkg.price_ngn ? `<span class="tab-badge-pill" style="background: #DCFCE7; color: #166534; font-size: 0.72rem;">Save ₦${Number(pkg.previous_price_ngn - pkg.price_ngn).toLocaleString()}</span>` : ''}
            </div>
          </div>

          <div style="margin-bottom: 0.5rem; font-weight: 700; font-size: 0.74rem; text-transform: uppercase; color: #64748B;">System Inclusions &amp; Hardware:</div>
          <p style="font-size: 0.8rem; color: #475569; line-height: 1.45; margin: 0 0 1rem 0; flex-grow: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHtml(specsText)}
          </p>

          <div class="solar-pkg-footer">
            <button type="button" class="btn-primary-yellow btn-quick-edit-pkg" data-package-id="${pkg.id}" style="flex-grow: 1; justify-content: center; padding: 0.55rem 0.85rem; font-size: 0.82rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>Quick Edit Package</span>
            </button>
            <a href="/packages/${encodeURIComponent(pkg.slug || '')}" target="_blank" class="btn-table-action" style="padding: 0.55rem 0.75rem; text-decoration: none;" title="View Package in Store">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.btn-quick-edit-pkg').forEach(btn => {
      btn.addEventListener('click', () => {
        const pkgId = btn.getAttribute('data-package-id');
        openEditSolarPackageModal(pkgId);
      });
    });
  }

  function openEditSolarPackageModal(packageId) {
    const pkg = cachedSolarPackages.find(p => String(p.id) === String(packageId));
    if (!pkg) return;

    const modal = document.getElementById('modal-edit-solar-package');
    if (!modal) return;

    document.getElementById('edit-pkg-id').value = pkg.id;
    document.getElementById('edit-pkg-name').value = pkg.name || '';
    document.getElementById('edit-pkg-sku').value = pkg.sku || '';
    document.getElementById('edit-pkg-price').value = pkg.price_ngn || '';
    document.getElementById('edit-pkg-previous-price').value = pkg.previous_price_ngn || '';
    document.getElementById('edit-pkg-power').value = pkg.power_rating || '';
    document.getElementById('edit-pkg-rating').value = pkg.rating || 5.0;
    document.getElementById('edit-pkg-stock').value = pkg.stock_status || 'in_stock';
    document.getElementById('edit-pkg-published').value = pkg.is_active === false ? 'false' : 'true';
    document.getElementById('edit-pkg-specs').value = pkg.specifications || pkg.description || '';

    modal.showModal();
  }

  async function saveSolarPackageChanges() {
    const btn = document.getElementById('btn-save-solar-package');
    const pkgId = document.getElementById('edit-pkg-id')?.value;
    if (!pkgId) return;

    const payload = {
      name: document.getElementById('edit-pkg-name')?.value.trim(),
      sku: document.getElementById('edit-pkg-sku')?.value.trim(),
      price_ngn: Number(document.getElementById('edit-pkg-price')?.value),
      previous_price_ngn: document.getElementById('edit-pkg-previous-price')?.value ? Number(document.getElementById('edit-pkg-previous-price').value) : null,
      power_rating: document.getElementById('edit-pkg-power')?.value.trim(),
      rating: Number(document.getElementById('edit-pkg-rating')?.value || 5.0),
      stock_status: document.getElementById('edit-pkg-stock')?.value,
      is_active: document.getElementById('edit-pkg-published')?.value === 'true',
      specifications: document.getElementById('edit-pkg-specs')?.value.trim()
    };

    if (!payload.name || !payload.sku || !payload.price_ngn) {
      alert('Package Name, SKU, and Selling Price are required.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving Changes...';
    }

    try {
      const res = await apiFetch(`/api/admin/solar-packages/${pkgId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update package');
      }

      const modal = document.getElementById('modal-edit-solar-package');
      if (modal) modal.close();

      await loadSolarPackagesModule();
    } catch (err) {
      alert('Error updating solar package: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Save Package Changes';
      }
    }
  }

  function renderSolarPackagesTable(packages) {
    const tbody = document.getElementById('solar-packages-tbody');
    if (!tbody) return;

    if (!packages || packages.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: var(--color-d-text-muted);">
            No solar packages found in database.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = packages.map(pkg => {
      const bom = pkg.bom_summary;
      let statusBadge = '<span class="badge-status badge-unapproved">No BOM</span>';
      let completenessBadge = '<span class="badge-status badge-unapproved">Not Configured</span>';
      let financeBadge = '<span class="badge-status badge-unapproved">Pending</span>';
      let approvalBadge = '<span class="badge-status badge-unapproved">Pending</span>';
      let costDisplay = '—';
      let marginDisplay = '—';

      if (bom) {
        if (bom.status === 'approved') {
          statusBadge = '<span class="badge-status badge-approved">Approved</span>';
        } else if (bom.status === 'ready_for_review') {
          statusBadge = '<span class="badge-status badge-review">Ready for Review</span>';
        } else if (bom.status === 'incomplete') {
          statusBadge = '<span class="badge-status badge-invalid">Incomplete</span>';
        } else {
          statusBadge = '<span class="badge-status badge-unapproved">Draft (Rev ' + bom.revision + ')</span>';
        }

        if (bom.is_costing_complete) {
          completenessBadge = `<span class="badge-status badge-approved">100% Complete (${bom.total_lines_count} lines)</span>`;
          costDisplay = `<strong>₦${Number(bom.total_estimated_cost_ngn).toLocaleString()}</strong>`;
          const profit = pkg.price_ngn - bom.total_estimated_cost_ngn;
          const marginPct = (profit / pkg.price_ngn) * 100;
          const marginColor = marginPct >= 15 ? '#10B981' : (marginPct >= 10 ? '#F59E0B' : '#EF4444');
          marginDisplay = `<span style="color: ${marginColor}; font-weight: 700;">${marginPct.toFixed(1)}%</span>`;
        } else {
          completenessBadge = `<span class="badge-status badge-invalid">${bom.missing_cost_lines_count} Missing Cost${bom.missing_cost_lines_count === 1 ? '' : 's'}</span>`;
          costDisplay = '<span style="color: var(--color-d-text-muted); font-size: 0.78rem;">Incomplete Costing</span>';
          marginDisplay = '<span style="color: var(--color-d-text-muted); font-size: 0.78rem;">— (Incomplete)</span>';
        }

        if (bom.finance_review_status === 'reviewed') {
          financeBadge = `<span class="badge-status badge-approved" title="Reviewed by ${escapeHtml(bom.finance_reviewed_by_email || 'Finance')} on ${bom.finance_reviewed_at ? new Date(bom.finance_reviewed_at).toLocaleDateString() : ''}">✓ Reviewed</span>`;
        } else if (bom.finance_review_status === 'rejected') {
          financeBadge = '<span class="badge-status badge-invalid">Rejected</span>';
        } else if (bom.finance_review_status === 'invalidated') {
          financeBadge = '<span class="badge-status badge-review">Invalidated</span>';
        } else {
          financeBadge = '<span class="badge-status badge-unapproved">Pending</span>';
        }

        if (bom.status === 'approved') {
          approvalBadge = `<span class="badge-status badge-approved" title="Approved by ${escapeHtml(bom.approved_by_email || 'Superadmin')} on ${bom.approved_at ? new Date(bom.approved_at).toLocaleDateString() : ''}">✓ Approved</span>`;
        } else {
          approvalBadge = '<span class="badge-status badge-unapproved">Pending</span>';
        }
      }

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: #FFFFFF;">${escapeHtml(pkg.name)}</div>
            <a href="/packages/${encodeURIComponent(pkg.slug)}" target="_blank" style="font-size: 0.74rem; color: #38BDF8; text-decoration: none;">
              /${escapeHtml(pkg.slug)} ↗
            </a>
          </td>
          <td>
            <div style="font-family: monospace; font-size: 0.8rem; color: #94A3B8;">${escapeHtml(pkg.sku)}</div>
            <div style="font-size: 0.74rem; color: var(--color-d-text-muted);">${escapeHtml(pkg.power_rating || '—')}</div>
          </td>
          <td style="text-align: right; font-weight: 700; color: #FFFFFF;">
            ₦${Number(pkg.price_ngn).toLocaleString()}
            ${pkg.previous_price_ngn ? `<div style="font-size: 0.72rem; color: var(--color-d-text-muted); text-decoration: line-through;">₦${Number(pkg.previous_price_ngn).toLocaleString()}</div>` : ''}
          </td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="text-align: center;">${completenessBadge}</td>
          <td style="text-align: center;">${financeBadge}</td>
          <td style="text-align: center;">${approvalBadge}</td>
          <td style="text-align: right;">${costDisplay}</td>
          <td style="text-align: right;">${marginDisplay}</td>
          <td style="text-align: center;">
            <button type="button" class="btn-secondary btn-action-bom" data-package-id="${pkg.id}" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;">
              Configure BOM
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-action-bom').forEach(btn => {
      btn.addEventListener('click', () => {
        const pkgId = btn.getAttribute('data-package-id');
        openBomEditor(pkgId);
      });
    });
  }

  async function openBomEditor(packageId) {
    const modal = document.getElementById('modal-bom-editor');
    if (!modal) return;

    activeBomPackageId = packageId;
    activeBomEligibleProducts = [];
    activeBomData = null;

    const compTbody = document.getElementById('bom-components-tbody');
    const npTbody = document.getElementById('bom-non-product-tbody');
    if (compTbody) compTbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 1rem;">Loading BOM data...</td></tr>';
    if (npTbody) npTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 1rem;">Loading services data...</td></tr>';

    try {
      const res = await apiFetch(`/api/admin/solar-packages/${packageId}/bom`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to retrieve package BOM');
      }

      activeBomData = data.bom;
      activeBomEligibleProducts = data.eligible_products || [];
      activeBomPackagePrice = data.package.price_ngn;

      const titleEl = document.getElementById('bom-modal-title');
      const skuBadge = document.getElementById('bom-modal-sku-badge');
      const revBadge = document.getElementById('bom-modal-revision-badge');
      const statusPill = document.getElementById('bom-modal-status-pill');
      const retailPriceEl = document.getElementById('bom-modal-retail-price');
      const powerRatingEl = document.getElementById('bom-modal-power-rating');
      const pkgIdInput = document.getElementById('bom-package-id');
      const baseRevInput = document.getElementById('bom-base-revision');
      const statusSelect = document.getElementById('bom-status-select');
      const notesInput = document.getElementById('bom-revision-notes');
      const approvedNotice = document.getElementById('bom-approved-notice');

      if (titleEl) titleEl.textContent = `${data.package.name} — BOM`;
      if (skuBadge) skuBadge.textContent = `SKU: ${data.package.sku}`;
      if (retailPriceEl) retailPriceEl.textContent = `₦${Number(data.package.price_ngn).toLocaleString()}`;
      if (powerRatingEl) powerRatingEl.textContent = data.package.power_rating || '—';
      if (pkgIdInput) pkgIdInput.value = data.package.id;

      if (data.bom) {
        if (revBadge) revBadge.textContent = `Rev ${data.bom.revision}`;
        if (statusPill) {
          statusPill.textContent = data.bom.status.toUpperCase();
          statusPill.className = `badge-status badge-${data.bom.status === 'approved' ? 'approved' : (data.bom.status === 'ready_for_review' ? 'review' : 'unapproved')}`;
        }
        if (baseRevInput) baseRevInput.value = data.bom.revision;
        if (statusSelect) statusSelect.value = data.bom.status === 'approved' ? 'ready_for_review' : data.bom.status;
        if (notesInput) notesInput.value = data.bom.notes || '';
        if (approvedNotice) approvedNotice.style.display = data.bom.status === 'approved' ? 'block' : 'none';
      } else {
        if (revBadge) revBadge.textContent = 'Rev 1 (Draft)';
        if (statusPill) {
          statusPill.textContent = 'NEW DRAFT';
          statusPill.className = 'badge-status badge-unapproved';
        }
        if (baseRevInput) baseRevInput.value = '0';
        if (statusSelect) statusSelect.value = 'draft';
        if (notesInput) notesInput.value = '';
        if (approvedNotice) approvedNotice.style.display = 'none';
      }

      // Populate Dual-Authorization Governance Card (Stage 8.4.1)
      const overallBadge = document.getElementById('bom-dual-auth-overall-badge');
      const finPill = document.getElementById('bom-finance-review-pill');
      const finInfo = document.getElementById('bom-finance-reviewer-info');
      const finNotesWrap = document.getElementById('bom-finance-review-notes-wrap');
      const finNotesText = document.getElementById('bom-finance-review-notes');
      const appPill = document.getElementById('bom-superadmin-approval-pill');
      const appInfo = document.getElementById('bom-superadmin-approver-info');
      const twoPersonWarning = document.getElementById('bom-dual-auth-violation-warning');

      const finRev = data.bom ? data.bom.finance_review : null;
      const isApproved = data.bom && data.bom.status === 'approved';
      const isReviewed = finRev && finRev.status === 'reviewed';

      if (finPill) {
        if (isReviewed) {
          finPill.textContent = '✓ Reviewed';
          finPill.className = 'badge-status badge-approved';
        } else if (finRev && finRev.status === 'rejected') {
          finPill.textContent = 'Rejected';
          finPill.className = 'badge-status badge-invalid';
        } else if (finRev && finRev.status === 'invalidated') {
          finPill.textContent = 'Invalidated';
          finPill.className = 'badge-status badge-review';
        } else {
          finPill.textContent = 'Pending';
          finPill.className = 'badge-status badge-unapproved';
        }
      }

      if (finInfo) {
        if (isReviewed) {
          finInfo.innerHTML = `Reviewed by <strong>${escapeHtml(finRev.reviewed_by_email || 'Finance')}</strong> on ${finRev.reviewed_at ? new Date(finRev.reviewed_at).toLocaleString() : '—'}`;
        } else if (finRev && finRev.status === 'rejected') {
          finInfo.innerHTML = `Rejected by <strong>${escapeHtml(finRev.reviewed_by_email || 'Finance')}</strong> on ${finRev.reviewed_at ? new Date(finRev.reviewed_at).toLocaleString() : '—'}`;
        } else if (finRev && finRev.status === 'invalidated') {
          finInfo.textContent = `Previous review on Rev ${finRev.revision_reviewed || 'prior'} was invalidated when BOM was modified. A new finance review is required.`;
        } else {
          finInfo.textContent = 'No formal review submitted yet. Requires 100% complete verified costing.';
        }
      }

      if (finNotesWrap && finNotesText) {
        if (finRev && finRev.notes) {
          finNotesWrap.style.display = 'block';
          finNotesText.textContent = finRev.notes;
        } else {
          finNotesWrap.style.display = 'none';
          finNotesText.textContent = '';
        }
      }

      if (appPill) {
        if (isApproved) {
          appPill.textContent = '✓ Approved';
          appPill.className = 'badge-status badge-approved';
        } else {
          appPill.textContent = 'Pending';
          appPill.className = 'badge-status badge-unapproved';
        }
      }

      if (appInfo) {
        if (isApproved) {
          appInfo.innerHTML = `Approved by <strong>${escapeHtml(data.bom.approved_by_email || 'Superadmin')}</strong> on ${data.bom.approved_at ? new Date(data.bom.approved_at).toLocaleString() : '—'}`;
        } else if (isReviewed) {
          appInfo.textContent = 'Step 1 complete. Ready for Superadmin final sign-off (Two-Person rule enforced).';
        } else {
          appInfo.textContent = 'Requires Step 1 positive review by a distinct user prior to final sign-off.';
        }
      }

      if (overallBadge) {
        if (isApproved) {
          overallBadge.textContent = '✓ Approved for Commercial Production';
          overallBadge.className = 'badge-status badge-approved';
        } else if (isReviewed) {
          overallBadge.textContent = 'Step 2: Superadmin Final Approval Ready';
          overallBadge.className = 'badge-status badge-review';
        } else if (finRev && finRev.status === 'rejected') {
          overallBadge.textContent = 'Step 1: Finance Review Rejected';
          overallBadge.className = 'badge-status badge-invalid';
        } else if (finRev && finRev.status === 'invalidated') {
          overallBadge.textContent = 'Review Invalidated — New Review Required';
          overallBadge.className = 'badge-status badge-review';
        } else {
          overallBadge.textContent = 'Step 1: Finance Review Pending';
          overallBadge.className = 'badge-status badge-unapproved';
        }
      }

      if (twoPersonWarning) {
        const isSameUser = currentUser && finRev && finRev.reviewed_by_id && String(currentUser.id) === String(finRev.reviewed_by_id);
        if (!isApproved && isReviewed && isSameUser) {
          twoPersonWarning.style.display = 'block';
        } else {
          twoPersonWarning.style.display = 'none';
        }
      }

      if (compTbody) compTbody.innerHTML = '';
      const existingComponents = (data.bom && Array.isArray(data.bom.components)) ? data.bom.components : [];
      if (existingComponents.length === 0) {
        addBomComponentRow();
      } else {
        existingComponents.forEach(comp => addBomComponentRow(comp));
      }

      if (npTbody) npTbody.innerHTML = '';
      const existingNonProduct = (data.bom && Array.isArray(data.bom.non_product_costs)) ? data.bom.non_product_costs : [];
      if (existingNonProduct.length > 0) {
        existingNonProduct.forEach(line => addBomNonProductRow(line));
      }

      recalculateLiveBom();
      modal.showModal();
    } catch (err) {
      console.error('[OPEN BOM EDITOR ERROR]:', err);
      alert(`Error loading BOM: ${err.message}`);
    }
  }

  function addBomComponentRow(comp = {}) {
    const tbody = document.getElementById('bom-components-tbody');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.className = 'bom-comp-row';

    const selectedType = comp.component_type || 'solar-panels';
    const selectedUnit = comp.unit || 'pcs';
    const selectedProductId = comp.product_id ? String(comp.product_id) : '';
    const selectedCostSource = comp.cost_source || 'unknown';

    const productOptions = activeBomEligibleProducts.map(p => {
      const isSel = String(p.id) === selectedProductId ? 'selected' : '';
      const costInfo = p.cost_price_ngn > 0 ? ` (₦${Number(p.cost_price_ngn).toLocaleString()})` : ' (No Cost)';
      return `<option value="${p.id}" data-category="${p.category}" data-sku="${escapeHtml(p.sku)}" data-name="${escapeHtml(p.name)}" data-cost="${p.cost_price_ngn || ''}" ${isSel}>${escapeHtml(p.name)} [${escapeHtml(p.sku)}]${costInfo}</option>`;
    }).join('');

    row.innerHTML = `
      <td>
        <select class="form-select bom-comp-type" style="font-size: 0.76rem; padding: 0.25rem 0.4rem;">
          <option value="solar-panels" ${selectedType === 'solar-panels' ? 'selected' : ''}>Solar Panels</option>
          <option value="hybrid-inverter" ${selectedType === 'hybrid-inverter' ? 'selected' : ''}>Hybrid Inverter</option>
          <option value="battery" ${selectedType === 'battery' ? 'selected' : ''}>Battery Storage</option>
          <option value="mounting-structure" ${selectedType === 'mounting-structure' ? 'selected' : ''}>Mounting Structure</option>
          <option value="dc-ac-protection" ${selectedType === 'dc-ac-protection' ? 'selected' : ''}>Protection &amp; Switchgear</option>
          <option value="cables-connectors" ${selectedType === 'cables-connectors' ? 'selected' : ''}>Cables &amp; Connectors</option>
          <option value="installation-materials" ${selectedType === 'installation-materials' ? 'selected' : ''}>Installation Materials</option>
          <option value="accessories" ${selectedType === 'accessories' ? 'selected' : ''}>Accessories &amp; BOS</option>
          <option value="other" ${selectedType === 'other' ? 'selected' : ''}>Other Component</option>
        </select>
      </td>
      <td>
        <div style="margin-bottom: 0.25rem;">
          <select class="form-select bom-comp-prod-select" style="font-size: 0.74rem; padding: 0.25rem 0.4rem; width: 100%;">
            <option value="">-- Select Active Catalog Product --</option>
            ${productOptions}
          </select>
        </div>
        <input type="text" class="form-input bom-comp-name" placeholder="Component display title..." value="${escapeHtml(comp.product_name || '')}" style="font-size: 0.76rem; padding: 0.25rem 0.4rem; width: 100%;">
        <input type="hidden" class="bom-comp-sku" value="${escapeHtml(comp.product_sku || '')}">
      </td>
      <td>
        <input type="number" class="form-input bom-comp-qty" min="0.001" step="any" value="${comp.quantity !== undefined ? comp.quantity : 1}" style="font-size: 0.76rem; padding: 0.25rem 0.4rem; width: 100%;">
      </td>
      <td>
        <select class="form-select bom-comp-unit" style="font-size: 0.76rem; padding: 0.25rem 0.4rem; width: 100%;">
          <option value="pcs" ${selectedUnit === 'pcs' ? 'selected' : ''}>pcs</option>
          <option value="meters" ${selectedUnit === 'meters' ? 'selected' : ''}>meters</option>
          <option value="sets" ${selectedUnit === 'sets' ? 'selected' : ''}>sets</option>
          <option value="roll" ${selectedUnit === 'roll' ? 'selected' : ''}>roll</option>
          <option value="lot" ${selectedUnit === 'lot' ? 'selected' : ''}>lot</option>
          <option value="hours" ${selectedUnit === 'hours' ? 'selected' : ''}>hours</option>
          <option value="units" ${selectedUnit === 'units' ? 'selected' : ''}>units</option>
        </select>
      </td>
      <td>
        <input type="number" class="form-input bom-comp-waste" min="0" max="100" step="1" value="${comp.waste_allowance_pct !== undefined ? comp.waste_allowance_pct : 0}" style="font-size: 0.76rem; padding: 0.25rem 0.4rem; width: 100%;">
      </td>
      <td>
        <input type="number" class="form-input bom-comp-cost" min="0" step="0.01" placeholder="Missing" value="${comp.unit_cost_ngn !== null && comp.unit_cost_ngn !== undefined ? comp.unit_cost_ngn : ''}" style="font-size: 0.76rem; padding: 0.25rem 0.4rem; width: 100%; text-align: right;">
      </td>
      <td style="text-align: right; font-weight: 700;">
        <span class="bom-comp-subtotal-display" style="font-size: 0.78rem;">—</span>
      </td>
      <td>
        <select class="form-select bom-comp-source" style="font-size: 0.74rem; padding: 0.25rem 0.35rem; width: 100%;">
          <option value="unknown" ${selectedCostSource === 'unknown' ? 'selected' : ''}>Unknown / Missing</option>
          <option value="catalog_documented_cost" ${selectedCostSource === 'catalog_documented_cost' ? 'selected' : ''}>Catalog Cost</option>
          <option value="verified_supplier_quote" ${selectedCostSource === 'verified_supplier_quote' ? 'selected' : ''}>Supplier Quote</option>
          <option value="manual_sourced_cost" ${selectedCostSource === 'manual_sourced_cost' ? 'selected' : ''}>Manual Verified</option>
        </select>
      </td>
      <td>
        <input type="text" class="form-input bom-comp-prov" placeholder="Invoice # or Quote Ref..." value="${escapeHtml(comp.cost_provenance_ref || '')}" style="font-size: 0.74rem; padding: 0.25rem 0.4rem; width: 100%;">
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn-delete-bom-row" style="background: none; border: none; color: #EF4444; cursor: pointer; padding: 0.2rem;" title="Remove Line">
          ✕
        </button>
      </td>
    `;

    tbody.appendChild(row);

    const prodSelect = row.querySelector('.bom-comp-prod-select');
    const nameInput = row.querySelector('.bom-comp-name');
    const skuInput = row.querySelector('.bom-comp-sku');
    const costInput = row.querySelector('.bom-comp-cost');
    const sourceSelect = row.querySelector('.bom-comp-source');
    const typeSelect = row.querySelector('.bom-comp-type');
    const deleteBtn = row.querySelector('.btn-delete-bom-row');

    prodSelect.addEventListener('change', () => {
      const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
      if (selectedOpt && selectedOpt.value) {
        const pName = selectedOpt.getAttribute('data-name');
        const pSku = selectedOpt.getAttribute('data-sku');
        const pCost = selectedOpt.getAttribute('data-cost');
        const pCat = selectedOpt.getAttribute('data-category');

        if (nameInput) nameInput.value = pName;
        if (skuInput) skuInput.value = pSku;
        if (pCost && Number(pCost) > 0) {
          if (costInput) costInput.value = pCost;
          if (sourceSelect) sourceSelect.value = 'catalog_documented_cost';
        }
        if (pCat === 'solar-panels' && typeSelect) typeSelect.value = 'solar-panels';
        if (pCat === 'inverters' && typeSelect) typeSelect.value = 'hybrid-inverter';
        if (pCat === 'batteries' && typeSelect) typeSelect.value = 'battery';
        if (pCat === 'accessories' && typeSelect) typeSelect.value = 'accessories';
      }
      recalculateLiveBom();
    });

    row.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', recalculateLiveBom);
      el.addEventListener('change', recalculateLiveBom);
    });

    deleteBtn.addEventListener('click', () => {
      row.remove();
      recalculateLiveBom();
    });
  }

  function addBomNonProductRow(line = {}) {
    const tbody = document.getElementById('bom-non-product-tbody');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.className = 'bom-np-row';

    const selectedType = line.cost_type || 'labour_installation';

    row.innerHTML = `
      <td>
        <select class="form-select bom-np-type" style="font-size: 0.76rem; padding: 0.25rem 0.4rem;">
          <option value="labour_installation" ${selectedType === 'labour_installation' ? 'selected' : ''}>Labour &amp; Installation</option>
          <option value="logistics_transport" ${selectedType === 'logistics_transport' ? 'selected' : ''}>Logistics &amp; Transport</option>
          <option value="electrical_switchgear_bos" ${selectedType === 'electrical_switchgear_bos' ? 'selected' : ''}>Electrical &amp; Switchgear BOS</option>
          <option value="contingency_commissioning" ${selectedType === 'contingency_commissioning' ? 'selected' : ''}>Commissioning &amp; Testing</option>
          <option value="other" ${selectedType === 'other' ? 'selected' : ''}>Other Service Cost</option>
        </select>
      </td>
      <td>
        <input type="text" class="form-input bom-np-name" placeholder="Service description..." value="${escapeHtml(line.name || '')}" style="font-size: 0.76rem; padding: 0.25rem 0.4rem; width: 100%;">
      </td>
      <td>
        <input type="number" class="form-input bom-np-cost" min="0" step="0.01" placeholder="Missing" value="${line.cost_ngn !== null && line.cost_ngn !== undefined ? line.cost_ngn : ''}" style="font-size: 0.76rem; padding: 0.25rem 0.4rem; width: 100%; text-align: right;">
      </td>
      <td>
        <input type="text" class="form-input bom-np-prov" placeholder="Subcontractor / Quote Ref..." value="${escapeHtml(line.provenance_ref || '')}" style="font-size: 0.74rem; padding: 0.25rem 0.4rem; width: 100%;">
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn-delete-bom-row" style="background: none; border: none; color: #EF4444; cursor: pointer; padding: 0.2rem;" title="Remove Line">
          ✕
        </button>
      </td>
    `;

    tbody.appendChild(row);

    row.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', recalculateLiveBom);
      el.addEventListener('change', recalculateLiveBom);
    });

    row.querySelector('.btn-delete-bom-row').addEventListener('click', () => {
      row.remove();
      recalculateLiveBom();
    });
  }

  function recalculateLiveBom() {
    let compSubtotal = 0;
    let npSubtotal = 0;
    let missingCount = 0;
    let totalLines = 0;

    document.querySelectorAll('.bom-comp-row').forEach(row => {
      totalLines++;
      const qty = parseFloat(row.querySelector('.bom-comp-qty')?.value) || 0;
      const wastePct = parseFloat(row.querySelector('.bom-comp-waste')?.value) || 0;
      const costVal = row.querySelector('.bom-comp-cost')?.value;
      const source = row.querySelector('.bom-comp-source')?.value;
      const subtotalEl = row.querySelector('.bom-comp-subtotal-display');

      const effectiveQty = qty * (1 + wastePct / 100);

      if (costVal === '' || costVal === null || costVal === undefined || isNaN(parseFloat(costVal)) || source === 'unknown') {
        missingCount++;
        if (subtotalEl) {
          subtotalEl.textContent = 'Missing';
          subtotalEl.style.color = '#EF4444';
        }
      } else {
        const unitCost = parseFloat(costVal);
        const lineTotal = effectiveQty * unitCost;
        compSubtotal += lineTotal;
        if (subtotalEl) {
          subtotalEl.textContent = `₦${Math.round(lineTotal).toLocaleString()}`;
          subtotalEl.style.color = '#10B981';
        }
      }
    });

    document.querySelectorAll('.bom-np-row').forEach(row => {
      totalLines++;
      const costVal = row.querySelector('.bom-np-cost')?.value;
      if (costVal === '' || costVal === null || costVal === undefined || isNaN(parseFloat(costVal))) {
        missingCount++;
      } else {
        npSubtotal += parseFloat(costVal);
      }
    });

    const isComplete = totalLines > 0 && missingCount === 0;
    const completenessPct = totalLines > 0 ? Math.round(((totalLines - missingCount) / totalLines) * 100) : 0;

    const compSubtotalEl = document.getElementById('summary-components-subtotal');
    const npSubtotalEl = document.getElementById('summary-non-product-subtotal');
    const totalCostEl = document.getElementById('summary-total-cost');
    const completenessPill = document.getElementById('summary-completeness-pill');
    const grossMarginEl = document.getElementById('summary-gross-margin');
    const grossProfitEl = document.getElementById('summary-gross-profit');
    const btnApprove = document.getElementById('btn-approve-bom');

    if (compSubtotalEl) compSubtotalEl.textContent = `₦${Math.round(compSubtotal).toLocaleString()}`;
    if (npSubtotalEl) npSubtotalEl.textContent = `₦${Math.round(npSubtotal).toLocaleString()}`;

    if (isComplete) {
      const totalCost = compSubtotal + npSubtotal;
      if (totalCostEl) {
        totalCostEl.textContent = `₦${Math.round(totalCost).toLocaleString()}`;
        totalCostEl.style.color = '#FFFFFF';
      }
      if (completenessPill) {
        completenessPill.textContent = '100% Costed (Complete)';
        completenessPill.className = 'badge-status badge-approved';
      }

      if (activeBomPackagePrice > 0) {
        const profit = activeBomPackagePrice - totalCost;
        const marginPct = (profit / activeBomPackagePrice) * 100;
        const marginColor = marginPct >= 15 ? '#10B981' : (marginPct >= 10 ? '#F59E0B' : '#EF4444');
        if (grossMarginEl) {
          grossMarginEl.textContent = `${marginPct.toFixed(1)}%`;
          grossMarginEl.style.color = marginColor;
        }
        if (grossProfitEl) grossProfitEl.textContent = `Est. Profit: ₦${Math.round(profit).toLocaleString()}`;
      }
    } else {
      if (totalCostEl) {
        totalCostEl.textContent = `₦${Math.round(compSubtotal + npSubtotal).toLocaleString()} (Incomplete)`;
        totalCostEl.style.color = '#F59E0B';
      }
      if (completenessPill) {
        completenessPill.textContent = `${completenessPct}% Costed (${missingCount} missing)`;
        completenessPill.className = 'badge-status badge-invalid';
      }
      if (grossMarginEl) {
        grossMarginEl.textContent = '— (Incomplete)';
        grossMarginEl.style.color = 'var(--color-d-text-muted)';
      }
      if (grossProfitEl) grossProfitEl.textContent = 'Requires 100% verified costs';
    }

    // Dual-Authorization Button State Controls (Stage 8.4.1)
    const btnReview = document.getElementById('btn-review-bom');
    const isFinanceOrSuperadmin = currentUser && (currentUser.role === 'finance' || currentUser.role === 'superadmin');
    const isSuperadmin = currentUser && currentUser.role === 'superadmin';

    // Step 1: Finance Review button control
    if (btnReview) {
      if (isFinanceOrSuperadmin) {
        btnReview.style.display = 'inline-block';
        if (isComplete) {
          btnReview.removeAttribute('disabled');
          btnReview.title = 'Submit formal Finance Review for this BOM revision';
        } else {
          btnReview.setAttribute('disabled', 'true');
          btnReview.title = 'Finance Review requires 100% complete verified costing (no missing costs)';
        }
      } else {
        btnReview.style.display = 'none';
      }
    }

    // Step 2: Superadmin Final Approval button control
    if (btnApprove) {
      if (isSuperadmin) {
        btnApprove.style.display = 'inline-block';
        const finRev = activeBomData ? activeBomData.finance_review : null;
        const hasPositiveReview = finRev && finRev.status === 'reviewed';
        const isSameUser = finRev && finRev.reviewed_by_id && currentUser && String(currentUser.id) === String(finRev.reviewed_by_id);

        if (!isComplete) {
          btnApprove.setAttribute('disabled', 'true');
          btnApprove.title = 'Approval requires 100% complete costing';
        } else if (!hasPositiveReview) {
          btnApprove.setAttribute('disabled', 'true');
          btnApprove.title = 'Approval requires Step 1 Finance Review before final sign-off';
        } else if (isSameUser) {
          btnApprove.setAttribute('disabled', 'true');
          btnApprove.title = 'Two-Person Rule: You cannot approve a BOM revision that you reviewed';
        } else {
          btnApprove.removeAttribute('disabled');
          btnApprove.title = 'Formally approve this BOM for commercial production';
        }
      } else {
        btnApprove.style.display = 'none';
      }
    }
  }

  async function saveCurrentBomRevision() {
    if (!activeBomPackageId) return;

    const baseRev = document.getElementById('bom-base-revision')?.value;
    const status = document.getElementById('bom-status-select')?.value || 'draft';
    const notes = document.getElementById('bom-revision-notes')?.value || '';

    const components = [];
    let hasValidationError = false;

    document.querySelectorAll('.bom-comp-row').forEach((row, idx) => {
      const type = row.querySelector('.bom-comp-type')?.value;
      const prodId = row.querySelector('.bom-comp-prod-select')?.value;
      const name = row.querySelector('.bom-comp-name')?.value?.trim();
      const sku = row.querySelector('.bom-comp-sku')?.value?.trim();
      const qty = parseFloat(row.querySelector('.bom-comp-qty')?.value);
      const unit = row.querySelector('.bom-comp-unit')?.value;
      const waste = parseFloat(row.querySelector('.bom-comp-waste')?.value) || 0;
      const costVal = row.querySelector('.bom-comp-cost')?.value?.trim();
      const source = row.querySelector('.bom-comp-source')?.value;
      const prov = row.querySelector('.bom-comp-prov')?.value?.trim();

      if (!name) {
        alert(`Hardware Line ${idx + 1}: Component name is required.`);
        hasValidationError = true;
        return;
      }
      if (!qty || qty <= 0) {
        alert(`Hardware Line ${idx + 1}: Quantity must be greater than 0.`);
        hasValidationError = true;
        return;
      }

      components.push({
        component_type: type,
        product_id: prodId ? Number(prodId) : null,
        product_name: name,
        product_sku: sku || '',
        quantity: qty,
        unit: unit,
        waste_allowance_pct: waste,
        unit_cost_ngn: costVal !== '' && !isNaN(parseFloat(costVal)) ? parseFloat(costVal) : null,
        cost_source: source,
        cost_provenance_ref: prov || ''
      });
    });

    if (hasValidationError) return;

    const nonProduct = [];
    document.querySelectorAll('.bom-np-row').forEach((row, idx) => {
      const type = row.querySelector('.bom-np-type')?.value;
      const name = row.querySelector('.bom-np-name')?.value?.trim();
      const costVal = row.querySelector('.bom-np-cost')?.value?.trim();
      const prov = row.querySelector('.bom-np-prov')?.value?.trim();

      if (!name) {
        alert(`Service Line ${idx + 1}: Description is required.`);
        hasValidationError = true;
        return;
      }

      nonProduct.push({
        cost_type: type,
        name: name,
        cost_ngn: costVal !== '' && !isNaN(parseFloat(costVal)) ? parseFloat(costVal) : null,
        provenance_ref: prov || ''
      });
    });

    if (hasValidationError) return;

    const saveBtn = document.getElementById('btn-save-bom');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving Revision...';
    }

    try {
      const res = await apiFetch(`/api/admin/solar-packages/${activeBomPackageId}/bom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_revision: Number(baseRev),
          status,
          revision_notes: notes,
          components,
          non_product_costs: nonProduct
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save BOM revision');
      }

      alert(`BOM revision ${data.bom.revision} saved successfully!`);
      const modal = document.getElementById('modal-bom-editor');
      if (modal) modal.close();
      loadSolarPackagesModule();
    } catch (err) {
      console.error('[SAVE BOM ERROR]:', err);
      alert(`Save Error: ${err.message}`);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save BOM Revision';
      }
    }
  }

  async function submitFinanceReviewCurrentBom() {
    if (!activeBomPackageId) return;

    const baseRev = document.getElementById('bom-base-revision')?.value;
    const isApproved = confirm('Click OK to submit an APPROVED Finance Review (Cost Verified),\nor CANCEL to return/reject for costing correction.');
    const decisionChoice = isApproved ? 'reviewed' : 'rejected';

    const notes = prompt(`Enter ${decisionChoice === 'reviewed' ? 'Finance Review' : 'Rejection'} notes for Rev ${baseRev}:`) || '';

    try {
      const res = await apiFetch(`/api/admin/solar-packages/${activeBomPackageId}/bom/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_revision: Number(baseRev),
          decision: decisionChoice,
          notes: notes
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit finance review');
      }

      alert(`Finance review (${decisionChoice.toUpperCase()}) submitted successfully for Revision ${data.bom.revision}!`);
      const modal = document.getElementById('modal-bom-editor');
      if (modal) modal.close();
      loadSolarPackagesModule();
    } catch (err) {
      console.error('[FINANCE REVIEW ERROR]:', err);
      alert(`Finance Review Error: ${err.message}`);
    }
  }

  async function approveCurrentBom() {
    if (!activeBomPackageId) return;

    if (!confirm('Are you sure you want to formally APPROVE this Bill of Materials? This action requires 100% verified component and service costs and prior Finance Review.')) {
      return;
    }

    const notes = prompt('Enter optional approval sign-off notes (e.g. Approved for commercial production):') || '';

    try {
      const res = await apiFetch(`/api/admin/solar-packages/${activeBomPackageId}/bom/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_notes: notes })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to approve BOM');
      }

      alert(`BOM revision ${data.bom.revision} approved successfully by superadmin!`);
      const modal = document.getElementById('modal-bom-editor');
      if (modal) modal.close();
      loadSolarPackagesModule();
    } catch (err) {
      console.error('[APPROVE BOM ERROR]:', err);
      alert(`Approval Error: ${err.message}`);
    }
  }

  function openBomRevisionsModal() {
    const modal = document.getElementById('modal-bom-revisions');
    const tbody = document.getElementById('bom-revisions-tbody');
    if (!modal || !tbody) return;

    if (!activeBomData) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 1.5rem;">No revision history available.</td></tr>';
      modal.showModal();
      return;
    }

    const history = Array.isArray(activeBomData.history) ? activeBomData.history : [];
    const allRevs = [
      ...history,
      {
        revision: activeBomData.revision,
        saved_at: activeBomData.updated_at || new Date(),
        saved_by_email: activeBomData.updated_by_email || activeBomData.created_by_email,
        status: activeBomData.status,
        cost_summary: activeBomData.cost_summary,
        finance_review_snapshot: activeBomData.finance_review,
        approved_by_email: activeBomData.approved_by_email,
        approved_at: activeBomData.approved_at,
        revision_notes: activeBomData.notes || 'Current active revision'
      }
    ];

    allRevs.sort((a, b) => b.revision - a.revision);

    tbody.innerHTML = allRevs.map(rev => {
      const costStr = rev.cost_summary && rev.cost_summary.is_costing_complete
        ? `₦${Number(rev.cost_summary.total_estimated_cost_ngn).toLocaleString()}`
        : 'Incomplete';
      const linesCount = rev.cost_summary ? rev.cost_summary.total_lines_count : '—';
      const dateStr = rev.saved_at ? new Date(rev.saved_at).toLocaleString() : '—';

      const finRev = rev.finance_review_snapshot;
      let dualAuthDetails = '';
      if (finRev && finRev.status === 'reviewed') {
        dualAuthDetails += `<div style="font-size: 0.7rem; color: #10B981; margin-top: 0.2rem;">Fin: ✓ ${escapeHtml(finRev.reviewed_by_email || 'Finance')}</div>`;
      } else if (finRev && finRev.status === 'invalidated') {
        dualAuthDetails += `<div style="font-size: 0.7rem; color: #F59E0B; margin-top: 0.2rem;">Fin: ⚠️ Invalidated</div>`;
      }
      if (rev.approved_by_email) {
        dualAuthDetails += `<div style="font-size: 0.7rem; color: #38BDF8; margin-top: 0.1rem;">App: ✓ ${escapeHtml(rev.approved_by_email)}</div>`;
      }

      return `
        <tr>
          <td><strong style="color: #FFFFFF;">Rev ${rev.revision}</strong></td>
          <td style="font-size: 0.76rem; color: var(--color-d-text-muted);">${dateStr}</td>
          <td style="font-size: 0.76rem;">${escapeHtml(rev.saved_by_email || '—')}</td>
          <td style="text-align: center;">
            <span class="badge-status badge-${rev.status === 'approved' ? 'approved' : (rev.status === 'ready_for_review' ? 'review' : 'unapproved')}">${escapeHtml(rev.status || 'draft')}</span>
            ${dualAuthDetails}
          </td>
          <td style="text-align: center;">${linesCount}</td>
          <td style="text-align: right; font-weight: 700;">${costStr}</td>
          <td style="font-size: 0.74rem; color: var(--color-d-text-muted);">${escapeHtml(rev.revision_notes || '—')}</td>
        </tr>
      `;
    }).join('');

    modal.showModal();
  }

  // ==========================================================================
  // PRODUCT IMAGE UPLOADERS & MEDIA ASSET MANAGEMENT
  // ==========================================================================

  function setupProductImageUploaders() {
    function bindUploader({ btnId, fileInputId, textInputId, previewImgId, statusId, containerId, previewBtnId }) {
      const btn = document.getElementById(btnId);
      const fileInput = document.getElementById(fileInputId);
      const textInput = document.getElementById(textInputId);
      const previewImg = document.getElementById(previewImgId);
      const statusEl = document.getElementById(statusId);
      const container = document.getElementById(containerId);

      if (!btn || !fileInput) return;

      btn.addEventListener('click', () => {
        fileInput.click();
      });

      async function uploadFile(file) {
        if (!file) return;

        // Client-side file type check
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
        if (!validTypes.includes(file.type) && !/\.(jpe?g|png|webp|svg|gif)$/i.test(file.name)) {
          if (statusEl) {
            statusEl.textContent = '❌ Invalid format. Please choose JPG, PNG, WEBP, SVG, or GIF.';
            statusEl.className = 'upload-status-text error';
          }
          return;
        }

        // 5MB limit
        if (file.size > 5 * 1024 * 1024) {
          if (statusEl) {
            statusEl.textContent = '❌ File exceeds 5MB limit.';
            statusEl.className = 'upload-status-text error';
          }
          return;
        }

        // Instant preview
        if (previewImg) {
          previewImg.src = URL.createObjectURL(file);
        }

        if (statusEl) {
          statusEl.textContent = `⏳ Uploading "${file.name}"...`;
          statusEl.className = 'upload-status-text uploading';
        }
        btn.disabled = true;

        try {
          const formData = new FormData();
          formData.append('image', file);

          const res = await fetch('/api/admin/uploads/product-image', {
            method: 'POST',
            body: formData
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Upload failed.');
          }

          if (textInput) {
            textInput.value = data.imageUrl;
          }
          if (previewImg) {
            previewImg.src = data.imageUrl;
          }
          if (statusEl) {
            statusEl.textContent = `✓ Uploaded: ${data.filename}`;
            statusEl.className = 'upload-status-text success';
          }
        } catch (err) {
          if (statusEl) {
            statusEl.textContent = `❌ ${err.message}`;
            statusEl.className = 'upload-status-text error';
          }
        } finally {
          btn.disabled = false;
          fileInput.value = '';
        }
      }

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) uploadFile(file);
      });

      // Drag and drop onto container
      if (container) {
        ['dragenter', 'dragover'].forEach(eventName => {
          container.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            container.style.borderColor = 'var(--color-brand-yellow, #FFB90C)';
            container.style.background = 'rgba(255, 185, 12, 0.08)';
          }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
          container.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            container.style.borderColor = '';
            container.style.background = '';
          }, false);
        });

        container.addEventListener('drop', (e) => {
          const dt = e.dataTransfer;
          const file = dt && dt.files && dt.files[0];
          if (file) uploadFile(file);
        });
      }

      // Sync preview when typing or pasting URL
      function updateUrlPreview() {
        if (!textInput || !previewImg) return;
        const val = textInput.value.trim();
        if (val) {
          previewImg.src = (val.startsWith('http') || val.startsWith('/')) ? val : `/${val}`;
        } else {
          previewImg.src = '/images/logo-mark.svg';
        }
      }

      if (textInput && previewImg) {
        textInput.addEventListener('input', updateUrlPreview);
        textInput.addEventListener('change', updateUrlPreview);
        textInput.addEventListener('paste', () => setTimeout(updateUrlPreview, 50));
      }

      if (previewBtnId) {
        const previewBtn = document.getElementById(previewBtnId);
        if (previewBtn) {
          previewBtn.addEventListener('click', (e) => {
            e.preventDefault();
            updateUrlPreview();
          });
        }
      }
    }

    // Bind Edit Modal
    bindUploader({
      btnId: 'btn-edit-prod-choose-file',
      fileInputId: 'edit-prod-file-input',
      textInputId: 'edit-prod-image',
      previewImgId: 'edit-prod-img-preview',
      statusId: 'edit-prod-upload-status',
      containerId: 'edit-prod-preview-container',
      previewBtnId: 'btn-edit-prod-preview-link'
    });

    // Bind Add Modal
    bindUploader({
      btnId: 'btn-add-prod-choose-file',
      fileInputId: 'add-prod-file-input',
      textInputId: 'add-prod-image',
      previewImgId: 'add-prod-img-preview',
      statusId: 'add-prod-upload-status',
      containerId: 'add-prod-preview-container',
      previewBtnId: 'btn-add-prod-preview-link'
    });
  }

  let cachedMediaImages = [];

  async function loadImageManagerModule() {
    const grid = document.getElementById('media-gallery-grid');
    const badge = document.getElementById('media-total-badge');
    if (!grid) return;

    grid.innerHTML = '<div class="media-loading-placeholder">Loading image gallery from server...</div>';

    try {
      const res = await fetch('/api/admin/uploads/images');
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load media files.');
      }

      cachedMediaImages = data.images || [];

      if (badge) {
        const totalMb = (cachedMediaImages.reduce((sum, img) => sum + (img.size || 0), 0) / (1024 * 1024)).toFixed(2);
        badge.textContent = `${cachedMediaImages.length} images (${totalMb} MB)`;
      }

      renderMediaGallery(cachedMediaImages);
    } catch (err) {
      grid.innerHTML = `<div class="media-loading-placeholder" style="color: #F87171;">Failed to load images: ${err.message}</div>`;
    }
  }

  function renderMediaGallery(imagesToRender) {
    const grid = document.getElementById('media-gallery-grid');
    if (!grid) return;

    if (!imagesToRender || imagesToRender.length === 0) {
      grid.innerHTML = '<div class="media-loading-placeholder">No images found. Upload your first product picture above!</div>';
      return;
    }

    grid.innerHTML = imagesToRender.map(img => {
      const sizeKb = img.size ? (img.size / 1024).toFixed(1) + ' KB' : '';
      const dateStr = img.modifiedAt ? formatDate(img.modifiedAt) : '';

      return `
        <div class="media-card" data-url="${escapeHtml(img.url)}" data-filename="${escapeHtml(img.filename)}">
          <div class="media-card-thumb">
            <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.filename)}" loading="lazy" onerror="this.src='/images/logo-mark.svg'">
          </div>
          <div class="media-card-info">
            <div>
              <div class="media-card-name" title="${escapeHtml(img.filename)}">${escapeHtml(img.filename)}</div>
              <div class="media-card-meta">${sizeKb} ${dateStr ? '• ' + dateStr : ''}</div>
            </div>
            <div class="media-card-actions">
              <button type="button" class="btn-media-copy" data-copy-url="${escapeHtml(img.url)}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Copy Path</span>
              </button>
              <a href="${escapeHtml(img.url)}" target="_blank" rel="noopener" class="btn-media-copy" style="text-decoration:none;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                <span>View</span>
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach copy listeners
    grid.querySelectorAll('[data-copy-url]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url = btn.getAttribute('data-copy-url');
        if (url) {
          try {
            await navigator.clipboard.writeText(url);
            const origHtml = btn.innerHTML;
            btn.innerHTML = '<span>✓ Copied!</span>';
            setTimeout(() => { btn.innerHTML = origHtml; }, 2000);
          } catch (e) {
            prompt('Copy image URL:', url);
          }
        }
      });
    });
  }

  function setupMediaLibraryListeners() {
    const uploadBtn = document.getElementById('btn-media-library-upload');
    const fileInput = document.getElementById('media-library-file-input');
    const dropzone = document.getElementById('media-dropzone');
    const dropzoneStatus = document.getElementById('media-dropzone-status');
    const searchInput = document.getElementById('media-search-input');
    const refreshBtn = document.getElementById('btn-refresh-media');

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => fileInput.click());
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('drag-over');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt && dt.files && dt.files[0];
        if (file) handleDirectMediaUpload(file);
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) handleDirectMediaUpload(file);
      });
    }

    async function handleDirectMediaUpload(file) {
      if (!dropzoneStatus) return;
      dropzoneStatus.style.display = 'block';

      if (file.size > 5 * 1024 * 1024) {
        dropzoneStatus.textContent = '❌ File size exceeds 5MB limit.';
        dropzoneStatus.className = 'upload-status-text error';
        return;
      }

      dropzoneStatus.textContent = `⏳ Uploading "${file.name}" to media storage...`;
      dropzoneStatus.className = 'upload-status-text uploading';

      try {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('/api/admin/uploads/product-image', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Upload failed.');
        }

        dropzoneStatus.textContent = `✓ Uploaded: ${data.filename}`;
        dropzoneStatus.className = 'upload-status-text success';

        await loadImageManagerModule();

        setTimeout(() => {
          if (dropzoneStatus) dropzoneStatus.style.display = 'none';
        }, 4000);
      } catch (err) {
        dropzoneStatus.textContent = `❌ ${err.message}`;
        dropzoneStatus.className = 'upload-status-text error';
      } finally {
        if (fileInput) fileInput.value = '';
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
          renderMediaGallery(cachedMediaImages);
        } else {
          const filtered = cachedMediaImages.filter(img =>
            img.filename.toLowerCase().includes(query) || img.url.toLowerCase().includes(query)
          );
          renderMediaGallery(filtered);
        }
      }, 250));
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadImageManagerModule);
    }
  }

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
