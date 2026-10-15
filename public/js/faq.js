/**
 * DEVICE PRO — TECHNICAL FAQS CONTROLLER (faq.js)
 * Manages 15 engineer-verified Nigerian solar questions, live search, and accordion interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
  const FAQ_DATA = [
    // SIZING & AC LOADS
    {
      id: 'faq-1',
      category: 'sizing',
      categoryName: 'Sizing & AC Loads',
      question: 'Can solar power run my 1.5HP or 2HP air conditioners and for how long?',
      answer: `
        <p><strong>Yes, absolutely.</strong> However, the runtime depends on inverter wattage, battery capacity, and AC technology.</p>
        <p>A modern 1.5HP Inverter AC consumes approximately 800W to 1,000W once the room cools down. On our <strong>5kVA package with a 10.24kWh LiFePO4 battery</strong>, you can comfortably run one 1.5HP Inverter AC continuously overnight for 8 to 10 hours alongside your refrigerators, lighting, TVs, and fans.</p>
        <p>During peak sunshine hours (10:00 AM to 4:00 PM), the rooftop solar array powers multiple ACs directly from sunlight without draining the battery.</p>
      `
    },
    {
      id: 'faq-2',
      category: 'sizing',
      categoryName: 'Sizing & AC Loads',
      question: 'Can I run my deep freezer and borehole submersible water pump simultaneously?',
      answer: `
        <p>Yes, provided the inverter has sufficient inductive surge overhead. A 1HP to 1.5HP submersible borehole pump draws ~1,100W running, but requires up to 3,500W for a fraction of a second at startup to overcome head water pressure.</p>
        <p>On systems rated <strong>5kVA and above</strong>, DEVICE PRO configures dedicated motor surge allowances. For extra safety, our engineers can install an inline Electronic Soft Starter on your pump to completely eliminate inrush shock to the inverter.</p>
      `
    },
    {
      id: 'faq-3',
      category: 'sizing',
      categoryName: 'Sizing & AC Loads',
      question: 'What happens during prolonged rainy weeks or heavy harmattan haze in Nigeria?',
      answer: `
        <p>Solar panels continue generating power during overcast, cloudy, or rainy weather through diffused ambient daylight, producing between <strong>25% and 40%</strong> of their maximum rated capacity.</p>
        <p>DEVICE PRO accounts for this by oversizing the PV array (typically 1.3x DC-to-AC ratio) and configuring our smart hybrid inverters to automatically synchronize with grid power when available or trigger your backup generator for a quick 2-hour bulk charge only when battery storage drops below 20%.</p>
      `
    },

    // BATTERIES & ENERGY STORAGE
    {
      id: 'faq-4',
      category: 'batteries',
      categoryName: 'LiFePO4 Batteries',
      question: 'Why does DEVICE PRO exclusively deploy LiFePO4 instead of tubular gel batteries?',
      answer: `
        <p>Tubular and Gel lead-acid batteries are fundamentally ill-suited for the Nigerian climate. When room temperatures exceed 30°C, lead-acid internal plate corrosion doubles, causing capacity collapse within 14 to 18 months. Furthermore, they can only be discharged to 50% Depth of Discharge.</p>
        <p><strong>Lithium Iron Phosphate (LiFePO4)</strong> delivers 6,000+ deep cycles (10 to 15+ years of continuous daily use), operates safely at up to 45°C without thermal degradation, allows 90%–95% usable capacity extraction, and features an integrated microprocessor BMS that communicates directly with the inverter.</p>
      `
    },
    {
      id: 'faq-5',
      category: 'batteries',
      categoryName: 'LiFePO4 Batteries',
      question: 'What is the expected lifespan of a LiFePO4 battery under Nigerian room temperatures?',
      answer: `
        <p>Our Tier-1 LiFePO4 cells (manufactured by Hithium and Felicitysolar) are rated for <strong>6,000 complete cycles at 80% DoD</strong>.</p>
        <p>With one full discharge and charge cycle per day, 6,000 cycles equals more than <strong>16 years of continuous service</strong>. Even after 6,000 cycles, the battery does not die; it simply retains approximately 80% of its original nameplate capacity.</p>
      `
    },
    {
      id: 'faq-6',
      category: 'batteries',
      categoryName: 'LiFePO4 Batteries',
      question: 'Can I start with a 5.12kWh battery and add another 5.12kWh module two years later?',
      answer: `
        <p><strong>Yes.</strong> Unlike lead-acid batteries (where mixing new and old batteries destroys the new bank), our 48V LiFePO4 rack and wall-mount batteries feature smart internal BMS microprocessors that automatically balance parallel modules.</p>
        <p>You can start with one 5.12kWh unit today and parallel up to 15 additional units (reaching over 75kWh of storage) as your family or business energy demand grows.</p>
      `
    },

    // GENERATORS & GRID
    {
      id: 'faq-7',
      category: 'generators',
      categoryName: 'Generators & Grid',
      question: 'Can my hybrid inverter integrate with my existing diesel/petrol generator and ATS?',
      answer: `
        <p>Yes. Our Deye and Growatt hybrid inverters feature auxiliary dry contact signal relays and dedicated generator input terminals.</p>
        <p>When wired to an Automatic Transfer Switch (ATS) with two-wire auto-start, the inverter can start the generator automatically only when the battery drops below your chosen safety threshold (e.g. 20%), charge the battery at the generator's highest fuel efficiency curve (80% load), and shut off the generator after 2 hours. This eliminates 70% to 85% of generator run hours and fuel theft.</p>
      `
    },
    {
      id: 'faq-8',
      category: 'generators',
      categoryName: 'Generators & Grid',
      question: 'How does the system protect against Nigerian grid brownouts (140V) and dangerous surges (280V)?',
      answer: `
        <p>Every DEVICE PRO installation includes comprehensive industrial-grade AC/DC switchgear:</p>
        <ul>
          <li><strong>Programmable Voltage Regulators (AVR window):</strong> The inverter disconnects incoming grid power if voltage falls below 170V or exceeds 265V, instantly switching to clean solar/battery power.</li>
          <li><strong>Type-1 + Type-2 Surge Protection Devices (SPD):</strong> Suppresses transient lightning spikes and transformer surges before they touch equipment.</li>
          <li><strong>Double-Pole DC/AC Breakers:</strong> Full isolation on both positive and negative legs.</li>
        </ul>
      `
    },
    {
      id: 'faq-9',
      category: 'generators',
      categoryName: 'Generators & Grid',
      question: 'Does the switchover between solar, grid, and battery cause computer reboot or TV flicker?',
      answer: `
        <p><strong>Zero flicker.</strong> Our pure sine-wave hybrid inverters feature an ultra-fast transfer time of less than <strong>8 to 10 milliseconds (ms)</strong>.</p>
        <p>This is well within the hold-up capacitor time of desktop computers, gaming consoles, servers, surgical medical equipment, and modern smart TVs. You will not notice when NEPA/DisCo power drops.</p>
      `
    },

    // INSTALLATION & ROOFING
    {
      id: 'faq-10',
      category: 'installation',
      categoryName: 'Installation & Roofing',
      question: 'Can solar panels be installed on my roof type (corrugated aluminium, stone-coated Gerard, or concrete slab)?',
      answer: `
        <p>Yes. DEVICE PRO uses specialized, non-invasive mounting hardware engineered for every Nigerian roofing profile:</p>
        <ul>
          <li><strong>Stone-Coated Tiles (Gerard/Bond):</strong> Heavy-duty stainless steel tile brackets that anchor directly into rafters underneath without cracking stone granules.</li>
          <li><strong>Corrugated & Long-Span Aluminium:</strong> Anodized aluminium mini-rails with EPDM waterproof rubber gaskets and self-drilling bimetallic fasteners.</li>
          <li><strong>Concrete Parapet Flat Roofs:</strong> Ballasted aluminium A-frames tilted at 10°–12° South, or non-penetrating weighted concrete blocks to protect waterproofing membranes.</li>
        </ul>
      `
    },
    {
      id: 'faq-11',
      category: 'installation',
      categoryName: 'Installation & Roofing',
      question: 'Do solar panels cause roof leaks during torrential Nigerian rainy seasons?',
      answer: `
        <p><strong>Never when installed by DEVICE PRO.</strong> Our field technicians are certified under NEMSA installation guidelines.</p>
        <p>We use UV-stabilized industrial polyurethane marine sealant (Sikaflex) alongside high-compression EPDM rubber washers on every mounting bracket. Our roof-mounting procedure guarantees 100% watertight integrity against heavy coastal rains.</p>
      `
    },
    {
      id: 'faq-12',
      category: 'installation',
      categoryName: 'Installation & Roofing',
      question: 'How long does a residential or commercial turnkey installation take to complete?',
      answer: `
        <p>Following site audit approval and hardware dispatch:</p>
        <ul>
          <li><strong>Standard Residential Systems (2kVA to 7.5kVA):</strong> Typically completed within <strong>1 to 2 business days</strong>.</li>
          <li><strong>Executive & Commercial Systems (10kVA to 30kVA):</strong> Typically <strong>3 to 5 business days</strong>, including distribution board separation and ATS integration.</li>
          <li><strong>Industrial Microgrids (50kVA+):</strong> 1 to 2 weeks, coordinated around business operational hours to prevent downtime.</li>
        </ul>
      `
    },

    // PRICING & WARRANTIES
    {
      id: 'faq-13',
      category: 'pricing',
      categoryName: 'Pricing & Warranties',
      question: 'Are there any hidden costs not included in your published turnkey package prices?',
      answer: `
        <p><strong>No hidden surprises.</strong> Our published package prices include the entire Bill of Engineering Measurement and Materials (BEME):</p>
        <ul>
          <li>Tier-1 Solar PV modules, Hybrid Inverter, and LiFePO4 Battery bank</li>
          <li>Complete Balance of System (DC/AC breakers, surge arrestors, 6mm²–16mm² solar cables, trunking)</li>
          <li>Anodized aluminium rooftop mounting structure and grounding copper rods</li>
          <li>Turnkey delivery, mechanical installation, electrical testing, and commissioning</li>
        </ul>
        <p><em>Note:</em> The only exceptions are specialized civil masonry works (e.g. constructing elevated ground-mount steel carports) or severe internal house rewiring if your existing property lacks proper phase separation.</p>
      `
    },
    {
      id: 'faq-14',
      category: 'pricing',
      categoryName: 'Pricing & Warranties',
      question: 'What is the exact warranty coverage on solar panels, hybrid inverters, and lithium batteries?',
      answer: `
        <p>Every piece of hardware deployed by DEVICE PRO carries verifiable manufacturer warranties backed by our local service centers:</p>
        <ul>
          <li><strong>Solar PV Modules (Jinko / Canadian Solar):</strong> 12-Year Product Workmanship Warranty &amp; 25-Year Linear Power Output Warranty (guaranteeing >80% yield at Year 25).</li>
          <li><strong>LiFePO4 Batteries (Hithium / Felicitysolar):</strong> 5 to 10-Year Full Performance Warranty (minimum 6,000 cycles).</li>
          <li><strong>Smart Hybrid Inverters (Deye / Growatt / SRNE):</strong> 5-Year Standard Manufacturer Warranty.</li>
          <li><strong>Installation Workmanship:</strong> 1-Year Comprehensive On-Site Electrical Service SLA by DEVICE PRO.</li>
        </ul>
      `
    },
    {
      id: 'faq-15',
      category: 'pricing',
      categoryName: 'Pricing & Warranties',
      question: 'How does DEVICE PRO handle after-sales service and replacement parts in Lagos, Abuja, and Port Harcourt?',
      answer: `
        <p>Unlike market traders who must ship faulty units back overseas (taking 3 to 6 months), DEVICE PRO maintains dedicated regional technical depots in <strong>Lagos (Victoria Island), Abuja (CBD), and Port Harcourt (Trans-Amadi)</strong>.</p>
        <p>We stock genuine replacement motherboard modules, MPPT controllers, BMS boards, and contactors. If an inverter or battery develops an in-warranty fault, our field engineers provide rapid swap units within 24 to 48 hours to ensure zero prolonged blackout.</p>
      `
    }
  ];

  // DOM Elements
  const container = document.getElementById('faq-accordion-container');
  const tabs = document.querySelectorAll('.faq-tab');
  const searchInput = document.getElementById('faq-search-input');
  const clearBtn = document.getElementById('faq-search-clear');
  const emptyState = document.getElementById('faq-empty-state');
  const countAll = document.getElementById('count-all');

  if (countAll) {
    countAll.textContent = FAQ_DATA.length;
  }

  let activeCategory = 'all';
  let searchQuery = '';

  // Render Accordion
  function renderAccordion() {
    if (!container) return;

    let filtered = FAQ_DATA;

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(item => item.category === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = filtered.map((item, idx) => {
      // Highlight search term in question
      let displayQuestion = item.question;
      if (searchQuery.trim().length > 0) {
        const regex = new RegExp(`(${searchQuery.trim()})`, 'gi');
        displayQuestion = displayQuestion.replace(regex, '<span class="highlight-match">$1</span>');
      }

      return `
        <div class="faq-item" id="${item.id}">
          <button type="button" class="faq-question-btn" aria-expanded="false" aria-controls="answer-${item.id}">
            <div>
              <span class="faq-item-category">${item.categoryName}</span>
              <div class="faq-question-text">${displayQuestion}</div>
            </div>
            <div class="faq-chevron" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </button>
          <div class="faq-answer-panel" id="answer-${item.id}" role="region" aria-labelledby="${item.id}">
            ${item.answer}
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to accordion buttons
    const buttons = container.querySelectorAll('.faq-question-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const isActive = item.classList.contains('active');

        // Close other items
        container.querySelectorAll('.faq-item').forEach(it => {
          it.classList.remove('active');
          const b = it.querySelector('.faq-question-btn');
          if (b) b.setAttribute('aria-expanded', 'false');
        });

        // Toggle clicked item
        if (!isActive) {
          item.classList.add('active');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    // Auto-open first item if viewing category without search
    if (searchQuery.trim().length === 0 && filtered.length > 0) {
      const first = container.querySelector('.faq-item');
      if (first) {
        first.classList.add('active');
        const b = first.querySelector('.faq-question-btn');
        if (b) b.setAttribute('aria-expanded', 'true');
      }
    }
  }

  // Live Search listener
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearBtn) {
        clearBtn.style.display = searchQuery.length > 0 ? 'inline-flex' : 'none';
      }
      renderAccordion();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        clearBtn.style.display = 'none';
        searchInput.focus();
        renderAccordion();
      }
    });
  }

  // Category Tabs listener
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      activeCategory = tab.getAttribute('data-category');
      renderAccordion();
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
    console.warn('[FAQ CART SYNC]:', e);
  }

  // Initial render
  renderAccordion();
});
