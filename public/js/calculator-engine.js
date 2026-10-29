/**
 * DEVICE PRO — Solar Sizing & Savings Domain Engine
 * Specification Reference: DEVICE_PRO_ARCHITECTURE.md (Sections 6.8, 6.9, 11.1, 11.2)
 *
 * Isolated, pure domain module. Zero UI dependencies.
 * Version: 1.0.0
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CalculatorEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // =========================================================================
  // CONSTANTS & REGIONAL SOLAR REFERENCE DATA (NIGERIA)
  // =========================================================================

  const REGIONAL_PSH = {
    lagos: { name: 'Lagos & South-West', psh: 4.2, defaultTilt: '10°-12° South' },
    abuja: { name: 'Abuja & North-Central', psh: 5.2, defaultTilt: '12°-15° South' },
    kano: { name: 'Kano & North-West', psh: 5.8, defaultTilt: '15° South' },
    maiduguri: { name: 'Maiduguri & North-East', psh: 6.0, defaultTilt: '15° South' },
    port_harcourt: { name: 'Port Harcourt & South-South', psh: 3.9, defaultTilt: '8°-10° South' },
    enugu: { name: 'Enugu & South-East', psh: 4.4, defaultTilt: '10°-12° South' }
  };

  const BATTERY_CHEMISTRIES = {
    lifepo4: {
      name: 'Lithium Iron Phosphate (LiFePO4)',
      recommendedDoD: 0.85,
      maxDoD: 0.90,
      roundTripEfficiency: 0.95,
      cycleLife: '4,000–6,000 cycles (10–15 years)',
      tempDerating: 0.98
    },
    tubular: {
      name: 'Deep-Cycle Tubular Lead-Acid',
      recommendedDoD: 0.50,
      maxDoD: 0.55,
      roundTripEfficiency: 0.75,
      cycleLife: '800–1,200 cycles (2–3 years)',
      tempDerating: 0.85
    }
  };

  const DEFAULT_APPLIANCES = [
    {
      id: 'led-lighting',
      name: 'LED Bulbs / Energy Lighting',
      category: 'Lighting',
      watts: 15,
      defaultQty: 10,
      defaultHoursDay: 2,
      defaultHoursNight: 8,
      hasSurge: false,
      surgeMultiplier: 1.0,
      notes: 'Standard 9W–15W residential LED bulbs'
    },
    {
      id: 'ceiling-fan',
      name: 'Ceiling Fan (High Efficiency)',
      category: 'Ventilation',
      watts: 65,
      defaultQty: 3,
      defaultHoursDay: 4,
      defaultHoursNight: 8,
      hasSurge: true,
      surgeMultiplier: 1.5,
      notes: 'AC induction motor ceiling fans'
    },
    {
      id: 'standing-fan',
      name: 'Standing / Orbit Fan',
      category: 'Ventilation',
      watts: 55,
      defaultQty: 2,
      defaultHoursDay: 4,
      defaultHoursNight: 6,
      hasSurge: true,
      surgeMultiplier: 1.5,
      notes: 'Portable standing fan'
    },
    {
      id: 'tv-decoder',
      name: '43"–55" Smart TV & Decoder',
      category: 'Entertainment',
      watts: 130,
      defaultQty: 1,
      defaultHoursDay: 4,
      defaultHoursNight: 6,
      hasSurge: false,
      surgeMultiplier: 1.0,
      notes: 'Includes DStv/StarTimes decoder and soundbar'
    },
    {
      id: 'inverter-refrigerator',
      name: 'Inverter Refrigerator (Double Door)',
      category: 'Refrigeration',
      watts: 150,
      dutyCycle: 0.40,
      defaultQty: 1,
      defaultHoursDay: 12,
      defaultHoursNight: 12,
      hasSurge: true,
      surgeMultiplier: 2.5,
      notes: 'Smart digital inverter compressor with soft ramp'
    },
    {
      id: 'chest-freezer',
      name: 'Deep Chest Freezer (Medium)',
      category: 'Refrigeration',
      watts: 250,
      dutyCycle: 0.45,
      defaultQty: 1,
      defaultHoursDay: 8,
      defaultHoursNight: 6,
      hasSurge: true,
      surgeMultiplier: 3.5,
      notes: 'Standard compressor freezer with high starting inrush'
    },
    {
      id: 'inverter-ac-1hp',
      name: '1.0 HP Inverter Air Conditioner',
      category: 'Climate',
      watts: 900,
      dutyCycle: 0.55,
      defaultQty: 0,
      defaultHoursDay: 2,
      defaultHoursNight: 6,
      hasSurge: true,
      surgeMultiplier: 2.2,
      notes: 'Modern variable-speed inverter compressor'
    },
    {
      id: 'inverter-ac-15hp',
      name: '1.5 HP Inverter Air Conditioner',
      category: 'Climate',
      watts: 1350,
      dutyCycle: 0.55,
      defaultQty: 0,
      defaultHoursDay: 2,
      defaultHoursNight: 6,
      hasSurge: true,
      surgeMultiplier: 2.5,
      notes: 'Requires minimum 3.5kVA–5kVA pure sine wave inverter'
    },
    {
      id: 'inverter-ac-2hp',
      name: '2.0 HP Inverter Air Conditioner',
      category: 'Climate',
      watts: 1800,
      dutyCycle: 0.60,
      defaultQty: 0,
      defaultHoursDay: 0,
      defaultHoursNight: 6,
      hasSurge: true,
      surgeMultiplier: 2.8,
      notes: 'Heavy residential load; requires 5kVA+ system'
    },
    {
      id: 'water-pump-1hp',
      name: '1.0 HP Water Transfer Pump',
      category: 'Pumping',
      watts: 750,
      defaultQty: 0,
      defaultHoursDay: 1,
      defaultHoursNight: 0,
      hasSurge: true,
      surgeMultiplier: 4.0,
      notes: 'Intermittent surface pumping; high starting surge'
    },
    {
      id: 'borehole-pump-15hp',
      name: '1.5 HP Borehole Submersible Pump',
      category: 'Pumping',
      watts: 1120,
      defaultQty: 0,
      defaultHoursDay: 1,
      defaultHoursNight: 0,
      hasSurge: true,
      surgeMultiplier: 4.5,
      notes: 'Deep-well submersible; requires large surge headroom'
    },
    {
      id: 'microwave',
      name: 'Microwave Oven (800W–1000W Output)',
      category: 'Kitchen',
      watts: 1200,
      defaultQty: 0,
      defaultHoursDay: 0.5,
      defaultHoursNight: 0,
      hasSurge: true,
      surgeMultiplier: 1.5,
      notes: 'High intermittent draw; daytime usage recommended'
    },
    {
      id: 'electric-iron',
      name: 'Electric Pressing Iron',
      category: 'Laundry',
      watts: 1500,
      defaultQty: 0,
      defaultHoursDay: 0.5,
      defaultHoursNight: 0,
      hasSurge: false,
      surgeMultiplier: 1.0,
      notes: 'Resistive heating element; use when solar PV is producing'
    },
    {
      id: 'workstation-pc',
      name: 'Desktop PC / High-End Workstation',
      category: 'Productivity',
      watts: 200,
      defaultQty: 1,
      defaultHoursDay: 6,
      defaultHoursNight: 2,
      hasSurge: false,
      surgeMultiplier: 1.0,
      notes: 'Tower PC with monitors and peripherals'
    },
    {
      id: 'internet-cctv',
      name: 'Starlink / WiFi Router & CCTV (4 cams)',
      category: 'Productivity',
      watts: 65,
      defaultQty: 1,
      defaultHoursDay: 12,
      defaultHoursNight: 12,
      hasSurge: false,
      surgeMultiplier: 1.0,
      notes: 'Continuous 24/7 security and internet connectivity'
    }
  ];

  const STANDARD_PACKAGES = [
    {
      slug: '2kva-starter-solar-backup-system',
      name: '2kVA Starter Solar Backup System',
      inverterKva: 2.0,
      continuousKw: 1.6,
      batteryKwh: 2.56,
      solarKwp: 1.1,
      priceNgn: 1150000,
      idealFor: '1–2 Bedroom Flat / Store / Essential Lights & TV'
    },
    {
      slug: '35kva-essential-home-solar-system',
      name: '3.5kVA Essential Home Solar System',
      inverterKva: 3.5,
      continuousKw: 2.8,
      batteryKwh: 5.12,
      solarKwp: 2.2,
      priceNgn: 2450000,
      idealFor: '2–3 Bedroom Flat / Office / Fridge & 1× Inverter AC'
    },
    {
      slug: '5kva-premium-duplex-solar-package',
      name: '5kVA Premium Duplex Solar Package',
      inverterKva: 5.0,
      continuousKw: 4.0,
      batteryKwh: 10.24,
      solarKwp: 4.4,
      priceNgn: 4350000,
      idealFor: '4-Bedroom Duplex / 2× Inverter ACs + Freezer + Water Pump'
    },
    {
      slug: '75kva-executive-villa-solar-package',
      name: '7.5kVA Executive Villa Solar Package',
      inverterKva: 7.5,
      continuousKw: 6.0,
      batteryKwh: 15.36,
      solarKwp: 6.6,
      priceNgn: 6450000,
      idealFor: '5-Bedroom Villa / 3× Inverter ACs + 1.5HP Submersible Pump'
    },
    {
      slug: '10kva-executive-residence-solar-system',
      name: '10kVA Executive Residence Solar System',
      inverterKva: 10.0,
      continuousKw: 8.0,
      batteryKwh: 20.48,
      solarKwp: 8.8,
      priceNgn: 8200000,
      idealFor: 'Luxury Villa / Clinic / 4× Inverter ACs + 2HP Borehole'
    },
    {
      slug: '15kva-commercial-office-microgrid',
      name: '15kVA Commercial Office Microgrid',
      inverterKva: 15.0,
      continuousKw: 12.0,
      batteryKwh: 30.72,
      solarKwp: 13.2,
      priceNgn: 12500000,
      idealFor: 'Corporate Office / Commercial Hub / 3-Phase Multi-Unit'
    }
  ];

  // Generator fuel consumption benchmarks (Litres per hour at typical 60–75% load)
  const GENERATOR_BENCHMARKS = [
    { kva: 2.5, fuelType: 'pms', litersPerHour: 1.1, name: '2.5kVA Small Petrol Gen ("I-pass-my-neighbor" / Tiger / Elepaq)' },
    { kva: 5.0, fuelType: 'pms', litersPerHour: 1.8, name: '5kVA Heavy Petrol Gen (Elepaq / Sumec / Firman)' },
    { kva: 7.5, fuelType: 'pms', litersPerHour: 2.4, name: '7.5kVA / 8kVA Big Petrol Gen (Firman / Lutian)' },
    { kva: 10.0, fuelType: 'diesel', litersPerHour: 2.8, name: '10kVA Soundproof Diesel (Mikano / Perkins / Kipor)' },
    { kva: 15.0, fuelType: 'diesel', litersPerHour: 3.8, name: '15kVA Soundproof Diesel (Mikano / Perkins / Cummins)' },
    { kva: 20.0, fuelType: 'diesel', litersPerHour: 4.8, name: '20kVA Heavy Diesel (Perkins / Cummins)' },
    { kva: 30.0, fuelType: 'diesel', litersPerHour: 6.8, name: '30kVA 3-Phase Diesel (Perkins / FG Wilson)' },
    { kva: 50.0, fuelType: 'diesel', litersPerHour: 11.5, name: '50kVA Industrial Diesel (Perkins / Cummins)' },
    { kva: 100.0, fuelType: 'diesel', litersPerHour: 22.0, name: '100kVA Industrial Power Plant' }
  ];

  // =========================================================================
  // SOLAR SIZING CALCULATION FUNCTION
  // =========================================================================

  /**
   * Calculates comprehensive solar sizing recommendations based on user appliances,
   * location, battery chemistry, and backup requirements.
   *
   * @param {Object} options
   * @param {Array} options.appliances List of appliance selections
   * @param {string} options.region 'lagos' | 'abuja' | 'kano' | 'maiduguri' | 'port_harcourt' | 'enugu'
   * @param {string} options.batteryType 'lifepo4' | 'tubular'
   * @param {number} options.autonomyDays Autonomy days (typically 1.0)
   * @param {number} options.diversityFactor Diversity/simultaneous factor (0.5 - 1.0, default 0.75)
   * @returns {Object} Sizing results with warnings and matched package
   */
  function calculateSolarSizing(options = {}) {
    const appliances = Array.isArray(options.appliances) ? options.appliances : [];
    const regionKey = (options.region || 'lagos').toLowerCase();
    const regionData = REGIONAL_PSH[regionKey] || REGIONAL_PSH.lagos;
    const batteryTypeKey = (options.batteryType || 'lifepo4').toLowerCase();
    const batteryData = BATTERY_CHEMISTRIES[batteryTypeKey] || BATTERY_CHEMISTRIES.lifepo4;
    const autonomyDays = Math.max(0.5, Math.min(3.0, Number(options.autonomyDays) || 1.0));
    const diversityFactor = Math.max(0.5, Math.min(1.0, Number(options.diversityFactor) || 0.75));

    let totalConnectedWatts = 0;
    let totalDailyWattHours = 0;
    let dayEnergyWattHours = 0;
    let nightEnergyWattHours = 0;
    let maxIndividualSurgeWatts = 0;
    let activeApplianceCount = 0;
    const warnings = [];

    // Analyze each appliance item
    const itemized = appliances.map(item => {
      const qty = Math.max(0, parseInt(item.qty, 10) || 0);
      const watts = Math.max(0, parseFloat(item.watts) || 0);
      const hoursDay = Math.max(0, Math.min(24, parseFloat(item.hoursDay) || 0));
      const hoursNight = Math.max(0, Math.min(24, parseFloat(item.hoursNight) || 0));
      const totalHours = Math.min(24, hoursDay + hoursNight);
      const surgeMultiplier = item.hasSurge ? Math.max(1.0, parseFloat(item.surgeMultiplier) || 2.0) : 1.0;

      // Realistic duty cycle for cycling refrigeration & climate compressors
      const dutyCycle = typeof item.dutyCycle === 'number'
        ? item.dutyCycle
        : (item.id === 'inverter-refrigerator' ? 0.40
          : item.id === 'chest-freezer' ? 0.45
          : (item.id && item.id.startsWith('inverter-ac')) ? 0.55
          : 1.0);

      const itemConnectedWatts = watts * qty;
      const itemDailyWh = Math.round(itemConnectedWatts * totalHours * dutyCycle);
      const itemDayWh = Math.round(itemConnectedWatts * hoursDay * dutyCycle);
      const itemNightWh = Math.round(itemConnectedWatts * hoursNight * dutyCycle);
      const itemSurgeWatts = item.hasSurge ? (watts * surgeMultiplier) : watts;

      if (qty > 0) {
        totalConnectedWatts += itemConnectedWatts;
        totalDailyWattHours += itemDailyWh;
        dayEnergyWattHours += itemDayWh;
        nightEnergyWattHours += itemNightWh;
        activeApplianceCount += qty;

        if (itemSurgeWatts > maxIndividualSurgeWatts) {
          maxIndividualSurgeWatts = itemSurgeWatts;
        }

        // Warnings for heavy resistive heating appliances on solar
        if (watts >= 1500 && (item.id === 'electric-iron' || (item.name && item.name.toLowerCase().includes('iron')))) {
          warnings.push({
            type: 'heavy_load',
            appliance: item.name,
            message: 'High-wattage electric iron detected. Recommended to run strictly during peak sunshine hours (11:00 AM – 3:00 PM) to avoid fast battery depletion.'
          });
        }
        if (item.hasSurge && surgeMultiplier >= 3.5) {
          warnings.push({
            type: 'inrush_surge',
            appliance: item.name,
            message: `${item.name} requires ${surgeMultiplier}x starting inrush. Inverter sizing accounts for peak inductive motor start.`
          });
        }
      }

      return {
        id: item.id,
        name: item.name,
        qty,
        watts,
        dutyCycle,
        hoursDay,
        hoursNight,
        totalHours,
        itemConnectedWatts,
        itemDailyWh
      };
    });

    // Calculations:
    // 1. Continuous running load under diversity factor
    const simultaneousLoadWatts = Math.round(totalConnectedWatts * diversityFactor);

    // 2. Inverter sizing:
    // Required continuous kW = simultaneousLoadWatts * 1.25 safety margin
    const inverterSafetyMultiplier = 1.25;
    const requiredContinuousWatts = Math.round(simultaneousLoadWatts * inverterSafetyMultiplier);
    const continuousKw = +(requiredContinuousWatts / 1000).toFixed(2);

    // Inverter kVA using standard 0.8 power factor:
    // Apparent Power (kVA) = Real Power (kW) / PF
    const rawInverterKva = continuousKw / 0.8;
    // Step up to nearest standard size (round to 0.5 step)
    const recommendedInverterKva = Math.max(1.5, Math.ceil(rawInverterKva * 2) / 2);

    // Peak surge requirement
    const requiredSurgeWatts = Math.round(simultaneousLoadWatts + maxIndividualSurgeWatts);

    // 3. Daily Energy Demand (kWh)
    const dailyEnergyKwh = +(totalDailyWattHours / 1000).toFixed(2);
    const dayEnergyKwh = +(dayEnergyWattHours / 1000).toFixed(2);
    const nightEnergyKwh = +(nightEnergyWattHours / 1000).toFixed(2);

    // 4. Match with standard DEVICE PRO Turnkey Package based on inverter capacity tier
    let matchedPackage = null;
    let nextTierPackage = null;

    for (let i = 0; i < STANDARD_PACKAGES.length; i++) {
      const pkg = STANDARD_PACKAGES[i];
      if (pkg.inverterKva >= recommendedInverterKva) {
        matchedPackage = pkg;
        nextTierPackage = STANDARD_PACKAGES[i + 1] || null;
        break;
      }
    }

    if (!matchedPackage) {
      if (recommendedInverterKva > 15) {
        matchedPackage = {
          slug: 'custom-commercial-microgrid',
          name: `${Math.ceil(recommendedInverterKva)}kVA Custom Industrial Microgrid`,
          inverterKva: Math.ceil(recommendedInverterKva),
          continuousKw: Math.ceil(continuousKw),
          batteryKwh: 30.72,
          solarKwp: Math.ceil(continuousKw * 1.2),
          priceNgn: null,
          idealFor: 'Custom Engineered Multi-Phase / Commercial Microgrid'
        };
      } else {
        matchedPackage = STANDARD_PACKAGES[0];
        nextTierPackage = STANDARD_PACKAGES[1];
      }
    }

    // 5. Battery Storage Sizing:
    // Sized with practical lithium modular battery sizes in Nigeria (2.56, 5.12, 10.24, 15.36, 20.48, 30.72 kWh)
    // and balanced to match the inverter capacity class and night essential load
    const systemVoltage = recommendedInverterKva >= 3.0 ? 48 : 24;
    let nominalStorageKwh = matchedPackage.batteryKwh || 5.12;

    // Allow expansion if high night demand warrants an additional battery module
    const inverterEfficiency = 0.90;
    const baseStorageKwh = (nightEnergyKwh * 0.65) * autonomyDays;
    const usableStorageKwh = +(baseStorageKwh / inverterEfficiency).toFixed(2);
    const rawNominalStorageKwh = usableStorageKwh > 0
      ? +(usableStorageKwh / batteryData.recommendedDoD).toFixed(2)
      : 0;

    if (recommendedInverterKva <= 2.0) {
      nominalStorageKwh = rawNominalStorageKwh > 3.5 ? 5.12 : 2.56;
    } else if (recommendedInverterKva <= 3.5) {
      nominalStorageKwh = rawNominalStorageKwh > 7.0 ? 10.24 : 5.12;
    } else if (recommendedInverterKva <= 5.0) {
      nominalStorageKwh = rawNominalStorageKwh > 12.0 ? 15.36 : 10.24;
    } else if (recommendedInverterKva <= 7.5) {
      nominalStorageKwh = rawNominalStorageKwh > 16.0 ? 20.48 : 15.36;
    } else if (recommendedInverterKva <= 10.0) {
      nominalStorageKwh = rawNominalStorageKwh > 22.0 ? 25.60 : 20.48;
    } else {
      nominalStorageKwh = Math.min(30.72, Math.max(20.48, Math.ceil(rawNominalStorageKwh / 5.12) * 5.12));
    }

    const batteryAh48V = Math.round((nominalStorageKwh * 1000) / systemVoltage);

    // 6. Solar PV Array Sizing:
    // Generates enough power during peak sun hours (PSH) to supply daytime load and replenish the battery bank
    const standardPanelWatts = 550;
    const basePackageSolarKwp = matchedPackage.solarKwp || 2.2;
    let solarArrayKwp = basePackageSolarKwp;

    if (dailyEnergyKwh > 0 || simultaneousLoadWatts > 0) {
      const batteryRechargeKwh = (nominalStorageKwh * batteryData.recommendedDoD) / 0.92;
      const dailySolarGenerationTargetKwh = (dayEnergyKwh + batteryRechargeKwh) * 1.10;
      const calculatedArrayKwp = +(dailySolarGenerationTargetKwh / regionData.psh).toFixed(2);

      // Realistic limits matching inverter MPPT input
      const maxMpptArrayKwp = Math.max(basePackageSolarKwp, +(continuousKw * 1.25).toFixed(2));
      solarArrayKwp = +(Math.min(maxMpptArrayKwp, Math.max(basePackageSolarKwp, calculatedArrayKwp))).toFixed(2);
    }
    const recommendedPanelCount = Math.max(2, Math.round((solarArrayKwp * 1000) / standardPanelWatts));
    const installedPvKwp = +((recommendedPanelCount * standardPanelWatts) / 1000).toFixed(2);

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      inputs: {
        activeApplianceCount,
        region: regionKey,
        regionName: regionData.name,
        peakSunHours: regionData.psh,
        solarTilt: regionData.defaultTilt,
        batteryType: batteryTypeKey,
        batteryChemistry: batteryData.name,
        batteryRecommendedDoD: batteryData.recommendedDoD,
        autonomyDays,
        diversityFactor
      },
      demand: {
        totalConnectedWatts,
        simultaneousLoadWatts,
        maxIndividualSurgeWatts,
        requiredSurgeWatts,
        dailyEnergyKwh,
        dayEnergyKwh,
        nightEnergyKwh
      },
      recommendations: {
        inverter: {
          continuousKw,
          apparentKva: +(rawInverterKva).toFixed(2),
          recommendedKva: recommendedInverterKva,
          systemVoltage: `${systemVoltage}V DC`,
          waveform: 'Pure Sine Wave',
          surgeCapabilityWatts: requiredSurgeWatts
        },
        battery: {
          usableStorageKwh,
          nominalStorageKwh,
          recommendedAh: batteryAh48V,
          voltage: `${systemVoltage}V DC`,
          chemistry: batteryData.name,
          expectedLifespan: batteryData.cycleLife,
          depthOfDischargePercent: Math.round(batteryData.recommendedDoD * 100)
        },
        solarArray: {
          minimumKwp: solarArrayKwp,
          installedKwp: installedPvKwp,
          standardPanelWatts,
          recommendedPanelCount,
          dailyEstimatedYieldKwh: +(installedPvKwp * regionData.psh * 0.82).toFixed(2),
          roofSpaceRequiredSqm: +(recommendedPanelCount * 2.6).toFixed(1)
        },
        matchedPackage,
        nextTierPackage
      },
      itemized,
      warnings,
      disclaimer: 'This calculation is an indicative preliminary estimate based on entered loads and empirical Nigerian solar irradiance data. Final installation requires a formal site survey and engineering audit by a certified DEVICE PRO engineer to verify roof orientation, shading, surge currents, cable runs, and distribution board breakers.'
    };
  }

  // =========================================================================
  // SAVINGS & GENERATOR OPEX CALCULATION FUNCTION
  // =========================================================================

  /**
   * Compares ongoing generator fuel and servicing operational expenditure against
   * solar capital investment, calculating monthly/yearly cash flow and payback period.
   *
   * @param {Object} options
   * @param {number} options.generatorKva Generator capacity in kVA (e.g. 5, 7.5, 10, 15, 20)
   * @param {string} options.fuelType 'pms' (Petrol) or 'diesel' (AGO)
   * @param {number} options.fuelPricePerLiter Price per litre in NGN (e.g. 1050 for PMS, 1350 for AGO)
   * @param {number} options.runningHoursPerDay Daily runtime (e.g. 8, 12, 16)
   * @param {number} options.maintenanceMonthlyNaira Monthly servicing & lubricant oil changes
   * @param {number} options.solarCostNaira Capital cost of equivalent solar package
   * @returns {Object} Savings and payback breakdown
   */
  function calculateGeneratorSavings(options = {}) {
    const generatorKva = Math.max(1, parseFloat(options.generatorKva) || 7.5);
    const fuelType = (options.fuelType || 'pms').toLowerCase() === 'diesel' ? 'diesel' : 'pms';

    // Default Nigerian fuel prices if not specified
    const defaultFuelPrice = fuelType === 'diesel' ? 1350 : 1050;
    const fuelPricePerLiter = Math.max(500, parseFloat(options.fuelPricePerLiter) || defaultFuelPrice);
    const runningHoursPerDay = Math.max(1, Math.min(24, parseFloat(options.runningHoursPerDay) || 10));

    // Default monthly maintenance based on capacity
    let defaultMaint = 25000;
    if (generatorKva >= 20) defaultMaint = 120000;
    else if (generatorKva >= 10) defaultMaint = 65000;
    else if (generatorKva >= 5) defaultMaint = 35000;

    const maintenanceMonthlyNaira = options.maintenanceMonthlyNaira !== undefined
      ? Math.max(0, parseFloat(options.maintenanceMonthlyNaira))
      : defaultMaint;

    // Estimate fuel consumption in Litres/Hour
    // Empirical formula for generator at ~65% load:
    // PMS: ~0.32 L per kVA-hr
    // Diesel: ~0.24 L per kVA-hr
    let litersPerHour = 0;
    const benchmark = GENERATOR_BENCHMARKS.find(b => b.kva === generatorKva && b.fuelType === fuelType);
    if (benchmark) {
      litersPerHour = benchmark.litersPerHour;
    } else {
      litersPerHour = fuelType === 'diesel'
        ? +(generatorKva * 0.23).toFixed(2)
        : +(generatorKva * 0.31).toFixed(2);
    }

    // Daily, Monthly, Yearly fuel burn
    const dailyFuelLiters = +(litersPerHour * runningHoursPerDay).toFixed(1);
    const monthlyFuelLiters = Math.round(dailyFuelLiters * 30);
    const yearlyFuelLiters = Math.round(dailyFuelLiters * 365);

    // Fuel costs
    const dailyFuelCostNaira = Math.round(dailyFuelLiters * fuelPricePerLiter);
    const monthlyFuelCostNaira = Math.round(monthlyFuelLiters * fuelPricePerLiter);
    const yearlyFuelCostNaira = Math.round(yearlyFuelLiters * fuelPricePerLiter);

    // Total Generator OPEX (Fuel + Servicing)
    const monthlyTotalOpexNaira = monthlyFuelCostNaira + maintenanceMonthlyNaira;
    const yearlyTotalOpexNaira = monthlyTotalOpexNaira * 12;
    const threeYearOpexNaira = yearlyTotalOpexNaira * 3;
    const fiveYearOpexNaira = yearlyTotalOpexNaira * 5;
    const tenYearOpexNaira = yearlyTotalOpexNaira * 10;

    // Equivalent solar package cost
    let solarCostNaira = parseFloat(options.solarCostNaira);
    if (!solarCostNaira || isNaN(solarCostNaira)) {
      // Automatic lookup based on generator kVA
      if (generatorKva <= 3.0) solarCostNaira = 1150000;
      else if (generatorKva <= 4.5) solarCostNaira = 2450000;
      else if (generatorKva <= 6.5) solarCostNaira = 4350000;
      else if (generatorKva <= 8.5) solarCostNaira = 6450000;
      else if (generatorKva <= 12.0) solarCostNaira = 8200000;
      else solarCostNaira = 12500000;
    }

    // Solar ongoing maintenance (approx 1% of capital per year for panel cleaning and inspection)
    const solarYearlyOpexNaira = Math.round(solarCostNaira * 0.015);
    const netAnnualSavingsNaira = yearlyTotalOpexNaira - solarYearlyOpexNaira;

    // Payback period
    const paybackYears = +(solarCostNaira / Math.max(1, netAnnualSavingsNaira)).toFixed(1);
    const paybackMonths = Math.round(paybackYears * 12);

    // 10-Year Net Cash Saved (Generator OPEX - Solar CapEx - Solar OpEx)
    const tenYearSolarTotalNaira = solarCostNaira + (solarYearlyOpexNaira * 10);
    const tenYearNetSavingsNaira = tenYearOpexNaira - tenYearSolarTotalNaira;

    // Environmental metrics:
    // Burning 1L petrol emits ~2.31 kg CO2; 1L diesel emits ~2.68 kg CO2
    const co2PerLiterKg = fuelType === 'diesel' ? 2.68 : 2.31;
    const annualCo2EmissionsTons = +((yearlyFuelLiters * co2PerLiterKg) / 1000).toFixed(2);
    const tenYearCo2AvoidedTons = +(annualCo2EmissionsTons * 10).toFixed(1);

    // Cumulative yearly comparison table for 5 years
    const yearlyProgression = [];
    let cumGenCost = 0;
    let cumSolarCost = solarCostNaira;

    for (let yr = 1; yr <= 5; yr++) {
      cumGenCost += yearlyTotalOpexNaira;
      cumSolarCost += solarYearlyOpexNaira;
      const netBenefit = cumGenCost - cumSolarCost;
      yearlyProgression.push({
        year: yr,
        cumulativeGeneratorNaira: cumGenCost,
        cumulativeSolarNaira: cumSolarCost,
        netCashFlowNaira: netBenefit,
        isBreakEven: netBenefit >= 0
      });
    }

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      inputs: {
        generatorKva,
        fuelType,
        fuelTypeName: fuelType === 'diesel' ? 'Automotive Gas Oil (AGO Diesel)' : 'Premium Motor Spirit (PMS Petrol)',
        fuelPricePerLiter,
        runningHoursPerDay,
        maintenanceMonthlyNaira,
        solarCostNaira,
        litersPerHour
      },
      consumption: {
        dailyFuelLiters,
        monthlyFuelLiters,
        yearlyFuelLiters
      },
      financials: {
        monthlyFuelCostNaira,
        monthlyMaintenanceNaira: maintenanceMonthlyNaira,
        monthlyTotalOpexNaira,
        yearlyFuelCostNaira,
        yearlyTotalOpexNaira,
        threeYearOpexNaira,
        fiveYearOpexNaira,
        tenYearOpexNaira,
        solarCapExNaira: solarCostNaira,
        solarYearlyOpexNaira,
        netAnnualSavingsNaira,
        paybackYears,
        paybackMonths,
        tenYearNetSavingsNaira
      },
      environmental: {
        annualCo2AvoidedTons: annualCo2EmissionsTons,
        tenYearCo2AvoidedTons,
        equivalentTreesPlanted: Math.round(annualCo2EmissionsTons * 45)
      },
      yearlyProgression,
      transparencyNote: 'Calculations use current Nigerian market fuel rates and generator burn rates at ~65% steady load. Solar system includes Tier-1 LiFePO4 storage (10–15 year lifespan) and monocrystalline panels (25-year performance warranty).'
    };
  }

  // Export module interface
  return {
    REGIONAL_PSH,
    BATTERY_CHEMISTRIES,
    DEFAULT_APPLIANCES,
    STANDARD_PACKAGES,
    GENERATOR_BENCHMARKS,
    calculateSolarSizing,
    calculateGeneratorSavings
  };
});
