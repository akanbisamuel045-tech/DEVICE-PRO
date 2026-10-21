/**
 * DEVICE PRO — Reset Password Controller
 * Validates recovery token, enforces password match & length, and updates credentials.
 */

(function () {
  'use strict';

  const form = document.getElementById('reset-form');
  const tokenInput = document.getElementById('reset-token');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const passwordWrapper = document.getElementById('password-wrapper');
  const confirmWrapper = document.getElementById('confirm-password-wrapper');
  const passwordError = document.getElementById('password-error');
  const confirmError = document.getElementById('confirm-password-error');
  const btnSubmit = document.getElementById('btn-submit');
  const btnTogglePassword = document.getElementById('btn-toggle-password');
  const passwordEyeIcon = document.getElementById('password-eye-icon');
  const btnToggleConfirm = document.getElementById('btn-toggle-confirm-password');
  const confirmEyeIcon = document.getElementById('confirm-eye-icon');
  const authAlert = document.getElementById('auth-alert');
  const alertMessage = document.getElementById('alert-message');
  const alertIcon = document.getElementById('alert-icon');

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || '';

  if (tokenInput) tokenInput.value = token;

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

  function setupPasswordToggle(button, input, icon) {
    if (!button || !input) return;
    button.addEventListener('click', function () {
      const isPassword = input.getAttribute('type') === 'password';
      input.setAttribute('type', isPassword ? 'text' : 'password');
      button.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
      button.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      if (icon) {
        icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
      }
    });
  }

  setupPasswordToggle(btnTogglePassword, passwordInput, passwordEyeIcon);
  setupPasswordToggle(btnToggleConfirm, confirmPasswordInput, confirmEyeIcon);

  if (!token) {
    showAlert('Invalid or missing password reset token. Please request a new link from the forgot password page.', 'error');
    if (btnSubmit) btnSubmit.disabled = true;
  }

  if (passwordInput) passwordInput.addEventListener('input', () => clearFieldError(passwordWrapper, passwordError));
  if (confirmPasswordInput) confirmPasswordInput.addEventListener('input', () => clearFieldError(confirmWrapper, confirmError));

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      hideAlert();

      const password = passwordInput ? passwordInput.value : '';
      const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

      let hasError = false;

      if (!password) {
        setFieldError(passwordWrapper, passwordError, 'Password is required.');
        hasError = true;
      } else if (password.length < 8) {
        setFieldError(passwordWrapper, passwordError, 'Password must be at least 8 characters.');
        hasError = true;
      }

      if (!confirmPassword) {
        setFieldError(confirmWrapper, confirmError, 'Please confirm your password.');
        hasError = true;
      } else if (confirmPassword !== password) {
        setFieldError(confirmWrapper, confirmError, 'Passwords do not match.');
        hasError = true;
      }

      if (hasError) return;

      btnSubmit.classList.add('loading');
      btnSubmit.disabled = true;

      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            token,
            password,
            confirmPassword
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          showAlert('Password updated successfully! Redirecting to sign in...', 'success');
          setTimeout(() => {
            window.location.href = '/login.html?message=' + encodeURIComponent('Your password has been reset successfully. Please sign in with your new password.');
          }, 1200);
        } else {
          btnSubmit.classList.remove('loading');
          btnSubmit.disabled = false;
          showAlert(data.error || 'Failed to update password. Your reset link may have expired.', 'error');
        }
      } catch (err) {
        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;
        showAlert('Network error. Please check your connection and try again.', 'error');
      }
    });
  }

})();
