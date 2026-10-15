/**
 * DEVICE PRO — RESOURCES & KNOWLEDGE BASE CONTROLLER (resources.js)
 * Manages educational guides data, category filters, and modal reader dialog.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 5 Comprehensive Nigerian Solar Educational Guides
  const GUIDES_DATA = [
    {
      id: 'buying-guide',
      category: 'sizing',
      categoryName: 'Buying & Sizing Guide',
      title: 'The Definitive Nigerian Solar Buying Guide (2026 Edition)',
      excerpt: 'How to navigate the Nigerian solar market without falling victim to counterfeit batteries, mismatched inverters, or undersized DC cabling.',
      author: 'Engr. Babatunde Adeyemi, FNSE',
      readTime: '9 min read',
      date: 'Updated October 2026',
      takeaways: [
        'Never confuse kVA with true usable kW (factor in 0.8 to 0.9 Power Factor).',
        'Demand a genuine single-line schematic and verified Tier-1 serial numbers.',
        'Ensure DC surge arrestors (SPDs) and copper earthing (<2Ω) are included.'
      ],
      content: `
        <h3>1. The Reality of Solar in Nigeria</h3>
        <p>With grid tariff increases (Band A rates) and automotive gas oil (diesel) fluctuating between ₦1,300 and ₦1,600 per litre, solar energy has transitioned from an eco-friendly luxury to a mandatory economic survival tool for Nigerian households and enterprises.</p>
        <p>However, the local market is saturated with uncertified equipment and roadside installers who calculate system requirements through guesswork. A properly engineered solar system should last 15 to 25 years with minimal maintenance.</p>

        <h3>2. kVA vs. kW: The Most Common Sizing Trap</h3>
        <p>Many consumers buy a "5kVA" inverter assuming it will output 5,000 Watts continuously. In reality, inverters have a <strong>Power Factor (PF)</strong>, typically 0.8 for standard units and 1.0 for premium pure sine wave units.</p>
        <blockquote>"A 5kVA inverter with a 0.8 Power Factor can only support 4,000 Watts of continuous load. Exceeding this triggers an overload fault or permanent MOSFET failure."</blockquote>
        <p>Always calculate your appliance loads in continuous Watts and ensure your inverter is sized with at least a 25% safety overhead.</p>

        <h3>3. Electrical Protection: The Difference Between 15 Years and 6 Months</h3>
        <p>The Nigerian National Grid experiences catastrophic voltage fluctuations (often dipping to 140V or spiking past 280V during transformer faults). Lightning strikes during tropical rainstorms also induce severe electromagnetic pulses into rooftop solar arrays.</p>
        <p>Every professional installation must include:</p>
        <ul>
          <li><strong>Class-1 DC Surge Protection Devices (SPD):</strong> Diverts high-voltage lightning surges to ground before reaching inverter MPPTs.</li>
          <li><strong>Dual-Pole DC Breakers & Isolators:</strong> Allows safe physical disconnection of high-voltage PV strings during maintenance.</li>
          <li><strong>Copper Earth Grounding:</strong> Measured earth resistance below 2 Ohms using certified copper rods and chemical earthing compound.</li>
        </ul>
      `
    },
    {
      id: 'lifepo4-vs-lead-acid',
      category: 'batteries',
      categoryName: 'Battery Chemistries',
      title: 'LiFePO4 Lithium vs. Tubular Lead-Acid: The 10-Year TCO Breakdown',
      excerpt: 'Why cheap lead-acid batteries fail after 18 months in tropical Nigerian heat (35°C+) and how 6,000-cycle LiFePO4 saves millions of Naira.',
      author: 'Engr. Ngozi Okonjo-Nwosu, M.Sc.',
      readTime: '11 min read',
      date: 'Updated October 2026',
      takeaways: [
        'Tubular lead-acid usable capacity is only 50%; LiFePO4 delivers 90%–95% daily.',
        'High ambient temperatures cut lead-acid cycle life by over 50% in Nigeria.',
        'A 10-year LiFePO4 bank saves over ₦5,000,000 compared to repeated lead-acid replacements.'
      ],
      content: `
        <h3>1. The Temperature Factor in Nigeria</h3>
        <p>Battery datasheets are rated at an optimal laboratory temperature of 25°C. In Nigerian equipment rooms across Lagos, Kano, or Port Harcourt, ambient temperatures consistently reach 32°C to 38°C.</p>
        <p>For lead-acid chemistries (including Gel, AGM, and Tall Tubular), the Arrhenius law dictates that for every 10°C rise above 25°C, battery internal grid corrosion doubles, halving calendar life. A tubular battery rated for 3 years in Europe often expires in 14–18 months under typical Nigerian conditions.</p>

        <h3>2. Depth of Discharge (DoD) & Usable Kilowatt-Hours</h3>
        <p>When you purchase a 200Ah 12V lead-acid battery, it holds 2.4kWh of nominal energy. However, discharging beyond 50% causes irreversible lead-sulfate crystallization on the plates. Therefore, you only have 1.2kWh of usable energy.</p>
        <p>In contrast, <strong>Lithium Iron Phosphate (LiFePO4)</strong> can be safely discharged to 90%–95% Depth of Discharge for 6,000 cycles without significant capacity degradation. To get 10kWh of usable storage:</p>
        <ul>
          <li>You need ~8x 200Ah tubular batteries (520kg weight, taking up an entire utility room).</li>
          <li>Or just 2x 5.12kWh 48V LiFePO4 wall-mount modules (90kg, sleek, zero gas emissions).</li>
        </ul>

        <h3>3. Active Battery Management Systems (BMS)</h3>
        <p>LiFePO4 batteries feature an internal microprocessor (BMS) that monitors individual cell voltages, temperatures, and state-of-charge (SoC). Over CANbus or RS485 communication, the battery commands the hybrid inverter to regulate charge current dynamically, preventing thermal runaway and extending lifespan to over 15 years.</p>
      `
    },
    {
      id: 'motor-surge-inverter-sizing',
      category: 'sizing',
      categoryName: 'Inductive Loads',
      title: 'Motor Inrush Surges: How to Run ACs and Water Pumps on Solar',
      excerpt: 'Demystifying inductive starting currents on 1.5HP/2HP pumps, inverter air conditioners, and deep freezers to eliminate inverter tripping.',
      author: 'Engr. Babatunde Adeyemi, FNSE',
      readTime: '8 min read',
      date: 'Updated October 2026',
      takeaways: [
        'Electric motors draw 3x to 5x their rated running watts when starting.',
        'Inverter ACs eliminate inrush spikes through DC brushless soft-starting.',
        'Borehole submersible pumps require dedicated surge headroom or external soft starters.'
      ],
      content: `
        <h3>1. Resistive vs. Inductive Loads</h3>
        <p>Lighting, televisions, laptop chargers, and fans are resistive or electronic loads; their starting wattage is almost identical to their continuous running wattage. A 65-inch LED TV drawing 120W needs 120W from the inverter at all times.</p>
        <p>Inductive loads (appliances with electromagnetic windings and compressors like air conditioners, refrigerators, and water pumping machines) behave fundamentally differently. To break mechanical inertia and establish a magnetic field, the motor draws a momentary surge (inrush current) lasting 100 to 500 milliseconds.</p>

        <h3>2. Standard ACs vs. Modern Inverter ACs</h3>
        <p>A conventional 1.5HP non-inverter air conditioner draws approximately 1,200W running. However, its locked rotor amp (LRA) surge can exceed <strong>4,500W to 5,500W</strong> at startup! If multiple non-inverter ACs kick on simultaneously, they will trip even an 8kVA inverter.</p>
        <blockquote>"Upgrading to Inverter AC technology utilizes a variable-frequency brushless DC compressor that ramps up gradually from 150W to 1,000W with zero starting inrush spike."</blockquote>

        <h3>3. Sizing for Borehole Submersible Pumping Machines</h3>
        <p>A typical 1.5HP submersible borehole pump draws ~1,100W continuous, but has a starting surge of 3,500W–4,000W due to the water column head pressure in the casing pipe.</p>
        <p>For smooth solar operation without buying an oversized 10kVA inverter solely for the pump, DEVICE PRO engineers recommend installing an inline <em>Electronic Soft Starter</em> or dedicated Solar Variable Frequency Drive (VFD), which limits the inrush current to 1.2x rated load.</p>
      `
    },
    {
      id: 'generator-ats-solar-hybridization',
      category: 'generators',
      categoryName: 'Hybridization',
      title: 'Generator ATS Hybridization: Slashing Diesel Runtime by 80%',
      excerpt: 'How modern smart hybrid inverters communicate with diesel/petrol generators via dry contacts to automate charging and eliminate fuel waste.',
      author: 'Engr. Farouk Danjuma, MNIEEE',
      readTime: '7 min read',
      date: 'Updated October 2026',
      takeaways: [
        'Smart hybrid inverters start generators automatically only when battery reaches 20% SoC.',
        'Generator runs at optimal 80% fuel efficiency load curve instead of wasteful 20% idling.',
        'Eliminates fuel theft, manual midnight switching, and noisy nighttime operation.'
      ],
      content: `
        <h3>1. The Wastefulness of Light-Load Generator Running</h3>
        <p>In Nigeria, many luxury homes and offices run 20kVA to 60kVA diesel generators at night merely to power a few lights, refrigerators, and 2 bedrooms. Diesel engines run at peak thermal efficiency when loaded between 70% and 80% of capacity.</p>
        <p>Running a 30kVA generator on a light 4kW load causes wet stacking (unburned diesel buildup in the exhaust), high maintenance frequency, and burns 6 to 8 litres of diesel per hour (₦9,000/hr) unnecessarily.</p>

        <h3>2. The Smart Hybrid Inverter Solution</h3>
        <p>Modern hybrid inverters (such as Deye and Growatt models deployed by DEVICE PRO) feature onboard auxiliary dry contact relays. When properly wired to an Automatic Transfer Switch (ATS) with two-wire auto-start capability:</p>
        <ul>
          <li>The solar array and LiFePO4 batteries power the facility silently 24/7.</li>
          <li>During consecutive rainy days, when battery SoC drops below 20%, the inverter automatically triggers the generator dry contact.</li>
          <li>The generator starts, warms up, and delivers bulk charging current to the battery at its optimal 80% load curve.</li>
          <li>Within 2 to 2.5 hours, the battery reaches 85% SoC; the inverter signals the generator to cool down and shut off automatically.</li>
        </ul>
        <p>This hybrid orchestration slashes generator operating hours from 14 hours daily to under 2 hours, saving over 80% in monthly diesel OPEX.</p>
      `
    },
    {
      id: 'nigerian-solar-irradiance-yield',
      category: 'irradiance',
      categoryName: 'Solar Irradiance',
      title: 'Solar Irradiance Across Nigerian Geopolitical Zones & Tilt Optimization',
      excerpt: 'Analyzing Peak Sun Hours (PSH) from Coastal Lagos (4.2 hrs) to the Northern Savanna (6.2 hrs) and proper tilt angles for harmattan dust.',
      author: 'Engr. Ngozi Okonjo-Nwosu, M.Sc.',
      readTime: '10 min read',
      date: 'Updated October 2026',
      takeaways: [
        'Southern coastal zones average 3.8 to 4.5 Peak Sun Hours due to marine cloud cover.',
        'Northern zones average 5.8 to 6.5 Peak Sun Hours with high direct normal irradiance.',
        'Rooftop panels should be tilted at 10° to 15° facing South for optimal year-round yield.'
      ],
      content: `
        <h3>1. What are Peak Sun Hours (PSH)?</h3>
        <p>A Peak Sun Hour is not simply an hour that the sun is in the sky. It represents the equivalent number of hours per day when solar irradiance averages 1,000 Watts per square meter (1,000 W/m²).</p>
        <p>A 1kWp solar panel in an area with 5.0 PSH will generate approximately 5.0 kilowatt-hours (kWh) of direct current electricity per day under ideal conditions.</p>

        <h3>2. Regional Irradiance Breakdown across Nigeria</h3>
        <ul>
          <li><strong>Coastal South-West & Niger Delta (Lagos, Port Harcourt, Calabar):</strong> 3.8 to 4.5 PSH. Higher atmospheric humidity and dense wet-season rain cloud cover require PV arrays to be oversized by 20% to guarantee full battery charging during July–September.</li>
          <li><strong>Middle Belt (Abuja, Jos, Ilorin, Makurdi):</strong> 4.8 to 5.4 PSH. Excellent solar insolation with moderate cloud cover.</li>
          <li><strong>Northern Savanna & Sahel (Kano, Sokoto, Maiduguri):</strong> 5.8 to 6.5 PSH. World-class solar resource. However, high ambient temperatures reduce panel operating voltage, making N-Type TOPCon panels with low temperature coefficients (-0.30%/°C) mandatory.</li>
        </ul>

        <h3>3. Tilt Angle & Seasonal Harmattan Dust Mitigation</h3>
        <p>Because Nigeria lies close to the equator (between latitudes 4°N and 14°N), panels mounted flat (0°) catch sunlight well, but accumulate heavy dust, bird droppings, and rainwater pooling.</p>
        <p>DEVICE PRO mandates an installation tilt angle of <strong>10° to 15° facing true South</strong>. This ensures maximum solar capture while enabling natural self-cleaning during rainfall and preventing harmattan dust sedimentation from causing hotspot microcracks.</p>
      `
    }
  ];

  // DOM Elements
  const container = document.getElementById('guides-container');
  const filterPills = document.querySelectorAll('.filter-pill');
  const modal = document.getElementById('guide-reader-modal');
  const modalCategory = document.getElementById('guide-modal-category');
  const modalTitle = document.getElementById('guide-modal-title');
  const modalAuthor = document.getElementById('guide-modal-author');
  const modalTime = document.getElementById('guide-modal-time');
  const modalDate = document.getElementById('guide-modal-date');
  const modalText = document.getElementById('guide-modal-text');
  const closeBtns = document.querySelectorAll('[data-close-guide]');

  // Render Guides
  function renderGuides(category = 'all') {
    if (!container) return;

    const filtered = category === 'all' 
      ? GUIDES_DATA 
      : GUIDES_DATA.filter(g => g.category === category);

    container.innerHTML = filtered.map(guide => `
      <article class="guide-card" data-guide-id="${guide.id}">
        <div class="guide-card-header">
          <span class="guide-category-tag">${guide.categoryName}</span>
          <span class="guide-read-time">${guide.readTime}</span>
        </div>
        <h2 class="guide-card-title">${guide.title}</h2>
        <p class="guide-card-excerpt">${guide.excerpt}</p>

        <div class="guide-takeaways-box">
          <div class="guide-takeaways-title">Key Engineering Takeaways</div>
          <ul class="guide-takeaways-list">
            ${guide.takeaways.map(t => `<li>${t}</li>`).join('')}
          </ul>
        </div>

        <div class="guide-card-footer">
          <span class="guide-author">${guide.author}</span>
          <button type="button" class="btn-read-guide" data-open-guide="${guide.id}">
            Read Complete Guide <span>→</span>
          </button>
        </div>
      </article>
    `).join('');

    // Attach click listeners to "Read Complete Guide"
    document.querySelectorAll('[data-open-guide]').forEach(btn => {
      btn.addEventListener('click', () => {
        const guideId = btn.getAttribute('data-open-guide');
        openGuideModal(guideId);
      });
    });
  }

  // Open Guide Modal Dialog
  function openGuideModal(guideId) {
    const guide = GUIDES_DATA.find(g => g.id === guideId);
    if (!guide || !modal) return;

    modalCategory.textContent = guide.categoryName;
    modalTitle.textContent = guide.title;
    modalAuthor.textContent = guide.author;
    modalTime.textContent = guide.readTime;
    modalDate.textContent = guide.date;
    modalText.innerHTML = guide.content;

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', 'true');
    }
  }

  // Close Guide Modal Dialog
  function closeGuideModal() {
    if (!modal) return;
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
  }

  closeBtns.forEach(btn => {
    btn.addEventListener('click', closeGuideModal);
  });

  if (modal) {
    modal.addEventListener('click', (e) => {
      const rect = modal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        closeGuideModal();
      }
    });
  }

  // Category Filter Pills
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');

      const cat = pill.getAttribute('data-category');
      renderGuides(cat);
    });
  });

  // Sync cart badge
  try {
    const cart = JSON.parse(localStorage.getItem('devicepro_cart') || '[]');
    const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    document.querySelectorAll('.cart-badge').forEach(badge => {
      badge.textContent = count;
      badge.setAttribute('aria-label', `${count} items in cart`);
    });
  } catch (e) {
    console.warn('[RESOURCES CART SYNC]:', e);
  }

  // Initial render
  renderGuides('all');
});
