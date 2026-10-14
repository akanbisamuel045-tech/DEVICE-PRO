/**
 * DEVICE PRO — Main Interactive Script
 * Accessible, lightweight, vanilla JavaScript
 * Handles navigation, modals, drawers, sticky header, and form behaviors
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Sticky Header Scroll Effect
  const header = document.querySelector('.site-header');
  const handleScroll = () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // 2. Modals and Drawers Utility
  const backdrop = document.getElementById('modal-backdrop');
  const searchModal = document.getElementById('search-modal');
  const cartDrawer = document.getElementById('cart-drawer');
  const mobileNavDrawer = document.getElementById('mobile-nav-drawer');
  const quoteModal = document.getElementById('quote-modal');

  const openElement = (elem) => {
    if (!elem) return;
    backdrop.classList.add('open');
    elem.classList.add('open');
    document.body.style.overflow = 'hidden';
    const firstInput = elem.querySelector('input, button');
    if (firstInput) firstInput.focus();
  };

  const closeAll = () => {
    backdrop.classList.remove('open');
    [searchModal, cartDrawer, mobileNavDrawer, quoteModal].forEach(el => {
      if (el) el.classList.remove('open');
    });
    document.body.style.overflow = '';
  };

  if (backdrop) {
    backdrop.addEventListener('click', closeAll);
  }

  // Close buttons inside modals/drawers
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
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
      openElement(searchModal);
    }
  });

  // Search Triggers
  document.querySelectorAll('[data-trigger-search]').forEach(btn => {
    btn.addEventListener('click', () => openElement(searchModal));
  });

  // Cart Triggers
  document.querySelectorAll('[data-trigger-cart]').forEach(btn => {
    btn.addEventListener('click', () => openElement(cartDrawer));
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
});
