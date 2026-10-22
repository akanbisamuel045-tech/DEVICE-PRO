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
          try {
            sessionStorage.setItem('reset_email', email);
          } catch (e) {}

          showAlert(
            data.message || 'If an eligible account exists for this email address, a 6-digit verification code has been sent.',
            'success'
          );

          // Add transition button directly into the alert
          const proceedBtn = document.createElement('a');
          proceedBtn.href = `/verify-reset-code.html?email=${encodeURIComponent(email)}`;
          proceedBtn.className = 'btn-auth-submit';
          proceedBtn.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; margin-top: 14px; text-decoration: none; width: 100%; height: 44px; font-size: 14px;';
          proceedBtn.innerHTML = '<span>Enter 6-Digit Code &rarr;</span>';
          authAlert.appendChild(proceedBtn);

          // Auto-redirect after 1.8 seconds to verify code page
          setTimeout(() => {
            window.location.href = `/verify-reset-code.html?email=${encodeURIComponent(email)}`;
          }, 1800);
        } else if (response.status === 429) {
          showAlert(data.error || 'Please wait a moment before requesting another verification code.', 'error');
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
