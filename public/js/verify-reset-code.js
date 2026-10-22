/**
 * DEVICE PRO — 6-Digit Verification Code Controller
 * Manages OTP input auto-advance, paste distribution, attempt tracking,
 * 60-second resend cooldown timer, and secure reset authorization token transition.
 */

(function () {
  'use strict';

  const form = document.getElementById('verify-form');
  const emailHidden = document.getElementById('email-hidden');
  const targetEmailSpan = document.getElementById('target-email');
  const emailBanner = document.getElementById('email-banner');
  const digitInputs = Array.from(document.querySelectorAll('.otp-digit'));
  const btnSubmit = document.getElementById('btn-submit');
  const btnResend = document.getElementById('btn-resend');
  const cooldownTimerSpan = document.getElementById('cooldown-timer');
  const attemptsText = document.getElementById('attempts-text');
  const attemptsBadge = document.getElementById('attempts-badge');
  const authAlert = document.getElementById('auth-alert');
  const alertMessage = document.getElementById('alert-message');
  const alertIcon = document.getElementById('alert-icon');

  // Read email from URL query or sessionStorage
  const urlParams = new URLSearchParams(window.location.search);
  let userEmail = urlParams.get('email') || '';
  if (!userEmail) {
    try {
      userEmail = sessionStorage.getItem('reset_email') || '';
    } catch (e) {}
  }
  userEmail = userEmail.trim().toLowerCase();

  if (targetEmailSpan) {
    targetEmailSpan.textContent = userEmail || 'your email';
  }
  if (emailHidden) {
    emailHidden.value = userEmail;
  }

  if (!userEmail) {
    showAlert('No email address specified. Please start from the password reset page.', 'error');
    if (btnSubmit) btnSubmit.disabled = true;
    if (btnResend) btnResend.disabled = true;
  }

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

  // OTP Digits Navigation & Typing
  digitInputs.forEach((input, index) => {
    // Only allow numbers
    input.addEventListener('input', function (e) {
      const val = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = val ? val[val.length - 1] : '';

      if (e.target.value) {
        e.target.classList.add('has-value');
        e.target.classList.remove('error');
        // Auto-advance to next input
        if (index < digitInputs.length - 1) {
          digitInputs[index + 1].focus();
          digitInputs[index + 1].select();
        }
      } else {
        e.target.classList.remove('has-value');
      }

      // Check if all 6 filled; if so, clear errors
      const fullCode = getEnteredCode();
      if (fullCode.length === 6) {
        hideAlert();
      }
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace') {
        if (!input.value && index > 0) {
          digitInputs[index - 1].focus();
          digitInputs[index - 1].select();
        } else {
          input.value = '';
          input.classList.remove('has-value');
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        digitInputs[index - 1].focus();
        digitInputs[index - 1].select();
      } else if (e.key === 'ArrowRight' && index < digitInputs.length - 1) {
        digitInputs[index + 1].focus();
        digitInputs[index + 1].select();
      }
    });

    // Paste handler to distribute 6 digits across inputs
    input.addEventListener('paste', function (e) {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text') || '';
      const digits = pasteData.replace(/[^0-9]/g, '').slice(0, 6);

      if (digits.length > 0) {
        digits.split('').forEach((char, i) => {
          if (digitInputs[i]) {
            digitInputs[i].value = char;
            digitInputs[i].classList.add('has-value');
            digitInputs[i].classList.remove('error');
          }
        });

        const nextFocusIndex = Math.min(digits.length, digitInputs.length - 1);
        digitInputs[nextFocusIndex].focus();

        if (digits.length === 6 && form) {
          // Trigger form verification automatically
          form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      }
    });
  });

  function getEnteredCode() {
    return digitInputs.map(input => input.value.trim()).join('');
  }

  // 60-Second Cooldown Timer
  let cooldownSeconds = 60;
  let cooldownInterval = null;

  function startCooldown(seconds = 60) {
    if (cooldownInterval) clearInterval(cooldownInterval);
    cooldownSeconds = seconds;

    if (btnResend) {
      btnResend.disabled = true;
      btnResend.innerHTML = `Resend Code (<span id="cooldown-timer">${cooldownSeconds}</span>s)`;
    }

    cooldownInterval = setInterval(() => {
      cooldownSeconds -= 1;
      const span = document.getElementById('cooldown-timer');
      if (span) span.textContent = cooldownSeconds;

      if (cooldownSeconds <= 0) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
        if (btnResend) {
          btnResend.disabled = false;
          btnResend.innerHTML = 'Resend Code';
        }
      }
    }, 1000);
  }

  // Initialize cooldown on page load
  startCooldown(60);

  // Resend Code Action
  if (btnResend) {
    btnResend.addEventListener('click', async function () {
      if (btnResend.disabled || !userEmail) return;

      btnResend.disabled = true;
      btnResend.textContent = 'Sending code...';
      hideAlert();

      try {
        const response = await fetch('/api/auth/resend-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ email: userEmail })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          showAlert(data.message || 'A new 6-digit verification code has been dispatched.', 'success');
          startCooldown(60);
          // Clear digits for new code
          digitInputs.forEach(inp => {
            inp.value = '';
            inp.classList.remove('has-value', 'error');
          });
          if (digitInputs[0]) digitInputs[0].focus();
        } else if (response.status === 429) {
          const waitTime = data.secondsRemaining || 60;
          showAlert(data.error || `Please wait ${waitTime} seconds before requesting a new code.`, 'error');
          startCooldown(waitTime);
        } else {
          showAlert(data.error || 'Failed to resend code. Please try again.', 'error');
          startCooldown(30);
        }
      } catch (err) {
        showAlert('Network error while resending code. Please check your connection.', 'error');
        startCooldown(15);
      }
    });
  }

  // Form Submit & Verification
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      hideAlert();

      const code = getEnteredCode();

      if (!userEmail) {
        showAlert('Please provide an email address first.', 'error');
        return;
      }

      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        digitInputs.forEach(inp => {
          if (!inp.value) inp.classList.add('error');
        });
        showAlert('Please enter the complete 6-digit verification code.', 'error');
        return;
      }

      btnSubmit.classList.add('loading');
      btnSubmit.disabled = true;

      try {
        const response = await fetch('/api/auth/verify-reset-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            email: userEmail,
            code: code
          })
        });

        const data = await response.json();

        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;

        if (response.ok && data.success && data.resetToken) {
          // Store token in session storage
          try {
            sessionStorage.setItem('dp_reset_token', data.resetToken);
          } catch (e) {}

          showAlert(data.message || 'Code verified successfully! Preparing password reset...', 'success');

          // Highlight all inputs green/valid
          digitInputs.forEach(inp => {
            inp.classList.remove('error');
            inp.style.borderColor = '#15803d';
          });

          // Redirect to /reset-password with verified token
          setTimeout(() => {
            window.location.href = `/reset-password.html?token=${encodeURIComponent(data.resetToken)}`;
          }, 1000);

        } else {
          // Verification failure
          digitInputs.forEach(inp => inp.classList.add('error'));

          if (data.attemptsRemaining !== undefined && attemptsText) {
            attemptsText.textContent = `${data.attemptsRemaining} attempt${data.attemptsRemaining === 1 ? '' : 's'} remaining`;
            if (data.attemptsRemaining <= 2 && attemptsBadge) {
              attemptsBadge.style.background = '#fee2e2';
              attemptsBadge.style.borderColor = '#fca5a5';
              attemptsBadge.style.color = '#991b1b';
            }
          }

          if (data.lockedOut) {
            if (attemptsText) attemptsText.textContent = 'Account locked out';
            btnSubmit.disabled = true;
            if (btnResend) btnResend.disabled = true;
            showAlert(data.error || 'Too many incorrect attempts. This code has been invalidated for security. Please request a new code.', 'error');
          } else {
            showAlert(data.error || 'Invalid or expired verification code. Please check and try again.', 'error');
            // Re-focus first input
            if (digitInputs[0]) {
              digitInputs[0].focus();
              digitInputs[0].select();
            }
          }
        }
      } catch (err) {
        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;
        showAlert('Network error during verification. Please check your connection and try again.', 'error');
      }
    });
  }

  // Auto-focus first input
  if (digitInputs[0]) {
    setTimeout(() => digitInputs[0].focus(), 100);
  }

})();
