/**
 * DEVICE PRO — Black Friday 2026 Product Detail Controller
 * Comprehensive Specification Matrix, Multi-Angle Gallery, Appliance Runtime Engine & Checkout
 */

(function () {
  'use strict';

  // 1. COMPREHENSIVE DATA DICTIONARY FOR THE 10 SOLAR COMBO PACKAGES
  const BF_PACKAGES = {
    'bf-lucan-500': {
      id: 'bf-lucan-500',
      brand: 'LUCAN',
      model: 'Lucan 500W Power Station',
      fullTitle: 'Lucan 500W Solar Power Station + 450W Monocrystalline Panel Combo',
      tagline: '500W Pure Sine Wave AC Output with 1,000Wh High-Capacity Lithium Battery Bank & Tier-1 450W Monocrystalline Solar Panel',
      finalPrice: 362000,
      marketValue: 500000,
      savings: 138000,
      savingsPct: '28%',
      rating: '4.9',
      reviewsCount: 38,
      stockCount: 5,
      badge: 'OFFICIAL LUCAN COMBO',
      solarIncluded: '1 × 450W Tier-1 Monocrystalline Solar Panel Included',
      powersShort: '43" Smart TV + Decoder + Standing Fans + Laptops + Lighting',
      warranty: '1-Year Official Manufacturer Warranty & Local Repair Support',
      images: [
        { label: 'Front Panel', src: '/images/products/lucan-500w-powerstation.jpg', desc: 'Lucan 500W Front Panel & Circular Display' },
        { label: 'Rear Ports & Specs', src: '/images/products/lucan-500w-powerstation1.jpg', desc: 'Lucan 500W Solar PV Input, AC Input, DC Output & Specs' },
        { label: '450W Solar Panel', src: '/images/products/jinko-solar-panel.png', desc: 'Tier-1 450W High-Efficiency Monocrystalline Panel' },
        { label: 'Solar Cables & Kit', src: '/images/products/mc4-solar-cable.png', desc: 'MC4 Solar Extension Cables & AC Charger' }
      ],
      description: `
        The <strong>Lucan 500W Solar Power Station (LU25004000ESS)</strong> delivers high-efficiency, zero-noise portable power designed for Nigerian homes, apartments, and modern workstations. With a clean <strong>500W pure sine wave inverter</strong>, it runs TVs, decoders, laptops, sound systems, and standing fans safely with zero buzzing or voltage fluctuations.
        <br><br>
        Equipped with an internal <strong>1,000Wh deep-cycle lithium storage system</strong>, dual cooling fans, and dedicated PV/solar charging ports, it charges rapidly under direct sunlight through the included Tier-1 <strong>450W Monocrystalline solar panel</strong>. Featuring standard AC and DC outputs plus USB fast-charge ports.
      `,
      specs: [
        { key: 'Model Number', val: 'LU25004000ESS Solar All-In-One Powerpack' },
        { key: 'Inverter Technology', val: 'Pure Sine Wave Inverter (Safe for laptops, TVs & sensitive electronics)' },
        { key: 'Continuous Power Output', val: '500 Watts' },
        { key: 'Surge / Peak Capacity', val: '1,000 Watts' },
        { key: 'Battery Capacity', val: '1,000Wh Lithium Energy Bank' },
        { key: 'Battery Lifespan', val: '2,500+ Deep Cycles to 80% Capacity' },
        { key: 'Bundled Solar Panel', val: '1 × 450W Tier-1 Monocrystalline Solar Panel Included' },
        { key: 'Solar PV Input', val: 'High-Efficiency MPPT Solar Controller (PV Input + / -)' },
        { key: 'AC Inputs & Outputs', val: 'Standard 220V–240V AC Sockets' },
        { key: 'DC & USB Ports', val: 'Fast-Charging USB-A, USB-C & 12V DC Output' },
        { key: 'Cooling & Safety', val: 'Dual Temperature-Controlled Silent Fans, Overload, Short-Circuit & Surge Protection' },
        { key: 'Delivery Guarantee', val: '100% Free Doorstep Delivery across Lagos State & Ibadan' },
        { key: 'Warranty Coverage', val: '1-Year Official Warranty with Dedicated Tech Support' }
      ],
      runtimes: [
        { appliance: 'Standard 16" Standing / Orbit Fan (50W)', power: '50W', duration: '16 – 20 Hours' },
        { appliance: '43" LED / Smart TV + Decoder (80W)', power: '80W', duration: '10 – 12 Hours' },
        { appliance: 'Workstation Laptops (60W)', power: '60W', duration: '14+ Full Laptop Recharges' },
        { appliance: 'Starlink Internet Router (40W)', power: '40W', duration: '20 – 24 Hours' },
        { appliance: '5× LED Home Lighting (20W total)', power: '20W', duration: '40+ Hours continuous' },
        { appliance: 'Smartphones & Tablets (Fast Charge)', power: '15W', duration: '55+ Recharges' },
        { appliance: 'Barbing Hair Clippers & Grooming', power: '15W', duration: '40+ Hours' }
      ],
      boxItems: [
        { title: 'Lucan 500W Solar Power Station', desc: 'LU25004000ESS with 1,000Wh Lithium battery & LCD display' },
        { title: '1× 450W Monocrystalline Panel', desc: 'Tier-1 high irradiance 450W solar panel' },
        { title: '10M Heavy-Duty MC4 Solar Cable', desc: 'Weatherproof pre-crimped solar connecting cables' },
        { title: '220V AC Mains Wall Fast Charger', desc: 'Direct wall outlet rapid charging adapter' },
        { title: 'Official User Manual & Warranty', desc: '1-Year Lagos warranty card & documentation' }
      ]
    },

    'bf-itel-500-450w': {
      id: 'bf-itel-500-450w',
      brand: 'itel Energy',
      model: 'itel 500W PowerTank (450W Solar Combo)',
      fullTitle: 'itel 500W PowerTank Solar Station + 450W Monocrystalline Panel Combo',
      tagline: '500W Pure Sine Wave AC Output with 1,000Wh High-Capacity PowerTank & Tier-1 450W Monocrystalline Solar Panel',
      finalPrice: 391000,
      marketValue: 520000,
      savings: 129000,
      savingsPct: '25%',
      rating: '4.9',
      reviewsCount: 54,
      stockCount: 4,
      badge: 'OFFICIAL ITEL COMBO',
      solarIncluded: '1 × 450W Tier-1 Monocrystalline Solar Panel Included',
      powersShort: '43" Smart TV + Decoder + 2 Standing Fans + Starlink + Laptops',
      warranty: '1-Year Official Manufacturer Warranty & Local Repair Support',
      images: [
        { label: 'Full Combo', src: '/images/products/itel-powertank-500w.webp', desc: 'itel 500W PowerTank + 450W Panel' },
        { label: 'Front & Screen', src: '/images/products/itel-powertank-500w.webp', desc: 'Front Display & Dual AC Sockets' },
        { label: '450W Solar Panel', src: '/images/products/jinko-solar-panel.png', desc: 'Tier-1 450W High-Efficiency Monocrystalline Panel' },
        { label: 'Solar Cables & Kit', src: '/images/products/mc4-solar-cable.png', desc: 'MC4 Solar Extension Cables & AC Charger' }
      ],
      description: `
        The <strong>itel 500W PowerTank Solar Station</strong> is engineered specifically to eliminate fuel expenses and power outages for Nigerian homes, apartments, and remote workstations. Delivering a crisp <strong>500W pure sine wave output</strong> (with 1,000W peak surge), it powers sensitive modern electronics without the buzz, fluctuation, or component wear common with basic inverters.
        <br><br>
        Equipped with an internal <strong>1,000Wh deep-cycle battery bank</strong>, this all-in-one power station operates in complete <strong>0dB silence</strong>, providing clean indoor electricity with zero fumes or ventilation hazards. Bundled with a Tier-1 <strong>450W Monocrystalline solar panel</strong>, the unit charges directly from Nigerian sunlight via its built-in MPPT solar charge controller.
      `,
      specs: [
        { key: 'Inverter Technology', val: 'Pure Sine Wave Inverter (Safe for laptops, TVs & motors)' },
        { key: 'Continuous Power Output', val: '500 Watts' },
        { key: 'Peak Surge Power', val: '1,000 Watts (Handles motor startup surge)' },
        { key: 'Battery Energy Capacity', val: '1,000 Watt-hours (1,000Wh)' },
        { key: 'Battery Chemistry', val: 'Automotive Grade LiFePO4 / Lithium-ion Cells' },
        { key: 'Battery Cycle Life', val: '4,000+ Recharge Cycles to 80% Capacity (10+ Years)' },
        { key: 'Solar PV Array Included', val: '1 × 450W Tier-1 High-Efficiency Monocrystalline Panel' },
        { key: 'Solar Charge Controller', val: 'Built-in Intelligent MPPT (Max Power Point Tracking)' },
        { key: 'Solar Charging Time', val: '2.2 – 3 Hours in clear sunlight' },
        { key: 'AC Wall Charging Time', val: '1.5 Hours (0 to 80% Fast Recharge)' },
        { key: 'AC Output Sockets', val: '2× 220V–240V 50Hz UK Standard 3-Pin Outlets' },
        { key: 'USB-C Power Delivery', val: '1× 100W PD 3.0 Fast-Charge (Direct MacBook / Laptop)' },
        { key: 'USB-A Outputs', val: '2× 18W QC 3.0 High-Speed Ports' },
        { key: '12V DC Outlets', val: '1× 12V/10A Car Cigarette Socket + 2× DC5521 12V/5A' },
        { key: 'Operating Noise', val: '0 dB (Completely Silent Indoor Operation)' },
        { key: 'Cooling System', val: 'Smart Temperature-Controlled Dual Silent Fans' },
        { key: 'Net Weight', val: 'Approx. 10.8 kg (Integrated Top Carry Handle)' },
        { key: 'Safety Protections', val: 'Overcharge, Deep Discharge, Short Circuit, Thermal Overheat & Surge BMS' }
      ],
      runtimes: [
        { appliance: '5× LED Home Lighting (10W total)', power: '10W', duration: '20+ Hours' },
        { appliance: '43" Smart LED TV + DStv/Decoder', power: '65W', duration: '12–14 Hours' },
        { appliance: 'Starlink Gen 2/3 Dish + Wi-Fi Router', power: '40W', duration: '20–24 Hours' },
        { appliance: 'Workstation Laptop (USB-C / AC)', power: '60W', duration: '12–15 Full Charges' },
        { appliance: 'Standard 16" Standing / Orbit Fan', power: '50W', duration: '15–18 Hours' },
        { appliance: 'Smartphones & Tablets (Fast Charge)', power: '15W', duration: '50+ Recharges' },
        { appliance: 'Barbing Hair Clippers & Grooming', power: '15W', duration: '40+ Hours' }
      ],
      boxItems: [
        { title: 'itel 500W Power Station', desc: '1,000Wh portable unit with LCD display' },
        { title: '1× 450W Monocrystalline Panel', desc: 'Tier-1 high irradiance solar panel' },
        { title: '5M Heavy-Duty MC4 Solar Cable', desc: 'Weatherproof pre-crimped solar connecting cable' },
        { title: '220V AC Mains Wall Fast Charger', desc: 'Direct wall outlet rapid charging adapter' },
        { title: '12V Car Cigarette Lighter Cable', desc: 'On-the-go vehicle charging cord' },
        { title: 'Official Warranty & User Guide', desc: '1-Year Lagos warranty card & setup manual' }
      ]
    },

    'bf-itel-500': {
      id: 'bf-itel-500',
      brand: 'itel Energy',
      model: 'itel 500W PowerTank Portable Solar Station',
      fullTitle: 'itel 500W PowerTank Solar Station + 585W Monocrystalline Panel Combo',
      tagline: '500W Pure Sine Wave AC Output with 1,000Wh High-Capacity PowerTank & Tier-1 585W Monocrystalline Solar Panel',
      finalPrice: 418000,
      marketValue: 550000,
      savings: 132000,
      savingsPct: '24%',
      rating: '4.9',
      reviewsCount: 58,
      stockCount: 4,
      badge: 'OFFICIAL ITEL COMBO',
      solarIncluded: '1 × 585W Tier-1 Monocrystalline Solar Panel Included',
      powersShort: '43" Smart TV + Decoder + 2 Standing Fans + Starlink + Laptops',
      warranty: '1-Year Official Manufacturer Warranty & Local Repair Support',
      images: [
        { label: 'Full Combo', src: '/images/products/itel-powertank-500w.webp', desc: 'itel 500W PowerTank + 585W Panel' },
        { label: 'Front & Screen', src: '/images/products/itel-powertank-500w.webp', desc: 'Front Display & Dual AC Sockets' },
        { label: '585W Solar Panel', src: '/images/products/jinko-solar-panel.png', desc: 'Tier-1 High-Efficiency Monocrystalline Panel' },
        { label: 'Solar Cables & Kit', src: '/images/products/mc4-solar-cable.png', desc: 'MC4 Solar Extension Cables & AC Charger' }
      ],
      description: `
        The <strong>itel 500W PowerTank Solar Station</strong> is engineered specifically to eliminate fuel expenses and power outages for Nigerian homes, apartments, and remote workstations. Delivering a crisp <strong>500W pure sine wave output</strong> (with 1,000W peak surge), it powers sensitive modern electronics without the buzz, fluctuation, or component wear common with basic inverters.
        <br><br>
        Equipped with an internal <strong>1,000Wh deep-cycle battery bank</strong>, this all-in-one power station operates in complete <strong>0dB silence</strong>, providing clean indoor electricity with zero fumes or ventilation hazards. Bundled with a Tier-1 <strong>585W Monocrystalline solar panel</strong>, the unit charges directly from Nigerian sunlight in as little as 2 hours via its built-in MPPT solar charge controller.
      `,
      specs: [
        { key: 'Inverter Technology', val: 'Pure Sine Wave Inverter (Safe for laptops, TVs & motors)' },
        { key: 'Continuous Power Output', val: '500 Watts' },
        { key: 'Peak Surge Power', val: '1,000 Watts (Handles motor startup surge)' },
        { key: 'Battery Energy Capacity', val: '1,000 Watt-hours (1,000Wh)' },
        { key: 'Battery Chemistry', val: 'Automotive Grade LiFePO4 / Lithium-ion Cells' },
        { key: 'Battery Cycle Life', val: '4,000+ Recharge Cycles to 80% Capacity (10+ Years)' },
        { key: 'Solar PV Array Included', val: '1× 585W Tier-1 High-Efficiency Monocrystalline Panel' },
        { key: 'Solar Charge Controller', val: 'Built-in Intelligent MPPT (Max Power Point Tracking)' },
        { key: 'Solar Charging Time', val: '1.8 – 2.5 Hours in clear sunlight' },
        { key: 'AC Wall Charging Time', val: '1.5 Hours (0 to 80% Fast Recharge)' },
        { key: 'AC Output Sockets', val: '2× 220V–240V 50Hz UK Standard 3-Pin Outlets' },
        { key: 'USB-C Power Delivery', val: '1× 100W PD 3.0 Fast-Charge (Direct MacBook / Laptop)' },
        { key: 'USB-A Outputs', val: '2× 18W QC 3.0 High-Speed Ports' },
        { key: '12V DC Outlets', val: '1× 12V/10A Car Cigarette Socket + 2× DC5521 12V/5A' },
        { key: 'Operating Noise', val: '0 dB (Completely Silent Indoor Operation)' },
        { key: 'Cooling System', val: 'Smart Temperature-Controlled Dual Silent Fans' },
        { key: 'Net Weight', val: 'Approx. 10.8 kg (Integrated Top Carry Handle)' },
        { key: 'Safety Protections', val: 'Overcharge, Deep Discharge, Short Circuit, Thermal Overheat & Surge BMS' }
      ],
      runtimes: [
        { appliance: '5× LED Home Lighting (10W total)', power: '10W', duration: '20+ Hours' },
        { appliance: '43" Smart LED TV + DStv/Decoder', power: '65W', duration: '12–14 Hours' },
        { appliance: 'Starlink Gen 2/3 Dish + Wi-Fi Router', power: '40W', duration: '20–24 Hours' },
        { appliance: 'Workstation Laptop (USB-C / AC)', power: '60W', duration: '12–15 Full Charges' },
        { appliance: 'Standard 16" Standing / Orbit Fan', power: '50W', duration: '15–18 Hours' },
        { appliance: 'Smartphones & Tablets (Fast Charge)', power: '15W', duration: '50+ Recharges' },
        { appliance: 'Barbing Hair Clippers & Grooming', power: '15W', duration: '40+ Hours' }
      ],
      boxItems: [
        { title: 'itel 500W Power Station', desc: '1,000Wh portable unit with LCD display' },
        { title: '1× 585W Monocrystalline Panel', desc: 'Tier-1 high irradiance solar panel' },
        { title: '5M Heavy-Duty MC4 Solar Cable', desc: 'Weatherproof pre-crimped solar connecting cable' },
        { title: '220V AC Mains Wall Fast Charger', desc: 'Direct wall outlet rapid charging adapter' },
        { title: '12V Car Cigarette Lighter Cable', desc: 'On-the-go vehicle charging cord' },
        { title: 'Official Warranty & User Guide', desc: '1-Year Lagos warranty card & setup manual' }
      ]
    },

    'bf-hicces-500': {
      id: 'bf-hicces-500',
      brand: 'Hicces',
      model: 'Hicces 500W Solar Power Station',
      fullTitle: 'Hicces 500W Solar Power Station + 585W Monocrystalline Panel Combo',
      tagline: '500W Continuous Pure Sine Wave with 1,000Wh Lithium Energy Storage & Tier-1 585W Solar Panel',
      finalPrice: 402000,
      marketValue: 520000,
      savings: 118000,
      savingsPct: '23%',
      rating: '4.8',
      reviewsCount: 42,
      stockCount: 5,
      badge: 'TOP VALUE COMBO',
      solarIncluded: '1 × 585W Tier-1 Monocrystalline Solar Panel Included',
      powersShort: 'TV + Decoder + Standing Fans + Workstations + Blender',
      warranty: '1-Year Full Warranty & Guaranteed Spare Parts Backup',
      images: [
        { label: 'Full Combo', src: '/images/products/hicces-500w.png', desc: 'Hicces 500W Station + 585W Panel' },
        { label: 'Front Display', src: '/images/products/hicces-500w.png', desc: 'Digital LCD Readout & AC Ports' },
        { label: '585W Solar Panel', src: '/images/products/jinko-solar-panel.png', desc: 'Monocrystalline Solar Panel' },
        { label: 'Cables & Accessories', src: '/images/products/mc4-solar-cable.png', desc: 'Heavy-Duty MC4 Extension Cables' }
      ],
      description: `
        The <strong>Hicces 500W Solar Power Station</strong> is a workhorse portable energy solution built for rugged Nigerian conditions. Packed with a <strong>1,000Wh battery core</strong> and a continuous <strong>500W pure sine wave inverter</strong>, it easily sustains desktop workstations, home theatres, multiple fans, and small kitchen blenders.
        <br><br>
        Coupled with a high-yield <strong>585W Monocrystalline solar panel</strong>, this setup offers complete energy autonomy. Charge by day through clean sunlight, and power your essentials through the night without burning a single drop of expensive petrol.
      `,
      specs: [
        { key: 'Inverter Technology', val: 'Pure Sine Wave Inverter' },
        { key: 'Continuous Power Output', val: '500 Watts' },
        { key: 'Peak Surge Power', val: '1,000 Watts' },
        { key: 'Battery Energy Capacity', val: '1,000 Watt-hours (1,000Wh)' },
        { key: 'Battery Chemistry', val: 'Grade-A LiFePO4 Energy Cells' },
        { key: 'Battery Cycle Life', val: '3,500+ Cycles to 80% Capacity' },
        { key: 'Solar PV Array Included', val: '1× 585W Tier-1 Monocrystalline Panel' },
        { key: 'Solar Charge Controller', val: 'High-Efficiency Built-in MPPT' },
        { key: 'Solar Charging Time', val: '2.0 – 2.5 Hours in standard sun' },
        { key: 'AC Wall Charging Time', val: '1.8 Hours Fast Charge' },
        { key: 'AC Output Sockets', val: '2× 220V–240V 50Hz UK Outlets' },
        { key: 'USB Ports', val: '2× USB-C PD (65W) + 3× USB-A QC3.0' },
        { key: '12V DC Outlets', val: '1× 12V/10A Car Port + DC Jack' },
        { key: 'Operating Noise', val: '0 dB (Ultra-Quiet Inverter Design)' },
        { key: 'Net Weight', val: 'Approx. 11.2 kg' },
        { key: 'Safety Protections', val: 'Comprehensive BMS Smart Protection' }
      ],
      runtimes: [
        { appliance: '5× LED Home Lighting', power: '10W', duration: '20+ Hours' },
        { appliance: '43"–55" Smart TV + Soundbar', power: '80W', duration: '10–12 Hours' },
        { appliance: 'Starlink Dish + Wi-Fi Router', power: '40W', duration: '20–22 Hours' },
        { appliance: 'Laptops / Workstations', power: '60W', duration: '12–14 Full Charges' },
        { appliance: 'Standing Fans (2 Units)', power: '100W', duration: '9–10 Hours' },
        { appliance: 'Compact Kitchen Blender (300W)', power: '300W', duration: '2.5 Hours intermittent' }
      ],
      boxItems: [
        { title: 'Hicces 500W Power Station', desc: '1,000Wh unit with carry handle' },
        { title: '1× 585W Monocrystalline Panel', desc: 'High-efficiency Tier-1 panel' },
        { title: 'MC4 Solar Extension Cable (5M)', desc: 'Pre-crimped weatherproof solar cable' },
        { title: 'AC Wall Charging Cable', desc: '220V wall adapter' },
        { title: 'Car Charging Adapter', desc: '12V DC vehicular charging cable' },
        { title: 'Warranty Card & Manual', desc: '1-Year DEVICE PRO warranty' }
      ]
    },

    'bf-hicces-300': {
      id: 'bf-hicces-300',
      brand: 'Hicces',
      model: 'Hicces 300W Solar Power Station',
      fullTitle: 'Hicces 300W Solar Power Station + 585W Monocrystalline Panel Combo',
      tagline: 'Budget-Friendly 300W Pure Sine Wave with 1,000Wh High-Capacity Battery & 585W Solar Panel',
      finalPrice: 354000,
      marketValue: 450000,
      savings: 96000,
      savingsPct: '21%',
      rating: '4.8',
      reviewsCount: 36,
      stockCount: 6,
      badge: 'STARTER COMBO',
      solarIncluded: '1 × 585W Tier-1 Monocrystalline Solar Panel Included',
      powersShort: 'Laptops, Starlink Router, Phones, Lighting, LED TV, Clippers',
      warranty: '1-Year Official Warranty & Lagos Technical Support',
      images: [
        { label: 'Full Combo', src: '/images/products/hicces-500w.png', desc: 'Hicces 300W Station + 585W Panel' },
        { label: 'Front Panel', src: '/images/products/hicces-500w.png', desc: 'Control Display & Outlets' },
        { label: '585W Solar Panel', src: '/images/products/jinko-solar-panel.png', desc: 'Monocrystalline Solar Panel' },
        { label: 'Cables & Accessories', src: '/images/products/mc4-solar-cable.png', desc: 'Connecting Cables & Charger' }
      ],
      description: `
        The lowest entry-cost complete solar generator combo in Nigeria. The <strong>Hicces 300W Solar Power Station</strong> gives you massive <strong>1,000Wh storage</strong> paired with an oversized <strong>585W solar panel</strong>. This ensures lightning-fast solar recharging while keeping your work essentials, Wi-Fi router, TV, and fan active 24/7.
      `,
      specs: [
        { key: 'Inverter Output', val: '300W Continuous Pure Sine Wave (600W Surge)' },
        { key: 'Battery Capacity', val: '1,000Wh Lithium Iron Phosphate' },
        { key: 'Solar Panel Included', val: '1× 585W Monocrystalline Panel' },
        { key: 'Cycle Life', val: '3,500+ Recharge Cycles' },
        { key: 'AC Sockets', val: '2× UK Standard 220V Sockets' },
        { key: 'USB Ports', val: '2× USB-C + 2× USB-A' },
        { key: 'Recharge Time', val: 'Under 2 hours in Nigerian sun' },
        { key: 'Net Weight', val: '10.5 kg' }
      ],
      runtimes: [
        { appliance: 'Home Lighting (5 bulbs)', power: '10W', duration: '20+ Hours' },
        { appliance: 'Starlink Dish + Wi-Fi', power: '40W', duration: '20–24 Hours' },
        { appliance: 'Laptops (Work From Home)', power: '60W', duration: '12–14 Charges' },
        { appliance: '32"–43" LED TV + Decoder', power: '50W', duration: '15–18 Hours' },
        { appliance: 'Standing Fan', power: '50W', duration: '15–18 Hours' }
      ],
      boxItems: [
        { title: 'Hicces 300W Power Station', desc: '1,000Wh battery unit' },
        { title: '1× 585W Solar Panel', desc: 'Monocrystalline high-yield PV panel' },
        { title: 'MC4 Solar Cable (5M)', desc: 'Pre-crimped weather-resistant cable' },
        { title: 'Wall AC Fast Charger', desc: '220V mains charger' },
        { title: 'User Manual & Warranty', desc: '1-Year DEVICE PRO warranty' }
      ]
    },

    'bf-coloar-1000-pro': {
      id: 'bf-coloar-1000-pro',
      brand: 'Coloar Solar',
      model: 'Coloar 1000 Pro Solar Power Station',
      fullTitle: 'Coloar 1000 Pro 300W Solar Station + 585W Monocrystalline Panel Combo',
      tagline: '300W Pure Sine Wave with 1,000Wh LiFePO4 Energy Bank & 585W Solar Array',
      finalPrice: 405000,
      marketValue: 535000,
      savings: 130000,
      savingsPct: '24%',
      rating: '4.9',
      reviewsCount: 47,
      stockCount: 3,
      badge: 'BESTSELLER COMBO',
      solarIncluded: '1 × 585W Tier-1 Monocrystalline Solar Panel Included',
      powersShort: 'Fans, Laptops, LED TV, Soundbar, Smart Home',
      warranty: '1-Year Replacement Warranty & Free Lagos Delivery',
      images: [
        { label: 'Full Combo', src: '/images/products/colar-1000-pro.webp', desc: 'Coloar 1000 Pro + 585W Panel' },
        { label: 'Station Unit', src: '/images/products/colar-1000-pro.webp', desc: 'Front LCD Screen & Multi-Ports' },
        { label: '585W Solar Panel', src: '/images/products/jinko-solar-panel.png', desc: 'High-Efficiency Monocrystalline Panel' },
        { label: 'Cables & Accessories', src: '/images/products/mc4-solar-cable.png', desc: 'Solar Connection & AC Wall Cord' }
      ],
      description: `
        The <strong>Coloar 1000 Pro</strong> combines robust industrial-grade LiFePO4 cells with smart thermal management. Delivering reliable <strong>300W continuous pure sine wave power</strong> backed by <strong>1,000Wh battery capacity</strong>, it keeps your smart home devices, lights, fans, and work computers running without interruption.
      `,
      specs: [
        { key: 'Inverter Output', val: '300W Continuous Pure Sine Wave (600W Peak)' },
        { key: 'Battery Energy', val: '1,000Wh Deep Storage LiFePO4' },
        { key: 'Solar Array', val: '1× 585W Tier-1 Monocrystalline Panel' },
        { key: 'Cycle Life', val: '4,000+ Cycles (10+ Years)' },
        { key: 'Outputs', val: '2× AC Sockets, 2× USB-C PD, 2× USB-A, 12V Car Port' },
        { key: 'Display', val: 'Smart Color LCD Screen' },
        { key: 'Noise', val: '0 dB Silent Operation' }
      ],
      runtimes: [
        { appliance: 'LED Home Lighting', power: '10W', duration: '20+ Hours' },
        { appliance: 'Starlink + Router', power: '40W', duration: '20–24 Hours' },
        { appliance: 'Laptops', power: '60W', duration: '12–14 Charges' },
        { appliance: 'Standing Fan', power: '50W', duration: '15–18 Hours' },
        { appliance: '43" Smart TV', power: '65W', duration: '12–14 Hours' }
      ],
      boxItems: [
        { title: 'Coloar 1000 Pro Station', desc: '1,000Wh LiFePO4 power unit' },
        { title: '1× 585W Solar Panel', desc: 'Tier-1 high efficiency monocrystalline' },
        { title: 'MC4 Solar Cables', desc: 'Heavy-duty 5m extension wire' },
        { title: 'AC Wall Adapter', desc: 'Mains fast charger' },
        { title: 'Warranty & Manual', desc: '1-Year DEVICE PRO warranty' }
      ]
    },

    'bf-coloar-1000-plus': {
      id: 'bf-coloar-1000-plus',
      brand: 'Coloar Solar',
      model: 'Coloar 1000 Plus Solar Power Station',
      fullTitle: 'Coloar 1000 Plus 500W Solar Station + 585W Monocrystalline Panel Combo',
      tagline: '500W Continuous Pure Sine Wave with 1,000Wh LiFePO4 Storage & 585W Solar Panel',
      finalPrice: 422000,
      marketValue: 560000,
      savings: 138000,
      savingsPct: '25%',
      rating: '4.9',
      reviewsCount: 51,
      stockCount: 4,
      badge: 'EXTENDED RUNTIME',
      solarIncluded: '1 × 585W Tier-1 Monocrystalline Solar Panel Included',
      powersShort: 'Home Entertainment + Lighting + 3 Standing Fans + Laptops',
      warranty: '1-Year Official Warranty & Local Service Backup',
      images: [
        { label: 'Full Combo', src: '/images/products/colar-1000.webp', desc: 'Coloar 1000 Plus + 585W Panel' },
        { label: 'Station Unit', src: '/images/products/colar-1000.webp', desc: 'Heavy-Duty Chasis & Ports' },
        { label: '585W Solar Panel', src: '/images/products/jinko-solar-panel.png', desc: 'Monocrystalline Solar Panel' },
        { label: 'Cables & Accessories', src: '/images/products/mc4-solar-cable.png', desc: 'Solar Cables & Charger' }
      ],
      description: `
        Upgraded with higher continuous wattage, the <strong>Coloar 1000 Plus</strong> outputs <strong>500W pure sine wave power</strong> to accommodate multiple fans, large Smart TVs, home theatres, and heavy workstation setups alongside its 1,000Wh battery and 585W solar array.
      `,
      specs: [
        { key: 'Inverter Output', val: '500W Pure Sine Wave (1000W Surge)' },
        { key: 'Battery Capacity', val: '1,000Wh LiFePO4 Battery' },
        { key: 'Solar Included', val: '1× 585W Tier-1 Panel' },
        { key: 'Cycle Life', val: '4,000+ Cycles' },
        { key: 'Ports', val: '2× AC UK Outlets, 2× USB-C PD 100W, USB-A, 12V DC' }
      ],
      runtimes: [
        { appliance: '3× Standing Fans', power: '150W', duration: '6–7 Hours' },
        { appliance: '55" Smart TV + Soundbar', power: '90W', duration: '9–10 Hours' },
        { appliance: 'Starlink + Wi-Fi Router', power: '40W', duration: '20–22 Hours' },
        { appliance: 'Laptops', power: '60W', duration: '12–14 Charges' }
      ],
      boxItems: [
        { title: 'Coloar 1000 Plus Station', desc: '500W / 1,000Wh solar generator' },
        { title: '1× 585W Solar Panel', desc: 'Monocrystalline panel' },
        { title: 'MC4 Solar Cable Kit', desc: 'Heavy-duty 5m wire' },
        { title: 'AC Wall Charger', desc: 'Rapid mains adapter' },
        { title: 'Warranty & Manual', desc: '1-Year DEVICE PRO warranty' }
      ]
    },

    'bf-hithium-2-single': {
      id: 'bf-hithium-2-single',
      brand: 'Hithium',
      model: 'Hithium 2 Solar Kit (1-Panel)',
      fullTitle: 'Hithium 2 1000W Solar Kit + 1× 585W Monocrystalline Panel Combo',
      tagline: '1,000W Pure Sine Wave with 2,000Wh EV-Grade LiFePO4 Battery & 585W High-Irradiance Panel',
      finalPrice: 642000,
      marketValue: 850000,
      savings: 208000,
      savingsPct: '24%',
      rating: '5.0',
      reviewsCount: 64,
      stockCount: 3,
      badge: 'EV-GRADE CELLS',
      solarIncluded: '1 × 585W Tier-1 Monocrystalline Solar Panel Included',
      powersShort: 'Double-Door Fridge + 55" TV + Blender + Desktop PC',
      warranty: '2-Year Official Hithium Warranty & Nationwide Support',
      images: [
        { label: 'Full Combo', src: '/images/products/hithium-hero-ee2.png', desc: 'Hithium 2 Kit + 585W Panel' },
        { label: 'HeroEE 1 Alt Angle', src: '/images/products/hithium-hero-ee1.webp', desc: '2000Wh Station & AC Ports' },
        { label: '585W Solar Panel', src: '/images/products/jinko-solar-panel.png', desc: 'High-Yield Monocrystalline Panel' },
        { label: 'Cables & Accessories', src: '/images/products/mc4-solar-cable.png', desc: 'High-Current Cables & Charger' }
      ],
      description: `
        The <strong>Hithium 2</strong> is built with true <strong>EV-grade lithium iron phosphate cells</strong> designed for more than 10 years of daily deep cycling. Outputting <strong>1,000W continuous pure sine wave power</strong> with a huge <strong>2,000Wh battery</strong>, this power station runs inverter refrigerators, desktop PCs, blenders, home audio, and lighting effortlessly.
      `,
      specs: [
        { key: 'Inverter Rating', val: '1,000W Continuous Pure Sine Wave (2,000W Surge)' },
        { key: 'Battery Energy', val: '2,000Wh EV-Grade LiFePO4 Storage' },
        { key: 'Solar Included', val: '1× 585W Tier-1 Monocrystalline Panel' },
        { key: 'Cycle Life', val: '4,000+ Cycles (10+ Years Lifespan)' },
        { key: 'Refrigeration', val: 'Supports Double-Door Inverter Refrigerators & Deep Freezers' },
        { key: 'Warranty', val: '2-Year Full Manufacturer Warranty' }
      ],
      runtimes: [
        { appliance: 'Inverter Refrigerator (100W avg)', power: '100W', duration: '14–18 Hours' },
        { appliance: '55" 4K Smart TV + Home Audio', power: '90W', duration: '18–20 Hours' },
        { appliance: 'Starlink Dish + Wi-Fi', power: '40W', duration: '40+ Hours' },
        { appliance: 'Standing Fans (3 Fans)', power: '150W', duration: '11–13 Hours' },
        { appliance: 'Kitchen Blender (400W)', power: '400W', duration: '4+ Hours continuous' }
      ],
      boxItems: [
        { title: 'Hithium 2 Power Station', desc: '1,000W / 2,000Wh EV-grade unit' },
        { title: '1× 585W Monocrystalline Panel', desc: 'Tier-1 solar panel' },
        { title: 'High-Current MC4 Solar Cables', desc: 'Heavy gauge solar wire' },
        { title: 'Rapid AC Wall Charger', desc: 'Wall fast charging cord' },
        { title: '2-Year Warranty Certificate', desc: 'Official Hithium warranty' }
      ]
    },

    'bf-hithium-2-dual': {
      id: 'bf-hithium-2-dual',
      brand: 'Hithium',
      model: 'Hithium 2 Rapid Solar Kit (Dual-Panel)',
      fullTitle: 'Hithium 2 1000W Rapid Kit + 2× 585W Panels (1,170W Array)',
      tagline: '1,000W Pure Sine Wave with 2,000Wh EV-Grade Battery & 1,170W Massive Dual Solar Array',
      finalPrice: 754000,
      marketValue: 1020000,
      savings: 266000,
      savingsPct: '26%',
      rating: '5.0',
      reviewsCount: 71,
      stockCount: 2,
      badge: 'RAPID CHARGE COMBO',
      solarIncluded: '2 × 585W Panels (1,170W Dual Solar Array)',
      powersShort: 'Full Flat Lighting + TV + Fridge + Freezer + Workstations',
      warranty: '2-Year Official Hithium Warranty & Free Lagos/Ibadan Delivery',
      images: [
        { label: 'Full Combo', src: '/images/products/hithium-hero-ee2.png', desc: 'Hithium 2 + Dual 585W Panels' },
        { label: 'HeroEE 2 Alt Angle', src: '/images/products/hithium-hero-ee2.jpg', desc: '2000Wh Powerhouse' },
        { label: 'Dual Solar Panels', src: '/images/products/jinko-solar-panel.png', desc: '2× 585W Monocrystalline Panels' },
        { label: 'MC4 Y-Branch Cables', desc: 'Parallel PV Branch Connectors & Cable' }
      ],
      description: `
        The ultimate rapid-recharge solar package. The <strong>Hithium 2 Dual-Panel Kit</strong> includes two massive Tier-1 585W monocrystalline solar panels generating up to <strong>1,170W of solar input</strong>. This recharges the 2,000Wh battery bank in under 90 minutes of midday sunlight, giving you boundless off-grid power for refrigerators, entertainment systems, and full-flat appliances.
      `,
      specs: [
        { key: 'Inverter Output', val: '1,000W Pure Sine Wave (2,000W Surge)' },
        { key: 'Battery Capacity', val: '2,000Wh EV-Grade LiFePO4' },
        { key: 'Solar Array Included', val: '2× 585W Panels (1,170W Total Array)' },
        { key: 'Solar Recharging Speed', val: 'Under 90 minutes in full sunlight' },
        { key: 'Warranty', val: '2-Year Official Manufacturer Warranty' }
      ],
      runtimes: [
        { appliance: 'Inverter Double-Door Refrigerator', power: '100W', duration: '16–20 Hours' },
        { appliance: '55"–65" Smart TV + Decoder', power: '90W', duration: '18–20 Hours' },
        { appliance: 'Full Flat Lighting + 3 Fans', power: '160W', duration: '11–12 Hours' },
        { appliance: 'Starlink + Router Network', power: '40W', duration: '40+ Hours' }
      ],
      boxItems: [
        { title: 'Hithium 2 Station (2,000Wh)', desc: '1,000W pure sine wave generator' },
        { title: '2× 585W Monocrystalline Panels', desc: '1,170W combined solar array' },
        { title: 'MC4 Solar Y-Branch Cable Kit', desc: 'Parallel branch connectors & 10m wire' },
        { title: 'AC Wall Mains Rapid Charger', desc: 'High-speed wall adapter' },
        { title: '2-Year Warranty Certificate', desc: 'Official warranty & user guide' }
      ]
    },

    'bf-hicces-1000': {
      id: 'bf-hicces-1000',
      brand: 'Hicces',
      model: 'Hicces 1000W Solar Power Station',
      fullTitle: 'Hicces 1000W Heavy-Duty Station + 2× 585W Panels (1,170W Array)',
      tagline: '1,000W Pure Sine Wave with 2,000Wh Capacity & Dual 585W Monocrystalline Solar Array',
      finalPrice: 784000,
      marketValue: 1050000,
      savings: 266000,
      savingsPct: '25%',
      rating: '4.9',
      reviewsCount: 39,
      stockCount: 3,
      badge: 'HEAVY ESSENTIALS',
      solarIncluded: '2 × 585W Panels (1,170W Combined Solar Array)',
      powersShort: 'Office Equipment, Deep Freezer, Sewing Machine, Sound',
      warranty: '1-Year Official Warranty & Lagos Spare Parts Guarantee',
      images: [
        { label: 'Full Combo', src: '/images/products/hicces-500w.png', desc: 'Hicces 1000W + 2× 585W Panels' },
        { label: 'Station Front', src: '/images/products/hicces-500w.png', desc: '1000W Inverter Outlets & Screen' },
        { label: 'Dual Panels', src: '/images/products/jinko-solar-panel.png', desc: '2× 585W Monocrystalline Panels' },
        { label: 'Solar Cables', src: '/images/products/mc4-solar-cable.png', desc: 'Parallel MC4 Extension Cable' }
      ],
      description: `
        The <strong>Hicces 1000W Heavy-Duty Solar Station</strong> is designed for demanding SME businesses, clinics, and modern residences. Featuring a <strong>2,000Wh battery storage bank</strong> and a <strong>1,170W dual solar panel array</strong>, it easily sustains deep freezers, sewing machines, office computers, and entertainment centers without downtime.
      `,
      specs: [
        { key: 'Inverter Rating', val: '1,000W Continuous Pure Sine Wave (2,000W Peak)' },
        { key: 'Battery Energy', val: '2,000Wh Deep-Cycle Lithium Bank' },
        { key: 'Solar Array Included', val: '2× 585W Panels (1,170W Total)' },
        { key: 'Recharge Time', val: 'Approx. 2 hours via solar array' },
        { key: 'Outlets', val: '3× AC 220V Sockets, USB-C PD, USB-A QC, 12V DC' }
      ],
      runtimes: [
        { appliance: 'Deep Freezer / Inverter Fridge', power: '120W', duration: '14–16 Hours' },
        { appliance: 'SME Sewing Machine / Clipper Hub', power: '150W', duration: '12–14 Hours' },
        { appliance: '55" TV + Soundbar + Fans', power: '150W', duration: '12–14 Hours' },
        { appliance: 'Starlink & Wi-Fi Network', power: '40W', duration: '40+ Hours' }
      ],
      boxItems: [
        { title: 'Hicces 1000W Power Station', desc: '2,000Wh heavy-duty solar unit' },
        { title: '2× 585W Monocrystalline Panels', desc: '1,170W high irradiance solar array' },
        { title: 'MC4 Y-Branch Solar Cable', desc: 'Heavy-duty parallel solar cables' },
        { title: 'AC Wall Charger & Manual', desc: '220V charger and 1-Year warranty' }
      ]
    },

    'bf-coloar-2000': {
      id: 'bf-coloar-2000',
      brand: 'Coloar Solar',
      model: 'Coloar 2000 Heavy-Duty Power Station',
      fullTitle: 'Coloar 2000 1000W Solar Station + 2× 585W Panels (1,170W Array)',
      tagline: '1,000W Pure Sine Wave with 2,000Wh LiFePO4 Energy Storage & 1,170W Dual Solar Panels',
      finalPrice: 812000,
      marketValue: 1100000,
      savings: 288000,
      savingsPct: '26%',
      rating: '4.9',
      reviewsCount: 54,
      stockCount: 2,
      badge: '🔥 FLASH DEAL HERO',
      solarIncluded: '2 × 585W Panels (1,170W Dual Monocrystalline Array)',
      powersShort: 'Freezer + TV + Fans + Laptops + Medical & Office Loads',
      warranty: '1-Year Full Warranty & Guaranteed Lagos Delivery',
      images: [
        { label: 'Full Combo', src: '/images/products/colar-2000.webp', desc: 'Coloar 2000 + Dual 585W Panels' },
        { label: 'Power Unit', src: '/images/products/colar-2000.webp', desc: 'Heavy-Duty 2000Wh Chasis' },
        { label: 'Dual Panels', src: '/images/products/jinko-solar-panel.png', desc: '2× 585W High-Yield Panels' },
        { label: 'Cables & Kit', src: '/images/products/mc4-solar-cable.png', desc: 'Solar Branch Connectors & Wires' }
      ],
      description: `
        The <strong>Coloar 2000</strong> represents premier engineering in mobile solar generators. Replaces small and medium petrol generators completely with <strong>zero fuel costs</strong> and <strong>0dB silent operation</strong>. Capable of driving home freezers, televisions, laptops, and medical diagnostic equipment smoothly.
      `,
      specs: [
        { key: 'Inverter Rating', val: '1,000W Pure Sine Wave (2,000W Surge)' },
        { key: 'Battery Capacity', val: '2,000Wh High-Capacity LiFePO4' },
        { key: 'Solar Array', val: '2× 585W Monocrystalline Panels (1,170W Total)' },
        { key: 'Cycle Life', val: '4,000+ Cycles (10+ Years)' },
        { key: 'AC Sockets', val: '3× UK Standard Sockets' }
      ],
      runtimes: [
        { appliance: 'Inverter Refrigerator', power: '100W', duration: '16–18 Hours' },
        { appliance: 'Home Theatre + 65" TV', power: '120W', duration: '14–16 Hours' },
        { appliance: '4 Standing Fans + Lighting', power: '200W', duration: '9–10 Hours' },
        { appliance: 'Starlink & Workstations', power: '60W', duration: '30+ Hours' }
      ],
      boxItems: [
        { title: 'Coloar 2000 Station', desc: '2,000Wh solar powerhouse' },
        { title: '2× 585W Solar Panels', desc: '1,170W high efficiency solar array' },
        { title: 'MC4 Y-Branch Cables', desc: 'Parallel solar wiring kit' },
        { title: 'AC Fast Charger & Manual', desc: '1-Year DEVICE PRO warranty' }
      ]
    },

    'bf-coloar-3600': {
      id: 'bf-coloar-3600',
      brand: 'Coloar Solar',
      model: 'Coloar 3600 Ultimate Solar Powerhouse',
      fullTitle: 'Coloar 3600 1200W Station + 3× 585W Panels (1,755W Mega Array)',
      tagline: '1,200W Continuous Pure Sine Wave with 3,600Wh Mega LiFePO4 Bank & 1,755W Triple Solar Array',
      finalPrice: 1166000,
      marketValue: 1600000,
      savings: 434000,
      savingsPct: '27%',
      rating: '5.0',
      reviewsCount: 82,
      stockCount: 2,
      badge: '👑 KING OF CAPACITY',
      solarIncluded: '3 × 585W Panels (1,755W Triple Mega Solar Array)',
      powersShort: 'Pumps, Refrigerators, Multiple Rooms & Clinic Workstations',
      warranty: '2-Year Official Warranty & Free Doorstep White-Glove Delivery',
      images: [
        { label: 'Full Combo', src: '/images/products/colar-3600.webp', desc: 'Coloar 3600 + Triple 585W Panels' },
        { label: 'Station Unit', src: '/images/products/colar-3600.webp', desc: '3600Wh Mega Power Unit' },
        { label: 'Triple Solar Panels', src: '/images/products/jinko-solar-panel.png', desc: '3× 585W Monocrystalline Panels' },
        { label: 'Solar Cables Kit', src: '/images/products/mc4-solar-cable.png', desc: 'Triple Branch Connectors & Heavy Duty Wires' }
      ],
      description: `
        The undisputed flagship of portable solar generators in Nigeria. The <strong>Coloar 3600 Ultimate</strong> boasts a staggering <strong>3,600Wh of expandable LiFePO4 battery storage</strong>, powered by a <strong>1,755W triple-panel solar array</strong> (3× 585W Tier-1 Monocrystalline panels).
        <br><br>
        Delivering <strong>1,200W pure sine wave continuous output</strong> (2,400W peak), it effortlessly handles refrigeration, water pumps, medical diagnostics, studio workstations, and entire 2-to-3 bedroom residential lighting and entertainment setups without breaking a sweat.
      `,
      specs: [
        { key: 'Inverter Rating', val: '1,200W Continuous Pure Sine Wave (2,400W Surge)' },
        { key: 'Battery Capacity', val: '3,600Wh Ultra-Capacity LiFePO4' },
        { key: 'Solar Array Included', val: '3× 585W Panels (1,755W Mega Solar Array)' },
        { key: 'Recharge Time', val: 'Approx. 2.2 hours under full Nigerian sun' },
        { key: 'Cycle Life', val: '4,500+ Recharge Cycles (12+ Years)' },
        { key: 'AC Sockets', val: '4× UK Standard 220V Pure Sine Outlets' },
        { key: 'Heavy Appliances', val: 'Runs refrigerators, booster pumps, dental chairs, sound systems' },
        { key: 'Warranty', val: '2-Year Full Manufacturer Warranty' }
      ],
      runtimes: [
        { appliance: 'Inverter Fridge + Inverter Freezer', power: '200W', duration: '16–18 Hours Continuous' },
        { appliance: 'Whole Flat Lighting + 4 Fans + TV', power: '250W', duration: '14–15 Hours' },
        { appliance: 'Starlink + Network Hub', power: '40W', duration: '75+ Hours' },
        { appliance: '0.5HP Inverter Booster Water Pump', power: '375W', duration: 'Multiple water pumping cycles' },
        { appliance: 'Medical / Dental / Lab Equipment', power: '400W', duration: 'Full 8-hour workday' }
      ],
      boxItems: [
        { title: 'Coloar 3600 Station (3,600Wh)', desc: 'Heavy-duty 1,200W powerhouse on caster wheels' },
        { title: '3× 585W Monocrystalline Panels', desc: '1,755W high-irradiance mega array' },
        { title: '3-Way MC4 Branch Connectors & Cable', desc: 'Triple panel solar wiring set' },
        { title: 'High-Speed AC Wall Charger', desc: 'Rapid mains wall charging cord' },
        { title: '2-Year VIP Warranty Card', desc: 'Full warranty & direct technical dispatch' }
      ]
    }
  };

  // Helper: Format Naira
  function formatNgn(num) {
    return '₦' + Number(num).toLocaleString('en-NG');
  }

  // Determine current package ID from URL (?id=... or /black-friday/...)
  function getSelectedPackageId() {
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get('id');
    if (queryId && BF_PACKAGES[queryId]) {
      return queryId;
    }

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && BF_PACKAGES[lastPart]) {
      return lastPart;
    }

    if (window.location.pathname.includes('itel-450w') || window.location.pathname.includes('itel-500w')) {
      return 'bf-itel-500-450w';
    }

    // Default to itel 500W (450W combo)
    return 'bf-itel-500-450w';
  }

  // 2. RENDER PRODUCT DETAIL
  function renderProductDetail() {
    const pkgId = getSelectedPackageId();
    const pkg = BF_PACKAGES[pkgId];
    if (!pkg) return;

    // Update Page Head Title & Meta
    document.title = `${pkg.model} — Black Friday Solar Combo | DEVICE PRO`;

    // Breadcrumb
    const breadcrumbCurrent = document.getElementById('bf-breadcrumb-current');
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = pkg.model;

    // Brand & Title
    const brandEl = document.getElementById('bf-detail-brand');
    if (brandEl) brandEl.textContent = pkg.brand;

    const titleEl = document.getElementById('bf-detail-title');
    if (titleEl) titleEl.textContent = pkg.fullTitle;

    const taglineEl = document.getElementById('bf-detail-tagline');
    if (taglineEl) taglineEl.textContent = pkg.tagline;

    // Pricing
    const finalPriceEl = document.getElementById('bf-detail-final-price');
    if (finalPriceEl) finalPriceEl.textContent = formatNgn(pkg.finalPrice);

    const regPriceEl = document.getElementById('bf-detail-regular-price');
    if (regPriceEl) regPriceEl.textContent = formatNgn(pkg.marketValue);

    const savingsChipEl = document.getElementById('bf-detail-savings-chip');
    if (savingsChipEl) savingsChipEl.textContent = `SAVE ${formatNgn(pkg.savings)} (${pkg.savingsPct} OFF)`;

    // Mobile bar
    const mobilePriceEl = document.getElementById('bf-mobile-price');
    if (mobilePriceEl) mobilePriceEl.textContent = formatNgn(pkg.finalPrice);

    // Badges & Stock
    const dealBadge = document.getElementById('bf-badge-deal');
    if (dealBadge) dealBadge.textContent = pkg.badge;

    const solarBadgeEl = document.getElementById('bf-gallery-solar-badge');
    if (solarBadgeEl) {
      if (pkg.solarIncluded && pkg.solarIncluded.includes('450W')) {
        solarBadgeEl.textContent = '450W PANEL INCLUDED';
      } else if (pkg.solarIncluded && pkg.solarIncluded.includes('2 ×')) {
        solarBadgeEl.textContent = '2 × 585W PANELS INCLUDED';
      } else if (pkg.solarIncluded && pkg.solarIncluded.includes('3 ×')) {
        solarBadgeEl.textContent = '3 × 585W PANELS INCLUDED';
      } else {
        solarBadgeEl.textContent = '585W PANEL INCLUDED';
      }
    }

    const stockEl = document.getElementById('bf-stock-text');
    if (stockEl) stockEl.textContent = `High Demand: Only ${pkg.stockCount} units remaining in Lagos warehouse`;

    // Variant Selector (itel 450W vs 585W combo)
    const switchContainer = document.getElementById('bf-panel-switch-container');
    if (switchContainer) {
      if (pkgId === 'bf-itel-500' || pkgId === 'bf-itel-500-450w') {
        switchContainer.innerHTML = `
          <div class="bf-panel-switch-wrap">
            <span class="bf-panel-switch-label">Select Solar Panel Combo:</span>
            <div class="bf-panel-switch-options">
              <a href="/black-friday-detail.html?id=bf-itel-500-450w" class="bf-panel-switch-btn ${pkgId === 'bf-itel-500-450w' ? 'active' : ''}">
                <span class="bf-switch-badge">⚡ HERO SPECIAL</span>
                <span class="bf-switch-watts">450W Solar Panel Combo</span>
                <span class="bf-switch-price">₦391,000</span>
              </a>
              <a href="/black-friday-detail.html?id=bf-itel-500" class="bf-panel-switch-btn ${pkgId === 'bf-itel-500' ? 'active' : ''}">
                <span class="bf-switch-badge">MAX SOLAR</span>
                <span class="bf-switch-watts">585W Solar Panel Combo</span>
                <span class="bf-switch-price">₦418,000</span>
              </a>
            </div>
          </div>
        `;
        switchContainer.style.display = 'block';
      } else {
        switchContainer.innerHTML = '';
        switchContainer.style.display = 'none';
      }
    }

    // Dynamic Solar Array references in Overview tab
    const is450W = pkg.solarIncluded && pkg.solarIncluded.includes('450W');
    const is2x585W = pkg.solarIncluded && pkg.solarIncluded.includes('2 ×');
    const is3x585W = pkg.solarIncluded && pkg.solarIncluded.includes('3 ×');
    const panelWattsLabel = is450W ? '450W' : (is2x585W ? '2 × 585W' : (is3x585W ? '3 × 585W' : '585W'));

    const solarBullet = document.getElementById('bf-detail-solar-watt-bullet');
    if (solarBullet) {
      solarBullet.textContent = panelWattsLabel;
    }

    const partnerTitle = document.getElementById('bf-detail-solar-partner-title');
    if (partnerTitle) {
      partnerTitle.textContent = `Bundled with Tier-1 ${panelWattsLabel} Solar Array`;
    }

    const partnerDesc = document.getElementById('bf-detail-solar-partner-desc');
    if (partnerDesc) {
      partnerDesc.textContent = `Every combo package comes complete with authentic Tier-1 ${panelWattsLabel} Monocrystalline solar panel engineered for ultra-high conversion efficiency even under cloudy Nigerian skies.`;
    }

    const partnerImg = document.getElementById('bf-detail-solar-partner-img');
    if (partnerImg) {
      partnerImg.alt = `${panelWattsLabel} Solar Panel`;
    }

    // Quick Specs Grid
    const quickSpecsGrid = document.getElementById('bf-quick-specs-grid');
    if (quickSpecsGrid) {
      quickSpecsGrid.innerHTML = `
        <div class="bf-quick-spec-item">
          <div class="bf-spec-label">Inverter Rating</div>
          <div class="bf-spec-val">${pkg.specs[1]?.val || 'Pure Sine Wave'}</div>
        </div>
        <div class="bf-quick-spec-item">
          <div class="bf-spec-label">Battery Capacity</div>
          <div class="bf-spec-val">${pkg.specs[3]?.val || '1,000Wh'}</div>
        </div>
        <div class="bf-quick-spec-item">
          <div class="bf-spec-label">Included Solar Array</div>
          <div class="bf-spec-val">${pkg.solarIncluded}</div>
        </div>
        <div class="bf-quick-spec-item">
          <div class="bf-spec-label">Doorstep Delivery</div>
          <div class="bf-spec-val">100% Free (Lagos &amp; Ibadan)</div>
        </div>
      `;
    }

    // Gallery Render
    const mainImg = document.getElementById('bf-main-product-img');
    const thumbsContainer = document.getElementById('bf-gallery-thumbs');
    if (mainImg && thumbsContainer && pkg.images) {
      mainImg.src = pkg.images[0].src;
      mainImg.alt = pkg.images[0].desc;

      thumbsContainer.innerHTML = pkg.images.map((img, idx) => `
        <button type="button" class="bf-thumb-btn ${idx === 0 ? 'active' : ''}" data-thumb-index="${idx}">
          <img src="${img.src}" alt="${img.desc}" loading="lazy">
          <span>${img.label}</span>
        </button>
      `).join('');

      // Add thumbnail switch listeners
      thumbsContainer.querySelectorAll('.bf-thumb-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          thumbsContainer.querySelectorAll('.bf-thumb-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const idx = Number(btn.getAttribute('data-thumb-index'));
          if (pkg.images[idx]) {
            mainImg.style.opacity = '0.3';
            setTimeout(() => {
              mainImg.src = pkg.images[idx].src;
              mainImg.alt = pkg.images[idx].desc;
              mainImg.style.opacity = '1';
            }, 120);
          }
        });
      });
    }

    // Description Tab
    const descContent = document.getElementById('bf-desc-content');
    if (descContent) {
      descContent.innerHTML = pkg.description;
    }

    // Runtime Table Tab
    const runtimeBody = document.getElementById('bf-runtime-tbody');
    if (runtimeBody && pkg.runtimes) {
      runtimeBody.innerHTML = pkg.runtimes.map(r => `
        <tr>
          <td><strong>${r.appliance}</strong></td>
          <td>${r.power}</td>
          <td><span class="bf-runtime-pill">${r.duration}</span></td>
        </tr>
      `).join('');
    }

    // Full Specs Tab
    const specsBody = document.getElementById('bf-specs-tbody');
    if (specsBody && pkg.specs) {
      specsBody.innerHTML = pkg.specs.map(s => `
        <tr>
          <td class="spec-key">${s.key}</td>
          <td class="spec-val">${s.val}</td>
        </tr>
      `).join('');
    }

    // What's in the Box Tab
    const boxContainer = document.getElementById('bf-box-container');
    if (boxContainer && pkg.boxItems) {
      boxContainer.innerHTML = pkg.boxItems.map(item => `
        <div class="bf-box-item">
          <div class="bf-box-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <h4 class="bf-box-title">${item.title}</h4>
          <p class="bf-box-desc">${item.desc}</p>
        </div>
      `).join('');
    }

    // Cross-sell Other Combos
    const otherGrid = document.getElementById('bf-other-combos-grid');
    if (otherGrid) {
      const otherKeys = Object.keys(BF_PACKAGES).filter(k => k !== pkgId).slice(0, 3);
      otherGrid.innerHTML = otherKeys.map(k => {
        const otherPkg = BF_PACKAGES[k];
        return `
          <a href="/black-friday-detail.html?id=${otherPkg.id}" class="bf-combo-mini-card">
            <div class="bf-mini-card-top">
              <img src="${otherPkg.images[0].src}" alt="${otherPkg.model}" class="bf-mini-card-img">
              <div class="bf-mini-card-info">
                <h4>${otherPkg.model}</h4>
                <span>${otherPkg.solarIncluded}</span>
              </div>
            </div>
            <div class="bf-mini-card-price-row">
              <span class="bf-mini-card-price">${formatNgn(otherPkg.finalPrice)}</span>
              <span class="bf-mini-card-link-text">View Specs →</span>
            </div>
          </a>
        `;
      }).join('');
    }

    // Wire Up WhatsApp Actions
    setupWhatsAppButtons(pkg);
    setupOrderOnlineButtons(pkg);
  }

  // 3. WHATSAPP DISPATCH HELPER
  function setupWhatsAppButtons(pkg) {
    const text = encodeURIComponent(
      `Hello DEVICE PRO! 👋\n\nI want to order the Black Friday Combo Deal:\n` +
      `📦 *Package:* ${pkg.fullTitle}\n` +
      `💰 *Combo Total:* ${formatNgn(pkg.finalPrice)} (Discounted from ${formatNgn(pkg.marketValue)})\n` +
      `☀️ *Included Solar:* ${pkg.solarIncluded}\n` +
      `🚚 *Delivery:* Free Doorstep Delivery across Lagos & Ibadan included!\n\n` +
      `Please confirm stock and dispatch schedule for my address.`
    );
    const waUrl = `https://wa.me/2348033882268?text=${text}`;

    const waBtn = document.getElementById('bf-btn-whatsapp-order');
    if (waBtn) waBtn.href = waUrl;

    const navWaBtn = document.getElementById('bf-nav-whatsapp');
    if (navWaBtn) navWaBtn.href = waUrl;

    const mobileWaBtn = document.getElementById('bf-mobile-whatsapp');
    if (mobileWaBtn) mobileWaBtn.href = waUrl;
  }

  // 4. ONLINE ORDER MODAL
  function setupOrderOnlineButtons(pkg) {
    const buyBtn = document.getElementById('bf-btn-buy-online');
    const mobileBuyBtn = document.getElementById('bf-mobile-buy');
    const modal = document.getElementById('bf-checkout-modal');
    const modalCloseBtn = document.getElementById('bf-modal-close');

    if (!modal) return;

    function openModal() {
      document.getElementById('bf-modal-product-name').textContent = pkg.fullTitle;
      document.getElementById('bf-modal-product-price').textContent = formatNgn(pkg.finalPrice);
      modal.showModal();
    }

    if (buyBtn) buyBtn.addEventListener('click', openModal);
    if (mobileBuyBtn) mobileBuyBtn.addEventListener('click', openModal);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => modal.close());

    // Modal Form Submission
    const checkoutForm = document.getElementById('bf-detail-checkout-form');
    if (checkoutForm) {
      checkoutForm.onsubmit = function (e) {
        e.preventDefault();
        const fullName = document.getElementById('bf-cust-name').value;
        const phone = document.getElementById('bf-cust-phone').value;
        const address = document.getElementById('bf-cust-address').value;
        const city = document.getElementById('bf-cust-city').value;

        // WhatsApp direct fulfillment backup
        const waMsg = encodeURIComponent(
          `⚡ *NEW BLACK FRIDAY ORDER SUBMITTED*\n\n` +
          `📦 *Product:* ${pkg.fullTitle}\n` +
          `💵 *Total:* ${formatNgn(pkg.finalPrice)} (Free Delivery Included)\n` +
          `👤 *Customer:* ${fullName}\n` +
          `📞 *Phone:* ${phone}\n` +
          `📍 *Delivery Address:* ${address}, ${city}\n\n` +
          `Please confirm doorstep delivery dispatch.`
        );
        modal.close();
        window.open(`https://wa.me/2348033882268?text=${waMsg}`, '_blank');
      };
    }
  }

  // 5. TABS CONTROLLER
  function initTabs() {
    const tabButtons = document.querySelectorAll('.bf-tab-btn');
    const tabPanes = document.querySelectorAll('.bf-tab-pane');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab-target');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    renderProductDetail();
    initTabs();
  });

})();

