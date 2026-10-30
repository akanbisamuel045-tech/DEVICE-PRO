/**
 * DEVICE PRO — Website-Wide Premium Motion & Smooth Scroll Engine
 * High-performance, hardware-accelerated, zero-dependency.
 * WCAG 2.2 AA compliant with full prefers-reduced-motion honor.
 */

(function () {
  'use strict';

  // Check user preference for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Progressive enhancement: add root class when JS is active
  if (!prefersReducedMotion.matches) {
    document.documentElement.classList.add('dp-anim-ready');
  }

  // Header offset calculator for smooth anchor scrolling
  function getHeaderOffset() {
    const header = document.querySelector('.products-header') ||
                   document.querySelector('.site-header') ||
                   document.querySelector('header');
    if (header) {
      const rect = header.getBoundingClientRect();
      return Math.max(rect.height + 16, 88);
    }
    return 88;
  }

  // Reusable IntersectionObserver instance
  let revealObserver = null;

  function initObserver() {
    if (prefersReducedMotion.matches) {
      revealAllElements();
      return;
    }

    if (!('IntersectionObserver' in window)) {
      revealAllElements();
      return;
    }

    revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add('is-revealed');

          // Trigger counter animation if element has counter target
          if (el.hasAttribute('data-counter-target') || el.classList.contains('stat-counter')) {
            animateCounter(el);
          }

          // Trigger child counters if any
          el.querySelectorAll('[data-counter-target], .stat-counter').forEach(childCounter => {
            animateCounter(childCounter);
          });

          // Unobserve to eliminate runtime CPU consumption
          observer.unobserve(el);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.08
    });
  }

  // Smooth number counter for stats and metrics
  function animateCounter(el) {
    if (el.dataset.counterStarted) return;
    el.dataset.counterStarted = 'true';

    const rawTarget = el.getAttribute('data-counter-target') || el.textContent;
    const match = rawTarget.match(/([\d,.]+)/);
    if (!match) return;

    const rawNumStr = match[1].replace(/,/g, '');
    const targetValue = parseFloat(rawNumStr);
    if (isNaN(targetValue) || targetValue <= 0) return;

    const prefix = rawTarget.substring(0, match.index);
    const suffix = rawTarget.substring(match.index + match[1].length);
    const isFloat = rawNumStr.includes('.');
    const decimals = isFloat ? rawNumStr.split('.')[1].length : 0;

    const duration = 1200; // ms
    const startTime = performance.now();

    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentVal = targetValue * ease;

      const formattedVal = isFloat
        ? currentVal.toFixed(decimals)
        : Math.round(currentVal).toLocaleString();

      el.textContent = `${prefix}${formattedVal}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        el.textContent = rawTarget; // Guarantee exact final string
      }
    }

    requestAnimationFrame(updateCounter);
  }

  // Auto-decorate landmarks and card grids across any page
  function scanAndDecorate() {
    if (prefersReducedMotion.matches) return;

    // 1. Auto-decorate section headers & titles
    const headers = document.querySelectorAll(`
      .section-header:not(.reveal),
      .section-heading-wrap:not(.reveal),
      .editorial-header:not(.reveal),
      .hero-content:not(.reveal),
      .auth-card:not(.reveal),
      .checkout-summary-card:not(.reveal),
      .order-receipt-card:not(.reveal)
    `);
    headers.forEach(el => {
      if (!el.classList.contains('reveal')) {
        el.classList.add('reveal');
      }
    });

    // 2. Auto-decorate card grids as stagger groups
    const gridContainers = document.querySelectorAll(`
      .products-grid:not(.reveal-group),
      .packages-grid:not(.reveal-group),
      .projects-grid:not(.reveal-group),
      .stats-grid:not(.reveal-group),
      .features-grid:not(.reveal-group),
      .grid-3:not(.reveal-group),
      .grid-4:not(.reveal-group),
      .pillars-grid:not(.reveal-group),
      .solutions-grid:not(.reveal-group)
    `);

    gridContainers.forEach(grid => {
      grid.classList.add('reveal-group');
      const items = grid.children;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.classList.contains('reveal-item')) {
          item.classList.add('reveal-item');
          item.classList.add('hover-lift');
          item.style.setProperty('--stagger-index', i);
        }
      }
    });

    // 3. Register all reveal targets with the IntersectionObserver
    const revealTargets = document.querySelectorAll('.reveal, .reveal-group, .reveal-sm, .reveal-fade, .reveal-scale, .reveal-left, .reveal-right');
    revealTargets.forEach(el => {
      // If element is already above or within viewport, reveal immediately
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) {
        el.classList.add('is-revealed');
      } else if (revealObserver) {
        revealObserver.observe(el);
      }
    });
  }

  // Reveal all elements immediately (for reduced motion or fallback)
  function revealAllElements() {
    document.querySelectorAll('.reveal, .reveal-group, .reveal-item, .reveal-sm, .reveal-fade, .reveal-scale, .reveal-left, .reveal-right').forEach(el => {
      el.classList.add('is-revealed');
    });
  }

  // Smooth Anchor Navigation with Sticky Header Offset
  function setupSmoothAnchorScrolling() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href*="#"]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href === '#' || href.startsWith('javascript:')) return;

      // Check if link points to an anchor on current page
      let targetId = '';
      if (href.startsWith('#')) {
        targetId = href.substring(1);
      } else {
        try {
          const url = new URL(href, window.location.origin);
          if (url.pathname === window.location.pathname && url.hash) {
            targetId = url.hash.substring(1);
          }
        } catch (_) {
          return;
        }
      }

      if (!targetId) return;

      const targetEl = document.getElementById(targetId) || document.querySelector(`[name="${targetId}"]`);
      if (targetEl) {
        e.preventDefault();

        // Close any active mobile menu drawer
        const mobileDrawer = document.getElementById('mobile-nav-drawer');
        if (mobileDrawer && mobileDrawer.classList.contains('open')) {
          mobileDrawer.classList.remove('open');
          const backdrop = document.getElementById('modal-backdrop');
          if (backdrop) backdrop.classList.remove('open');
          document.body.style.overflow = '';
        }

        const offset = getHeaderOffset();
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
        });

        // Update URL hash cleanly without instant jump
        if (history.pushState) {
          history.pushState(null, null, `#${targetId}`);
        } else {
          window.location.hash = targetId;
        }

        // Set focus to target for accessibility
        targetEl.setAttribute('tabindex', '-1');
        targetEl.focus({ preventScroll: true });
      }
    });

    // Check if initial load had an anchor hash in the URL
    if (window.location.hash) {
      const hashId = window.location.hash.substring(1);
      setTimeout(() => {
        const targetEl = document.getElementById(hashId) || document.querySelector(`[name="${hashId}"]`);
        if (targetEl) {
          const offset = getHeaderOffset();
          const elementPosition = targetEl.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;
          window.scrollTo({
            top: offsetPosition,
            behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
          });
        }
      }, 150);
    }
  }

  // Public API for dynamic catalog, filter, or tab updates
  window.DeviceProAnimation = {
    init: function () {
      initObserver();
      scanAndDecorate();
      setupSmoothAnchorScrolling();
    },
    refresh: function () {
      scanAndDecorate();
    },
    revealAll: revealAllElements
  };

  // Auto-boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.DeviceProAnimation.init);
  } else {
    window.DeviceProAnimation.init();
  }

  // Safety net: after 2.5s, ensure any offscreen or dynamically generated items are never permanently invisible
  setTimeout(revealAllElements, 2500);

  // Listen for reduced motion changes dynamically
  if (typeof prefersReducedMotion.addEventListener === 'function') {
    prefersReducedMotion.addEventListener('change', (e) => {
      if (e.matches) {
        revealAllElements();
      }
    });
  }
})();
