/**
 * DEVICE PRO — Generator vs Solar Savings & ROI Calculator Controller
 * Architecture Reference: DEVICE_PRO_ARCHITECTURE.md (Sections 6.9, 11.2)
 */

(function () {
  'use strict';

  if (typeof CalculatorEngine === 'undefined') {
    console.error('CalculatorEngine module is required.');
    return;
  }

  // State
  let currentFuelType = 'pms';
  let currentGenKva = 7.5;
  let currentFuelPrice = 1050;
  let currentHoursPerDay = 10;
  let currentMaintenanceNaira = 35000;
  let currentSolarCostNaira = 4350000;
  let lastCalculation = null;

  // DOM Elements
  const fuelTabs = document.querySelectorAll('[data-fuel-tab]');
  const genChips = document.querySelectorAll('[data-gen-chip]');
  const hoursSlider = document.getElementById('hours-slider');
  const hoursDisplay = document.getElementById('hours-display');
  const fuelPriceInput = document.getElementById('fuel-price-input');
  const maintInput = document.getElementById('maint-input');
  const solarCostInput = document.getElementById('solar-cost-input');

  // Results Elements
  const resPaybackMonths = document.getElementById('res-payback-months');
  const resPaybackYears = document.getElementById('res-payback-years');
  const resMonthlyBurnLitres = document.getElementById('res-monthly-burn-litres');
  const resMonthlyOpexNaira = document.getElementById('res-monthly-opex-naira');
  const resYearlyOpexNaira = document.getElementById('res-yearly-opex-naira');
  const resNetAnnualSavings = document.getElementById('res-net-annual-savings');
  const resTenYearWealth = document.getElementById('res-ten-year-wealth');
  const resCo2Tons = document.getElementById('res-co2-tons');
  const resTreesPlanted = document.getElementById('res-trees-planted');
  const comparisonTableBody = document.getElementById('comparison-table-body');

  // Actions
  const btnSavingsWhatsapp = document.getElementById('btn-savings-whatsapp');
  const btnSavingsQuote = document.getElementById('btn-savings-quote');
  const savingsQuoteForm = document.getElementById('savings-quote-form');
  const savingsFeedback = document.getElementById('savings-quote-feedback');

  function init() {
    setupEventListeners();
    recalculate();
  }

  function setupEventListeners() {
    // Fuel Type Tabs
    fuelTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        fuelTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFuelType = tab.getAttribute('data-fuel-tab');

        // Adjust default fuel price
        if (currentFuelType === 'diesel') {
          currentFuelPrice = 1350;
          if (currentGenKva < 10) currentGenKva = 10;
        } else {
          currentFuelPrice = 1050;
          if (currentGenKva > 7.5) currentGenKva = 7.5;
        }

        if (fuelPriceInput) fuelPriceInput.value = currentFuelPrice;
        syncChipsToKva();
        recalculate();
      });
    });

    // Generator Chips
    genChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const kva = parseFloat(chip.getAttribute('data-gen-chip'));
        currentGenKva = kva;

        // Auto-switch fuel type if appropriate
        if (kva >= 10 && currentFuelType === 'pms') {
          currentFuelType = 'diesel';
          currentFuelPrice = 1350;
          if (fuelPriceInput) fuelPriceInput.value = currentFuelPrice;
          fuelTabs.forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-fuel-tab') === 'diesel');
          });
        }

        // Auto update solar cost & maintenance defaults
        updateDefaultsForKva(kva);
        syncChipsToKva();
        recalculate();
      });
    });

    // Hours Slider
    if (hoursSlider) {
      hoursSlider.addEventListener('input', e => {
        currentHoursPerDay = parseFloat(e.target.value) || 1;
        if (hoursDisplay) hoursDisplay.textContent = `${currentHoursPerDay} hrs / day`;
        recalculate();
      });
    }

    // Fuel Price Input
    if (fuelPriceInput) {
      fuelPriceInput.addEventListener('input', e => {
        currentFuelPrice = Math.max(500, parseFloat(e.target.value) || 1050);
        recalculate();
      });
    }

    // Maintenance Input
    if (maintInput) {
      maintInput.addEventListener('input', e => {
        currentMaintenanceNaira = Math.max(0, parseFloat(e.target.value) || 0);
        recalculate();
      });
    }

    // Solar Cost Input
    if (solarCostInput) {
      solarCostInput.addEventListener('input', e => {
        currentSolarCostNaira = Math.max(100000, parseFloat(e.target.value) || 1150000);
        recalculate();
      });
    }

    // WhatsApp Action
    if (btnSavingsWhatsapp) {
      btnSavingsWhatsapp.addEventListener('click', () => {
        if (!lastCalculation) return;
        const fin = lastCalculation.financials;
        const inp = lastCalculation.inputs;
        const text = encodeURIComponent(
          `Hello DEVICE PRO Engineers, I calculated my generator operational cost:\n` +
          `• Generator: ${inp.generatorKva}kVA (${inp.fuelTypeName})\n` +
          `• Daily Runtime: ${inp.runningHoursPerDay} hours/day\n` +
          `• Monthly Fuel & Servicing: ₦${fin.monthlyTotalOpexNaira.toLocaleString()}/month\n` +
          `• Annual Gen OPEX: ₦${fin.yearlyTotalOpexNaira.toLocaleString()}/year\n` +
          `• Estimated Solar Payback: ${fin.paybackMonths} Months (${fin.paybackYears} Years)\n` +
          `• 10-Year Net Savings: ₦${fin.tenYearNetSavingsNaira.toLocaleString()}\n` +
          `Please provide a solar transition proposal to eliminate my generator fuel spend.`
        );
        window.open(`https://wa.me/2348031234567?text=${text}`, '_blank');
      });
    }

    // Quote CTA
    if (btnSavingsQuote) {
      btnSavingsQuote.addEventListener('click', () => {
        const formSec = document.getElementById('savings-quote-section');
        if (formSec) formSec.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Form submission
    if (savingsQuoteForm) {
      savingsQuoteForm.addEventListener('submit', handleSavingsQuoteSubmit);
    }
  }

  function syncChipsToKva() {
    genChips.forEach(chip => {
      const kva = parseFloat(chip.getAttribute('data-gen-chip'));
      chip.classList.toggle('active', kva === currentGenKva);
    });
  }

  function updateDefaultsForKva(kva) {
    if (kva <= 3.0) {
      currentSolarCostNaira = 1150000;
      currentMaintenanceNaira = 15000;
    } else if (kva <= 5.0) {
      currentSolarCostNaira = 2450000;
      currentMaintenanceNaira = 25000;
    } else if (kva <= 7.5) {
      currentSolarCostNaira = 4350000;
      currentMaintenanceNaira = 35000;
    } else if (kva <= 10.0) {
      currentSolarCostNaira = 6450000;
      currentMaintenanceNaira = 65000;
    } else if (kva <= 15.0) {
      currentSolarCostNaira = 8200000;
      currentMaintenanceNaira = 95000;
    } else if (kva <= 20.0) {
      currentSolarCostNaira = 12500000;
      currentMaintenanceNaira = 120000;
    } else {
      currentSolarCostNaira = Math.round(kva * 600000);
      currentMaintenanceNaira = Math.round(kva * 6000);
    }

    if (solarCostInput) solarCostInput.value = currentSolarCostNaira;
    if (maintInput) maintInput.value = currentMaintenanceNaira;
  }

  function recalculate() {
    lastCalculation = CalculatorEngine.calculateGeneratorSavings({
      generatorKva: currentGenKva,
      fuelType: currentFuelType,
      fuelPricePerLiter: currentFuelPrice,
      runningHoursPerDay: currentHoursPerDay,
      maintenanceMonthlyNaira: currentMaintenanceNaira,
      solarCostNaira: currentSolarCostNaira
    });

    updateUI(lastCalculation);
  }

  function updateUI(data) {
    const fin = data.financials;
    const con = data.consumption;
    const env = data.environmental;

    if (resPaybackMonths) resPaybackMonths.textContent = `${fin.paybackMonths} Months`;
    if (resPaybackYears) resPaybackYears.textContent = `(${fin.paybackYears} Years)`;
    if (resMonthlyBurnLitres) resMonthlyBurnLitres.textContent = `${con.monthlyFuelLiters.toLocaleString()} Litres`;
    if (resMonthlyOpexNaira) resMonthlyOpexNaira.textContent = `₦${fin.monthlyTotalOpexNaira.toLocaleString()}`;
    if (resYearlyOpexNaira) resYearlyOpexNaira.textContent = `₦${fin.yearlyTotalOpexNaira.toLocaleString()}`;
    if (resNetAnnualSavings) resNetAnnualSavings.textContent = `₦${fin.netAnnualSavingsNaira.toLocaleString()}`;
    if (resTenYearWealth) resTenYearWealth.textContent = `₦${fin.tenYearNetSavingsNaira.toLocaleString()}`;
    if (resCo2Tons) resCo2Tons.textContent = `${env.annualCo2AvoidedTons} Tons CO2 / Yr`;
    if (resTreesPlanted) resTreesPlanted.textContent = `~${env.equivalentTreesPlanted} Trees`;

    // Render 5-Year Cumulative Table
    if (comparisonTableBody && data.yearlyProgression) {
      comparisonTableBody.innerHTML = '';
      data.yearlyProgression.forEach(item => {
        const row = document.createElement('tr');
        if (item.isBreakEven) row.className = 'break-even-row';

        const statusCell = item.isBreakEven
          ? `<span class="break-even-badge">✓ Net Profit</span>`
          : `<span style="color: #64748B; font-size: 0.75rem;">CapEx Amortization</span>`;

        row.innerHTML = `
          <td><strong>Year ${item.year}</strong></td>
          <td style="color: #EF4444; font-weight: 700;">₦${item.cumulativeGeneratorNaira.toLocaleString()}</td>
          <td style="color: #3B82F6; font-weight: 600;">₦${item.cumulativeSolarNaira.toLocaleString()}</td>
          <td style="color: ${item.netCashFlowNaira >= 0 ? '#16A34A' : '#64748B'}; font-weight: 800;">
            ${item.netCashFlowNaira >= 0 ? '+' : ''}₦${item.netCashFlowNaira.toLocaleString()}
          </td>
          <td>${statusCell}</td>
        `;
        comparisonTableBody.appendChild(row);
      });
    }
  }

  async function handleSavingsQuoteSubmit(e) {
    e.preventDefault();
    if (!savingsQuoteForm) return;

    const submitBtn = savingsQuoteForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    if (savingsFeedback) {
      savingsFeedback.style.display = 'block';
      savingsFeedback.className = 'quote-feedback-loading';
      savingsFeedback.textContent = 'Submitting your generator audit to our energy transition team...';
    }

    const payload = {
      fullName: savingsQuoteForm.fullName.value,
      phone: savingsQuoteForm.phone.value,
      email: savingsQuoteForm.email.value,
      state: savingsQuoteForm.state.value,
      propertyType: savingsQuoteForm.propertyType.value,
      notes: `GENERATOR SAVINGS AUDIT SUBMISSION:
• Existing Generator: ${lastCalculation.inputs.generatorKva}kVA (${lastCalculation.inputs.fuelTypeName})
• Daily Runtime: ${lastCalculation.inputs.runningHoursPerDay} hrs/day
• Current Monthly Fuel & Maint: ₦${lastCalculation.financials.monthlyTotalOpexNaira.toLocaleString()}/month
• Current Annual Spend: ₦${lastCalculation.financials.yearlyTotalOpexNaira.toLocaleString()}/year
• Estimated Solar Payback: ${lastCalculation.financials.paybackMonths} Months
• 10-Year Net Savings: ₦${lastCalculation.financials.tenYearNetSavingsNaira.toLocaleString()}
• Client Notes: ${savingsQuoteForm.notes ? savingsQuoteForm.notes.value : 'None'}`
    };

    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        savingsFeedback.className = 'quote-feedback-success';
        savingsFeedback.innerHTML = `
          <strong>Generator Audit Confirmed! Reference #: ${json.referenceId || json.quoteId}</strong><br>
          Our solar energy transition lead will reach out to schedule an on-site diesel/petrol audit and formal system proposal.
        `;
        savingsQuoteForm.reset();
      } else {
        throw new Error(json.error || 'Submission failed');
      }
    } catch (err) {
      if (savingsFeedback) {
        savingsFeedback.className = 'quote-feedback-error';
        savingsFeedback.textContent = `Error: ${err.message}. Please try again or WhatsApp us.`;
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
