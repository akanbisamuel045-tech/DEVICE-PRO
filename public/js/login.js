/**
 * DEVICE PRO — Login Page Controller
 * Handles client-side validation, password toggling, API submission,
 * Google OAuth redirect, safe URL redirection, and error handling.
 */

(function () {
  'use strict';

  // DOM Elements
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberCheckbox = document.getElementById('remember-me');
  const btnSubmit = document.getElementById('btn-submit');
  const btnTogglePassword = document.getElementById('btn-toggle-password');
  const passwordEyeIcon = document.getElementById('password-eye-icon');
  const emailWrapper = document.getElementById('email-wrapper');
  const passwordWrapper = document.getElementById('password-wrapper');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const authAlert = document.getElementById('auth-alert');
  const alertMessage = document.getElementById('alert-message');
  const alertIcon = document.getElementById('alert-icon');
  const btnGoogle = document.getElementById('btn-google-auth');

  // Parse Query Parameters safely
  const urlParams = new URLSearchParams(window.location.search);
  const rawRedirect = urlParams.get('redirect') || urlParams.get('returnUrl') || '';
  const safeRedirect = validateRedirectUrl(rawRedirect);

  // Forward safe redirect to registration link if specified
  if (safeRedirect && safeRedirect !== '/') {
    document.querySelectorAll('.auth-card-footer a, a[href="/register.html"], a[href="/register"]').forEach(a => {
      a.href = `/register.html?redirect=${encodeURIComponent(safeRedirect)}`;
    });
  }

  // Validate internal redirect destination to prevent open redirect vulnerabilities
  function validateRedirectUrl(url) {
    if (!url || typeof url !== 'string') return '/';
    const trimmed = url.trim();
    // Must begin with single forward slash and not start with // (protocol-relative) or backslash
    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
      // Prevent javascript: or other pseudo-protocols
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

  // Display feedback alert
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

  function setFieldError(inputWrapper, errorSpan, message) {
    if (inputWrapper) inputWrapper.classList.add('has-error');
    if (errorSpan) {
      errorSpan.textContent = message;
      errorSpan.classList.add('visible');
    }
  }

  function clearFieldError(inputWrapper, errorSpan) {
    if (inputWrapper) inputWrapper.classList.remove('has-error');
    if (errorSpan) {
      errorSpan.textContent = '';
      errorSpan.classList.remove('visible');
    }
  }

  // Check URL parameters for status messages (e.g. from registration or errors)
  const initialMsg = urlParams.get('message');
  const initialError = urlParams.get('error');
  if (initialMsg) {
    showAlert(decodeURIComponent(initialMsg), 'success');
  } else if (initialError) {
    showAlert(decodeURIComponent(initialError), 'error');
  }

  // Pre-fill email if passed in query
  const emailParam = urlParams.get('email');
  if (emailParam && emailInput) {
    emailInput.value = emailParam.trim();
  }

  // Password Visibility Toggle
  if (btnTogglePassword && passwordInput) {
    btnTogglePassword.addEventListener('click', function () {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      btnTogglePassword.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
      btnTogglePassword.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      
      if (passwordEyeIcon) {
        passwordEyeIcon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
      }
    });
  }

  // Clear errors on input
  if (emailInput) {
    emailInput.addEventListener('input', () => clearFieldError(emailWrapper, emailError));
  }
  if (passwordInput) {
    passwordInput.addEventListener('input', () => clearFieldError(passwordWrapper, passwordError));
  }

  // Check if user is already authenticated
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
    } catch (e) {
      // Ignore network errors on background check
    }
  }
  checkExistingAuth();

  // Handle Google Authentication Button Click
  if (btnGoogle) {
    btnGoogle.addEventListener('click', function () {
      hideAlert();
      // Navigate to server Google OAuth endpoint with safe return URL
      window.location.href = `/api/auth/google?redirect=${encodeURIComponent(safeRedirect)}`;
    });
  }

  // Form Submission
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      hideAlert();

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      const remember = rememberCheckbox ? rememberCheckbox.checked : false;

      let hasError = false;

      // Validate Email
      if (!email) {
        setFieldError(emailWrapper, emailError, 'Email address is required.');
        hasError = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError(emailWrapper, emailError, 'Please enter a valid email address.');
        hasError = true;
      } else {
        clearFieldError(emailWrapper, emailError);
      }

      // Validate Password
      if (!password) {
        setFieldError(passwordWrapper, passwordError, 'Password is required.');
        hasError = true;
      } else {
        clearFieldError(passwordWrapper, passwordError);
      }

      if (hasError) return;

      // Submit Request
      btnSubmit.classList.add('loading');
      btnSubmit.disabled = true;

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            username: email,
            email: email,
            password: password,
            remember: remember
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // If bearer token returned, store in sessionStorage for API compatibility
          if (data.token) {
            try {
              sessionStorage.setItem('devicepro_auth_token', data.token);
              sessionStorage.setItem('devicepro_user', JSON.stringify(data.user));
            } catch (err) {}
          }

          showAlert(`Welcome back, ${data.user.fullName || 'Valued Customer'}! Redirecting...`, 'success');

          // Smooth redirect
          setTimeout(() => {
            window.location.href = safeRedirect;
          }, 600);
        } else {
          btnSubmit.classList.remove('loading');
          btnSubmit.disabled = false;
          showAlert(data.error || 'Invalid email address or password. Please try again.', 'error');
        }
      } catch (err) {
        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;
        showAlert('Unable to connect to the authentication service. Please check your internet connection.', 'error');
      }
    });
  }

})();
