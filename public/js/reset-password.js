/**
 * DEVICE PRO — Reset Password Controller
 * Validates recovery token, enforces password requirements checklist in real-time,
 * and securely updates credentials with session invalidation.
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

  // Requirement items
  const reqLength = document.getElementById('req-length');
  const reqUppercase = document.getElementById('req-uppercase');
  const reqLowercase = document.getElementById('req-lowercase');
  const reqNumber = document.getElementById('req-number');
  const reqSpecial = document.getElementById('req-special');
  const reqMatch = document.getElementById('req-match');

  const urlParams = new URLSearchParams(window.location.search);
  let token = urlParams.get('token') || '';
  if (!token) {
    try {
      token = sessionStorage.getItem('dp_reset_token') || '';
    } catch (e) {}
  }

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
    showAlert('Invalid or missing password reset authorization. Please request a new verification code.', 'error');
    if (btnSubmit) btnSubmit.disabled = true;
  }

  function updateReqItem(element, isMet) {
    if (!element) return;
    if (isMet) {
      element.classList.add('met');
      const icon = element.querySelector('.password-req-icon');
      if (icon) icon.innerHTML = '<i data-lucide="check-circle-2" style="width: 13px; height: 13px; color: #15803d;"></i>';
    } else {
      element.classList.remove('met');
      const icon = element.querySelector('.password-req-icon');
      if (icon) icon.innerHTML = '<i data-lucide="circle" style="width: 12px; height: 12px; color: #94a3b8;"></i>';
    }
  }

  function validateRequirements() {
    const pwd = passwordInput ? passwordInput.value : '';
    const cpwd = confirmPasswordInput ? confirmPasswordInput.value : '';

    updateReqItem(reqLength, pwd.length >= 8);
    updateReqItem(reqUppercase, /[A-Z]/.test(pwd));
    updateReqItem(reqLowercase, /[a-z]/.test(pwd));
    updateReqItem(reqNumber, /[0-9]/.test(pwd));
    updateReqItem(reqSpecial, /[^A-Za-z0-9]/.test(pwd));
    updateReqItem(reqMatch, pwd.length > 0 && cpwd.length > 0 && pwd === cpwd);

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      clearFieldError(passwordWrapper, passwordError);
      validateRequirements();
    });
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', () => {
      clearFieldError(confirmWrapper, confirmError);
      validateRequirements();
    });
  }

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
      } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        setFieldError(passwordWrapper, passwordError, 'Password must include uppercase, lowercase, number, and special character.');
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
          // Clean up storage
          try {
            sessionStorage.removeItem('dp_reset_token');
            sessionStorage.removeItem('reset_email');
          } catch (e) {}

          showAlert('Password reset successfully! Redirecting to sign in...', 'success');
          setTimeout(() => {
            window.location.href = '/login.html?message=' + encodeURIComponent('Your password has been reset successfully. Please sign in with your new password.');
          }, 1500);
        } else {
          btnSubmit.classList.remove('loading');
          btnSubmit.disabled = false;
          showAlert(data.error || 'Failed to update password. Your reset authorization may have expired. Please request a new verification code.', 'error');
        }
      } catch (err) {
        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;
        showAlert('Network error. Please check your connection and try again.', 'error');
      }
    });
  }

  // Initial validate run
  validateRequirements();

})();
