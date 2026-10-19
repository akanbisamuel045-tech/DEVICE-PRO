/**
 * DEVICE PRO — Projects Portfolio & Case Studies Controller
 */

(function () {
  'use strict';

  const STORAGE_CART_KEY = 'devicepro_cart';

  const PROJECTS_DATA = [
    {
      id: 1,
      slug: 'apex-medical-centre-ikeja',
      title: '15kVA Solar Hybrid Microgrid at Apex Specialist Medical Centre',
      sector: 'commercial',
      sector_label: 'Commercial / Healthcare',
      location: 'Ikeja GRA, Lagos State',
      image: 'images/solution-commercial.jpg',
      challenge: 'Apex Medical Centre experienced frequent local grid fluctuations that threatened surgical theater lighting and sensitive vaccine cold-chain refrigeration units, accumulating over ₦1,200,000 monthly diesel costs.',
      solution: 'Engineered a 15kW three-phase hybrid inverter with 30kWh server-rack LiFePO4 battery storage, 24× 550W Tier-1 bifacial panels, and an automatic transfer switch (ATS) synchronizing with their backup Perkins generator.',
      hardware: [
        '15kW 3-Phase Smart Hybrid Inverter with Quad MPPT',
        '30.72kWh (6× 5.12kWh) Server-Rack LiFePO4 Battery System',
        '24× 550W Tier-1 Monocrystalline Bifacial PV Modules (13.2kWp)',
        'Pre-wired IP65 DC Combiner with Type-II Surge Arresters',
        'Dual ATS dry-contact generator auto-start integration'
      ],
      outcome: '78% reduction in monthly diesel expenditure with 24/7 uncompromised surgical power and zero vaccine spoilage.',
      stats: {
        power: '15.0 kW',
        battery: '30.7 kWh',
        solar: '13.2 kWp',
        diesel_cut: '78% Savings'
      }
    },
    {
      id: 2,
      slug: 'lekki-phase1-luxury-villa',
      title: '10kVA Executive Solar Villa System',
      sector: 'residential',
      sector_label: 'Residential Luxury Villa',
      location: 'Lekki Phase 1, Lagos State',
      image: 'images/sunfold-hero-house.jpg',
      challenge: 'A 5-bedroom private residence suffered from 8 to 14 hours of daily blackout periods, forcing the homeowner to run a noisy 25kVA diesel generator continuously throughout the night.',
      solution: 'Installed a 10kW single-phase smart hybrid system with 20.48kWh high-cycle LiFePO4 storage and 16× 550W rooftop panels, delivering silent 24/7 electricity capable of running 3 inverter ACs and a borehole pump simultaneously.',
      hardware: [
        '10kW Smart Hybrid Inverter with Dual MPPT & Smart Cloud Telemetry',
        '20.48kWh (4× 5.12kWh) Wall-Mount LiFePO4 Battery Bank',
        '16× 550W Monocrystalline Half-Cell Bifacial Modules (8.8kWp)',
        'Anodized aluminium roof mounting railing with 45m/s wind certification',
        'Class-I/II Lightning Surge Suppression & Earthing (<3.8 Ohms)'
      ],
      outcome: '100% silent power through the night, running three 1.5HP inverter air conditioners with over ₦420,000 monthly fuel savings.',
      stats: {
        power: '10.0 kW',
        battery: '20.5 kWh',
        solar: '8.8 kWp',
        diesel_cut: '₦420k / mo'
      }
    },
    {
      id: 3,
      slug: 'vgc-duplex-5kva-hybrid',
      title: '5kVA Premium Duplex Solar Package',
      sector: 'residential',
      sector_label: 'Residential Duplex',
      location: 'Victoria Garden City (VGC), Lekki, Lagos',
      image: 'images/lifestyle-home.jpg',
      challenge: 'A young family required reliable power to run home office workstations, lighting, deep freezer, and two 1.5HP inverter air conditioners without experiencing brownout dips.',
      solution: 'Configured our 5kVA Premium package with 10.24kWh modular LiFePO4 storage and 8× 550W monocrystalline panels with full phase separation at the distribution board.',
      hardware: [
        '5kW 48V Pure Sine Wave Smart Hybrid Inverter',
        '10.24kWh (2× 5.12kWh) LiFePO4 Lithium Battery Array',
        '8× 550W Tier-1 Monocrystalline Bifacial PV Panels (4.4kWp)',
        'Heavy-duty AC consumer unit changeover switch & DC breaker box'
      ],
      outcome: 'Zero flicker power transition during grid collapses, running double-door refrigerator, TV, lighting, and night AC.',
      stats: {
        power: '5.0 kW',
        battery: '10.2 kWh',
        solar: '4.4 kWp',
        diesel_cut: '85% Savings'
      }
    },
    {
      id: 4,
      slug: 'sagamu-agrisolar-irrigation',
      title: '30kW AgriSolar Irrigation & Cold Storage Hub',
      sector: 'agrisolar',
      sector_label: 'AgriSolar & Pumping',
      location: 'Sagamu Farm Cluster, Ogun State',
      image: 'images/bento-solar-carport-realistic.jpg',
      challenge: 'A 25-hectare commercial greenhouse farm spent over ₦850,000 monthly powering petrol-driven water pumps and post-harvest cooling facilities across an un-electrified rural corridor.',
      solution: 'Designed a ground-mounted 30kW solar PV array directly coupled to dual 7.5HP solar VFD water pumps and a 20kWh cold room storage battery system.',
      hardware: [
        '30kW High-Efficiency Ground-Mount PV Array (54× 550W Panels)',
        '2× 7.5HP Variable Frequency Drive (VFD) Solar Borehole Pumps',
        '20.48kWh Industrial LiFePO4 Battery for Cold Room Chilling',
        'Galvanized steel ground-mount substructure with tilt angle optimization'
      ],
      outcome: 'Completely eliminated petrol pumping expenses, delivering 40,000 liters of automated irrigation water daily.',
      stats: {
        power: '30.0 kW',
        battery: '20.5 kWh',
        solar: '30.0 kWp',
        diesel_cut: 'Zero Fuel'
      }
    },
    {
      id: 5,
      slug: 'vi-financial-district-commercial',
      title: '25kVA Commercial Rooftop Solar Installation',
      sector: 'commercial',
      sector_label: 'Commercial Office Plaza',
      location: 'Victoria Island Financial District, Lagos',
      image: 'images/installation-rooftop.jpg',
      challenge: 'A financial consultancy firm faced exorbitant Band-A grid tariffs combined with diesel generator runtimes during business hours for 35 desktop computers and central AC.',
      solution: 'Installed a 25kW three-phase rooftop solar array with 45kWh LiFePO4 energy storage designed for daytime peak shaving and automatic grid synchronization.',
      hardware: [
        '25kW 3-Phase Smart Hybrid Commercial Inverter',
        '46.08kWh High-Voltage LiFePO4 Industrial Battery Bank',
        '44× 550W Tier-1 Bifacial Solar Panels (24.2kWp array)',
        'Cloud telemetry portal with real-time per-circuit power monitoring'
      ],
      outcome: 'Reduced grid and diesel daytime energy costs by 72%, with full operational resilience from 8:00 AM to 6:00 PM.',
      stats: {
        power: '25.0 kW',
        battery: '46.1 kWh',
        solar: '24.2 kWp',
        diesel_cut: '72% Savings'
      }
    },
    {
      id: 6,
      slug: 'ikeja-industrial-packaging-bess',
      title: '50kVA Factory Microgrid & Peak Shaving BESS',
      sector: 'industrial',
      sector_label: 'Industrial & Microgrids',
      location: 'Ikeja Industrial Estate, Lagos State',
      image: 'images/industrial-power-storage-schematic.jpg',
      challenge: 'A food packaging factory suffered micro-outages lasting 10–30 seconds that tripped high-speed automated packaging machinery, causing costly raw material waste.',
      solution: 'Engineered a 50kVA zero-transfer-time microgrid system with 60kWh containerized BESS and intelligent generator sync to eliminate voltage dips.',
      hardware: [
        '50kW Heavy Industrial Inverter System with Static Transfer Switch',
        '61.44kWh Containerized LiFePO4 BESS with Integrated Aerosol Fire Suppression',
        '60× 550W High-Efficiency Monocrystalline Modules (33kWp)',
        'Smart SCADA monitoring and generator automatic load controller'
      ],
      outcome: 'Eliminated packaging line trip incidents with 1,200 liters of weekly diesel savings during factory shifts.',
      stats: {
        power: '50.0 kW',
        battery: '61.4 kWh',
        solar: '33.0 kWp',
        diesel_cut: '1,200L / wk'
      }
    }
  ];

  let currentFilter = 'all';

  function renderProjects() {
    const container = document.getElementById('projects-container');
    if (!container) return;

    let filtered = PROJECTS_DATA;
    if (currentFilter !== 'all') {
      filtered = PROJECTS_DATA.filter(p => p.sector === currentFilter);
    }

    container.innerHTML = filtered.map(p => `
      <article class="project-card" data-project-id="${p.id}">
        <div class="project-thumb-wrap">
          <img src="/${p.image}" alt="${p.title}" class="project-thumb-img" loading="lazy">
          <span class="project-sector-tag">${p.sector_label}</span>
          <div class="project-location-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>${p.location}</span>
          </div>
        </div>

        <div class="project-card-body">
          <h3 class="project-title">${p.title}</h3>
          <p class="project-challenge-snippet">${p.challenge}</p>

          <div class="project-specs-grid">
            <div class="p-spec-chip">
              <span class="p-chip-lbl">Inverter Power</span>
              <span class="p-chip-val">${p.stats.power}</span>
            </div>
            <div class="p-spec-chip">
              <span class="p-chip-lbl">Battery Storage</span>
              <span class="p-chip-val">${p.stats.battery}</span>
            </div>
            <div class="p-spec-chip">
              <span class="p-chip-lbl">Solar PV Array</span>
              <span class="p-chip-val">${p.stats.solar}</span>
            </div>
            <div class="p-spec-chip">
              <span class="p-chip-lbl">Verified Impact</span>
              <span class="p-chip-val" style="color:#16A34A;">${p.stats.diesel_cut}</span>
            </div>
          </div>

          <div class="project-outcome-box">
            <span class="outcome-icon">📈</span>
            <span class="outcome-text">${p.outcome}</span>
          </div>

          <div class="project-card-actions">
            <button type="button" class="btn-view-case-study" data-open-project="${p.id}">
              Read Full Engineering Case Study →
            </button>
          </div>
        </div>
      </article>
    `).join('');

    container.querySelectorAll('[data-open-project]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-open-project'), 10);
        openProjectModal(id);
      });
    });
  }

  function openProjectModal(id) {
    const project = PROJECTS_DATA.find(p => p.id === id);
    if (!project) return;

    const modal = document.getElementById('project-modal');
    const content = document.getElementById('modal-project-content');
    if (!modal || !content) return;

    const waText = encodeURIComponent(`Hello DEVICE PRO, I would like to consult an engineer about a project similar to "${project.title}".`);

    const hardwareList = project.hardware.map(item => `
      <li>
        <span style="color:#16A34A; font-weight:bold;">✓</span>
        <span>${item}</span>
      </li>
    `).join('');

    content.innerHTML = `
      <div class="modal-header-section">
        <span class="modal-proj-tag">${project.sector_label}</span>
        <h2 id="modal-project-title" class="modal-proj-title">${project.title}</h2>
        <div class="modal-proj-loc">📍 Location: ${project.location}</div>
      </div>

      <img src="/${project.image}" alt="${project.title}" style="width:100%; height:280px; object-fit:cover; border-radius:10px; margin-bottom:1.5rem;">

      <h4 class="modal-section-title">The Operational Challenge</h4>
      <p class="modal-text">${project.challenge}</p>

      <h4 class="modal-section-title">Our Technical Engineering Solution</h4>
      <p class="modal-text">${project.solution}</p>

      <h4 class="modal-section-title">Commissioned Equipment &amp; Balance of System</h4>
      <ul class="modal-hardware-list">
        ${hardwareList}
      </ul>

      <h4 class="modal-section-title">Measured Outcomes &amp; ROI</h4>
      <div class="project-outcome-box" style="margin-bottom:1.5rem;">
        <span class="outcome-icon">📈</span>
        <span class="outcome-text" style="font-size:0.9rem;">${project.outcome}</span>
      </div>

      <div class="modal-actions-row">
        <a href="/contact" class="btn-get-quote-yellow" style="flex-grow:1; text-align:center;">
          Request Site Survey for Your Building →
        </a>
        <a href="https://wa.me/2348031234567?text=${waText}" target="_blank" rel="noopener" class="wa-direct-btn" style="flex-shrink:0;">
          <span>💬 WhatsApp Engineer</span>
        </a>
      </div>
    `;

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    }
  }

  // Filter Pills
  document.querySelectorAll('.proj-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.proj-filter-pill').forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');
      currentFilter = pill.getAttribute('data-filter') || 'all';
      renderProjects();
    });
  });

  // Dialog Close
  document.querySelectorAll('[data-close-dialog]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dialog = btn.closest('dialog');
      if (dialog) dialog.close();
    });
  });

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      const drawer = document.getElementById('mobile-nav-drawer');
      if (drawer) drawer.classList.add('open');
    });
  }

  document.querySelectorAll('[data-close-drawer]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));
    });
  });

  // Cart Badge Sync
  try {
    localStorage.removeItem('devicepro_cart');
    if (window.DeviceProCart) {
      window.DeviceProCart.updateBadge();
    } else {
      const cart = JSON.parse(localStorage.getItem('dp_equipment_cart_v1')) || [];
      const totalItems = cart.reduce((sum, item) => sum + (item.quantity || item.qty || 1), 0);
      document.querySelectorAll('.cart-badge').forEach(badge => {
        badge.textContent = totalItems;
        badge.setAttribute('aria-label', `${totalItems} items in cart`);
      });
    }
  } catch {}

  renderProjects();

})();
