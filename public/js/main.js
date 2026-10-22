/**
 * DEVICE PRO — Main Interactive Script
 * Accessible, lightweight, vanilla JavaScript
 * Handles navigation, modals, drawers, sticky header, and form behaviors
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Sticky Header Scroll Effect
  const header = document.querySelector('.products-header') || document.querySelector('.site-header');
  if (header) {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // 2. Modals and Drawers Utility
  const searchModal = document.getElementById('search-dialog');
  const cartDrawer = document.getElementById('cart-drawer');
  const mobileNavDrawer = document.getElementById('mobile-nav-drawer');
  const quoteModal = document.getElementById('quote-modal');

  const getBackdrop = () => {
    let bd = document.getElementById('modal-backdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'modal-backdrop';
      bd.className = 'modal-backdrop';
      document.body.appendChild(bd);
      bd.addEventListener('click', closeAll);
    }
    return bd;
  };

  const openElement = (elem) => {
    if (!elem) return;
    const bd = getBackdrop();
    if (bd) {
      bd.style.setProperty('z-index', '99990', 'important');
      bd.classList.add('open');
    }
    elem.style.setProperty('z-index', '100000', 'important');
    elem.style.setProperty('background-color', '#FFFFFF', 'important');
    elem.style.setProperty('background', '#FFFFFF', 'important');
    elem.classList.add('open');
    elem.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const firstInput = elem.querySelector('input, button');
    if (firstInput) firstInput.focus();
  };

  const closeAll = () => {
    const bd = document.getElementById('modal-backdrop');
    if (bd) bd.classList.remove('open');
    document.querySelectorAll('.drawer.open, #cart-drawer.open, #mobile-nav-drawer.open').forEach(el => {
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
    });
    document.querySelectorAll('dialog[open]').forEach(d => {
      if (typeof d.close === 'function') {
        try { d.close(); } catch (_) {}
      }
    });
    document.body.style.overflow = '';
  };

  const existingBackdrop = document.getElementById('modal-backdrop');
  if (existingBackdrop) {
    existingBackdrop.addEventListener('click', closeAll);
  }

  // Close buttons inside modals/drawers
  document.querySelectorAll('[data-close-modal], [data-close-drawer], [data-close-dialog]').forEach(btn => {
    btn.addEventListener('click', closeAll);
  });

  // ESC Key Listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAll();
    }
    // Ctrl/Cmd + K for Search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (window.DeviceProSearch) {
        window.DeviceProSearch.open();
      } else {
        openElement(searchModal);
      }
    }
  });

  // Search Triggers
  document.querySelectorAll('[data-trigger-search]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.DeviceProSearch) {
        window.DeviceProSearch.open();
      } else {
        openElement(searchModal);
      }
    });
  });

  // Cart Triggers
  document.querySelectorAll('[data-trigger-cart]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.DeviceProCart) {
        window.DeviceProCart.openDrawer();
      } else {
        openElement(cartDrawer);
      }
    });
  });

  // Checkout Auth Protection: Redirect unauthenticated customers to login
  document.addEventListener('click', async (e) => {
    const checkoutBtn = e.target.closest('#btn-cart-checkout, .btn-checkout-submit, [data-trigger-checkout]');
    if (!checkoutBtn) return;
    if (checkoutBtn.disabled || checkoutBtn.getAttribute('aria-disabled') === 'true') return;

    // Do not intercept order submission button on checkout page itself
    if (checkoutBtn.id === 'btn-submit-order' || checkoutBtn.closest('#checkout-form')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (authChecked && cachedUser) {
      window.location.href = '/checkout';
      return;
    }

    try {
      checkoutBtn.style.opacity = '0.7';
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          cachedUser = data.user;
          authChecked = true;
          window.location.href = '/checkout';
          return;
        }
      }
    } catch (_) {}
    finally {
      checkoutBtn.style.opacity = '';
    }

    window.location.href = '/login?redirect=' + encodeURIComponent('/checkout');
  }, true);

  // Mobile Menu Triggers
  const mobileToggle = document.getElementById('mobile-menu-btn');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => openElement(mobileNavDrawer));
  }

  // Quote Triggers
  document.querySelectorAll('[data-trigger-quote]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openElement(quoteModal);
    });
  });

  // 3. Hero Slider Dot Interaction (Micro-interaction)
  const dots = document.querySelectorAll('.hero-slider-indicators [data-slide-index]');
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      dots.forEach(d => {
        d.classList.remove('slider-bar-active');
        d.classList.add('slider-bar-inactive');
      });
      dot.classList.remove('slider-bar-inactive');
      dot.classList.add('slider-bar-active');
    });
  });

  // 4. Smooth Anchor Scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          closeAll();
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // 5. Quote Form Submission Simulation
  const quoteForm = document.getElementById('quick-quote-form');
  if (quoteForm) {
    quoteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = quoteForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Submitting Request...';
      submitBtn.disabled = true;

      setTimeout(() => {
        alert('Thank you! Your solar quotation request has been received. Our technical team will reach out shortly.');
        quoteForm.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        closeAll();
      }, 700);
    });
  }

  // 6. Search Input Handling
  const searchInput = document.getElementById('site-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const resultsContainer = document.getElementById('search-quick-results');
      if (resultsContainer) {
        if (query.length > 1) {
          resultsContainer.style.display = 'block';
        } else {
          resultsContainer.style.display = 'none';
        }
      }
    });
  }

  // 7. Dynamic User Authentication Header Indicator & Profile Navigation
  let cachedUser = null;
  let authChecked = false;

  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const updateMobileDrawerProfile = async (user) => {
    const drawerBody = document.querySelector('#mobile-nav-drawer .drawer-body');
    if (!drawerBody) return;

    let profileSection = document.getElementById('mobile-drawer-profile-root');
    if (!profileSection) {
      profileSection = document.createElement('div');
      profileSection.id = 'mobile-drawer-profile-root';
      profileSection.className = 'mobile-drawer-profile-section';
      drawerBody.insertBefore(profileSection, drawerBody.firstChild);
    }

    if (user) {
      const displayName = user.fullName || user.username || 'Customer';
      let initials = 'DP';
      if (displayName) {
        const parts = displayName.trim().split(/\s+/);
        initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
      }
      const roleText = user.role === 'admin' ? 'Administrator' : 'Verified Customer';

      profileSection.innerHTML = `
        <a href="/profile" class="mobile-drawer-user-card" title="View Customer Profile" data-close-drawer>
          <div class="mobile-drawer-avatar" aria-hidden="true">
            <span class="mobile-drawer-initials">${initials}</span>
            <span class="mobile-drawer-avatar-status" title="Active"></span>
          </div>
          <div class="mobile-drawer-user-info">
            <h3 class="mobile-drawer-user-name">${escapeHtml(displayName)}</h3>
            <p class="mobile-drawer-user-email">${escapeHtml(user.email || '')}</p>
            <div class="mobile-drawer-badge-row">
              <span class="mobile-drawer-role-badge">${roleText}</span>
            </div>
          </div>
        </a>
        <div class="mobile-drawer-profile-sublinks">
          <a href="/profile" class="mobile-drawer-sublink" data-close-drawer data-profile-action="overview">
            <span class="mobile-drawer-sublink-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              My Profile
            </span>
          </a>
          <a href="/profile#orders" class="mobile-drawer-sublink" data-close-drawer data-profile-action="orders">
            <span class="mobile-drawer-sublink-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              Order History
            </span>
            <span class="tab-counter mobile-drawer-order-count" id="mobile-drawer-order-count">0</span>
          </a>
          <a href="/profile#security" class="mobile-drawer-sublink" data-close-drawer data-profile-action="security">
            <span class="mobile-drawer-sublink-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Account Security
            </span>
          </a>
          <button type="button" class="mobile-drawer-signout-btn" id="mobile-drawer-signout-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign Out
          </button>
        </div>
      `;

      // Order count query
      try {
        const orderRes = await fetch('/api/profile/orders?limit=1', { credentials: 'include' });
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          if (orderData.success && typeof orderData.total === 'number') {
            const countBadge = document.getElementById('mobile-drawer-order-count');
            if (countBadge) countBadge.textContent = orderData.total;
          }
        }
      } catch (_) {}

      // Bind signout button
      const signoutBtn = document.getElementById('mobile-drawer-signout-btn');
      if (signoutBtn) {
        signoutBtn.addEventListener('click', async () => {
          signoutBtn.disabled = true;
          try {
            await fetch('/api/auth/logout', { method: 'POST' });
          } catch (_) {}
          window.location.href = '/login?logged_out=1';
        });
      }
    } else {
      profileSection.innerHTML = `
        <div class="mobile-drawer-guest-card">
          <div class="mobile-drawer-guest-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="mobile-drawer-guest-info">
            <p class="mobile-drawer-guest-title">Customer Account</p>
            <p class="mobile-drawer-guest-desc">Sign in to track orders &amp; profile</p>
            <a href="/login?redirect=/profile" class="mobile-drawer-guest-btn" data-close-drawer>
              Sign In / Register →
            </a>
          </div>
        </div>
      `;
    }
  };

  const checkUserSession = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          cachedUser = data.user;
          authChecked = true;
          document.querySelectorAll('.header-user-btn, [data-user-profile-btn]').forEach(btn => {
            btn.setAttribute('title', `Account: ${data.user.fullName || data.user.email}`);
            btn.setAttribute('aria-label', `Account: ${data.user.fullName || data.user.email}`);
            btn.classList.add('user-logged-in');
            if (btn.tagName === 'A') {
              btn.setAttribute('href', '/profile');
            }
          });
          document.querySelectorAll('.mobile-profile-label').forEach(label => {
            label.textContent = data.user.fullName ? `Profile (${data.user.fullName.split(' ')[0]})` : 'My Profile';
          });
          updateMobileDrawerProfile(data.user);
          return;
        }
      }
    } catch (_) {}
    cachedUser = null;
    authChecked = true;
    document.querySelectorAll('.header-user-btn, [data-user-profile-btn]').forEach(btn => {
      btn.setAttribute('title', 'Sign In / My Profile');
      btn.setAttribute('aria-label', 'Sign In or View Profile');
      btn.classList.remove('user-logged-in');
      if (btn.tagName === 'A') {
        btn.setAttribute('href', '/login?redirect=/profile');
      }
    });
    document.querySelectorAll('.mobile-profile-label').forEach(label => {
      label.textContent = 'Sign In / Profile';
    });
    updateMobileDrawerProfile(null);
  };

  // Immediate Profile Icon Click Handler
  document.addEventListener('click', async (e) => {
    const profileBtn = e.target.closest('.header-user-btn, [data-user-profile-btn]');
    if (!profileBtn) return;

    // Intercept navigation to verify authoritative server session
    e.preventDefault();

    if (authChecked && cachedUser) {
      window.location.href = '/profile';
      return;
    }

    try {
      profileBtn.style.opacity = '0.7';
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          cachedUser = data.user;
          authChecked = true;
          window.location.href = '/profile';
          return;
        }
      }
    } catch (_) {}
    finally {
      profileBtn.style.opacity = '';
    }

    // Unauthenticated -> redirect to login with intended profile destination preserved
    window.location.href = '/login?redirect=/profile';
  });

  checkUserSession();
});
