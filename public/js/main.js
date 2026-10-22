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
