/**
 * DEVICE PRO — Direct Phone & Consultation Modal
 * Replaces the jarring desktop browser "Open Pick an app?" prompt
 * with an elegant, branded quick-connect dialog.
 */
(function() {
  'use strict';

  const DEFAULT_PHONE = '+234 803 388 2268';
  const RAW_PHONE = '+2348033882268';
  const WHATSAPP_URL = 'https://wa.me/2348033882268?text=Hello%20DEVICE%20PRO%20Engineering%2C%20I%20would%20like%20to%20inquire%20about%20your%20solar%20equipment%20and%20turnkey%20installations.';

  let modalBackdrop = null;
  let isCopiedTimeout = null;

  function createModalDOM() {
    if (document.getElementById('phone-action-modal-backdrop')) {
      return document.getElementById('phone-action-modal-backdrop');
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'phone-action-modal-backdrop';
    backdrop.className = 'phone-action-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'phone-modal-title');

    backdrop.innerHTML = `
      <div class="phone-action-modal">
        <div class="phone-modal-header">
          <div class="phone-modal-header-info">
            <div class="phone-modal-icon-badge" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <div>
              <h3 id="phone-modal-title" class="phone-modal-title">Direct Engineer Hotline</h3>
              <p class="phone-modal-subtitle">Speak directly with our technical &amp; sales team.</p>
            </div>
          </div>
          <button type="button" class="phone-modal-close" id="btn-close-phone-modal" aria-label="Close dialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="phone-modal-number-card">
          <div class="phone-modal-status-badge">
            <span class="phone-modal-pulse-dot" aria-hidden="true"></span>
            <span>Live Engineer Available Now</span>
          </div>
          <div class="phone-modal-display-num" id="phone-modal-number-text">${DEFAULT_PHONE}</div>
          <p class="phone-modal-hours">Mon – Sat: 8:00 AM – 6:00 PM (West Africa Time)</p>
        </div>

        <div class="phone-modal-actions">
          <button type="button" class="btn-phone-copy" id="btn-copy-phone-num">
            <svg class="copy-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="copy-label">Copy Phone Number</span>
          </button>

          <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer" class="btn-phone-whatsapp" id="btn-whatsapp-direct">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span>Chat on WhatsApp</span>
          </a>

          <div class="phone-modal-alt-row">
            <span style="color: #64748B;">Have a dialer or paired phone?</span>
            <a href="tel:${RAW_PHONE}" class="btn-phone-dial-direct" id="link-direct-dial">
              <span>Open in Calling App →</span>
            </a>
          </div>
        </div>

        <div class="phone-modal-footer-note">
          📍 No 13 adepele street, computervillage, ikeja, lagos.<br>
          Direct line • Official COREN Certified Solar Engineering Desk
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Event listeners
    const closeBtn = backdrop.querySelector('#btn-close-phone-modal');
    closeBtn.addEventListener('click', closePhoneModal);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closePhoneModal();
      }
    });

    const copyBtn = backdrop.querySelector('#btn-copy-phone-num');
    copyBtn.addEventListener('click', async () => {
      const numToCopy = backdrop.querySelector('#phone-modal-number-text').textContent.trim();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(numToCopy.replace(/\s+/g, ''));
        } else {
          const ta = document.createElement('textarea');
          ta.value = numToCopy.replace(/\s+/g, '');
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }

        copyBtn.classList.add('is-copied');
        copyBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>✓ Copied to Clipboard!</span>
        `;

        if (isCopiedTimeout) clearTimeout(isCopiedTimeout);
        isCopiedTimeout = setTimeout(() => {
          copyBtn.classList.remove('is-copied');
          copyBtn.innerHTML = `
            <svg class="copy-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="copy-label">Copy Phone Number</span>
          `;
        }, 2500);
      } catch (err) {
        console.error('[PHONE MODAL] Copy failed:', err);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && backdrop.classList.contains('is-open')) {
        closePhoneModal();
      }
    });

    return backdrop;
  }

  function openPhoneModal(phone) {
    if (!modalBackdrop) {
      modalBackdrop = createModalDOM();
    }
    const numEl = modalBackdrop.querySelector('#phone-modal-number-text');
    const dialLink = modalBackdrop.querySelector('#link-direct-dial');
    if (phone && phone.trim()) {
      numEl.textContent = phone.trim();
      if (dialLink) dialLink.href = 'tel:' + phone.replace(/[^0-9+]/g, '');
    }
    modalBackdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    const copyBtn = modalBackdrop.querySelector('#btn-copy-phone-num');
    if (copyBtn) copyBtn.focus();
  }

  function closePhoneModal() {
    if (modalBackdrop) {
      modalBackdrop.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  }

  // Intercept all tel: links and phone actions on desktop
  function initTelInterceptor() {
    document.addEventListener('click', (e) => {
      // If clicking inside the modal itself to explicitly launch app, allow it through
      const directDial = e.target.closest('#link-direct-dial');
      if (directDial) {
        return;
      }

      // 1. Any direct <a href="tel:...">
      const telLink = e.target.closest('a[href^="tel:"]');
      if (telLink) {
        // Only intercept on non-touch desktop / laptop environments where browser triggers "Open Pick an app?"
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                                && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

        if (!isMobileDevice) {
          e.preventDefault();
          e.stopPropagation();
          const rawTel = telLink.getAttribute('href').replace(/^tel:/, '').trim();
          openPhoneModal(rawTel || DEFAULT_PHONE);
        }
        return;
      }

      // 2. Any explicit button with data-open-phone-modal or book-call trigger
      const trigger = e.target.closest('[data-open-phone-modal], #btn-book-call-checkout, .btn-checkout-consult');
      if (trigger) {
        e.preventDefault();
        openPhoneModal(DEFAULT_PHONE);
      }
    }, true); // Use capture phase so it reliably stops the default browser prompt
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTelInterceptor);
  } else {
    initTelInterceptor();
  }

  window.DeviceProPhoneModal = {
    open: openPhoneModal,
    close: closePhoneModal
  };
})();
