/**
 * DEVICE PRO — Registration Page Controller
 * Handles client-side validation, password strength checking, password toggling,
 * Nigerian/international phone formatting, API submission, and error handling.
 */

(function () {
  'use strict';

  // DOM Elements
  const form = document.getElementById('register-form');
  const fullnameInput = document.getElementById('fullname');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const agreeTermsCheckbox = document.getElementById('agree-terms');
  const btnSubmit = document.getElementById('btn-submit');
  const btnTogglePassword = document.getElementById('btn-toggle-password');
  const passwordEyeIcon = document.getElementById('password-eye-icon');
  const btnToggleConfirm = document.getElementById('btn-toggle-confirm-password');
  const confirmEyeIcon = document.getElementById('confirm-eye-icon');
  const btnGoogle = document.getElementById('btn-google-auth');

  // Input Wrappers
  const fullnameWrapper = document.getElementById('fullname-wrapper');
  const emailWrapper = document.getElementById('email-wrapper');
  const phoneWrapper = document.getElementById('phone-wrapper');
  const passwordWrapper = document.getElementById('password-wrapper');
  const confirmWrapper = document.getElementById('confirm-password-wrapper');

  // Error Spans
  const fullnameError = document.getElementById('fullname-error');
  const emailError = document.getElementById('email-error');
  const phoneError = document.getElementById('phone-error');
  const passwordError = document.getElementById('password-error');
  const confirmError = document.getElementById('confirm-password-error');
  const termsError = document.getElementById('terms-error');

  // Strength Bars
  const strengthBars = [
    document.getElementById('strength-1'),
    document.getElementById('strength-2'),
    document.getElementById('strength-3'),
    document.getElementById('strength-4')
  ];
  const strengthText = document.getElementById('strength-text');

  // Alert Box
  const authAlert = document.getElementById('auth-alert');
  const alertMessage = document.getElementById('alert-message');
  const alertIcon = document.getElementById('alert-icon');

  // Safe Redirect Destination
  const urlParams = new URLSearchParams(window.location.search);
  const rawRedirect = urlParams.get('redirect') || urlParams.get('returnUrl') || '';
  const safeRedirect = validateRedirectUrl(rawRedirect);

  function validateRedirectUrl(url) {
    if (!url || typeof url !== 'string') return '/';
    const trimmed = url.trim();
    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
      try {
        const dummy = new URL(trimmed, window.location.origin);
        if (dummy.origin === window.location.origin) {
          return dummy.pathname + dummy.search + dummy.hash;
        }
      } catch (e) {
        return '/';
      }
    }
    return '/';
  }

  function showAlert(message, type = 'error') {
    if (!authAlert) return;
    authAlert.className = `auth-alert auth-alert-${type} visible`;
    if (alertMessage) alertMessage.textContent = message;

    if (alertIcon) {
      if (type === 'success') {
        alertIcon.setAttribute('data-lucide', 'check-circle');
      } else if (type === 'info') {
        alertIcon.setAttribute('data-lucide', 'info');
      } else {
        alertIcon.setAttribute('data-lucide', 'alert-circle');
      }
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

  // Password Visibility Toggle Helpers
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

  // Real-Time Password Strength Calculation
  function calculatePasswordStrength(pass) {
    if (!pass) return { score: 0, label: 'Password' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;

    const levels = [
      { score: 0, label: 'Password', color: '#e2e8f0' },
      { score: 1, label: 'Weak', color: '#ef4444' },
      { score: 2, label: 'Fair', color: '#f59e0b' },
      { score: 3, label: 'Good', color: '#3b82f6' },
      { score: 4, label: 'Strong', color: '#10b981' }
    ];

    const current = levels[Math.min(score, 4)];
    return current;
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', function () {
      clearFieldError(passwordWrapper, passwordError);
      const strength = calculatePasswordStrength(passwordInput.value);

      if (strengthText) strengthText.textContent = strength.label;

      strengthBars.forEach((bar, index) => {
        if (!bar) return;
        if (index < strength.score) {
          bar.style.backgroundColor = strength.color;
        } else {
          bar.style.backgroundColor = '#e2e8f0';
        }
      });
    });
  }

  if (fullnameInput) fullnameInput.addEventListener('input', () => clearFieldError(fullnameWrapper, fullnameError));
  if (emailInput) emailInput.addEventListener('input', () => clearFieldError(emailWrapper, emailError));
  if (phoneInput) phoneInput.addEventListener('input', () => clearFieldError(phoneWrapper, phoneError));
  if (confirmPasswordInput) confirmPasswordInput.addEventListener('input', () => clearFieldError(confirmWrapper, confirmError));
  if (agreeTermsCheckbox) agreeTermsCheckbox.addEventListener('change', () => clearFieldError(null, termsError));

  // Check Existing Auth
  async function checkExistingAuth() {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          showAlert(`You are already signed in as ${data.user.fullName || data.user.email}. Redirecting...`, 'info');
          setTimeout(() => {
            window.location.href = safeRedirect;
          }, 800);
        }
      }
    } catch (e) {}
  }
  checkExistingAuth();

  // Google OAuth
  if (btnGoogle) {
    btnGoogle.addEventListener('click', function () {
      hideAlert();
      window.location.href = `/api/auth/google?redirect=${encodeURIComponent(safeRedirect)}`;
    });
  }

  // Form Submission
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      hideAlert();

      const fullName = fullnameInput ? fullnameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
      const agreeTerms = agreeTermsCheckbox ? agreeTermsCheckbox.checked : false;

      let hasError = false;

      // Full Name Validation
      if (!fullName) {
        setFieldError(fullnameWrapper, fullnameError, 'Full name is required.');
        hasError = true;
      } else if (fullName.length < 2) {
        setFieldError(fullnameWrapper, fullnameError, 'Please enter your complete full name.');
        hasError = true;
      } else {
        clearFieldError(fullnameWrapper, fullnameError);
      }

      // Email Validation
      if (!email) {
        setFieldError(emailWrapper, emailError, 'Email address is required.');
        hasError = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError(emailWrapper, emailError, 'Please enter a valid email address.');
        hasError = true;
      } else {
        clearFieldError(emailWrapper, emailError);
      }

      // Optional Phone Validation
      if (phone) {
        // Accept common Nigerian formats (080..., 070..., 090..., +234...) and international E.164
        const cleanPhone = phone.replace(/[\s\-()]/g, '');
        if (!/^(\+?[0-9]{8,15})$/.test(cleanPhone)) {
          setFieldError(phoneWrapper, phoneError, 'Please enter a valid phone number (e.g. +234 803 123 4567 or 08012345678).');
          hasError = true;
        } else {
          clearFieldError(phoneWrapper, phoneError);
        }
      }

      // Password Validation
      if (!password) {
        setFieldError(passwordWrapper, passwordError, 'Password is required.');
        hasError = true;
      } else if (password.length < 8) {
        setFieldError(passwordWrapper, passwordError, 'Password must be at least 8 characters long.');
        hasError = true;
      } else {
        clearFieldError(passwordWrapper, passwordError);
      }

      // Confirm Password Validation
      if (!confirmPassword) {
        setFieldError(confirmWrapper, confirmError, 'Please confirm your password.');
        hasError = true;
      } else if (confirmPassword !== password) {
        setFieldError(confirmWrapper, confirmError, 'Passwords do not match. Please verify both fields.');
        hasError = true;
      } else {
        clearFieldError(confirmWrapper, confirmError);
      }

      // Terms Agreement Validation
      if (!agreeTerms) {
        setFieldError(null, termsError, 'You must agree to the Terms of Service and Privacy Policy to register.');
        hasError = true;
      } else {
        clearFieldError(null, termsError);
      }

      if (hasError) return;

      // Submit Request
      btnSubmit.classList.add('loading');
      btnSubmit.disabled = true;

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            fullName,
            email,
            phone,
            password,
            confirmPassword
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (data.token) {
            try {
              sessionStorage.setItem('devicepro_auth_token', data.token);
              sessionStorage.setItem('devicepro_user', JSON.stringify(data.user));
            } catch (err) {}
          }

          showAlert('Account created successfully! Welcome to DEVICE PRO. Redirecting...', 'success');

          setTimeout(() => {
            window.location.href = safeRedirect;
          }, 800);
        } else {
          btnSubmit.classList.remove('loading');
          btnSubmit.disabled = false;
          showAlert(data.error || 'Registration could not be completed. Please review your details and try again.', 'error');
        }
      } catch (err) {
        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;
        showAlert('Unable to connect to the registration service. Please check your internet connection.', 'error');
      }
    });
  }

})();
