/**
 * DEVICE PRO — Customer Profile & Account Client Controller
 * Handles user authentication state, profile data sync, tab routing,
 * password updates, and order history rendering.
 */

(function () {
  'use strict';

  // State
  let currentUser = null;
  let userOrders = [];

  // DOM Elements
  const sidebarInitials = document.getElementById('profile-avatar-initials');
  const sidebarName = document.getElementById('sidebar-display-name');
  const sidebarEmail = document.getElementById('sidebar-display-email');
  const sidebarRole = document.getElementById('sidebar-role-badge');
  const sidebarOrderCount = document.getElementById('sidebar-order-count');
  const sidebarSignOutBtn = document.getElementById('btn-sidebar-signout');

  // Overview metrics
  const metricAccountStatus = document.getElementById('metric-account-status');
  const metricMemberSince = document.getElementById('metric-member-since');
  const metricTotalOrders = document.getElementById('metric-total-orders');
  const metricAuthMethod = document.getElementById('metric-auth-method');
  const metricAuthDetail = document.getElementById('metric-auth-detail');

  // Overview inputs
  const overviewName = document.getElementById('overview-name');
  const overviewEmail = document.getElementById('overview-email');
  const overviewPhone = document.getElementById('overview-phone');

  // Personal Info form
  const formPersonal = document.getElementById('form-personal-info');
  const editFullName = document.getElementById('edit-fullname');
  const editEmail = document.getElementById('edit-email');
  const editPhone = document.getElementById('edit-phone');
  const editRole = document.getElementById('edit-role');
  const btnSavePersonal = document.getElementById('btn-save-personal');

  // Security elements
  const googleBanner = document.getElementById('google-account-banner');
  const formPassword = document.getElementById('form-change-password');
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const btnSubmitPassword = document.getElementById('btn-submit-password');

  // Orders container
  const ordersContainer = document.getElementById('orders-container');
  const toastContainer = document.getElementById('toast-container');

  // Helpers
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `profile-toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'success' 
          ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>' 
          : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
      </svg>
      <span>${escapeHtml(message)}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatNaira(amount) {
    const num = Number(amount) || 0;
    return '₦' + new Intl.NumberFormat('en-NG').format(num);
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (_) {
      return dateStr;
    }
  }

  function getInitials(name, email) {
    if (name && typeof name === 'string' && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (email && typeof email === 'string') {
      return email.substring(0, 2).toUpperCase();
    }
    return 'DP';
  }

  // Tab Navigation Routing
  function initTabs() {
    const tabButtons = document.querySelectorAll('.profile-nav-btn[data-target-panel]');
    const panels = document.querySelectorAll('.profile-panel');

    function activateTab(panelId) {
      tabButtons.forEach(btn => {
        const matches = btn.getAttribute('data-target-panel') === panelId;
        btn.classList.toggle('active', matches);
        btn.setAttribute('aria-selected', matches ? 'true' : 'false');
      });

      panels.forEach(p => {
        p.classList.toggle('active', p.id === panelId);
      });
    }

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target-panel');
        activateTab(targetId);
        window.history.replaceState(null, '', `#${targetId.replace('panel-', '')}`);
      });
    });

    // Check URL hash on load (e.g. #orders, #security, #personal)
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && document.getElementById(`panel-${hash}`)) {
        activateTab(`panel-${hash}`);
      }
    };

    window.addEventListener('hashchange', handleHash);
    handleHash();

    // Support mobile drawer profile action clicks directly
    document.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-profile-action]');
      if (!actionBtn) return;
      const action = actionBtn.getAttribute('data-profile-action');
      if (action && document.getElementById(`panel-${action}`)) {
        e.preventDefault();
        activateTab(`panel-${action}`);
        window.history.replaceState(null, '', `#${action}`);
        const drawer = document.getElementById('mobile-nav-drawer');
        const bd = document.getElementById('modal-backdrop');
        if (drawer) drawer.classList.remove('open');
        if (bd) bd.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  // Password Visibility Toggle
  function initPasswordToggles() {
    document.querySelectorAll('[data-toggle-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-toggle-target');
        const input = document.getElementById(targetId);
        if (input) {
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          btn.style.color = isPassword ? '#0B192C' : '#94A3B8';
        }
      });
    });
  }

  // Fetch Current Profile
  async function loadProfile() {
    try {
      const res = await fetch('/api/profile', {
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      });

      if (res.status === 401 || res.status === 403) {
        // Not authenticated — redirect smoothly to login with redirect back
        window.location.href = `/login?redirect=${encodeURIComponent('/profile')}`;
        return;
      }

      const data = await res.json();
      if (!data.success || !data.user) {
        window.location.href = `/login?redirect=${encodeURIComponent('/profile')}`;
        return;
      }

      currentUser = data.user;
      renderUserData(currentUser);
      loadUserOrders();
    } catch (err) {
      console.error('[PROFILE LOAD ERROR]:', err);
      showToast('Network error while loading your profile.', 'error');
    }
  }

  // Populate Profile UI
  function renderUserData(user) {
    const initials = getInitials(user.fullName, user.email);
    sidebarInitials.textContent = initials;
    sidebarName.textContent = user.fullName || user.username || 'Customer';
    sidebarEmail.textContent = user.email || '';
    sidebarRole.textContent = user.role === 'admin' ? 'Administrator' : 'Verified Customer';

    // Overview
    overviewName.value = user.fullName || '';
    overviewEmail.value = user.email || '';
    overviewPhone.value = user.phone || '';
    metricAccountStatus.textContent = 'Active';
    if (user.createdAt) {
      const createdDate = new Date(user.createdAt);
      metricMemberSince.textContent = `Member since ${createdDate.toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}`;
    }

    if (user.authMethod === 'google') {
      metricAuthMethod.textContent = 'Google';
      metricAuthDetail.textContent = 'Google OAuth 2.0';
    } else {
      metricAuthMethod.textContent = 'Password';
      metricAuthDetail.textContent = 'Encrypted Credentials';
    }

    // Personal Info Form
    editFullName.value = user.fullName || '';
    editEmail.value = user.email || '';
    editPhone.value = user.phone || '';
    editRole.value = user.role === 'admin' ? 'Administrator' : 'Customer Account';

    // Security Form
    if (user.authMethod === 'google' && !user.hasPassword) {
      googleBanner.style.display = 'flex';
      formPassword.style.display = 'none';
    } else {
      googleBanner.style.display = 'none';
      formPassword.style.display = 'block';
    }
  }

  // Personal Info Form Handler
  function initPersonalForm() {
    formPersonal.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = editFullName.value.trim();
      const phone = editPhone.value.trim();

      if (!fullName || fullName.length < 2) {
        showToast('Please provide your full name (minimum 2 characters).', 'error');
        editFullName.focus();
        return;
      }

      btnSavePersonal.disabled = true;
      btnSavePersonal.innerHTML = `
        <svg class="spin-animation" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
        </svg>
        Saving Changes...
      `;

      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ fullName, phone })
        });

        const data = await res.json();
        if (data.success && data.user) {
          currentUser = { ...currentUser, ...data.user };
          renderUserData(currentUser);
          showToast('Profile information successfully saved.', 'success');
        } else {
          showToast(data.error || 'Failed to update profile.', 'error');
        }
      } catch (err) {
        console.error('[PROFILE UPDATE ERROR]:', err);
        showToast('Network error while saving profile.', 'error');
      } finally {
        btnSavePersonal.disabled = false;
        btnSavePersonal.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          Save Profile Changes
        `;
      }
    });
  }

  // Password Change Handler
  function initPasswordForm() {
    formPassword.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = currentPasswordInput.value;
      const newPassword = newPasswordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      if (!currentPassword) {
        showToast('Please enter your current password.', 'error');
        currentPasswordInput.focus();
        return;
      }

      if (newPassword.length < 8) {
        showToast('New password must be at least 8 characters long.', 'error');
        newPasswordInput.focus();
        return;
      }

      if (newPassword !== confirmPassword) {
        showToast('New password and confirmation do not match.', 'error');
        confirmPasswordInput.focus();
        return;
      }

      btnSubmitPassword.disabled = true;
      btnSubmitPassword.innerHTML = `
        <svg class="spin-animation" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
        </svg>
        Updating Password...
      `;

      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
        });

        const data = await res.json();
        if (data.success) {
          formPassword.reset();
          showToast('Your password was updated successfully.', 'success');
        } else {
          showToast(data.error || 'Password update failed.', 'error');
        }
      } catch (err) {
        console.error('[PASSWORD CHANGE ERROR]:', err);
        showToast('Network error while updating password.', 'error');
      } finally {
        btnSubmitPassword.disabled = false;
        btnSubmitPassword.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Update Password
        `;
      }
    });
  }

  // Fetch & Render Orders
  async function loadUserOrders() {
    try {
      const res = await fetch('/api/profile/orders?limit=30', {
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        userOrders = data.orders;
        sidebarOrderCount.textContent = userOrders.length;
        metricTotalOrders.textContent = userOrders.length;
        renderOrdersList(userOrders);
      } else {
        renderOrdersList([]);
      }
    } catch (err) {
      console.error('[ORDERS LOAD ERROR]:', err);
      ordersContainer.innerHTML = `
        <div class="orders-empty-state">
          <p class="empty-title">Unable to load orders</p>
          <p class="empty-desc">There was a problem retrieving your order history. Please refresh the page.</p>
        </div>
      `;
    }
  }

  function renderOrdersList(orders) {
    if (!orders || orders.length === 0) {
      ordersContainer.innerHTML = `
        <div class="orders-empty-state">
          <div class="empty-state-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          </div>
          <h4 class="empty-state-title">No Orders Placed Yet</h4>
          <p class="empty-desc">You haven't purchased any solar equipment or installation packages yet. When you complete an order, tracking details and warranty certificates will appear here.</p>
          <a href="/products" class="btn-explore-products">Explore Solar Catalogue →</a>
        </div>
      `;
      return;
    }

    ordersContainer.innerHTML = orders.map(order => {
      const itemsList = Array.isArray(order.items) ? order.items : [];
      const itemsCount = itemsList.reduce((sum, it) => sum + (it.quantity || 1), 0);
      const itemsSummary = itemsList.map(it => `${it.quantity || 1}x ${it.name || it.title || 'Product'}`).slice(0, 2).join(', ') + (itemsList.length > 2 ? ` +${itemsList.length - 2} more` : '');
      const statusClass = (order.orderStatus || 'pending').toLowerCase();
      const trackingUrl = `/tracking?orderNumber=${encodeURIComponent(order.orderNumber)}`;

      return `
        <article class="order-history-card">
          <div class="order-card-header">
            <div class="order-ref-group">
              <span class="order-number">${escapeHtml(order.orderNumber)}</span>
              <span class="order-date">${formatDate(order.createdAt)}</span>
            </div>
            <div class="order-badges-group">
              <span class="badge-order-status ${statusClass}">${escapeHtml(order.orderStatus || 'Pending')}</span>
            </div>
          </div>

          <div class="order-card-body">
            <div class="order-items-summary">
              <span class="order-items-count">${itemsCount} item${itemsCount === 1 ? '' : 's'}</span>
              <span class="order-items-preview">${escapeHtml(itemsSummary || 'Solar Hardware Equipment')}</span>
            </div>

            <div class="order-amount-group">
              <span class="order-amount-label">Total Amount</span>
              <div class="order-amount-val">${formatNaira(order.totalNgn)}</div>
            </div>
          </div>

          <div class="order-card-footer">
            <div class="order-address-snippet">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${escapeHtml(order.deliveryState || order.deliveryAddress ? `${order.deliveryAddress || ''}, ${order.deliveryState || ''}` : 'Delivery to customer destination')}</span>
            </div>

            <a href="${trackingUrl}" class="btn-track-order-link">
              Track Order
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>
          </div>
        </article>
      `;
    }).join('');
  }

  // Sign Out Handler
  function initSignOut() {
    sidebarSignOutBtn.addEventListener('click', async () => {
      sidebarSignOutBtn.disabled = true;
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (_) {}
      window.location.href = '/login?logged_out=1';
    });
  }

  // Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initPasswordToggles();
    initPersonalForm();
    initPasswordForm();
    initSignOut();
    loadProfile();
  });

})();
