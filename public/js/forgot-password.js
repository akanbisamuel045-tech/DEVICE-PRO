/**
 * DEVICE PRO — Forgot Password Controller
 * Submits recovery request, handles non-enumerating responses, and formats feedback.
 */

(function () {
  'use strict';

  const form = document.getElementById('forgot-form');
  const emailInput = document.getElementById('email');
  const emailWrapper = document.getElementById('email-wrapper');
  const emailError = document.getElementById('email-error');
  const btnSubmit = document.getElementById('btn-submit');
  const authAlert = document.getElementById('auth-alert');
  const alertMessage = document.getElementById('alert-message');
  const alertIcon = document.getElementById('alert-icon');

  function showAlert(message, type = 'error') {
    if (!authAlert) return;
    authAlert.className = `auth-alert auth-alert-${type} visible`;
    if (alertMessage) alertMessage.textContent = message;

    if (alertIcon) {
      alertIcon.setAttribute('data-lucide', type === 'success' ? 'check-circle' : 'alert-circle');
    }
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function hideAlert() {
    if (authAlert) {
      authAlert.className = 'auth-alert';
      if (alertMessage) alertMessage.textContent = '';
    }
  }

  function setFieldError(wrapper, errorSpan, message) {
    if (wrapper) wrapper.classList.add('has-error');
    if (errorSpan) {
      errorSpan.textContent = message;
      errorSpan.classList.add('visible');
    }
  }

  function clearFieldError(wrapper, errorSpan) {
    if (wrapper) wrapper.classList.remove('has-error');
    if (errorSpan) {
      errorSpan.textContent = '';
      errorSpan.classList.remove('visible');
    }
  }

  if (emailInput) {
    emailInput.addEventListener('input', () => clearFieldError(emailWrapper, emailError));
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      hideAlert();

      const email = emailInput ? emailInput.value.trim() : '';

      if (!email) {
        setFieldError(emailWrapper, emailError, 'Email address is required.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError(emailWrapper, emailError, 'Please enter a valid email address.');
        return;
      }

      btnSubmit.classList.add('loading');
      btnSubmit.disabled = true;

      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ email })
        });

        const data = await response.json();

        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;

        if (response.ok && data.success) {
          showAlert(
            data.message || 'If an account exists for this email address, password reset instructions have been sent.',
            'success'
          );

          // If development reset link is provided (when email provider is not yet set up), show helpful testing note
          if (data.devResetUrl) {
            console.log('[DEV RESET URL]:', data.devResetUrl);
            const devNote = document.createElement('div');
            devNote.style.cssText = 'margin-top: 10px; font-size: 12px; word-break: break-all; color: #1e40af; background: #eff6ff; padding: 10px; border-radius: 8px; border: 1px dashed #93c5fd;';
            devNote.innerHTML = `<strong>Developer Testing Mode:</strong><br><a href="${data.devResetUrl}" style="color: #0866d9;">Click here to reset password directly</a>`;
            authAlert.appendChild(devNote);
          }

          if (emailInput) emailInput.value = '';
        } else {
          showAlert(data.error || 'Unable to process recovery request. Please try again.', 'error');
        }
      } catch (err) {
        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;
        showAlert('Network error. Please verify your connection and try again.', 'error');
      }
    });
  }

})();
