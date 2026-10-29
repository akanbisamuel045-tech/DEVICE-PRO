/**
 * DEVICE PRO — Solar Sizing Calculator Frontend Controller
 * Architecture Reference: DEVICE_PRO_ARCHITECTURE.md (Sections 6.8, 11.1, 11.2)
 */

(function () {
  'use strict';

  // Ensure CalculatorEngine is available
  if (typeof CalculatorEngine === 'undefined') {
    console.error('CalculatorEngine module is required.');
    return;
  }

  // Pre-configured load presets
  const PRESETS = {
    starter: {
      name: '1–2 Bedroom Flat / Store',
      description: 'Basic lighting, TV, fans, and small fridge',
      loads: {
        'led-lighting': { qty: 8, hoursDay: 2, hoursNight: 8 },
        'ceiling-fan': { qty: 2, hoursDay: 4, hoursNight: 8 },
        'standing-fan': { qty: 1, hoursDay: 4, hoursNight: 6 },
        'tv-decoder': { qty: 1, hoursDay: 4, hoursNight: 6 },
        'inverter-refrigerator': { qty: 1, hoursDay: 12, hoursNight: 12 },
        'internet-cctv': { qty: 1, hoursDay: 12, hoursNight: 12 }
      }
    },
    apartment: {
      name: '3-Bedroom Apartment / Office',
      description: 'Lights, fans, TV, fridge, freezer & 1× 1.0HP Inverter AC',
      loads: {
        'led-lighting': { qty: 12, hoursDay: 2, hoursNight: 8 },
        'ceiling-fan': { qty: 4, hoursDay: 4, hoursNight: 8 },
        'tv-decoder': { qty: 2, hoursDay: 4, hoursNight: 6 },
        'inverter-refrigerator': { qty: 1, hoursDay: 12, hoursNight: 12 },
        'chest-freezer': { qty: 1, hoursDay: 8, hoursNight: 6 },
        'inverter-ac-1hp': { qty: 1, hoursDay: 2, hoursNight: 6 },
        'workstation-pc': { qty: 1, hoursDay: 6, hoursNight: 2 },
        'internet-cctv': { qty: 1, hoursDay: 12, hoursNight: 12 }
      }
    },
    duplex: {
      name: '4–5 Bedroom Duplex',
      description: 'Full house with 2× Inverter ACs, deep freezer, fridge, water pump',
      loads: {
        'led-lighting': { qty: 20, hoursDay: 2, hoursNight: 8 },
        'ceiling-fan': { qty: 6, hoursDay: 4, hoursNight: 8 },
        'tv-decoder': { qty: 3, hoursDay: 4, hoursNight: 6 },
        'inverter-refrigerator': { qty: 1, hoursDay: 12, hoursNight: 12 },
        'chest-freezer': { qty: 1, hoursDay: 10, hoursNight: 8 },
        'inverter-ac-15hp': { qty: 2, hoursDay: 3, hoursNight: 7 },
        'water-pump-1hp': { qty: 1, hoursDay: 1, hoursNight: 0 },
        'microwave': { qty: 1, hoursDay: 0.5, hoursNight: 0 },
        'workstation-pc': { qty: 2, hoursDay: 8, hoursNight: 2 },
        'internet-cctv': { qty: 1, hoursDay: 12, hoursNight: 12 }
      }
    },
    villa: {
      name: 'Executive Villa / Clinic',
      description: 'Large residence with 4× Inverter ACs, borehole pump & refrigeration',
      loads: {
        'led-lighting': { qty: 30, hoursDay: 2, hoursNight: 10 },
        'ceiling-fan': { qty: 8, hoursDay: 6, hoursNight: 8 },
        'tv-decoder': { qty: 4, hoursDay: 6, hoursNight: 6 },
        'inverter-refrigerator': { qty: 2, hoursDay: 12, hoursNight: 12 },
        'chest-freezer': { qty: 2, hoursDay: 10, hoursNight: 8 },
        'inverter-ac-15hp': { qty: 3, hoursDay: 4, hoursNight: 8 },
        'inverter-ac-2hp': { qty: 1, hoursDay: 2, hoursNight: 6 },
        'borehole-pump-15hp': { qty: 1, hoursDay: 1, hoursNight: 0 },
        'microwave': { qty: 1, hoursDay: 0.5, hoursNight: 0 },
        'workstation-pc': { qty: 3, hoursDay: 8, hoursNight: 4 },
        'internet-cctv': { qty: 1, hoursDay: 12, hoursNight: 12 }
      }
    },
    office: {
      name: 'Commercial Office / Microgrid',
      description: '3-Phase office with 6× ACs, 20+ PCs, network servers and lighting',
      loads: {
        'led-lighting': { qty: 40, hoursDay: 9, hoursNight: 2 },
        'tv-decoder': { qty: 2, hoursDay: 8, hoursNight: 0 },
        'inverter-refrigerator': { qty: 2, hoursDay: 10, hoursNight: 2 },
        'inverter-ac-2hp': { qty: 4, hoursDay: 9, hoursNight: 0 },
        'water-pump-1hp': { qty: 1, hoursDay: 1, hoursNight: 0 },
        'workstation-pc': { qty: 15, hoursDay: 9, hoursNight: 0 },
        'internet-cctv': { qty: 1, hoursDay: 12, hoursNight: 12 }
      }
    }
  };

  // State
  let currentAppliances = JSON.parse(JSON.stringify(CalculatorEngine.DEFAULT_APPLIANCES));
  let currentRegion = 'lagos';
  let currentBatteryType = 'lifepo4';
  let currentAutonomyDays = 1.0;
  let currentDiversityFactor = 0.75;
  let activeFilterCategory = 'all';
  let activeSearchQuery = '';
  let lastCalculation = null;

  // DOM Elements
  const regionSelect = document.getElementById('calc-region');
  const batterySelect = document.getElementById('calc-battery');
  const autonomySelect = document.getElementById('calc-autonomy');
  const diversitySelect = document.getElementById('calc-diversity');
  const appliancesTableBody = document.getElementById('appliances-table-body');
  const filterPills = document.querySelectorAll('[data-app-filter]');
  const searchInput = document.getElementById('app-search-input');
  const presetBtns = document.querySelectorAll('[data-preset]');

  // Result display elements
  const resLoadKw = document.getElementById('res-load-kw');
  const resSurgeKw = document.getElementById('res-surge-kw');
  const resInverterKva = document.getElementById('res-inverter-kva');
  const resDailyKwh = document.getElementById('res-daily-kwh');
  const resBatteryKwh = document.getElementById('res-battery-kwh');
  const resBatteryAh = document.getElementById('res-battery-ah');
  const resSolarKwp = document.getElementById('res-solar-kwp');
  const resPanelCount = document.getElementById('res-panel-count');
  const resRoofSpace = document.getElementById('res-roof-space');

  // Package Card Elements
  const pkgNameEl = document.getElementById('pkg-name');
  const pkgPriceEl = document.getElementById('pkg-price');
  const pkgIdealEl = document.getElementById('pkg-ideal');
  const btnAddPkgCart = document.getElementById('btn-add-pkg-cart');
  const btnRequestQuote = document.getElementById('btn-request-quote');
  const btnWhatsappConsult = document.getElementById('btn-whatsapp-consult');
  const warningsWrap = document.getElementById('calc-warnings-wrap');

  // Custom Appliance Modal Elements
  const customModal = document.getElementById('custom-appliance-modal');
  const btnOpenCustom = document.getElementById('btn-open-custom-app');
  const btnCloseCustom = document.getElementById('btn-close-custom-app');
  const btnCancelCustomX = document.getElementById('btn-cancel-custom-x');
  const btnSaveCustom = document.getElementById('btn-save-custom-app');

  // Quote Form
  const calcQuoteForm = document.getElementById('calc-quote-form');
  const quoteFeedback = document.getElementById('calc-quote-feedback');

  // Initialize
  function init() {
    renderAppliancesTable();
    setupEventListeners();
    applyPreset('apartment');
    recalculate();
  }

  // Render Table
  function renderAppliancesTable() {
    if (!appliancesTableBody) return;
    appliancesTableBody.innerHTML = '';

    const query = activeSearchQuery.trim().toLowerCase();

    currentAppliances.forEach((app, index) => {
      // Category filter check
      if (activeFilterCategory !== 'all' && app.category.toLowerCase() !== activeFilterCategory.toLowerCase()) {
        return;
      }

      // Search query check
      if (query && !app.name.toLowerCase().includes(query) && !app.category.toLowerCase().includes(query)) {
        return;
      }

      const row = document.createElement('tr');
      row.className = 'app-row';
      row.setAttribute('data-app-id', app.id);

      const surgeTag = app.hasSurge
        ? `<span class="app-surge-badge">${app.surgeMultiplier}x Surge</span>`
        : '';

      const totalHours = Math.min(24, (parseFloat(app.hoursDay) || 0) + (parseFloat(app.hoursNight) || 0));
      const duty = typeof app.dutyCycle === 'number' ? app.dutyCycle : (
        app.id === 'inverter-refrigerator' ? 0.40 :
        app.id === 'chest-freezer' ? 0.45 :
        (app.id && app.id.startsWith('inverter-ac')) ? 0.55 : 1.0
      );
      const dailyWh = Math.round((app.watts || 0) * (app.qty || 0) * totalHours * duty);

      row.innerHTML = `
        <td class="app-info-td">
          <div class="app-meta-cell">
            <span class="app-title">
              ${escapeHtml(app.name)}
              ${surgeTag}
            </span>
            <span class="app-notes">${escapeHtml(app.notes || app.category)}</span>
          </div>
        </td>
        <td>
          <input type="number" class="app-watt-input" min="1" max="15000" step="5" value="${app.watts}" data-index="${index}" data-field="watts" aria-label="Wattage for ${escapeHtml(app.name)}">
          <span style="font-size: 0.75rem; color: #64748B;">W</span>
        </td>
        <td>
          <div class="qty-stepper">
            <button type="button" class="qty-step-btn" data-step="-1" data-index="${index}" aria-label="Decrease quantity">−</button>
            <span class="qty-number" id="qty-val-${index}">${app.qty}</span>
            <button type="button" class="qty-step-btn" data-step="1" data-index="${index}" aria-label="Increase quantity">+</button>
          </div>
        </td>
        <td>
          <div class="hours-cell">
            <div class="hours-row">
              <span>Day (Sun):</span>
              <input type="number" class="hours-input" min="0" max="24" step="0.5" value="${app.hoursDay || 0}" data-index="${index}" data-field="hoursDay" aria-label="Day hours">
            </div>
            <div class="hours-row">
              <span>Night (Bat):</span>
              <input type="number" class="hours-input" min="0" max="24" step="0.5" value="${app.hoursNight || 0}" data-index="${index}" data-field="hoursNight" aria-label="Night hours">
            </div>
          </div>
        </td>
        <td class="app-subtotal-cell">
          <span id="subtotal-${index}">${dailyWh.toLocaleString()} Wh</span>
        </td>
      `;

      appliancesTableBody.appendChild(row);
    });
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Select dropdowns
    if (regionSelect) {
      regionSelect.addEventListener('change', e => {
        currentRegion = e.target.value;
        recalculate();
      });
    }

    if (batterySelect) {
      batterySelect.addEventListener('change', e => {
        currentBatteryType = e.target.value;
        recalculate();
      });
    }

    if (autonomySelect) {
      autonomySelect.addEventListener('change', e => {
        currentAutonomyDays = parseFloat(e.target.value) || 1.0;
        recalculate();
      });
    }

    if (diversitySelect) {
      diversitySelect.addEventListener('change', e => {
        currentDiversityFactor = parseFloat(e.target.value) || 0.75;
        recalculate();
      });
    }

    // Preset buttons
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const presetKey = btn.getAttribute('data-preset');
        applyPreset(presetKey);
      });
    });

    // Filter pills
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeFilterCategory = pill.getAttribute('data-app-filter');
        renderAppliancesTable();
      });
    });

    // Search input
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        activeSearchQuery = e.target.value;
        renderAppliancesTable();
      });
    }

    // Delegated table input changes
    if (appliancesTableBody) {
      appliancesTableBody.addEventListener('click', e => {
        const stepBtn = e.target.closest('.qty-step-btn');
        if (stepBtn) {
          const index = parseInt(stepBtn.getAttribute('data-index'), 10);
          const step = parseInt(stepBtn.getAttribute('data-step'), 10);
          const app = currentAppliances[index];
          if (app) {
            app.qty = Math.max(0, Math.min(99, (app.qty || 0) + step));
            const qtyEl = document.getElementById(`qty-val-${index}`);
            if (qtyEl) qtyEl.textContent = app.qty;
            updateRowSubtotal(index);
            recalculate();
          }
        }
      });

      appliancesTableBody.addEventListener('input', e => {
        const target = e.target;
        const index = parseInt(target.getAttribute('data-index'), 10);
        const field = target.getAttribute('data-field');
        if (!isNaN(index) && field && currentAppliances[index]) {
          const val = Math.max(0, parseFloat(target.value) || 0);
          currentAppliances[index][field] = val;
          updateRowSubtotal(index);
          recalculate();
        }
      });
    }

    // Custom Appliance Modal
    const closeCustomModal = () => {
      if (customModal) customModal.classList.remove('open');
    };

    if (btnOpenCustom && customModal) {
      btnOpenCustom.addEventListener('click', () => {
        customModal.classList.add('open');
        const firstInput = document.getElementById('custom-app-name');
        if (firstInput) firstInput.focus();
      });
    }

    if (btnCloseCustom) {
      btnCloseCustom.addEventListener('click', closeCustomModal);
    }

    if (btnCancelCustomX) {
      btnCancelCustomX.addEventListener('click', closeCustomModal);
    }

    if (customModal) {
      customModal.addEventListener('click', (e) => {
        if (e.target === customModal) closeCustomModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && customModal && customModal.classList.contains('open')) {
        closeCustomModal();
      }
    });

    if (btnSaveCustom) {
      btnSaveCustom.addEventListener('click', saveCustomAppliance);
    }

    // Add to Cart
    if (btnAddPkgCart) {
      btnAddPkgCart.addEventListener('click', () => {
        if (!lastCalculation || !lastCalculation.recommendations.matchedPackage) return;
        const pkg = lastCalculation.recommendations.matchedPackage;
        if (!pkg.priceNgn) {
          alert('This custom engineered microgrid requires an engineered quote. Please submit the consultation form below.');
          scrollToQuote();
          return;
        }

        if (window.DeviceProCart) {
          window.DeviceProCart.addItem({
            id: `pkg-${pkg.slug}`,
            slug: pkg.slug,
            name: pkg.name,
            category: 'Solar Packages',
            price: pkg.priceNgn,
            image: '/images/products/package-5kva-duplex.jpg'
          });
          window.DeviceProCart.openDrawer();
          return;
        }

        // Add to localStorage cart fallback
        const cartItem = {
          id: `pkg-${pkg.slug}`,
          slug: pkg.slug,
          name: pkg.name,
          category: 'Solar Packages',
          price: pkg.priceNgn,
          quantity: 1,
          image: '/images/products/package-5kva-duplex.jpg'
        };

        let cart = [];
        try {
          cart = JSON.parse(localStorage.getItem('devicepro_cart') || '[]');
        } catch (e) { cart = []; }

        const existing = cart.find(i => i.id === cartItem.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          cart.push(cartItem);
        }

        localStorage.setItem('devicepro_cart', JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart } }));

        // Open cart drawer if available
        const cartDrawer = document.getElementById('cart-drawer');
        if (cartDrawer) {
          cartDrawer.classList.add('is-open');
        } else {
          alert(`Added "${pkg.name}" (₦${pkg.priceNgn.toLocaleString()}) to your equipment cart!`);
        }
      });
    }

    // Request Quote button
    if (btnRequestQuote) {
      btnRequestQuote.addEventListener('click', scrollToQuote);
    }

    // WhatsApp Consultation
    if (btnWhatsappConsult) {
      btnWhatsappConsult.addEventListener('click', () => {
        if (!lastCalculation) return;
        const rec = lastCalculation.recommendations;
        const text = encodeURIComponent(
          `Hello DEVICE PRO Engineers, I sized my solar system on your website:\n` +
          `• Inverter: ${rec.inverter.recommendedKva}kVA (${rec.inverter.continuousKw}kW continuous)\n` +
          `• Battery: ${rec.battery.nominalStorageKwh}kWh (${rec.battery.chemistry})\n` +
          `• Solar Array: ${rec.solarArray.minimumKwp}kWp (~${rec.solarArray.recommendedPanelCount} panels)\n` +
          `• Daily Energy: ${lastCalculation.demand.dailyEnergyKwh} kWh/day\n` +
          `• Location: ${lastCalculation.inputs.regionName}\n` +
          `Please provide a formal proposal with delivery and installation schedule.`
        );
        window.open(`https://wa.me/2348031234567?text=${text}`, '_blank');
      });
    }

    // Quote Form Submit
    if (calcQuoteForm) {
      calcQuoteForm.addEventListener('submit', handleQuoteSubmit);
    }
  }

  // Update specific row subtotal in UI
  function updateRowSubtotal(index) {
    const app = currentAppliances[index];
    if (!app) return;
    const totalHours = Math.min(24, (parseFloat(app.hoursDay) || 0) + (parseFloat(app.hoursNight) || 0));
    const duty = typeof app.dutyCycle === 'number' ? app.dutyCycle : (
      app.id === 'inverter-refrigerator' ? 0.40 :
      app.id === 'chest-freezer' ? 0.45 :
      (app.id && app.id.startsWith('inverter-ac')) ? 0.55 : 1.0
    );
    const dailyWh = Math.round((app.watts || 0) * (app.qty || 0) * totalHours * duty);
    const subEl = document.getElementById(`subtotal-${index}`);
    if (subEl) {
      subEl.textContent = `${dailyWh.toLocaleString()} Wh`;
    }
  }

  // Apply Preset
  function applyPreset(key) {
    const preset = PRESETS[key];
    if (!preset) return;

    currentAppliances.forEach(app => {
      if (preset.loads[app.id]) {
        const item = preset.loads[app.id];
        app.qty = item.qty;
        app.hoursDay = item.hoursDay;
        app.hoursNight = item.hoursNight;
      } else {
        app.qty = 0;
      }
    });

    renderAppliancesTable();
    recalculate();
  }

  // Save Custom Appliance
  function saveCustomAppliance() {
    const nameInput = document.getElementById('custom-app-name');
    const wattsInput = document.getElementById('custom-app-watts');
    const surgeInput = document.getElementById('custom-app-surge');
    const catInput = document.getElementById('custom-app-cat');

    const name = (nameInput.value || '').trim();
    const watts = parseFloat(wattsInput.value) || 100;
    const surge = parseFloat(surgeInput.value) || 1.0;
    const cat = catInput ? catInput.value : 'Custom';

    if (!name) {
      alert('Please enter an appliance name.');
      return;
    }

    const newApp = {
      id: `custom-${Date.now()}`,
      name,
      category: cat,
      watts,
      qty: 1,
      hoursDay: 2,
      hoursNight: 4,
      hasSurge: surge > 1.0,
      surgeMultiplier: surge,
      notes: `User-defined (${surge}x surge)`
    };

    currentAppliances.unshift(newApp);
    customModal.classList.remove('open');
    nameInput.value = '';
    wattsInput.value = '';

    renderAppliancesTable();
    recalculate();
  }

  // Main Recalculate
  function recalculate() {
    lastCalculation = CalculatorEngine.calculateSolarSizing({
      appliances: currentAppliances,
      region: currentRegion,
      batteryType: currentBatteryType,
      autonomyDays: currentAutonomyDays,
      diversityFactor: currentDiversityFactor
    });

    updateResultsUI(lastCalculation);
  }

  // Update Results UI
  function updateResultsUI(data) {
    const rec = data.recommendations;
    const dem = data.demand;

    // Load Metrics
    if (resLoadKw) resLoadKw.textContent = `${(dem.simultaneousLoadWatts / 1000).toFixed(2)} kW`;
    if (resSurgeKw) resSurgeKw.textContent = `${(dem.requiredSurgeWatts / 1000).toFixed(2)} kW`;
    if (resInverterKva) resInverterKva.textContent = `${rec.inverter.recommendedKva} kVA`;
    if (resDailyKwh) resDailyKwh.textContent = `${dem.dailyEnergyKwh} kWh`;
    if (resBatteryKwh) resBatteryKwh.textContent = `${rec.battery.nominalStorageKwh} kWh`;
    if (resBatteryAh) resBatteryAh.textContent = `${rec.battery.recommendedAh} Ah`;
    const resBatteryVolts = document.getElementById('res-battery-volts');
    if (resBatteryVolts) resBatteryVolts.textContent = rec.battery.voltage ? rec.battery.voltage.replace(' DC', '') : '48V';
    if (resSolarKwp) resSolarKwp.textContent = `${rec.solarArray.installedKwp || rec.solarArray.minimumKwp} kWp`;
    if (resPanelCount) resPanelCount.textContent = `${rec.solarArray.recommendedPanelCount} × 550W`;
    if (resRoofSpace) resRoofSpace.textContent = `${rec.solarArray.roofSpaceRequiredSqm} m²`;

    // Matched Package Card
    const pkg = rec.matchedPackage;
    if (pkg) {
      if (pkgNameEl) pkgNameEl.textContent = pkg.name;
      if (pkgPriceEl) {
        pkgPriceEl.textContent = pkg.priceNgn
          ? `₦${pkg.priceNgn.toLocaleString()}`
          : 'Custom Engineering Quote';
      }
      if (pkgIdealEl) pkgIdealEl.textContent = pkg.idealFor;
      if (btnAddPkgCart) {
        btnAddPkgCart.style.display = pkg.priceNgn ? 'inline-flex' : 'none';
      }
    }

    // Warnings
    if (warningsWrap) {
      warningsWrap.innerHTML = '';
      if (data.warnings && data.warnings.length > 0) {
        data.warnings.forEach(w => {
          const alertDiv = document.createElement('div');
          alertDiv.className = 'calc-alert calc-alert-warning';
          alertDiv.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span><strong>${escapeHtml(w.appliance)}:</strong> ${escapeHtml(w.message)}</span>
          `;
          warningsWrap.appendChild(alertDiv);
        });
      }
    }

    // Update Quote Form Hidden Fields
    const fieldSystem = document.getElementById('quote-calc-system');
    if (fieldSystem) {
      fieldSystem.value = `${rec.inverter.recommendedKva}kVA / ${rec.battery.nominalStorageKwh}kWh / ${rec.solarArray.minimumKwp}kWp`;
    }
  }

  // Scroll to Quote Form
  function scrollToQuote() {
    const target = document.getElementById('sizing-quote-section');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Handle Quote Submission
  async function handleQuoteSubmit(e) {
    e.preventDefault();
    if (!calcQuoteForm) return;

    const submitBtn = calcQuoteForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    if (quoteFeedback) {
      quoteFeedback.style.display = 'block';
      quoteFeedback.className = 'quote-feedback-loading';
      quoteFeedback.textContent = 'Submitting your sizing specification to our engineering desk...';
    }

    const payload = {
      fullName: calcQuoteForm.fullName.value,
      phone: calcQuoteForm.phone.value,
      email: calcQuoteForm.email.value,
      state: calcQuoteForm.state.value,
      propertyType: calcQuoteForm.propertyType.value,
      notes: `SOLAR SIZING CALCULATOR SUBMISSION:
• Recommended Inverter: ${lastCalculation.recommendations.inverter.recommendedKva}kVA
• Daily Energy: ${lastCalculation.demand.dailyEnergyKwh} kWh/day
• Battery Storage: ${lastCalculation.recommendations.battery.nominalStorageKwh} kWh (${lastCalculation.inputs.batteryChemistry})
• Solar PV Array: ${lastCalculation.recommendations.solarArray.minimumKwp} kWp (${lastCalculation.recommendations.solarArray.recommendedPanelCount} panels)
• Region: ${lastCalculation.inputs.regionName}
• Additional Notes: ${calcQuoteForm.notes ? calcQuoteForm.notes.value : 'None'}`
    };

    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        quoteFeedback.className = 'quote-feedback-success';
        quoteFeedback.innerHTML = `
          <strong>Quotation Request Confirmed! Reference #: ${json.referenceId || json.quoteId}</strong><br>
          Our solar engineering lead will review your sizing profile and contact you within 2 business hours.
        `;
        calcQuoteForm.reset();
      } else {
        throw new Error(json.error || 'Submission failed');
      }
    } catch (err) {
      if (quoteFeedback) {
        quoteFeedback.className = 'quote-feedback-error';
        quoteFeedback.textContent = `Error: ${err.message}. Please try again or WhatsApp us directly.`;
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Start on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
