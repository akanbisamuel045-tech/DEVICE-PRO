/**
 * DEVICE PRO — Lucide Icons Global Runtime Initializer
 * Automatically converts all <i data-lucide="..."></i> or <span data-lucide="..."></span>
 * elements into official Lucide SVGs across static and dynamic components.
 */

(function () {
  'use strict';

  function createIconsSafe() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try {
        window.lucide.createIcons();
      } catch (e) {
        console.warn('[LUCIDE INIT] Icon render notice:', e.message);
      }
    }
  }

  // Global helper accessible by any client module
  window.refreshLucideIcons = createIconsSafe;

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  function onReady() {
    createIconsSafe();

    // Observe dynamic DOM insertions (cart drawer, modals, search results, tracking updates)
    if (typeof MutationObserver !== 'undefined' && document.body) {
      let debounceTimer = null;
      const observer = new MutationObserver(function (mutations) {
        let hasNewIcons = false;
        for (let i = 0; i < mutations.length; i++) {
          const added = mutations[i].addedNodes;
          for (let j = 0; j < added.length; j++) {
            const node = added[j];
            if (node.nodeType === 1) { // ELEMENT_NODE
              if (node.hasAttribute && node.hasAttribute('data-lucide')) {
                hasNewIcons = true;
                break;
              }
              if (node.querySelector && node.querySelector('[data-lucide]')) {
                hasNewIcons = true;
                break;
              }
            }
          }
          if (hasNewIcons) break;
        }

        if (hasNewIcons) {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(createIconsSafe, 16);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
})();
