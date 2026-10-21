/**
 * DEVICE PRO — Order Confirmation Client Script
 * Hydrates pro-forma invoice and bank transfer coordinates from API or storage.
 */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const orderNumber = params.get('orderNumber');

  const displayOrderNum = document.getElementById('display-order-number');
  const copyBtn = document.getElementById('btn-copy-ref');
  const invDate = document.getElementById('inv-date');
  const invOrderNum = document.getElementById('inv-order-num');
  const invNarration = document.getElementById('inv-payment-narration');

  const custName = document.getElementById('inv-cust-name');
  const custPhone = document.getElementById('inv-cust-phone');
  const custEmail = document.getElementById('inv-cust-email');
  const custAddress = document.getElementById('inv-cust-address');
  const custState = document.getElementById('inv-cust-state');

  const itemsBody = document.getElementById('inv-items-body');
  const subtotalEl = document.getElementById('inv-subtotal');
  const deliveryEl = document.getElementById('inv-delivery');
  const installRow = document.getElementById('inv-row-install');
  const installEl = document.getElementById('inv-install');
  const totalEl = document.getElementById('inv-total');
  const waBtn = document.getElementById('btn-whatsapp-confirm');

  const formatNaira = (val) => '₦' + Number(val || 0).toLocaleString('en-NG');

  let orderData = null;

  // Try sessionStorage first
  const cached = sessionStorage.getItem('dp_latest_order');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (!orderNumber || parsed.order_number === orderNumber || parsed.orderNumber === orderNumber) {
        orderData = parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cached order:', e);
    }
  }

  // If no order data and orderNumber in URL, fetch from server
  if (!orderData && orderNumber) {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`);
      const result = await res.json();
      if (result.success && result.order) {
        orderData = result.order;
      }
    } catch (e) {
      console.error('Failed to fetch order from server:', e);
    }
  }

  if (!orderData) {
    displayOrderNum.textContent = orderNumber || 'DP-ORD-NOT-FOUND';
    custName.textContent = 'Order details not found or expired from session.';
    return;
  }

  // Extract fields
  const num = orderData.order_number || orderData.orderNumber || 'DP-ORD-000000';
  const name = orderData.customer_name || orderData.customerName || 'Valued Customer';
  const phone = orderData.customer_phone || orderData.customerPhone || '';
  const email = orderData.customer_email || orderData.customerEmail || '';
  const address = orderData.delivery_address || orderData.deliveryAddress || 'Standard Delivery';
  const state = orderData.delivery_state || orderData.deliveryState || 'Lagos';
  const subtotal = Number(orderData.subtotal_ngn !== undefined ? orderData.subtotal_ngn : (orderData.subtotalNgn !== undefined ? orderData.subtotalNgn : 0));
  const deliveryFee = Number(orderData.delivery_fee_ngn !== undefined ? orderData.delivery_fee_ngn : (orderData.deliveryFeeNgn !== undefined ? orderData.deliveryFeeNgn : (state.toLowerCase() === 'lagos' ? 15000 : 35000)));

  let installFee = Number(orderData.installation_fee_ngn !== undefined ? orderData.installation_fee_ngn : (orderData.installationFeeNgn !== undefined ? orderData.installationFeeNgn : 0));
  const installOption = orderData.installation_option || orderData.installationOption;
  if (installFee === 0 && installOption === 'turnkey_install' && subtotal > 0) {
    installFee = Math.max(120000, Math.round(subtotal * 0.08));
  }

  const rawTotal = Number(orderData.total_ngn !== undefined ? orderData.total_ngn : (orderData.totalNgn !== undefined ? orderData.totalNgn : 0));
  const total = rawTotal > 0 && rawTotal >= (subtotal + deliveryFee + installFee)
    ? rawTotal
    : (subtotal + deliveryFee + installFee);

  const createdAt = orderData.created_at || new Date().toISOString();

  // Populate UI
  displayOrderNum.textContent = num;
  invOrderNum.textContent = num;
  invNarration.textContent = num;
  invDate.textContent = new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  custName.textContent = name;
  custPhone.textContent = phone ? `Phone / WhatsApp: ${phone}` : '';
  custEmail.textContent = email ? `Email: ${email}` : '';
  custAddress.textContent = `Address: ${address}`;
  custState.textContent = `Region: ${state}`;

  subtotalEl.textContent = formatNaira(subtotal);
  deliveryEl.textContent = formatNaira(deliveryFee);

  if (installFee > 0) {
    installRow.style.display = 'flex';
    installEl.textContent = formatNaira(installFee);
  } else {
    installRow.style.display = 'none';
  }

  totalEl.textContent = formatNaira(total);

  // Live Tracking Button link
  const trackingBtn = document.getElementById('btn-live-tracking');
  if (trackingBtn) {
    const contact = phone || email || '';
    trackingBtn.href = `/tracking?orderNumber=${encodeURIComponent(num)}&contact=${encodeURIComponent(contact)}`;
  }

  // Line items
  let items = orderData.items || [];
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (e) { items = []; }
  }

  if (Array.isArray(items) && items.length > 0) {
    let rowsHtml = '';
    items.forEach(item => {
      const qty = item.quantity || item.qty || 1;
      const unitPrice = item.price || item.unitPriceNgn || 0;
      const lineSub = item.subtotal || (unitPrice * qty);
      rowsHtml += `
        <tr>
          <td>
            <strong>${item.name || item.title || 'Solar Equipment'}</strong>
            ${item.slug ? `<div style="font-size:0.75rem; color:#64748B;">SKU: ${item.slug}</div>` : ''}
          </td>
          <td style="text-align: center;">${qty}</td>
          <td style="text-align: right;">${formatNaira(unitPrice)}</td>
          <td style="text-align: right;"><strong>${formatNaira(lineSub)}</strong></td>
        </tr>
      `;
    });
    itemsBody.innerHTML = rowsHtml;
  } else {
    itemsBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 1.5rem; color: #64748B;">
          Hardware components packaged and ready for dispatch.
        </td>
      </tr>
    `;
  }

  // Copy reference button
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(num).then(() => {
        copyBtn.innerHTML = '<i data-lucide="check" class="lucide-sm"></i>';
        if (window.refreshLucideIcons) window.refreshLucideIcons();
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          `;
        }, 2000);
      });
    });
  }

  // WhatsApp Button
  if (waBtn) {
    const waText = encodeURIComponent(`Hello DEVICE PRO Nigeria! I just placed order ${num} for ${formatNaira(total)}. I would like to confirm payment and delivery.`);
    waBtn.href = `https://wa.me/2348031234567?text=${waText}`;
  }

  // Check if returning with payment reference from online gateway
  const reference = params.get('reference');
  const statusBadge = document.getElementById('inv-status-badge');
  const bankBox = document.getElementById('bank-transfer-details-box');
  const onlineBox = document.getElementById('online-payment-confirmed-box');
  const confRef = document.getElementById('conf-pay-ref');
  const confChannel = document.getElementById('conf-pay-channel');
  const stepPayment = document.getElementById('tracker-step-payment');
  const dotPayment = document.getElementById('tracker-dot-payment');
  const subPayment = document.getElementById('tracker-sub-payment');
  const stepQc = document.getElementById('tracker-step-qc');

  function renderPaidState(payRef, channel) {
    if (statusBadge) {
      statusBadge.textContent = 'PAID IN FULL';
      statusBadge.className = 'badge-status-confirmed';
      statusBadge.style.cssText = 'background: #16A34A; color: #FFFFFF; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 0.8rem;';
    }
    if (bankBox) bankBox.style.display = 'none';
    if (onlineBox) onlineBox.style.display = 'block';
    if (confRef) confRef.textContent = payRef || 'VERIFIED';
    if (confChannel) confChannel.textContent = channel ? channel.toUpperCase() : 'ONLINE CARD / USSD';

    if (stepPayment) {
      stepPayment.className = 'tracker-step completed';
      if (dotPayment) {
        dotPayment.innerHTML = '<i data-lucide="check" class="lucide-sm"></i>';
        if (window.refreshLucideIcons) window.refreshLucideIcons();
      }
      if (subPayment) subPayment.textContent = 'Verified & Settled';
    }
    if (stepQc) {
      stepQc.className = 'tracker-step active';
    }
  }

  // 1. If returning from Paystack / Gateway with reference
  if (reference) {
    try {
      const verifyRes = await fetch(`/api/payments/verify/${encodeURIComponent(reference)}?orderNumber=${encodeURIComponent(num)}`);
      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.verified && verifyData.paymentStatus === 'paid') {
        renderPaidState(reference, verifyData.channel);
      } else {
        console.warn('Payment verification pending or failed:', verifyData.error);
      }
    } catch (e) {
      console.error('Error during payment verification call:', e);
    }
  } else if (orderData.payment_status === 'paid' || orderData.paymentStatus === 'paid') {
    // 2. If order already marked paid in database
    renderPaidState(orderData.payment_reference || 'CONFIRMED', orderData.payment_method || 'transfer');
  }
});
