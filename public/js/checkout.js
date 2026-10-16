/**
 * DEVICE PRO — Checkout Page Client Logic
 * Handles cart item hydration, fee calculation, form validation,
 * and order submission to /api/orders.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const cartGrid = document.getElementById('checkout-grid-container');
  const emptyState = document.getElementById('checkout-empty-state');
  const form = document.getElementById('checkout-form');
  const submitBtn = document.getElementById('btn-submit-order');
  const errorFeedback = document.getElementById('checkout-error-feedback');

  const summaryList = document.getElementById('summary-items-list');
  const itemsCountBadge = document.getElementById('summary-items-count');
  const subtotalEl = document.getElementById('calc-subtotal');
  const deliveryEl = document.getElementById('calc-delivery');
  const installRow = document.getElementById('row-install-fee');
  const installEl = document.getElementById('calc-installation');
  const totalEl = document.getElementById('calc-total');

  const stateSelect = document.getElementById('cust-state');
  const installRadios = document.querySelectorAll('input[name="installationOption"]');

  // Load cart items
  const items = window.DeviceProCart ? window.DeviceProCart.getItems() : [];

  if (!items || items.length === 0) {
    if (cartGrid) cartGrid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  // Currency helper
  const formatNaira = (val) => '₦' + Number(val || 0).toLocaleString('en-NG');

  // Render items in sticky summary
  function renderSummary() {
    itemsCountBadge.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;
    
    let html = '';
    items.forEach(item => {
      const qty = parseInt(item.quantity, 10) || 1;
      const price = parseInt(item.price, 10) || 0;
      const lineSubtotal = price * qty;
      const img = item.image || '/images/products/jinko-solar-panel.png';

      html += `
        <div class="summary-item-row">
          <img src="${img}" alt="${item.name}" class="summary-item-img" onerror="this.src='/images/products/jinko-solar-panel.png'">
          <div class="summary-item-info">
            <h4 class="summary-item-name" title="${item.name}">${item.name}</h4>
            <div class="summary-item-qty">Qty: ${qty} × ${formatNaira(price)}</div>
          </div>
          <div class="summary-item-subtotal">${formatNaira(lineSubtotal)}</div>
        </div>
      `;
    });

    summaryList.innerHTML = html;
  }

  // Calculate delivery fee
  function getDeliveryFee() {
    const state = stateSelect.value;
    if (state === 'Pickup') return 0;
    if (state === 'Lagos') return 15000;
    if (state === 'Ogun') return 25000;
    if (state === 'Oyo') return 30000;
    return 35000; // Default nationwide shipping
  }

  // Calculate installation fee
  function getInstallationFee(subtotal) {
    const selectedOption = document.querySelector('input[name="installationOption"]:checked');
    if (selectedOption && selectedOption.value === 'turnkey_install') {
      // 10% of subtotal or flat ₦120,000 minimum
      return Math.max(120000, Math.round(subtotal * 0.08));
    }
    return 0;
  }

  // Recalculate totals
  function recalculateTotals() {
    const subtotal = window.DeviceProCart ? window.DeviceProCart.getSubtotal() : 0;
    const delivery = getDeliveryFee();
    const installation = getInstallationFee(subtotal);
    const total = subtotal + delivery + installation;

    subtotalEl.textContent = formatNaira(subtotal);
    deliveryEl.textContent = delivery === 0 ? 'FREE (Pickup)' : formatNaira(delivery);

    if (installation > 0) {
      installRow.style.display = 'flex';
      installEl.textContent = formatNaira(installation);
    } else {
      installRow.style.display = 'none';
      installEl.textContent = '₦0';
    }

    totalEl.textContent = formatNaira(total);

    const btnText = submitBtn.querySelector('span:first-child');
    if (btnText) {
      btnText.textContent = `Place Order & Generate Invoice (${formatNaira(total)})`;
    }
  }

  // Event Listeners
  stateSelect.addEventListener('change', recalculateTotals);
  installRadios.forEach(radio => radio.addEventListener('change', () => {
    document.querySelectorAll('.install-option-card').forEach(c => c.classList.remove('selected'));
    radio.closest('.install-option-card').classList.add('selected');
    recalculateTotals();
  }));

  document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('selected'));
      radio.closest('.payment-method-card').classList.add('selected');
    });
  });

  // Initial Calculation
  renderSummary();
  recalculateTotals();

  // Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorFeedback.style.display = 'none';

    const customerName = document.getElementById('cust-name').value.trim();
    const customerPhone = document.getElementById('cust-phone').value.trim();
    const customerEmail = document.getElementById('cust-email').value.trim();
    const deliveryAddress = document.getElementById('cust-address').value.trim();
    const deliveryState = stateSelect.value;
    const notes = document.getElementById('cust-notes').value.trim();
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const installationOption = document.querySelector('input[name="installationOption"]:checked').value;

    if (!customerName || !customerPhone || !deliveryAddress || !deliveryState) {
      errorFeedback.textContent = 'Please fill out all mandatory customer and delivery destination fields.';
      errorFeedback.style.display = 'block';
      return;
    }

    const subtotal = window.DeviceProCart.getSubtotal();
    const deliveryFee = getDeliveryFee();
    const installationFee = getInstallationFee(subtotal);

    const orderPayload = {
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      deliveryState,
      items: items.map(i => ({
        id: i.id,
        slug: i.slug,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        subtotal: i.price * i.quantity
      })),
      paymentMethod,
      installationOption,
      installationFeeNgn: installationFee,
      deliveryFeeNgn: deliveryFee,
      notes
    };

    submitBtn.disabled = true;
    submitBtn.querySelector('span:first-child').textContent = 'Creating Order & Reserving Hardware...';

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to place order.');
      }

      // Save order details to sessionStorage for the confirmation view
      sessionStorage.setItem('dp_latest_order', JSON.stringify(result.order));

      // Clear the cart
      window.DeviceProCart.clearCart();

      // Redirect to confirmation page
      window.location.href = `/order-confirmation?orderNumber=${encodeURIComponent(result.orderNumber)}`;
    } catch (err) {
      console.error('[CHECKOUT SUBMIT ERROR]:', err);
      errorFeedback.textContent = err.message || 'An error occurred while placing your order. Please try again.';
      errorFeedback.style.display = 'block';
      submitBtn.disabled = false;
      recalculateTotals();
    }
  });
});
