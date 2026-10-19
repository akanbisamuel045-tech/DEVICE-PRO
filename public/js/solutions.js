/**
 * DEVICE PRO — Solutions & Service Pages Client Controller
 * Handles sector navigation, quote form submission, FAQ accordions, and cart state.
 */

(function () {
  'use strict';

  const STORAGE_CART_KEY = 'devicepro_cart';

  // Cart badge update
  function updateCartBadges() {
    try {
      localStorage.removeItem('devicepro_cart');
      if (window.DeviceProCart) {
        window.DeviceProCart.updateBadge();
        return;
      }
      const cart = JSON.parse(localStorage.getItem('dp_equipment_cart_v1')) || [];
      const totalItems = cart.reduce((sum, item) => sum + (item.quantity || item.qty || 1), 0);
      document.querySelectorAll('.cart-badge').forEach(badge => {
        badge.textContent = totalItems;
        badge.setAttribute('aria-label', `${totalItems} items in cart`);
      });
    } catch {
      // ignore
    }
  }

  // Smooth scroll and active state for sector navigation
  const sectorNavBtns = document.querySelectorAll('.sector-nav-btn');
  sectorNavBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('href');
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        sectorNavBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const offset = 120;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = targetEl.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // Solutions Quote Form submission
  const solForm = document.getElementById('solutions-quote-form');
  const feedbackMsg = document.getElementById('sol-form-feedback');
  const submitBtn = document.getElementById('btn-sol-submit');

  if (solForm) {
    solForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('sol-name').value.trim();
      const phone = document.getElementById('sol-phone').value.trim();
      const email = document.getElementById('sol-email').value.trim();
      const type = document.getElementById('sol-type').value;
      const location = document.getElementById('sol-location').value.trim();
      const spend = document.getElementById('sol-spend').value;
      const notes = document.getElementById('sol-notes').value.trim();

      if (!name || !phone) {
        if (feedbackMsg) {
          feedbackMsg.className = 'form-feedback-msg error';
          feedbackMsg.textContent = 'Please provide your Full Name and WhatsApp phone number.';
          feedbackMsg.style.display = 'block';
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting Request...';
      }

      try {
        const response = await fetch('/api/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            phone,
            type: `${type} Solar Solution (${location})`,
            notes: `Spend: ${spend}. Email: ${email}. Notes: ${notes}`
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (feedbackMsg) {
            feedbackMsg.className = 'form-feedback-msg success';
            feedbackMsg.innerHTML = `
              <strong>✓ Sizing Request Confirmed!</strong><br>
              Reference ID: <strong>${data.referenceId || 'DP-SOLAR'}</strong>. A DEVICE PRO senior engineer will contact your WhatsApp (${phone}) within 2 business hours with an indicative system design.
            `;
            feedbackMsg.style.display = 'block';
          }
          solForm.reset();
        } else {
          throw new Error(data.error || 'Server error occurred');
        }
      } catch (err) {
        if (feedbackMsg) {
          feedbackMsg.className = 'form-feedback-msg error';
          feedbackMsg.textContent = 'Failed to submit request. Please reach us directly on WhatsApp (+234 803 123 4567).';
          feedbackMsg.style.display = 'block';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Energy Sizing Request →';
        }
      }
    });
  }

  // Pre-fill solution type when buttons clicked
  document.querySelectorAll('[data-solution-type]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = btn.getAttribute('data-solution-type');
      const select = document.getElementById('sol-type');
      if (select && type) {
        select.value = type;
        const formSection = document.getElementById('consultation-form-section');
        if (formSection) {
          formSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // FAQs Accordion
  document.querySelectorAll('.solutions-faqs-section .faq-question-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

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
        if (drawer) drawer.classList.add('open');
      }
    });
  });

  document.querySelectorAll('[data-trigger-quote]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // If triggered from quote modal button, open dialog
      if (!btn.hasAttribute('data-solution-type')) {
        e.preventDefault();
        const modal = document.getElementById('quote-modal');
        if (modal && typeof modal.showModal === 'function') {
          modal.showModal();
        }
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

  // Init
  updateCartBadges();

})();
