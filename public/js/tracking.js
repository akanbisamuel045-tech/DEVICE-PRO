/**
 * DEVICE PRO Nigeria — Delivery, Installation & After-Sales Operations Portal
 * Client-side script for privacy-safe tracking, warranty verification, and support ticketing.
 */

(function () {
  'use strict';

  // Formatters
  function formatNaira(num) {
    if (num === null || num === undefined || isNaN(num)) return '₦0';
    return '₦' + Number(num).toLocaleString('en-NG');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Active state
  let currentOrderData = null;
  let currentWarrantyData = null;

  // DOM Elements - Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-content-panel');

  // DOM Elements - Order Tracker
  const orderForm = document.getElementById('order-tracking-form');
  const orderNumInput = document.getElementById('track-order-number');
  const contactInput = document.getElementById('track-contact-input');
  const btnTrackSubmit = document.getElementById('btn-track-submit');
  const orderLoading = document.getElementById('tracking-loading-state');
  const orderErrorAlert = document.getElementById('tracking-error-alert');
  const orderErrorMsg = document.getElementById('tracking-error-msg');
  const orderResultsCard = document.getElementById('tracking-results-card');

  // Results fields
  const resOrderNum = document.getElementById('res-order-number');
  const resOrderStatusBadge = document.getElementById('res-order-status-badge');
  const resCustomerName = document.getElementById('res-customer-name');
  const resDestinationState = document.getElementById('res-destination-state');
  const resOrderDate = document.getElementById('res-order-date');
  const resPaymentStatus = document.getElementById('res-payment-status');
  const resTotalAmount = document.getElementById('res-total-amount');
  const resCourierPartner = document.getElementById('res-courier-partner');
  const resEstimatedDelivery = document.getElementById('res-estimated-delivery');
  const resWaybillNumber = document.getElementById('res-waybill-number');
  const resMilestonesTimeline = document.getElementById('res-milestones-timeline');
  const resAssignedEngineer = document.getElementById('res-assigned-engineer');
  const resScheduledDate = document.getElementById('res-scheduled-date');
  const resEngineerPhone = document.getElementById('res-engineer-phone');
  const resCommissioningStatus = document.getElementById('res-commissioning-status');
  const resCertIdBadge = document.getElementById('res-cert-id-badge');
  const resTestsMatrix = document.getElementById('res-tests-matrix');
  const resItemsTableBody = document.getElementById('res-items-table-body');
  const resWhatsappLink = document.getElementById('res-whatsapp-link');

  // DOM Elements - Warranty Check
  const warrantyForm = document.getElementById('warranty-search-form');
  const warrantyInput = document.getElementById('warranty-serial-input');
  const btnVerifyWarranty = document.getElementById('btn-verify-warranty');
  const warrantyErrorAlert = document.getElementById('warranty-error-alert');
  const warrantyErrorMsg = document.getElementById('warranty-error-msg');
  const warrantyResultCard = document.getElementById('warranty-result-card');

  // Warranty Card Fields
  const certStatusBadge = document.getElementById('cert-status-badge');
  const certProductName = document.getElementById('cert-product-name');
  const certProductSku = document.getElementById('cert-product-sku');
  const certWarrantyCode = document.getElementById('cert-warranty-code');
  const certYearsText = document.getElementById('cert-years-text');
  const certDaysRemaining = document.getElementById('cert-days-remaining');
  const certSerialNumber = document.getElementById('cert-serial-number');
  const certCustomerName = document.getElementById('cert-customer-name');
  const certStartDate = document.getElementById('cert-start-date');
  const certEndDate = document.getElementById('cert-end-date');
  const certCoverageSummary = document.getElementById('cert-coverage-summary');

  // DOM Elements - Support Ticket
  const supportForm = document.getElementById('support-ticket-form');
  const btnSubmitTicket = document.getElementById('btn-submit-ticket');
  const ticketSuccessBox = document.getElementById('ticket-success-box');
  const ticketCreatedNumber = document.getElementById('ticket-created-number');
  const ticketSlaText = document.getElementById('ticket-sla-text');

  // DOM Elements - Track Ticket
  const trackTicketForm = document.getElementById('track-ticket-form');
  const trackTicketNumInput = document.getElementById('track-ticket-number');
  const trackTicketContactInput = document.getElementById('track-ticket-contact');
  const ticketTrackError = document.getElementById('ticket-track-error');
  const ticketTrackErrorMsg = document.getElementById('ticket-track-error-msg');
  const ticketTrackResult = document.getElementById('ticket-track-result');
  const resTktNum = document.getElementById('res-tkt-num');
  const resTktStatusBadge = document.getElementById('res-tkt-status-badge');
  const resTktName = document.getElementById('res-tkt-name');
  const resTktCategory = document.getElementById('res-tkt-category');
  const resTktDate = document.getElementById('res-tkt-date');
  const resTktSubject = document.getElementById('res-tkt-subject');
  const resTktDesc = document.getElementById('res-tkt-desc');
  const resTktEngineer = document.getElementById('res-tkt-engineer');
  const resTktNotes = document.getElementById('res-tkt-notes');

  // =========================================================================
  // 1. TAB SWITCHING
  // =========================================================================
  function switchTab(tabKey) {
    tabButtons.forEach(btn => {
      const match = btn.getAttribute('data-tab') === tabKey;
      btn.classList.toggle('active', match);
    });

    tabPanels.forEach(panel => {
      const match = panel.id === `panel-${tabKey}`;
      panel.classList.toggle('active', match);
    });

    // Update URL parameter without reload
    const url = new URL(window.location);
    url.searchParams.set('tab', tabKey);
    window.history.replaceState({}, '', url);
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // =========================================================================
  // 2. ORDER TRACKING LOGIC
  // =========================================================================
  async function performOrderTracking(orderNumber, contact) {
    if (!orderNumber || !contact) {
      showOrderError('Please provide both the Order Number and the registered Phone or Email.');
      return;
    }

    if (orderLoading) orderLoading.style.display = 'block';
    if (orderErrorAlert) orderErrorAlert.style.display = 'none';
    if (orderResultsCard) orderResultsCard.style.display = 'none';
    if (btnTrackSubmit) {
      btnTrackSubmit.disabled = true;
      btnTrackSubmit.innerHTML = '<span>Verifying...</span>';
    }

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          verificationContact: contact.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to verify order with provided credentials.');
      }

      currentOrderData = data.tracking;
      renderOrderTrackingResults(data.tracking);
    } catch (err) {
      showOrderError(err.message || 'Verification failed. Please check your order details.');
    } finally {
      if (orderLoading) orderLoading.style.display = 'none';
      if (btnTrackSubmit) {
        btnTrackSubmit.disabled = false;
        btnTrackSubmit.innerHTML = '<span>Track Milestones</span><span class="arrow">→</span>';
      }
    }
  }

  function showOrderError(msg) {
    if (orderErrorMsg) orderErrorMsg.textContent = msg;
    if (orderErrorAlert) orderErrorAlert.style.display = 'block';
    if (orderResultsCard) orderResultsCard.style.display = 'none';
  }

  function renderOrderTrackingResults(tracking) {
    if (!orderResultsCard) return;

    if (resOrderNum) resOrderNum.textContent = tracking.orderNumber;
    if (resCustomerName) resCustomerName.textContent = tracking.customerName;
    if (resDestinationState) resDestinationState.textContent = tracking.deliveryState;
    if (resOrderDate) resOrderDate.textContent = formatDate(tracking.createdAt);
    if (resPaymentStatus) {
      resPaymentStatus.textContent = tracking.paymentStatus === 'paid' || tracking.paymentStatus === 'verified'
        ? 'Verified (Paid in Full)'
        : (tracking.paymentStatus === 'failed' ? 'Declined' : 'Pending Verification');
    }
    if (resTotalAmount) resTotalAmount.textContent = formatNaira(tracking.totalNgn);

    if (resOrderStatusBadge) {
      resOrderStatusBadge.textContent = tracking.orderStatus;
      resOrderStatusBadge.className = `badge-pill status-${tracking.orderStatus}`;
    }

    // Logistics & Courier Banner
    if (resCourierPartner) resCourierPartner.textContent = tracking.fulfillment.courierPartner || 'DEVICE PRO Fleet Logistics';
    if (resEstimatedDelivery) resEstimatedDelivery.textContent = tracking.fulfillment.estimatedDelivery || 'In Transit (Scheduled)';
    if (resWaybillNumber) resWaybillNumber.textContent = tracking.fulfillment.waybillNumber || 'PREPARING-WAYBILL';

    // 6-Stage Milestone Stepper
    if (resMilestonesTimeline) {
      resMilestonesTimeline.innerHTML = (tracking.milestones || []).map(m => {
        const isDone = m.status === 'completed';
        const isActive = m.status === 'active' || m.status === 'current';
        const markerContent = isDone ? '<i data-lucide="check" class="lucide-sm"></i>' : m.step;

        return `
          <div class="timeline-step ${isDone ? 'completed' : ''} ${isActive ? 'active' : ''}">
            <div class="step-marker-circle">${markerContent}</div>
            <div class="step-content-card">
              <div class="step-top-row">
                <span class="step-title">${m.step}. ${escapeHtml(m.title)}</span>
                <span class="step-badge">${escapeHtml(m.badge)}</span>
              </div>
              <p class="step-desc">${escapeHtml(m.detail || m.details || m.description)}</p>
              ${m.timestamp ? `<span class="step-timestamp">Logged: ${formatDate(m.timestamp)}</span>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    // Certified Commissioning & Engineering Matrix
    const comm = tracking.commissioning || {};
    if (resAssignedEngineer) {
      resAssignedEngineer.textContent = comm.assignedEngineer || 'Pending Engineer Allocation';
    }
    if (resScheduledDate) {
      resScheduledDate.textContent = comm.installationScheduledDate || 'Pending Schedule Confirmation';
    }
    if (resEngineerPhone) {
      resEngineerPhone.textContent = comm.engineerPhone || '+234 803 123 4567';
    }
    if (resCommissioningStatus) {
      resCommissioningStatus.textContent = comm.commissioningStatus.toUpperCase();
    }
    if (resCertIdBadge) {
      resCertIdBadge.textContent = comm.commissioningCertificateId 
        ? `Certificate ID: ${comm.commissioningCertificateId}` 
        : 'Certificate: Issued Post-Commissioning';
    }

    // Safety Tests Matrix
    if (resTestsMatrix && comm.commissioningTests) {
      const tests = comm.commissioningTests;
      resTestsMatrix.innerHTML = `
        <div class="test-check-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Earthing: <strong>${escapeHtml(tests.earthingResistance || '< 5.0Ω Pass')}</strong></span>
        </div>
        <div class="test-check-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>DC Surge: <strong>${escapeHtml(tests.dcSurgeProtection || 'Type II SPD Verified')}</strong></span>
        </div>
        <div class="test-check-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Inverter Sync: <strong>${escapeHtml(tests.inverterSync || '50Hz Grid Lock Pass')}</strong></span>
        </div>
        <div class="test-check-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Battery Cells: <strong>${escapeHtml(tests.batteryCellDeviation || tests.cellBalanceDeviation || '< 15mV Pass')}</strong></span>
        </div>
      `;
    }

    // Equipment Items List
    if (resItemsTableBody) {
      const items = tracking.items || [];
      resItemsTableBody.innerHTML = items.map(item => `
        <tr>
          <td>
            <strong>${escapeHtml(item.name)}</strong>
          </td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">${formatNaira(item.price)}</td>
          <td style="text-align: right; font-weight: 700;">${formatNaira(item.subtotal || item.price * item.quantity)}</td>
          <td style="text-align: center;">
            <span style="font-size: 0.75rem; background: #E0E7FF; color: #3730A3; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px;">
              Tier-1 Warranty
            </span>
          </td>
        </tr>
      `).join('');
    }

    // WhatsApp Direct Link
    if (resWhatsappLink) {
      const waMsg = encodeURIComponent(`Hello DEVICE PRO, I am checking on my Order ${tracking.orderNumber} for ${tracking.customerName} in ${tracking.deliveryState}.`);
      resWhatsappLink.href = `https://wa.me/2348031234567?text=${waMsg}`;
    }

    orderResultsCard.style.display = 'block';
    orderResultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (orderForm) {
    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const num = orderNumInput ? orderNumInput.value.trim() : '';
      const contact = contactInput ? contactInput.value.trim() : '';
      performOrderTracking(num, contact);
    });
  }

  // =========================================================================
  // 3. WARRANTY VERIFICATION LOGIC
  // =========================================================================
  async function performWarrantyLookup(serialOrCode) {
    if (!serialOrCode) return;

    if (warrantyErrorAlert) warrantyErrorAlert.style.display = 'none';
    if (warrantyResultCard) warrantyResultCard.style.display = 'none';
    if (btnVerifyWarranty) {
      btnVerifyWarranty.disabled = true;
      btnVerifyWarranty.innerHTML = '<span>Verifying...</span>';
    }

    try {
      const res = await fetch(`/api/warranty/verify/${encodeURIComponent(serialOrCode.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Warranty record not found.');
      }

      currentWarrantyData = data.warranty;
      renderWarrantyCard(data.warranty);
    } catch (err) {
      if (warrantyErrorMsg) warrantyErrorMsg.textContent = err.message || 'Serial number not recognized.';
      if (warrantyErrorAlert) warrantyErrorAlert.style.display = 'block';
    } finally {
      if (btnVerifyWarranty) {
        btnVerifyWarranty.disabled = false;
        btnVerifyWarranty.innerHTML = '<span>Verify Warranty</span><span class="arrow">→</span>';
      }
    }
  }

  function renderWarrantyCard(w) {
    if (!warrantyResultCard) return;

    if (certProductName) certProductName.textContent = w.productName;
    if (certProductSku) certProductSku.textContent = w.productSku || 'TIER-1 CERTIFIED';
    if (certWarrantyCode) certWarrantyCode.textContent = w.warrantyCode;
    if (certSerialNumber) certSerialNumber.textContent = w.serialNumber;
    if (certCustomerName) certCustomerName.textContent = w.customerName;
    if (certStartDate) certStartDate.textContent = formatDate(w.startDate);
    if (certEndDate) certEndDate.textContent = formatDate(w.endDate);
    if (certCoverageSummary) certCoverageSummary.textContent = w.coverageSummary;
    if (certYearsText) certYearsText.textContent = `${w.warrantyYears} Years Manufacturer Warranty`;

    if (certDaysRemaining) {
      certDaysRemaining.textContent = w.isExpired 
        ? 'Warranty Expired' 
        : `${w.daysRemaining.toLocaleString()} Days Remaining`;
      certDaysRemaining.style.color = w.isExpired ? '#EF4444' : '#15803D';
    }

    if (certStatusBadge) {
      certStatusBadge.textContent = w.isExpired ? 'EXPIRED COVERAGE' : 'VERIFIED TIER-1 HARDWARE';
      certStatusBadge.className = `cert-seal-badge ${w.isExpired ? 'expired' : ''}`;
    }

    warrantyResultCard.style.display = 'block';
    warrantyResultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (warrantyForm) {
    warrantyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = warrantyInput ? warrantyInput.value.trim() : '';
      performWarrantyLookup(query);
    });
  }

  // =========================================================================
  // 4. SUPPORT TICKET CREATION LOGIC
  // =========================================================================
  if (supportForm) {
    supportForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const customerName = document.getElementById('ticket-name')?.value.trim();
      const customerPhone = document.getElementById('ticket-phone')?.value.trim();
      const customerEmail = document.getElementById('ticket-email')?.value.trim();
      const orderNumber = document.getElementById('ticket-order-ref')?.value.trim();
      const issueCategory = document.getElementById('ticket-category')?.value;
      const priority = document.getElementById('ticket-priority')?.value;
      const subject = document.getElementById('ticket-subject')?.value.trim();
      const description = document.getElementById('ticket-description')?.value.trim();

      if (!customerName || !customerPhone || !subject || !description) {
        alert('Please fill out all required ticket fields.');
        return;
      }

      if (btnSubmitTicket) {
        btnSubmitTicket.disabled = true;
        btnSubmitTicket.innerHTML = '<span>Logging Ticket...</span>';
      }

      try {
        const res = await fetch('/api/support/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName,
            customerPhone,
            customerEmail,
            orderNumber: orderNumber || null,
            issueCategory,
            priority,
            subject,
            description
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to submit support ticket.');
        }

        if (ticketCreatedNumber) ticketCreatedNumber.textContent = data.ticketNumber;
        if (ticketSlaText) ticketSlaText.textContent = data.slaNotice || 'Ticket received. Technician will respond shortly.';
        if (ticketSuccessBox) ticketSuccessBox.style.display = 'block';

        supportForm.reset();
        ticketSuccessBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (err) {
        alert(err.message || 'Error submitting ticket.');
      } finally {
        if (btnSubmitTicket) {
          btnSubmitTicket.disabled = false;
          btnSubmitTicket.innerHTML = '<span>Submit Engineering Ticket</span><span class="arrow">→</span>';
        }
      }
    });
  }

  // =========================================================================
  // 5. TRACK SUPPORT TICKET STATUS
  // =========================================================================
  if (trackTicketForm) {
    trackTicketForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tktNum = trackTicketNumInput ? trackTicketNumInput.value.trim() : '';
      const contact = trackTicketContactInput ? trackTicketContactInput.value.trim() : '';

      if (!tktNum || !contact) {
        if (ticketTrackErrorMsg) ticketTrackErrorMsg.textContent = 'Please provide ticket number and registered contact.';
        if (ticketTrackError) ticketTrackError.style.display = 'block';
        return;
      }

      if (ticketTrackError) ticketTrackError.style.display = 'none';
      if (ticketTrackResult) ticketTrackResult.style.display = 'none';

      try {
        const res = await fetch(`/api/support/tickets/${encodeURIComponent(tktNum)}?contact=${encodeURIComponent(contact)}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Ticket record not found or contact mismatch.');
        }

        const t = data.ticket;
        if (resTktNum) resTktNum.textContent = t.ticketNumber;
        if (resTktName) resTktName.textContent = t.customerName;
        if (resTktCategory) resTktCategory.textContent = t.issueCategory;
        if (resTktDate) resTktDate.textContent = formatDate(t.createdAt);
        if (resTktSubject) resTktSubject.textContent = t.subject;
        if (resTktDesc) resTktDesc.textContent = t.description;
        if (resTktEngineer) resTktEngineer.textContent = t.assignedEngineer || 'Unassigned (Queued for Field Engineer)';
        if (resTktNotes) resTktNotes.textContent = t.resolutionNotes || 'Our operations team has received your inquiry. Dispatch technician is currently reviewing the fault log.';

        if (resTktStatusBadge) {
          resTktStatusBadge.textContent = t.status.toUpperCase();
          resTktStatusBadge.className = `badge-pill status-${t.status === 'resolved' ? 'completed' : (t.status === 'in_progress' ? 'processing' : 'pending')}`;
        }

        if (ticketTrackResult) {
          ticketTrackResult.style.display = 'block';
          ticketTrackResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } catch (err) {
        if (ticketTrackErrorMsg) ticketTrackErrorMsg.textContent = err.message || 'Ticket lookup failed.';
        if (ticketTrackError) ticketTrackError.style.display = 'block';
      }
    });
  }

  // =========================================================================
  // 6. GLOBAL HELPER FUNCTIONS
  // =========================================================================
  window.demoFillTracking = function (orderNum, contact) {
    if (orderNumInput) orderNumInput.value = orderNum;
    if (contactInput) contactInput.value = contact;
    performOrderTracking(orderNum, contact);
  };

  window.demoVerifyWarranty = function (serial) {
    if (warrantyInput) warrantyInput.value = serial;
    performWarrantyLookup(serial);
  };

  window.demoFillTicket = function (ticketNum, contact) {
    if (trackTicketNumInput) trackTicketNumInput.value = ticketNum;
    if (trackTicketContactInput) trackTicketContactInput.value = contact;
    trackTicketForm.dispatchEvent(new Event('submit'));
  };

  window.openSupportForOrder = function () {
    switchTab('support-ticket');
    if (currentOrderData) {
      const orderRef = document.getElementById('ticket-order-ref');
      const name = document.getElementById('ticket-name');
      const phone = document.getElementById('ticket-phone');
      const email = document.getElementById('ticket-email');
      if (orderRef) orderRef.value = currentOrderData.orderNumber;
      if (name) name.value = currentOrderData.customerName;
      if (phone) phone.value = currentOrderData.customerPhone;
      if (email && currentOrderData.customerEmail) email.value = currentOrderData.customerEmail;
    }
  };

  window.claimWarrantyFromCert = function () {
    switchTab('support-ticket');
    if (currentWarrantyData) {
      const orderRef = document.getElementById('ticket-order-ref');
      const name = document.getElementById('ticket-name');
      const category = document.getElementById('ticket-category');
      const subject = document.getElementById('ticket-subject');
      const description = document.getElementById('ticket-description');

      if (orderRef) orderRef.value = currentWarrantyData.serialNumber;
      if (name) name.value = currentWarrantyData.customerName;
      if (category) category.value = 'warranty';
      if (subject) subject.value = `Warranty Claim: ${currentWarrantyData.productName} (${currentWarrantyData.serialNumber})`;
      if (description) description.value = `Requesting authorized warranty inspection and rapid swap unit for hardware serial ${currentWarrantyData.serialNumber}.`;
    }
  };

  window.trackCreatedTicket = function () {
    const num = ticketCreatedNumber?.textContent?.trim();
    if (num) {
      switchTab('track-ticket');
      if (trackTicketNumInput) trackTicketNumInput.value = num;
      // Auto-focus contact field for user
      if (trackTicketContactInput) trackTicketContactInput.focus();
    }
  };

  // Check URL parameters on load
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  const orderParam = urlParams.get('orderNumber');
  const contactParam = urlParams.get('contact');
  const serialParam = urlParams.get('serial');

  if (tabParam) {
    if (tabParam === 'warranty') switchTab('warranty-check');
    else if (tabParam === 'support') switchTab('support-ticket');
    else if (tabParam === 'ticket') switchTab('track-ticket');
    else switchTab('order-tracker');
  }

  if (orderParam && contactParam) {
    if (orderNumInput) orderNumInput.value = orderParam;
    if (contactInput) contactInput.value = contactParam;
    performOrderTracking(orderParam, contactParam);
  } else if (orderParam) {
    if (orderNumInput) orderNumInput.value = orderParam;
    // Prompt focus on contact input
    if (contactInput) contactInput.focus();
  }

  if (serialParam) {
    switchTab('warranty-check');
    if (warrantyInput) warrantyInput.value = serialParam;
    performWarrantyLookup(serialParam);
  }

})();
