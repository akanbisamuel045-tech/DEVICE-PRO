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
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

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

  function showAuthScreen() {
    currentUser = null;
    if (authView) authView.style.display = 'flex';
    if (dashboardView) dashboardView.style.display = 'none';
  }

  function showDashboard() {
    if (authView) authView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'flex';

    // Set profile info
    if (nameEl) nameEl.textContent = currentUser.fullName || currentUser.username;
    if (roleEl) {
      roleEl.textContent = currentUser.role.toUpperCase();
      roleEl.className = `user-role-badge ${currentUser.role}`;
    }
    if (avatarEl) {
      const initials = (currentUser.fullName || currentUser.username)
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      avatarEl.textContent = initials || 'DP';
    }

    // Role-based visibility
    const isSuperadmin = currentUser.role === 'superadmin';
    document.querySelectorAll('.superadmin-only').forEach(el => {
      el.style.display = isSuperadmin ? '' : 'none';
    });

    // Load initial data
    loadDashboardStats();
    loadCurrentTab();
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

    // Logout Button
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        try {
          await apiFetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
          // ignore
        }
        clearToken();
        showAuthScreen();
      });
    }

    // Refresh Live Data Button
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        loadDashboardStats();
        loadCurrentTab();
      });
    }

    // Navigation Tabs
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });

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

    // Add Product Modal trigger
    const btnAddProd = document.getElementById('btn-add-product-modal');
    if (btnAddProd && addProductModal) {
      btnAddProd.addEventListener('click', () => {
        const form = document.getElementById('add-product-form');
        if (form) form.reset();
        addProductModal.showModal();
      });
    }

    // Add Product Form Submit
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
      addProductForm.addEventListener('submit', handleAddProductSubmit);
    }

    // Edit Product Form Submit
    const editProductForm = document.getElementById('product-edit-form');
    if (editProductForm) {
      editProductForm.addEventListener('submit', handleEditProductSubmit);
    }

    // Export Database Backup Button
    const btnExportBackup = document.getElementById('btn-export-backup');
    if (btnExportBackup) {
      btnExportBackup.addEventListener('click', exportDatabaseBackup);
    }
  }

  function showAuthError(msg) {
    if (authErrorBox) {
      authErrorBox.textContent = msg;
      authErrorBox.style.display = 'block';
    }
  }

  function switchTab(tabName) {
    activeTab = tabName;
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${tabName}`);
    });

    // Update Topbar Title
    const titles = {
      overview: 'Operational Overview',
      orders: 'Commercial Order Management & Fulfillment',
      fulfillment: 'Fulfillment, Waybills & Commissioning Operations',
      support: 'After-Sales Support, Field Claims & Digital Warranties',
      quotes: 'Solar Engineering Quotation Pipeline',
      enquiries: 'Customer Support & Inquiries Desk',
      products: 'Equipment Catalogue & Stock Control',
      audit: 'Tamper-Evident Audit Trail & Backups'
    };
    if (topbarTitle) topbarTitle.textContent = titles[tabName] || 'Operations Console';

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
      case 'quotes':
        loadQuotes();
        break;
      case 'enquiries':
        loadEnquiries();
        break;
      case 'products':
        loadProducts();
        break;
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
  // TAB 5: PRODUCT CATALOGUE & STOCK CONTROL
  // ==========================================================================
  async function loadProducts() {
    const tbody = document.getElementById('products-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">Loading catalogue from SQLite...</td></tr>';

    const category = document.getElementById('products-category-filter')?.value || '';
    const search = document.getElementById('products-search-input')?.value || '';

    try {
      const queryParams = new URLSearchParams();
      if (category) queryParams.set('category', category);
      if (search) queryParams.set('search', search);

      const res = await apiFetch(`/api/admin/products?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        cachedProducts = data.products || [];
        renderProductsTable();
      }
    } catch (err) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">Network error loading products.</td></tr>';
    }
  }

  function renderProductsTable() {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;

    if (!cachedProducts || cachedProducts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">No equipment SKUs found in catalogue.</td></tr>';
      return;
    }

    tbody.innerHTML = cachedProducts.map(p => `
      <tr>
        <td>
          <img src="/${p.image_url || 'images/products/jinko-solar-panel.png'}" alt="${escapeHtml(p.name)}" class="prod-table-thumb" onerror="this.src='/images/logo-mark.svg'">
        </td>
        <td><code>${escapeHtml(p.sku || 'N/A')}</code></td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(p.name)}</div>
          <div style="font-size: 0.72rem; color: rgba(238,241,248,0.5);">${escapeHtml(p.specifications || '')}</div>
        </td>
        <td>${escapeHtml(p.brand || 'DEVICE PRO')}</td>
        <td><span style="font-size: 0.75rem; text-transform: uppercase;">${escapeHtml(p.category_label || p.category)}</span></td>
        <td>${escapeHtml(p.power_rating || '—')}</td>
        <td style="font-weight: 700; color: #FFFFFF;">${formatNaira(p.price_ngn)}</td>
        <td><span class="status-pill status-${p.stock_status || 'in_stock'}">${p.stock_status || 'in_stock'}</span></td>
        <td style="text-align: center;">
          <div class="table-actions-cell">
            <button type="button" class="btn-table-action" onclick="window.adminOpenEditProductModal(${p.id})">Edit</button>
            <button type="button" class="btn-table-action delete" onclick="window.adminArchiveProduct(${p.id}, '${escapeHtml(p.name)}')">Archive</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  window.adminOpenEditProductModal = function (id) {
    const prod = cachedProducts.find(p => p.id === id);
    if (!prod || !productEditModal) return;

    document.getElementById('edit-prod-id').value = prod.id;
    document.getElementById('edit-prod-name').value = prod.name;
    document.getElementById('edit-prod-price').value = prod.price_ngn;
    document.getElementById('edit-prod-prev-price').value = prod.previous_price_ngn || '';
    document.getElementById('edit-prod-stock').value = prod.stock_status || 'in_stock';
    document.getElementById('edit-prod-specs').value = prod.specifications || '';

    const titleEl = document.getElementById('modal-product-title');
    if (titleEl) titleEl.textContent = `Edit SKU: ${prod.sku} (${prod.brand})`;

    productEditModal.showModal();
  };

  async function handleEditProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-prod-id').value;
    const name = document.getElementById('edit-prod-name').value;
    const price_ngn = parseInt(document.getElementById('edit-prod-price').value, 10);
    const previous_price_ngn = document.getElementById('edit-prod-prev-price').value ? parseInt(document.getElementById('edit-prod-prev-price').value, 10) : null;
    const stock_status = document.getElementById('edit-prod-stock').value;
    const specifications = document.getElementById('edit-prod-specs').value;

    try {
      const res = await apiFetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, price_ngn, previous_price_ngn, stock_status, specifications })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update equipment SKU');
      }

      productEditModal.close();
      loadProducts();
      loadDashboardStats();
    } catch (err) {
      alert('Error updating product: ' + err.message);
    }
  }

  async function handleAddProductSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('add-prod-name').value;
    const category = document.getElementById('add-prod-category').value;
    const brand = document.getElementById('add-prod-brand').value;
    const price_ngn = parseInt(document.getElementById('add-prod-price').value, 10);
    const sku = document.getElementById('add-prod-sku').value;
    const specifications = document.getElementById('add-prod-specs').value;

    try {
      const res = await apiFetch('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({ name, category, brand, price_ngn, sku, specifications })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish new equipment SKU');
      }

      addProductModal.close();
      loadProducts();
      loadDashboardStats();
    } catch (err) {
      alert('Error adding product: ' + err.message);
    }
  }

  window.adminArchiveProduct = async function (id, name) {
    if (!confirm(`Are you sure you want to unpublish/archive "${name}" from the live store catalogue?`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadProducts();
        loadDashboardStats();
      }
    } catch (err) {
      alert('Failed to archive product: ' + err.message);
    }
  };

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
