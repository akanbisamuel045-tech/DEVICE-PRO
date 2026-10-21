/**
 * DEVICE PRO — CONTACT & SHOWROOM INQUIRY CONTROLLER (contact.js)
 * Manages form validation, asynchronous POST /api/contact submission, and reference ID confirmation.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-inquiry-form');
  const btnSubmit = document.getElementById('btn-submit-contact');
  const feedback = document.getElementById('contact-status-feedback');

  const nameInput = document.getElementById('contact-name');
  const phoneInput = document.getElementById('contact-phone');
  const emailInput = document.getElementById('contact-email');
  const stateInput = document.getElementById('contact-state');
  const typeInput = document.getElementById('contact-type');
  const msgInput = document.getElementById('contact-message');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Reset errors
      let hasError = false;
      document.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('has-error'));
      if (feedback) {
        feedback.style.display = 'none';
        feedback.className = 'contact-feedback';
      }

      // Validate Name
      if (!nameInput.value.trim()) {
        nameInput.closest('.form-group').classList.add('has-error');
        hasError = true;
      }

      // Validate Phone
      const phoneVal = phoneInput.value.trim().replace(/\s+/g, '');
      if (!phoneVal || phoneVal.length < 8) {
        phoneInput.closest('.form-group').classList.add('has-error');
        hasError = true;
      }

      // Validate State
      if (!stateInput.value) {
        stateInput.closest('.form-group').classList.add('has-error');
        hasError = true;
      }

      // Validate Project Requirement
      if (!typeInput.value) {
        typeInput.closest('.form-group').classList.add('has-error');
        hasError = true;
      }

      if (hasError) {
        if (feedback) {
          feedback.textContent = 'Please fill in all required fields indicated above.';
          feedback.classList.add('error');
          feedback.style.display = 'block';
        }
        return;
      }

      // Disable button
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Transmitting to Engineering Desk...';

      try {
        const payload = {
          name: nameInput.value.trim(),
          phone: phoneInput.value.trim(),
          email: emailInput.value.trim(),
          state: stateInput.value,
          subject: `${typeInput.value} [${stateInput.value}]`,
          message: msgInput.value.trim()
        };

        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.success) {
          feedback.innerHTML = `
            <strong>Inquiry Received Successfully!</strong><br>
            ${data.message}<br>
            <span class="ref-pill">Tracking Reference: ${data.referenceId}</span>
          `;
          feedback.classList.add('success');
          feedback.style.display = 'block';

          // Reset form fields
          form.reset();

          // Smooth scroll to feedback
          feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          throw new Error(data.error || 'Unable to submit inquiry at this time.');
        }
      } catch (err) {
        console.error('[CONTACT INQUIRY ERROR]:', err);
        feedback.textContent = 'Network or server error. Please call +234 803 388 2268 or reach us via WhatsApp directly.';
        feedback.classList.add('error');
        feedback.style.display = 'block';
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Submit Engineering Inquiry →';
      }
    });
  }

  // Sync cart badge
  try {
    localStorage.removeItem('devicepro_cart');
    if (window.DeviceProCart) {
      window.DeviceProCart.updateBadge();
    } else {
      const cart = JSON.parse(localStorage.getItem('dp_equipment_cart_v1') || '[]');
      const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
      document.querySelectorAll('.cart-badge').forEach(badge => {
        badge.textContent = count;
        badge.setAttribute('aria-label', `${count} items in cart`);
      });
    }
  } catch (e) {
    console.warn('[CONTACT CART SYNC]:', e);
  }
});
