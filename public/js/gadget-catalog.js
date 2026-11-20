/**
 * DEVICE PRO — Gadget & Tech Store Catalog Data Module
 * Single source of truth for /gadget storefront and /gadget/:slug product detail pages.
 * Shares universal cart & Paystack/Transfer checkout with DEVICE PRO (/checkout).
 */

(function (global) {
  'use strict';

  const CATEGORIES = [
    { id: 'all', label: 'All Gadgets', shortLabel: 'All', icon: 'layout-grid', desc: 'Complete tech lineup' },
    { id: 'smartphones', label: 'Smartphones', shortLabel: 'Phones', icon: 'smartphone', desc: '5G flagships & daily drivers' },
    { id: 'laptops', label: 'Laptops', shortLabel: 'Laptops', icon: 'laptop', desc: 'Ultrabooks & pro workstations' },
    { id: 'powerbanks', label: 'Powerbanks', shortLabel: 'Powerbanks', icon: 'battery-charging', desc: 'High-wattage PD fast charge' },
    { id: 'speakers', label: 'Bluetooth Speakers', shortLabel: 'Speakers', icon: 'speaker', desc: 'Waterproof & Hi-Fi portable audio' },
    { id: 'monitors', label: 'Monitors', shortLabel: 'Monitors', icon: 'monitor', desc: '4K USB-C & high-refresh displays' },
    { id: 'printers', label: 'Printers', shortLabel: 'Printers', icon: 'printer', desc: 'Wireless laser & EcoTank MFPs' },
    { id: 'logitech', label: 'Logitech Gear', shortLabel: 'Logitech', icon: 'keyboard', desc: 'MX mice, keyboards & combos' },
    { id: 'audio', label: 'Headphones & Audio', shortLabel: 'Audio', icon: 'headphones', desc: 'ANC headphones & earbuds' },
    { id: 'accessories', label: 'GaN Chargers & Hubs', shortLabel: 'Hubs & GaN', icon: 'usb', desc: 'USB-C docks & 100W chargers' }
  ];

  const GADGETS = [
    // =========================================================================
    // 1. LOGITECH KEYBOARDS & MICE
    // =========================================================================
    {
      id: 'dp-gad-logi-b100',
      slug: 'logitech-b100-optical-usb-mouse',
      name: 'Logitech B100 Optical USB Mouse',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'corded',
      partNumber: '910-003357',
      modelCode: 'B100',
      color: 'Black-Grey',
      connectivityType: 'USB-A Corded (1.8m)',
      price: 6480,
      originalPrice: 8500,
      rating: 4.8,
      reviewCount: 38,
      stockCount: 30,
      badge: '30 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: '800 DPI optical precision • Full-size ambidextrous shape • 1.8m USB cord',
      image: '/images/gadgets/logitech-b100-mouse.jpg',
      images: [
        '/images/gadgets/logitech-b100-mouse.jpg',
        '/images/gadgets/logitech-official-logo.jpg'
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Black-Grey (P/N 910-003357)', priceDelta: 0 }
      ],
      highlights: [
        'Precise 800 DPI optical tracking for smooth cursor control and accurate text selection',
        'Comfortable full-size ambidextrous design crafted for either left- or right-handed use',
        'Simple plug-and-play setup: just plug the USB-A cable into your PC or laptop with zero software needed',
        'Built to Logitech’s renowned quality standards with durable click switches and tactile scroll wheel',
        '30 units ready in Lagos warehouse for same-day dispatch'
      ],
      description: 'The Logitech B100 Optical USB Mouse delivers dependable everyday computing essentials. With an ambidextrous curved shape that keeps your hand comfortable all day long, high-precision 800 DPI optical tracking, and zero-setup USB connectivity, it is the trusted workhorse for corporate offices, call centers, and home desktops.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '910-003357' },
        { key: 'Warehouse Inventory', val: '30 Units Available (Lagos Stock)' },
        { key: 'Sensor Technology', val: 'Optical Tracking (800 DPI)' },
        { key: 'Number of Buttons', val: '3 (Left, Right, Middle Click with Scroll Wheel)' },
        { key: 'Connectivity', val: 'USB-A Corded Cable (1.8m / 5.9 ft)' },
        { key: 'Form Factor', val: 'Full-Size Ambidextrous (Left & Right Hand)' },
        { key: 'Official Model', val: 'Logitech B100 Optical Mouse EMEA28i-935' },
        { key: 'Compatibility', val: 'Windows 10/11, macOS, Linux, ChromeOS' }
      ],
      boxContents: [
        'Logitech B100 Optical USB Mouse (Black-Grey)',
        'Attached 1.8m USB-A Cable',
        'Official Documentation & Warranty Information'
      ]
    },
    {
      id: 'dp-gad-logi-m90',
      slug: 'logitech-m90-optical-usb-mouse',
      name: 'Logitech Mouse M90',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'corded',
      partNumber: '910-001793',
      modelCode: 'M90',
      color: 'Grey',
      connectivityType: 'USB-A Corded',
      price: 6560,
      originalPrice: 8900,
      rating: 4.7,
      reviewCount: 42,
      stockCount: 30,
      badge: '30 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: '1,000 DPI high-definition tracking • Symmetrical curved palm grip • USB plug-and-play',
      image: '/images/gadgets/logitech-m90-mouse.jpg',
      images: [
        '/images/gadgets/logitech-m90-mouse.jpg',
        '/images/gadgets/logitech-official-logo.jpg'
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Grey (P/N 910-001793)', priceDelta: 0 }
      ],
      highlights: [
        '1,000 DPI high-definition optical tracking for responsive and smooth cursor navigation',
        'Full-size ambidextrous comfort ensures natural palm resting during long work hours',
        'Direct plug-and-play USB connection with instant driver recognition across all operating systems',
        'Precision stepped optical scroll wheel for line-by-line document reading',
        '30 units ready in Lagos warehouse for immediate dispatch'
      ],
      description: 'Logitech M90 gives you just the basics for comfortable, reliable control of your computer. There is no software to install and because it is corded, you can just plug the cable into a USB port and use it right away. Full-size ambidextrous comfort means your hand rests naturally whether you are right- or left-handed.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '910-001793' },
        { key: 'Warehouse Inventory', val: '30 Units Available (Lagos Stock)' },
        { key: 'Sensor Resolution', val: '1,000 DPI High-Definition Optical' },
        { key: 'Buttons', val: '3 Buttons (Left/Right Click, Clickable Scroll Wheel)' },
        { key: 'Connection', val: 'USB-A Corded' },
        { key: 'Ergonomics', val: 'Symmetrical Ambidextrous' },
        { key: 'Regional Spec', val: 'EMEA28i-935 M90' },
        { key: 'OS Support', val: 'Windows 11/10/8/7, macOS, ChromeOS, Linux Kernel 2.6+' }
      ],
      boxContents: [
        'Logitech Mouse M90 (Grey)',
        'User Documentation',
        'DEVICE PRO Authenticity & Warranty Guarantee'
      ]
    },
    {
      id: 'dp-gad-logi-m100',
      slug: 'logitech-m100-optical-usb-mouse',
      name: 'Logitech Mouse M100',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'corded',
      partNumber: '910-006652',
      modelCode: 'M100',
      color: 'Black',
      connectivityType: 'USB-A Corded',
      price: 8620,
      originalPrice: 11500,
      rating: 4.8,
      reviewCount: 56,
      stockCount: 20,
      badge: '20 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: '1,000 DPI optical tracking • Full-size comfort • Akoya Hangtab Retail Box',
      image: '/images/gadgets/logitech-m100-mouse.jpg',
      images: [
        '/images/gadgets/logitech-m100-mouse.jpg',
        '/images/gadgets/logitech-m100-alt.jpg',
        '/images/gadgets/logitech-official-logo.jpg'
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Black (P/N 910-006652)', priceDelta: 0 }
      ],
      highlights: [
        'Accurate 1,000 DPI optical sensor ensures smooth tracking on desks and mousepads',
        'Full-size symmetrical body sculpted for fatigue-free extended office shifts',
        'Akoya Hangtab official retail packaging with authentic serial numbers',
        'Rigid, durable click switches rated for millions of cycles',
        '20 units available in Lagos warehouse for immediate order fulfillment'
      ],
      description: 'The Logitech M100 is the benchmark for durable everyday corded mice. Packaged in official factory-sealed Akoya Hangtab retail boxes, it features a responsive 1,000 DPI optical engine, ambidextrous contouring, and zero-latency USB connectivity for professional workstation environments.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '910-006652' },
        { key: 'Warehouse Inventory', val: '20 Units Available (Lagos Stock)' },
        { key: 'Packaging', val: 'Akoya Hangtab Box M100 EMEA28i-935' },
        { key: 'Sensor Resolution', val: '1,000 DPI' },
        { key: 'Interface', val: 'USB-A Corded' },
        { key: 'Buttons', val: '3 Buttons (Left, Right, Middle click scroll)' },
        { key: 'Cable Length', val: '1.8 m' },
        { key: 'Supported Systems', val: 'Windows, macOS, ChromeOS, Linux' }
      ],
      boxContents: [
        'Logitech Mouse M100 (Black)',
        'Akoya Hangtab Retail Packaging',
        'User Guide & Warranty Card'
      ]
    },
    {
      id: 'dp-gad-logi-m170',
      slug: 'logitech-m170-wireless-mouse',
      name: 'Logitech M170 Wireless Mouse',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'wireless',
      partNumber: '910-004642',
      modelCode: 'M170',
      color: 'Black / Grey',
      connectivityType: '2.4GHz Wireless (Nano Receiver)',
      price: 14700,
      originalPrice: 18500,
      rating: 4.8,
      reviewCount: 64,
      stockCount: 10,
      badge: '10 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: '2.4GHz Wireless (10m range) • 12-Month Battery • Tiny USB Nano Receiver',
      image: '/images/gadgets/logitech-m170-mouse.jpg',
      images: [
        '/images/gadgets/logitech-m170-mouse.jpg',
        '/images/gadgets/logitech-official-logo.jpg'
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Black/Grey (P/N 910-004642)', priceDelta: 0 }
      ],
      highlights: [
        'Rock-solid 2.4GHz wireless connection up to 10 meters (33 ft) with zero dropouts',
        '12-month battery life on a single AA battery with automatic sleep power saving',
        'Plug-and-play simplicity: plug the tiny nano receiver into your laptop and start clicking',
        'Compact and portable form factor fits easily into any laptop bag or backpack',
        '10 units in stock in Lagos for quick dispatch'
      ],
      description: 'Logitech M170 Wireless Mouse offers reliable wireless freedom at an affordable price. With a 10-meter operational radius, 12-month battery longevity, and an ambidextrous shape that can reassign left and right button functions via software, it is the ideal everyday travel companion for students and business pros.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '910-004642' },
        { key: 'Warehouse Inventory', val: '10 Units Available (Lagos Stock)' },
        { key: 'Wireless Technology', val: 'Advanced 2.4 GHz Wireless' },
        { key: 'Wireless Range', val: '10 meters (33 feet)' },
        { key: 'Sensor Resolution', val: '1,000 DPI Optical' },
        { key: 'Battery Details', val: '1 x AA (Included) — up to 12 months' },
        { key: 'Receiver Type', val: 'Logitech USB Nano Receiver' },
        { key: 'Weight', val: '70.5 g with battery' }
      ],
      boxContents: [
        'Logitech M170 Wireless Mouse',
        'USB Nano Receiver',
        '1 AA Battery (Pre-installed)',
        'User Documentation'
      ]
    },
    {
      id: 'dp-gad-logi-m171',
      slug: 'logitech-m171-wireless-mouse',
      name: 'Logitech M171 Wireless Mouse',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'wireless',
      partNumber: '910-004424 / 910-004640 / 910-006866 / 910-004641',
      modelCode: 'M171',
      color: 'Black, Blue, Blue-Grey, Red',
      connectivityType: '2.4GHz Wireless (Nano Receiver)',
      price: 15490,
      originalPrice: 19800,
      rating: 4.8,
      reviewCount: 92,
      stockCount: 60,
      badge: '60 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: '2.4GHz Wireless (10m) • 4 Vibrant Colors • 12-Month Battery • Nano Receiver',
      image: '/images/gadgets/logitech-m171-mouse.jpg',
      images: [
        '/images/gadgets/logitech-m171-mouse.jpg',
        '/images/gadgets/logitech-official-logo.jpg'
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Black-K (P/N 910-004424 - 20 in stock)', priceDelta: 0 },
        { label: 'Blue-K (P/N 910-004640 - 20 in stock)', priceDelta: 0 },
        { label: 'Blue-Grey (P/N 910-006866 - 10 in stock)', priceDelta: 0 },
        { label: 'Red-K (P/N 910-004641 - 10 in stock)', priceDelta: 0 }
      ],
      highlights: [
        '60 total units in stock across 4 vibrant color finishes (Black, Blue, Blue-Grey, Red)',
        'Reliable 2.4GHz wireless connection up to 10 meters with plug-and-play USB receiver',
        '12 months of worry-free use on a single pre-installed AA battery with on/off switch',
        'Ambidextrous shape with compact contouring fits naturally in small-to-medium hands',
        'Smooth optical tracking for precision navigation on virtually all flat surfaces'
      ],
      description: 'The Logitech M171 Wireless Mouse combines playful modern aesthetics with dependable Swiss engineering. Available in Black, Blue, Blue-Grey, and Red variants, this compact wireless mouse provides up to a year of battery life and a strong 10-meter wireless link through its ultra-compact USB receiver.',
      specs: [
        { key: 'Official Part Numbers (P/N)', val: '910-004424 (Black), 910-004640 (Blue), 910-006866 (Blue-Grey), 910-004641 (Red)' },
        { key: 'Warehouse Inventory', val: '60 Units Total (20 Black, 20 Blue, 10 Blue-Grey, 10 Red)' },
        { key: 'Wireless Standard', val: '2.4 GHz USB Nano Receiver' },
        { key: 'Operating Range', val: 'Up to 10 m (33 ft)' },
        { key: 'Sensor Resolution', val: '1,000 DPI Optical' },
        { key: 'Battery', val: '1x AA Battery (up to 12 months)' },
        { key: 'On/Off Switch', val: 'Yes, integrated power switch for battery saving' },
        { key: 'System Requirements', val: 'Windows 10/11, macOS 10.8+, ChromeOS, Linux' }
      ],
      boxContents: [
        'Logitech M171 Wireless Mouse in Chosen Color',
        'USB Nano Receiver',
        '1 AA Battery (Pre-installed)',
        'Quick Start Guide'
      ]
    },
    {
      id: 'dp-gad-logi-m185',
      slug: 'logitech-m185-wireless-mouse',
      name: 'Logitech Wireless Mouse M185',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'wireless',
      partNumber: '910-002235 / 910-002237',
      modelCode: 'M185 TERRA',
      color: 'Swift Grey, Red',
      connectivityType: '2.4GHz Wireless (Nano Receiver)',
      price: 14970,
      originalPrice: 19000,
      rating: 4.8,
      reviewCount: 88,
      stockCount: 40,
      badge: '40 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Contoured ergonomic shape • 1-Year Battery • Plug-and-forget nano receiver',
      image: '/images/gadgets/logitech-m185-mouse.jpg',
      images: [
        '/images/gadgets/logitech-m185-mouse.jpg',
        '/images/gadgets/logitech-official-logo.jpg'
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Swift Grey (P/N 910-002235 - 20 in stock)', priceDelta: 0 },
        { label: 'Red (P/N 910-002237 - 20 in stock)', priceDelta: 0 }
      ],
      highlights: [
        '40 units ready in Lagos warehouse (20 Swift Grey, 20 Red)',
        'Contoured ergonomic profile designed to keep hands comfortable through long working hours',
        'Plug-and-forget nano receiver stays in your USB port with virtually no lag or dropouts',
        '1-year battery life with smart sleep mode and physical power switch',
        'Smooth, responsive optical tracking cursor control'
      ],
      description: 'A simple, reliable wireless mouse with plug-and-play wireless. You get the reliability of a cord with wireless convenience and freedom—fast data transmission and virtually no delays or dropouts. The contoured shape follows the natural curve of your hand, so you can stay productive longer.',
      specs: [
        { key: 'Official Part Numbers (P/N)', val: '910-002235 (Swift Grey), 910-002237 (Red)' },
        { key: 'Warehouse Inventory', val: '40 Units Total (20 Swift Grey, 20 Red in Lagos)' },
        { key: 'Series / Spec', val: 'M185 TERRA EMEA28i-935' },
        { key: 'Sensor Resolution', val: '1,000 DPI Optical' },
        { key: 'Wireless Connection', val: '2.4GHz USB Nano Receiver' },
        { key: 'Battery Life', val: '12-Month Battery Life (1x AA)' },
        { key: 'Dimensions', val: '99 x 60 x 39 mm (75.2 g)' },
        { key: 'Compatibility', val: 'Windows, macOS, ChromeOS, Linux' }
      ],
      boxContents: [
        'Logitech Wireless Mouse M185 (Swift Grey or Red)',
        'USB Nano Receiver',
        '1 AA Battery (Pre-installed)',
        'User Documentation'
      ]
    },
    {
      id: 'dp-gad-logi-m196',
      slug: 'logitech-m196-bluetooth-mouse',
      name: 'Logitech M196 Bluetooth Mouse',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'bluetooth',
      partNumber: '910-007459 / 910-007460 / 910-007461',
      modelCode: 'M196',
      color: 'Graphite, Off-White, Rose',
      connectivityType: 'Bluetooth 5.0 Low Energy (No Dongle)',
      price: 15580,
      originalPrice: 20000,
      rating: 4.9,
      reviewCount: 45,
      stockCount: 60,
      badge: '60 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Instant Bluetooth pairing • No USB port needed • 12-Month Battery • Recycled Plastic',
      image: '/images/gadgets/logitech-m196-mouse.jpg',
      images: [
        '/images/gadgets/logitech-m196-mouse.jpg',
        '/images/gadgets/logitech-official-logo.jpg'
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Graphite (P/N 910-007459 - 20 in stock)', priceDelta: 0 },
        { label: 'Off-White (P/N 910-007460 - 20 in stock)', priceDelta: 0 },
        { label: 'Rose / Lilac (P/N 910-007461 - 20 in stock)', priceDelta: 0 }
      ],
      highlights: [
        '60 total units available in Lagos warehouse across Graphite, Off-White, and Rose',
        'Connects in seconds directly via Bluetooth Low Energy — no USB dongle required, freeing up laptop ports',
        'Smooth optical tracking and line-by-line scrolling for fluid document navigation',
        '12-month battery life on a single AA with auto-sleep power management',
        'Eco-conscious build: crafted with certified post-consumer recycled plastic'
      ],
      description: 'Meet Logitech M196, the reliable Bluetooth mouse that frees up your workspace. Connects in seconds with a fast, reliable Bluetooth connection—no dongle or USB port required. Designed with an ambidextrous shape, smooth optical tracking, and up to 12 months of battery life, it is the perfect pairing for modern ultra-thin laptops and tablets.',
      specs: [
        { key: 'Official Part Numbers (P/N)', val: '910-007459 (Graphite), 910-007460 (Off-White), 910-007461 (Rose)' },
        { key: 'Warehouse Inventory', val: '60 Units Total (20 Graphite, 20 Off-White, 20 Rose in Lagos)' },
        { key: 'Connectivity', val: 'Bluetooth 5.0 Low Energy (BLE)' },
        { key: 'Wireless Range', val: '10 m (33 ft)' },
        { key: 'Sensor Resolution', val: '1,000 DPI Optical' },
        { key: 'Battery', val: '1x AA Battery (12 months estimated life)' },
        { key: 'Sustainability', val: 'Up to 67% post-consumer recycled plastic' },
        { key: 'Compatibility', val: 'Windows 10/11, macOS 11+, iPadOS 14+, Android 12+, ChromeOS' }
      ],
      boxContents: [
        'Logitech M196 Bluetooth Mouse',
        '1 AA Battery (Pre-installed)',
        'User Documentation'
      ]
    },
    {
      id: 'dp-gad-logi-m220',
      slug: 'logitech-m220-silent-wireless-mouse',
      name: 'Logitech M220 Silent Wireless Mouse',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'silent',
      partNumber: '910-004878',
      modelCode: 'M220 SILENT TERRA',
      color: 'Charcoal',
      connectivityType: '2.4GHz Wireless (Nano Receiver)',
      price: 15080,
      originalPrice: 19500,
      rating: 4.9,
      reviewCount: 76,
      stockCount: 20,
      badge: '20 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'SilentTouch 90% Noise Reduction • 18-Month Battery • Quiet Mark Certified',
      image: '/images/gadgets/logitech-m220-mouse.jpg',
      images: [
        '/images/gadgets/logitech-m220-mouse.jpg',
        '/images/gadgets/logitech-official-logo.jpg'
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Charcoal (P/N 910-004878)', priceDelta: 0 }
      ],
      highlights: [
        'Over 90% click noise reduction with SilentTouch technology while keeping satisfying click feel',
        'Awarded Quiet Mark certification for ultra-quiet workspace environments',
        'Exceptional 18-month battery life with smart automatic sleep and hardware on/off switch',
        '2.4GHz USB nano receiver provides a reliable 10-meter wireless operating radius',
        '20 units available in Lagos warehouse for immediate dispatch'
      ],
      description: 'With the same click feel and over 90% noise reduction on the click sound, Logitech M220 Silent delivers a quiet experience for you and those around you. It features an 18-month battery life with auto-sleep, powerful 10-meter wireless range with 128-bit encryption between mouse and receiver, and smooth optical tracking.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '910-004878' },
        { key: 'Warehouse Inventory', val: '20 Units Available (Lagos Stock)' },
        { key: 'Silent Technology', val: 'SilentTouch (>90% Click Noise Reduction)' },
        { key: 'Certifications', val: 'Quiet Mark Certified' },
        { key: 'Wireless Connection', val: '2.4 GHz USB Nano Receiver' },
        { key: 'Sensor Resolution', val: '1,000 DPI Optical' },
        { key: 'Battery Longevity', val: 'Up to 18 Months (1x AA)' },
        { key: 'Operating Systems', val: 'Windows, macOS, ChromeOS, Linux' }
      ],
      boxContents: [
        'Logitech M220 Silent Wireless Mouse (Charcoal)',
        'USB Nano Receiver',
        '1 AA Battery (Pre-installed)',
        'User Documentation'
      ]
    },
    {
      id: 'dp-gad-logi-m240',
      slug: 'logitech-m240-silent-bluetooth-mouse',
      name: 'Logitech M240 Silent Bluetooth Mouse',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'silent',
      partNumber: '910-007119',
      modelCode: 'M240',
      color: 'Graphite',
      connectivityType: 'Fast Pair Bluetooth + Logi Bolt Compatible',
      price: 23820,
      originalPrice: 30000,
      rating: 4.9,
      reviewCount: 68,
      stockCount: 20,
      badge: '20 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Fast Pair Bluetooth • 90% SilentTouch Clicks • 18-Month Battery • Logi Bolt Ready',
      image: '/images/gadgets/logitech-m240-mouse.jpg',
      images: [
        '/images/gadgets/logitech-m240-mouse.jpg',
        '/images/gadgets/logitech-official-logo.jpg'
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Graphite (P/N 910-007119)', priceDelta: 0 }
      ],
      highlights: [
        'Instant Fast Pair Bluetooth Low Energy connection with zero dongle required',
        'SilentTouch technology removes 90% of clicking distractions for ultimate focus',
        '18-month battery endurance with auto-standby power conservation',
        'Compatible with Logi Bolt USB receivers for high-security enterprise setups',
        '20 units ready in Lagos warehouse for immediate dispatch'
      ],
      description: 'Meet the Logitech M240 Silent, the reliable Bluetooth mouse that clears your desk space. Pairs in seconds with a fast, easy Bluetooth connection—no dongle or port required. Ultra-quiet SilentTouch clicks deliver the same satisfying click feel with 90% less noise, supported by 18-month battery endurance.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '910-007119' },
        { key: 'Warehouse Inventory', val: '20 Units Available (Lagos Stock)' },
        { key: 'Connectivity', val: 'Bluetooth Low Energy (Fast Pair) & Logi Bolt Receiver Ready' },
        { key: 'Noise Reduction', val: 'SilentTouch 90% Quieter' },
        { key: 'Sensor Resolution', val: '400 – 4,000 DPI (Configurable via Logi Options+)' },
        { key: 'Battery', val: '1x AA Battery (18 months battery life)' },
        { key: 'Color', val: 'Graphite' },
        { key: 'OS Support', val: 'Windows, macOS, iPadOS, ChromeOS, Android, Linux' }
      ],
      boxContents: [
        'Logitech M240 Silent Bluetooth Mouse (Graphite)',
        '1 AA Battery (Pre-installed)',
        'User Documentation & Warranty Information'
      ]
    },
    {
      id: 'dp-gad-logi-m350s',
      slug: 'logitech-pebble-mouse-2-m350s-bluetooth',
      name: 'Logitech Pebble Mouse 2 M350s',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'bluetooth',
      partNumber: '910-007015',
      modelCode: 'M350s',
      color: 'Tonal Graphite',
      connectivityType: 'Bluetooth Low Energy Easy-Switch (3 Devices)',
      price: 35630,
      originalPrice: 45000,
      rating: 4.9,
      reviewCount: 54,
      stockCount: 10,
      badge: '10 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Ultra-slim pebble design • Easy-Switch 3 devices • Silent clicks • 24-Month Battery',
      image: '/images/gadgets/logitech-pebble-m350s-mouse.jpg',
      images: [
        '/images/gadgets/logitech-pebble-m350s-mouse.jpg',
        '/images/gadgets/logitech-official-logo.jpg'
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Tonal Graphite (P/N 910-007015)', priceDelta: 0 }
      ],
      highlights: [
        'Defy boring with an iconic, minimalist round pebble silhouette that slips into any pocket',
        'Easy-Switch Bluetooth button toggles instantly across 3 devices (e.g., MacBook, iPad, PC)',
        'SilentTouch clicks reduce noise by 90% for quiet cafés, libraries, and meetings',
        'Customizable middle button with Logi Options+ for one-click shortcuts (e.g. Spotify, emoji menu)',
        'Incredible 2-year (24-month) battery life on a single AA battery',
        '10 units available in Lagos warehouse for immediate dispatch'
      ],
      description: 'Defy boring with the Logitech Pebble Mouse 2 M350s. Its iconic slim, rounded pebble shape looks stunning on any desk and fits effortlessly into your pocket or bag. Hop across 3 computers, tablets, or phones with the press of an Easy-Switch button, while customizable app shortcuts and SilentTouch clicks keep you productive in quiet style.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '910-007015' },
        { key: 'Warehouse Inventory', val: '10 Units Available (Lagos Stock)' },
        { key: 'Form Factor', val: 'Ultra-Slim Minimalist Ambidextrous Pebble' },
        { key: 'Multi-Device', val: 'Easy-Switch across up to 3 Devices simultaneously' },
        { key: 'Connectivity', val: 'Bluetooth 5.1 Low Energy + Logi Bolt Compatible' },
        { key: 'Clicks', val: 'SilentTouch Technology (90% Quieter)' },
        { key: 'Customization', val: 'Logi Options+ Customizable Middle Button' },
        { key: 'Battery Endurance', val: '24 Months (1x AA included)' }
      ],
      boxContents: [
        'Logitech Pebble Mouse 2 M350s (Tonal Graphite)',
        '1 AA Alkaline Battery (Pre-installed)',
        'User Documentation & Authenticity Card'
      ]
    },
    {
      id: 'dp-gad-logi-m650l',
      slug: 'logitech-signature-m650-l-wireless-mouse',
      name: 'Logitech Signature M650 L Wireless Mouse',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'performance',
      partNumber: '910-006236 / 910-006239',
      modelCode: 'M650 L',
      color: 'Graphite (Right & Left Hand Options)',
      connectivityType: 'Bluetooth Low Energy + Logi Bolt USB Receiver',
      price: 44730,
      originalPrice: 56000,
      rating: 4.9,
      reviewCount: 78,
      stockCount: 20,
      badge: '20 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'SmartWheel precision scrolling • Right & Left Hand Large sizes • Logi Bolt + BT',
      image: '/images/gadgets/logitech-m650l-mouse.jpg',
      images: [
        '/images/gadgets/logitech-m650l-mouse.jpg',
        '/images/gadgets/logitech-official-logo.jpg'
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Graphite Large — Right Hand (P/N 910-006236 - 10 in stock)', priceDelta: 0 },
        { label: 'Graphite Large — Left Hand (P/N 910-006239 - 10 in stock)', priceDelta: 0 }
      ],
      highlights: [
        '20 units available in Lagos warehouse (10 Right-Hand Large, 10 Left-Hand Large)',
        'SmartWheel scrolling automatically shifts between line-by-line precision and super-fast free spin',
        'Tailored Large form factor with soft rubberized side thumb grips for medium-to-large hands',
        'SilentTouch clicks minimize 90% of noise while maintaining tactile confirmation',
        'Customizable side buttons via Logi Options+ (forward, back, copy, paste)',
        'Dual connectivity: Bluetooth Low Energy + Logi Bolt secure USB receiver with 24-month battery'
      ],
      description: 'Upgrade your desk setup for all-day comfort and productivity with the Logitech Signature M650 L. Featuring SmartWheel scrolling that delivers line-by-line precision when you need it and super-fast scrolling when you want to fly through long pages. Tailored specifically for large hands with both right- and left-handed dedicated models, SilentTouch clicks, and dual Logi Bolt + Bluetooth connectivity.',
      specs: [
        { key: 'Official Part Numbers (P/N)', val: '910-006236 (Right Hand Large), 910-006239 (Left Hand Large)' },
        { key: 'Warehouse Inventory', val: '20 Units Total (10 Right-Hand, 10 Left-Hand in Lagos)' },
        { key: 'Scroll Wheel', val: 'SmartWheel (Precision + Super-Fast Free Spin)' },
        { key: 'Sizing & Ergonomics', val: 'Large Size (Hand length > 19cm) with Contoured Thumb Rest' },
        { key: 'Hand Options', val: 'Right-Handed & Left-Handed Dedicated Ergonomics' },
        { key: 'Noise Reduction', val: 'SilentTouch 90% Less Noise' },
        { key: 'Connectivity', val: 'Logi Bolt USB Receiver + Bluetooth Low Energy' },
        { key: 'Battery Longevity', val: 'Up to 24 Months on 1x AA Battery' }
      ],
      boxContents: [
        'Logitech Signature M650 L Wireless Mouse',
        'Logi Bolt USB Receiver',
        '1 AA Battery',
        'User Documentation'
      ]
    },
    {
      id: 'dp-gad-logi-k250',
      slug: 'logitech-k250-wireless-keyboard',
      name: 'Logitech K250 Wireless Keyboard',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'keyboards',
      partNumber: '920-013451',
      modelCode: 'K250',
      color: 'Graphite',
      connectivityType: '2.4GHz Wireless + Bluetooth (US Int\'l)',
      price: 26610,
      originalPrice: 35000,
      rating: 4.8,
      reviewCount: 34,
      stockCount: 10,
      badge: '10 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Dual wireless (2.4GHz + Bluetooth) • Full-size US layout • Spill-resistant',
      image: '/images/gadgets/logitech-mx-keyboard.jpg',
      images: [
        '/images/gadgets/logitech-mx-keyboard.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Graphite (P/N 920-013451)', priceDelta: 0 },
      ],
      highlights: [
        'Seamless dual-mode wireless connectivity via 2.4GHz USB receiver or direct Bluetooth',
        'Full-size keyboard with integrated number pad and dedicated multimedia hotkeys',
        'Durable spill-resistant construction designed for high-intensity office workflows',
        'Long-lasting battery life with automatic sleep and physical power switch',
        '10 units available in Lagos warehouse for immediate dispatch',
      ],
      description: 'Logitech K250 Wireless Keyboard provides versatile desktop productivity. Featuring dual connectivity via Bluetooth and 2.4GHz wireless, a full-size US international layout with responsive low-profile scissor keys, and robust spill resistance.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '920-013451' },
        { key: 'Warehouse Inventory', val: '10 Units In Stock (Lagos Stock)' },
        { key: 'Keyboard Layout', val: 'US International (INTNL-973)' },
        { key: 'Connectivity', val: '2.4GHz USB Receiver + Bluetooth Dual Mode' },
        { key: 'Key Type', val: 'Deep-profile tactile quiet keys with number pad' },
        { key: 'Spill Resistance', val: 'Tested up to 60ml liquid drainage' },
        { key: 'Compatibility', val: 'Windows 10/11, macOS, ChromeOS, Linux' },
      ],
      boxContents: [
        'Logitech K250 Wireless Keyboard',
        'USB Wireless Receiver',
        '2 AAA Batteries',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-mk540',
      slug: 'logitech-mk540-advanced-wireless-combo',
      name: 'Logitech MK540 ADVANCED Wireless Combo',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'keyboards',
      partNumber: '920-008685',
      modelCode: 'MK540 ADVANCED',
      color: 'Black',
      connectivityType: '2.4GHz Logitech Unifying Wireless',
      price: 58150,
      originalPrice: 72000,
      rating: 4.9,
      reviewCount: 82,
      stockCount: 10,
      badge: '10 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Precision keyboard with palm rest • Contoured ambidextrous mouse • 36-mo battery',
      image: '/images/gadgets/logitech-mx-keys-s-combo.jpg',
      images: [
        '/images/gadgets/logitech-mx-keys-s-combo.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Standard Combo (P/N 920-008685)', priceDelta: 0 },
      ],
      highlights: [
        'Familiar instantly comfortable typing experience with integrated palm rest and adjustable tilt legs',
        'Whisper-quiet keys deliver tactile precision without office noise',
        'Contoured wireless mouse with soft rubber side grips and advanced optical tracking',
        'Massive battery longevity: up to 36 months for keyboard and 18 months for mouse',
        '10 units available in Lagos warehouse for immediate dispatch',
      ],
      description: 'Logitech MK540 Advanced is an instantly familiar wireless keyboard and mouse combo built for precision, comfort, and reliability. The full-size keyboard features familiar key shape, number pad, media keys, and an integrated textured palm rest.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '920-008685' },
        { key: 'Warehouse Inventory', val: '10 Units In Stock (Lagos Stock)' },
        { key: 'Layout', val: 'US International (INTNL-973)' },
        { key: 'Wireless Connection', val: 'Logitech Unifying USB Receiver (2.4GHz)' },
        { key: 'Keyboard Battery', val: '36 Months (2x AA)' },
        { key: 'Mouse Battery', val: '18 Months (1x AA)' },
        { key: 'Compatibility', val: 'Windows 10/11, ChromeOS' },
      ],
      boxContents: [
        'Logitech Wireless Keyboard K540',
        'Logitech Wireless Mouse M310',
        'Logitech Unifying Receiver',
        'Pre-installed AA Batteries',
        'User Guide',
      ],
    },
    {
      id: 'dp-gad-logi-mk330',
      slug: 'logitech-wireless-combo-mk330',
      name: 'Logitech Wireless Combo MK330',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'keyboards',
      partNumber: '920-003989',
      modelCode: 'MK330 CR',
      color: 'Black',
      connectivityType: '2.4GHz Wireless (Nano Receiver)',
      price: 44400,
      originalPrice: 56000,
      rating: 4.8,
      reviewCount: 46,
      stockCount: 20,
      badge: '20 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: '11 multimedia hotkeys • Low-profile quiet keys • 24-month battery life',
      image: '/images/gadgets/logitech-mx-keys-s-combo.jpg',
      images: [
        '/images/gadgets/logitech-mx-keys-s-combo.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Standard Combo (P/N 920-003989)', priceDelta: 0 },
      ],
      highlights: [
        '11 hotkeys and 4 programmable F-keys give instant control over music, video, internet and email',
        'Sleek low-profile whisper-quiet keys ensure fatigue-free typing throughout the workday',
        'Portable wireless mouse with plug-and-forget nano receiver',
        'Long-lasting battery life: 24 months keyboard, 12 months mouse',
        '20 units ready in Lagos warehouse',
      ],
      description: 'Logitech Wireless Combo MK330 puts entertainment and productivity at your fingertips. With 11 dedicated multimedia hotkeys, low-profile quiet keys, and a comfortable optical mouse, this combo makes computing effortless.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '920-003989' },
        { key: 'Warehouse Inventory', val: '20 Units In Stock (Lagos Stock)' },
        { key: 'Layout', val: 'US International (INTNL-973 CR)' },
        { key: 'Hotkeys', val: '11 Multimedia Hotkeys + 4 Programmable F-keys' },
        { key: 'Wireless Range', val: '10 meters (2.4 GHz)' },
        { key: 'Compatibility', val: 'Windows 11/10, ChromeOS' },
      ],
      boxContents: [
        'Wireless Keyboard MK330',
        'Wireless Mouse',
        'USB Nano Receiver',
        'Batteries Included',
        'User Guide',
      ],
    },
    {
      id: 'dp-gad-logi-mk295',
      slug: 'logitech-mk295-silent-wireless-combo',
      name: 'Logitech MK295 Silent Wireless Combo',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'keyboards',
      partNumber: '920-009800',
      modelCode: 'MK295 SILENT',
      color: 'Graphite',
      connectivityType: '2.4GHz Wireless with SilentTouch',
      price: 42360,
      originalPrice: 54000,
      rating: 4.9,
      reviewCount: 78,
      stockCount: 20,
      badge: '20 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'SilentTouch 90% Noise Reduction • Full-size keyboard & mouse • 36-mo battery',
      image: '/images/gadgets/logitech-mx-keys-s-combo.jpg',
      images: [
        '/images/gadgets/logitech-mx-keys-s-combo.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Graphite (P/N 920-009800)', priceDelta: 0 },
      ],
      highlights: [
        'Innovative SilentTouch technology removes over 90% of distracting click and typing sounds',
        'Full-size keyboard with 8 handy shortcuts and full numeric keypad',
        'Comfortable, contoured compact wireless mouse with precision optical tracking',
        'Strong, reliable 2.4GHz wireless connection with up to 10m range',
        '20 units available in Lagos warehouse for immediate dispatch',
      ],
      description: 'Stay focused and eliminate distractions with Logitech MK295 Silent Wireless Combo featuring SilentTouch—an exclusive Logitech technology that eliminates over 90% of keyboard and mouse noise without compromising tactile feel.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '920-009800' },
        { key: 'Warehouse Inventory', val: '20 Units In Stock (Lagos Stock)' },
        { key: 'Silent Technology', val: 'SilentTouch (>90% Click & Type Noise Reduction)' },
        { key: 'Layout', val: 'US International Full-Size with Numpad' },
        { key: 'Battery', val: '36-month keyboard / 18-month mouse' },
        { key: 'Compatibility', val: 'Windows 10/11, ChromeOS' },
      ],
      boxContents: [
        'Silent Keyboard with 2 AAA batteries',
        'Silent Mouse with 1 AA battery',
        'USB Receiver',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-mk120',
      slug: 'logitech-desktop-mk120-corded-combo',
      name: 'Logitech Desktop MK120',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'keyboards',
      partNumber: '920-002562',
      modelCode: 'MK120',
      color: 'Black',
      connectivityType: 'Dual USB-A Corded (Keyboard + Mouse)',
      price: 16870,
      originalPrice: 22000,
      rating: 4.8,
      reviewCount: 115,
      stockCount: 30,
      badge: '30 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Reliable USB wired keyboard & optical mouse • Spill-resistant • Durable keys',
      image: '/images/gadgets/logitech-mx-keys-s-combo.jpg',
      images: [
        '/images/gadgets/logitech-mx-keys-s-combo.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Black (P/N 920-002562)', priceDelta: 0 },
      ],
      highlights: [
        'Durable spill-resistant keyboard paired with smooth 1,000 DPI high-definition optical mouse',
        'Thin profile keyboard with sturdy adjustable tilt legs and keys rated for up to 10 million keystrokes',
        'Instant plug-and-play setup: plug both USB cables into your computer and start typing immediately',
        'Bold, bright white characters that are easy to read and won\'t wear off easily',
        '30 units in stock in Lagos warehouse',
      ],
      description: 'Logitech Desktop MK120 is the durable corporate standard. A comfortable, quiet keyboard and high-definition optical mouse combination that gives you long-lasting build quality and effortless USB plug-and-play simplicity.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '920-002562' },
        { key: 'Warehouse Inventory', val: '30 Units In Stock (Lagos Stock)' },
        { key: 'Interface', val: '2x USB-A Corded Cables' },
        { key: 'Mouse Sensor', val: '1,000 DPI Optical Tracking' },
        { key: 'Durability', val: 'Spill-resistant up to 60ml, 10M keystroke rating' },
        { key: 'Compatibility', val: 'Windows, macOS, Linux, ChromeOS' },
      ],
      boxContents: [
        'Logitech Keyboard K120',
        'Logitech Mouse M120',
        'Attached USB Cables',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-k120',
      slug: 'logitech-k120-corded-usb-keyboard',
      name: 'Logitech K120 Corded Keyboard',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'keyboards',
      partNumber: '920-002508',
      modelCode: 'K120',
      color: 'Black',
      connectivityType: 'USB-A Corded (1.5m)',
      price: 14310,
      originalPrice: 18500,
      rating: 4.8,
      reviewCount: 94,
      stockCount: 30,
      badge: '30 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Low-profile whisper-quiet keys • Spill-resistant • 10M keystrokes rated',
      image: '/images/gadgets/logitech-mx-keyboard.jpg',
      images: [
        '/images/gadgets/logitech-mx-keyboard.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Black (P/N 920-002508)', priceDelta: 0 },
      ],
      highlights: [
        'Low-profile whisper-quiet keys with standard full-size layout and full numeric keypad',
        'Spill-resistant liquid drainage channels protect your keyboard against accidental desk spills',
        'Sturdy tilt legs allow 8-degree angle adjustment for ergonomic typing comfort',
        'Curved space bar keeps hands in a more natural position',
        '30 units available in Lagos warehouse for immediate corporate order fulfillment',
      ],
      description: 'Logitech Keyboard K120 is built for business reliability. Featuring quiet keys that barely make a sound, standard layout with F-keys and number pad, thin sleek profile, and rugged spill-resistant design.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '920-002508' },
        { key: 'Warehouse Inventory', val: '30 Units In Stock (Lagos Stock)' },
        { key: 'Layout', val: 'US International (INTNL-973)' },
        { key: 'Connectivity', val: 'USB-A Wired Cable (1.5m)' },
        { key: 'Key Switch Rating', val: 'Up to 10 Million Keystrokes' },
        { key: 'Compatibility', val: 'Windows 11/10/8/7, Linux, ChromeOS' },
      ],
      boxContents: [
        'Logitech K120 Corded Keyboard',
        'Integrated USB Cable',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-mk235',
      slug: 'logitech-mk235-wireless-keyboard-mouse-combo',
      name: 'Logitech MK235 Wireless Keyboard & Mouse Combo',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'keyboards',
      partNumber: '920-007931',
      modelCode: 'MK235',
      color: 'Grey',
      connectivityType: '2.4GHz Wireless (Nano Receiver)',
      price: 25400,
      originalPrice: 32000,
      rating: 4.8,
      reviewCount: 65,
      stockCount: 15,
      badge: '15 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: '36-month keyboard battery • Spill-resistant • Simple durable wireless setup',
      image: '/images/gadgets/logitech-mx-keys-s-combo.jpg',
      images: [
        '/images/gadgets/logitech-mx-keys-s-combo.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Grey (P/N 920-007931)', priceDelta: 0 },
      ],
      highlights: [
        'Durable build with anti-fading treatment on each key so letters never wear away',
        'Extraordinary 36-month keyboard battery life and 12-month mouse battery life',
        'Advanced 2.4GHz wireless connection up to 10 meters with tiny plug-and-forget nano receiver',
        'Full-size keyboard with 15 shortcut keys accessible through the FN key',
        '15 units available in Lagos warehouse',
      ],
      description: 'Logitech MK235 Wireless Keyboard and Mouse Combo is simple, durable, and reliable. Built to withstand spills with treated keys that prevent fading, long-lasting battery life, and strong wireless connectivity.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '920-007931' },
        { key: 'Warehouse Inventory', val: '15 Units In Stock (Lagos Stock)' },
        { key: 'Layout', val: 'US International (INTNL-973 Grey Keys Grey Bottom)' },
        { key: 'Battery', val: '36 Months (2x AAA Keyboard), 12 Months (1x AA Mouse)' },
        { key: 'Wireless Range', val: '10 m (33 ft)' },
        { key: 'Compatibility', val: 'Windows 10/11, ChromeOS' },
      ],
      boxContents: [
        'Wireless Keyboard MK235',
        'Wireless Mouse',
        'USB Receiver',
        '2 AAA & 1 AA Batteries',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-mk270',
      slug: 'logitech-wireless-combo-mk270',
      name: 'Logitech Wireless Combo MK270',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'keyboards',
      partNumber: '920-004509',
      modelCode: 'MK270',
      color: 'Black',
      connectivityType: '2.4GHz Wireless (Logitech Nano Receiver)',
      price: 30360,
      originalPrice: 38000,
      rating: 4.9,
      reviewCount: 140,
      stockCount: 15,
      badge: '15 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'World\'s bestselling wireless combo • 8 shortcut keys • 36-mo keyboard battery',
      image: '/images/gadgets/logitech-mx-keys-s-combo.jpg',
      images: [
        '/images/gadgets/logitech-mx-keys-s-combo.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Standard Combo (P/N 920-004509)', priceDelta: 0 },
      ],
      highlights: [
        'The world’s best-selling wireless keyboard and mouse combo for dependable daily computing',
        '8 convenient multimedia and internet shortcut keys for one-touch volume, mute, and media controls',
        'Lag-free 2.4GHz wireless connection up to 10 meters with Logitech advanced nano receiver',
        'Extended battery life: 36 months keyboard, 12 months mouse with on/off switches',
        '15 units in stock in Lagos warehouse',
      ],
      description: 'Logitech Wireless Combo MK270 brings together the convenience of wireless connectivity with the reliability of a cord. Packed with 8 multimedia hotkeys and robust battery life, it delivers everyday computing convenience.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '920-004509' },
        { key: 'Warehouse Inventory', val: '15 Units In Stock (Lagos Stock)' },
        { key: 'Layout', val: 'US International (INTNL-973)' },
        { key: 'Shortcuts', val: '8 Dedicated Multimedia Hotkeys' },
        { key: 'Battery', val: '36-month keyboard / 12-month mouse' },
        { key: 'Compatibility', val: 'Windows 11/10/8/7, ChromeOS' },
      ],
      boxContents: [
        'Wireless Keyboard K270',
        'Wireless Mouse M185',
        'USB Nano Receiver',
        'Batteries Pre-installed',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-mk345',
      slug: 'logitech-wireless-combo-mk345',
      name: 'Logitech Wireless Combo MK345',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'keyboards',
      partNumber: '920-006489',
      modelCode: 'MK345 KALUGA',
      color: 'Black',
      connectivityType: '2.4GHz Wireless (Nano Receiver)',
      price: 40060,
      originalPrice: 50000,
      rating: 4.8,
      reviewCount: 58,
      stockCount: 10,
      badge: '10 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Generous palm rest • Contoured right-handed mouse • Spill-resistant design',
      image: '/images/gadgets/logitech-mx-keys-s-combo.jpg',
      images: [
        '/images/gadgets/logitech-mx-keys-s-combo.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Black (P/N 920-006489)', priceDelta: 0 },
      ],
      highlights: [
        'Generously sized palm rest and contoured right-handed mouse for optimal ergonomic support',
        '12 enhanced F-keys for instant media controls and app switching',
        'Exceptional battery efficiency: 3-year keyboard battery life, 18-month mouse battery life',
        'Spill-resistant textured surface with durable keys',
        '10 units available in Lagos warehouse',
      ],
      description: 'Boost your comfort and productivity with the Logitech MK345 Wireless Combo. Featuring a spacious palm rest, full-size keyboard layout, and a precision contoured right-handed mouse with wide scroll wheel.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '920-006489' },
        { key: 'Warehouse Inventory', val: '10 Units In Stock (Lagos Stock)' },
        { key: 'Layout', val: 'US International (INTNL-973 KALUGA AVALON CR)' },
        { key: 'Palm Rest', val: 'Integrated Textured Full-Width Palm Rest' },
        { key: 'Mouse Ergonomics', val: 'Contoured Right-Handed Shape' },
        { key: 'Compatibility', val: 'Windows, ChromeOS' },
      ],
      boxContents: [
        'Wireless Keyboard K345',
        'Wireless Mouse M275',
        'USB Nano Receiver',
        'Batteries Included',
        'User Guide',
      ],
    },
    {
      id: 'dp-gad-logi-mxkeys-combo',
      slug: 'logitech-mx-keys-s-combo',
      name: 'Logitech MX Keys S Combo',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'keyboards',
      partNumber: '920-011614',
      modelCode: 'MX Keys S Combo',
      color: 'Graphite',
      connectivityType: 'Bluetooth Low Energy + Logi Bolt USB Receiver',
      price: 269590,
      originalPrice: 320000,
      rating: 5.0,
      reviewCount: 98,
      stockCount: 10,
      badge: '10 In Stock',
      badgeTone: 'gold',
      featured: true,
      shortSpec: 'Smart backlit MX Keys S • MX Master 3S Mouse • Palm Rest • Logi Bolt',
      image: '/images/gadgets/logitech-mx-keys-s-combo.jpg',
      images: [
        '/images/gadgets/logitech-mx-keys-s-combo.jpg',
        '/images/gadgets/logitech-mx-keyboard.jpg',
        '/images/gadgets/logitech-mx-mouse.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Graphite Flagship Combo (P/N 920-011614)', priceDelta: 0 },
      ],
      highlights: [
        'The ultimate productivity suite: includes MX Keys S illuminated keyboard, MX Master 3S mouse, and premium palm rest',
        'Spherically-dished Perfect Stroke keys match the shape of your fingertips for fluid, accurate typing',
        'Smart ambient backlighting illuminates as your hands approach and adjusts to changing room lighting',
        'MagSpeed electromagnetic 8,000 DPI mouse with Quiet Clicks and multi-device Flow',
        '10 units in stock in Lagos warehouse for immediate delivery',
      ],
      description: 'Logitech MX Keys S Combo combines the precision of MX Keys S keyboard with the unmatched control of the MX Master 3S mouse and a cushioned palm rest. Built for creators and developers who demand peak workflow performance.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '920-011614' },
        { key: 'Warehouse Inventory', val: '10 Units In Stock (Lagos Stock)' },
        { key: 'Included Hardware', val: 'MX Keys S Keyboard + MX Master 3S Mouse + MX Palm Rest' },
        { key: 'Backlighting', val: 'Smart Proximity Sensor Backlight (Auto-adjusting)' },
        { key: 'Connectivity', val: 'Logi Bolt USB Receiver + Bluetooth Low Energy (Easy-Switch 3 devices)' },
        { key: 'Rechargeable', val: 'USB-C Fast Charging (Cable Included)' },
        { key: 'Compatibility', val: 'Windows, macOS, Linux, ChromeOS, iPadOS' },
      ],
      boxContents: [
        'MX Keys S Keyboard',
        'MX Master 3S Mouse',
        'MX Palm Rest',
        'Logi Bolt USB Receiver',
        'USB-C to USB-A Charging Cable',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-h390',
      slug: 'logitech-h390-wired-usb-headset',
      name: 'Logitech H390 Wired USB-A Headset',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'headsets',
      partNumber: '981-000406',
      modelCode: 'H390 COMFORT',
      color: 'Black',
      connectivityType: 'USB-A Wired with In-line Controls',
      price: 33730,
      originalPrice: 42000,
      rating: 4.8,
      reviewCount: 160,
      stockCount: 200,
      badge: '200 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Enhanced digital stereo audio • Noise-canceling mic • In-line volume/mute • USB-A',
      image: '/images/gadgets/logitech-h390-headset.jpg',
      images: [
        '/images/gadgets/logitech-h390-headset.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Black USB-A (P/N 981-000406)', priceDelta: 0 },
      ],
      highlights: [
        'Massive stock: 200 units available in Lagos warehouse for immediate corporate call center or remote work orders',
        'Laser-tuned drivers provide enhanced digital stereo audio for crystal-clear conference calls and music',
        'Rotating noise-canceling microphone minimizes unwanted background chatter for crisp voice pickup',
        'Convenient in-line audio controls on the 1.9m cable allow instant volume adjustment or mic mute',
        'Plush leatherette ear cushions and padded headband ensure supreme comfort through all-day use',
      ],
      description: 'Logitech H390 USB Headset is the trusted standard for enterprise call centers, customer support agents, and remote professionals. Featuring laser-tuned audio drivers, noise-canceling microphone, convenient in-line controls, and simple USB plug-and-play.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '981-000406' },
        { key: 'Warehouse Inventory', val: '200 Units In Stock (Lagos Stock)' },
        { key: 'Connection', val: 'USB-A (1.9m / 6.2 ft cable)' },
        { key: 'Microphone', val: 'Bidirectional Noise-Canceling (Rotating Boom)' },
        { key: 'Controls', val: 'In-line Volume Up/Down & Microphone Mute button' },
        { key: 'Certification', val: 'Works with Zoom, Microsoft Teams, Skype, Google Meet' },
        { key: 'Compatibility', val: 'Windows, macOS, ChromeOS' },
      ],
      boxContents: [
        'Logitech H390 USB Headset',
        'Attached 1.9m USB-A Cable',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-zone-vibe-100',
      slug: 'logitech-zone-vibe-100-wireless-headset',
      name: 'Logitech Zone Vibe 100 Wireless Headset',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'headsets',
      partNumber: '981-001213',
      modelCode: 'Zone Vibe 100',
      color: 'Graphite',
      connectivityType: 'Bluetooth 5.2 Wireless (Multipoint)',
      price: 133240,
      originalPrice: 160000,
      rating: 4.9,
      reviewCount: 54,
      stockCount: 10,
      badge: '10 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Ultra-lightweight 185g • Flip-to-mute mic • 40mm speaker drivers • 20h battery',
      image: '/images/gadgets/logitech-zone-vibe-100-headset.jpg',
      images: [
        '/images/gadgets/logitech-zone-vibe-100-headset.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Graphite (P/N 981-001213)', priceDelta: 0 },
      ],
      highlights: [
        'Ultra-lightweight design (just 185 grams) with breathable knitted fabric and memory foam ear cushions',
        'Flip-to-mute noise-canceling microphone tucks cleanly into the earcup when not in use',
        'Immersive 40mm audio drivers deliver rich bass, crisp highs, and low distortion',
        'Up to 20 hours of listening time and 18 hours of talk time on a single charge',
        '10 units available in Lagos warehouse',
      ],
      description: 'Express your personal style with Logitech Zone Vibe 100 wireless headphones. Perfect for working from home, video conferencing, or relaxing to music with rich 40mm drivers, flip-to-mute mic, and featherweight all-day comfort.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '981-001213' },
        { key: 'Warehouse Inventory', val: '10 Units In Stock (Lagos Stock)' },
        { key: 'Wireless Connection', val: 'Bluetooth 5.2 (Up to 30m / 100ft range)' },
        { key: 'Battery Life', val: 'Up to 20 hours listening / 18 hours talk time' },
        { key: 'Drivers', val: '40 mm Speaker Drivers' },
        { key: 'Weight', val: 'Ultra-light 185 grams' },
        { key: 'Compatibility', val: 'Windows, macOS, iOS, Android, ChromeOS' },
      ],
      boxContents: [
        'Zone Vibe 100 Wireless Headset',
        'USB-C Charging Cable',
        'Travel Bag',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-zone-300',
      slug: 'logitech-zone-300-bluetooth-headset',
      name: 'Logitech Zone 300 Wireless Headset',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'headsets',
      partNumber: '981-001407',
      modelCode: 'Zone 300',
      color: 'Black',
      connectivityType: 'Bluetooth 5.3 Wireless (Multipoint)',
      price: 107690,
      originalPrice: 130000,
      rating: 4.9,
      reviewCount: 42,
      stockCount: 20,
      badge: '20 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Dual noise-canceling mics • Flip-to-mute • Multipoint Bluetooth • 20h battery',
      image: '/images/gadgets/logitech-zone-300-headset.jpg',
      images: [
        '/images/gadgets/logitech-zone-300-headset.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Black (P/N 981-001407)', priceDelta: 0 },
      ],
      highlights: [
        'Dual beamforming microphones with noise-suppressing algorithms ensure your voice is heard clearly',
        'Multipoint Bluetooth 5.3 allows seamless switching between your laptop and phone',
        'Up to 20 hours of listening time and 16 hours of talk time with fast USB-C charging',
        'Customizable audio EQ settings and sidetone controls via the Logi Tune app',
        '20 units available in Lagos warehouse',
      ],
      description: 'Logitech Zone 300 is an essential wireless headset with great audio and reliable voice clarity for daily office and remote collaboration. Lightweight, stylish, and engineered for long battery life.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '981-001407' },
        { key: 'Warehouse Inventory', val: '20 Units In Stock (Lagos Stock)' },
        { key: 'Wireless Version', val: 'Bluetooth 5.3 (Multipoint support for 2 devices)' },
        { key: 'Microphones', val: 'Dual Beamforming Noise-Suppressing Mics' },
        { key: 'Battery', val: '20 hours audio / 16 hours talk time (USB-C Fast Charge)' },
        { key: 'App Support', val: 'Logi Tune (iOS, Android, Windows, macOS)' },
      ],
      boxContents: [
        'Logitech Zone 300 Headset',
        'USB-C to USB-C Charging Cable',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-h110',
      slug: 'logitech-h110-stereo-headset',
      name: 'Logitech Stereo Headset H110',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'headsets',
      partNumber: '981-000271',
      modelCode: 'H110',
      color: 'Silver/Grey',
      connectivityType: 'Dual 3.5mm Audio Jacks (Mic + Headphone)',
      price: 15000,
      originalPrice: 19500,
      rating: 4.7,
      reviewCount: 68,
      stockCount: 10,
      badge: '10 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Standard 3.5mm dual jacks • Rotating noise-canceling mic • Adjustable headband',
      image: '/images/gadgets/logitech-h110-headset.jpg',
      images: [
        '/images/gadgets/logitech-h110-headset.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Silver/Grey (P/N 981-000271)', priceDelta: 0 },
      ],
      highlights: [
        'Versatile stereo headset with separate 3.5 mm audio-in and audio-out microphone ports',
        'Rotating boom microphone rotates 180 degrees to be worn on your left or right side',
        'Full stereo sound for games, music, movies, and online lessons',
        'Lightweight adjustable headband and soft foam ear cushions',
        '10 units in stock in Lagos warehouse',
      ],
      description: 'Logitech Stereo Headset H110 is a simple, reliable headset for everyday computers with separate 3.5 mm microphone-in and audio-out ports. Clear stereo audio and noise-canceling microphone make it perfect for VoIP calling and schooling.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '981-000271' },
        { key: 'Warehouse Inventory', val: '10 Units In Stock (Lagos Stock)' },
        { key: 'Connector', val: 'Dual 3.5mm Analog Audio Jacks' },
        { key: 'Microphone', val: '180-degree Rotating Noise-Canceling Mic' },
        { key: 'Cable Length', val: '1.8 meters' },
        { key: 'Compatibility', val: 'Computers and laptops with separate 3.5mm mic and headphone jacks' },
      ],
      boxContents: [
        'Logitech H110 Stereo Headset',
        'Attached Dual 3.5mm Cable',
        'User Guide',
      ],
    },
    {
      id: 'dp-gad-logi-g321',
      slug: 'logitech-g321-gaming-headset',
      name: 'Logitech G321 Wireless Gaming Headset',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'headsets',
      partNumber: '981-001563',
      modelCode: 'G321',
      color: 'Black',
      connectivityType: '2.4GHz LIGHTSPEED Wireless + Bluetooth',
      price: 68510,
      originalPrice: 85000,
      rating: 4.9,
      reviewCount: 38,
      stockCount: 5,
      badge: '5 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'LIGHTSPEED Wireless • Dual connectivity • Low latency audio • Lightweight build',
      image: '/images/gadgets/logitech-g321-headset.jpg',
      images: [
        '/images/gadgets/logitech-g321-headset.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Black (P/N 981-001563)', priceDelta: 0 },
      ],
      highlights: [
        'Pro-grade 2.4GHz LIGHTSPEED wireless delivers ultra-low latency gaming audio',
        'Dual connectivity allows instant pairing with PC via USB dongle and phone via Bluetooth',
        'Precision tuned drivers provide crisp spatial awareness and deep bass impact',
        'Integrated beamforming microphone for clear team communication',
        '5 units available in Lagos warehouse',
      ],
      description: 'Logitech G321 Wireless Gaming Headset brings competitive-grade audio performance to your battlestation. With dual LIGHTSPEED 2.4GHz and Bluetooth wireless, breathable ear cushions, and crystal-clear voice comms.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '981-001563' },
        { key: 'Warehouse Inventory', val: '5 Units In Stock (Lagos Stock)' },
        { key: 'Audio Technology', val: 'LIGHTSPEED Wireless + Bluetooth Low Latency' },
        { key: 'Frequency Response', val: '20 Hz – 20 kHz' },
        { key: 'Battery', val: 'Up to 18 hours continuous gaming' },
        { key: 'Compatibility', val: 'PC, Mac, PlayStation 4/5, Nintendo Switch, Mobile' },
      ],
      boxContents: [
        'G321 Gaming Headset',
        'LIGHTSPEED USB Wireless Receiver',
        'USB-C Charging Cable',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-g522',
      slug: 'logitech-g522-gaming-headset',
      name: 'Logitech G522 Wireless Gaming Headset',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'headsets',
      partNumber: '981-001544',
      modelCode: 'G522',
      color: 'Black',
      connectivityType: '2.4GHz LIGHTSPEED Pro Wireless',
      price: 173540,
      originalPrice: 210000,
      rating: 5.0,
      reviewCount: 46,
      stockCount: 5,
      badge: '5 In Stock',
      badgeTone: 'gold',
      featured: true,
      shortSpec: 'PRO-G 50mm audio drivers • DTS Headphone:X 2.0 7.1 Surround • Blue VO!CE mic',
      image: '/images/gadgets/logitech-g522-headset.jpg',
      images: [
        '/images/gadgets/logitech-g522-headset.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Black (P/N 981-001544)', priceDelta: 0 },
      ],
      highlights: [
        'Pro-grade 50mm PRO-G drivers deliver accurate soundscapes and powerful positional bass',
        'DTS Headphone:X 2.0 next-generation 7.1 surround sound reveals enemy footstep locations',
        'Blue VO!CE broadcast-quality microphone filters reduce noise and optimize vocal clarity in real time',
        'Up to 29 hours of wireless freedom on a single charge with LIGHTSPEED 2.4GHz link',
        '5 units in stock in Lagos warehouse',
      ],
      description: 'Logitech G522 Wireless Gaming Headset is engineered for serious competitive esports players. Featuring advanced PRO-G 50mm audio drivers, real-time Blue VO!CE microphone filters, DTS Headphone:X 2.0 surround sound, and lag-free LIGHTSPEED wireless.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '981-001544' },
        { key: 'Warehouse Inventory', val: '5 Units In Stock (Lagos Stock)' },
        { key: 'Driver Diameter', val: '50mm Hybrid Mesh PRO-G Drivers' },
        { key: 'Surround Sound', val: 'DTS Headphone:X 2.0 7.1 Surround' },
        { key: 'Microphone', val: '6mm Detachable Blue VO!CE Mic Boom' },
        { key: 'Battery Life', val: 'Up to 29 hours (USB-C Fast Charge)' },
        { key: 'Compatibility', val: 'PC (Windows 10/11), PS5, PS4' },
      ],
      boxContents: [
        'G522 Gaming Headset',
        'LIGHTSPEED Wireless USB Receiver',
        'Detachable Mic Boom',
        'USB-C Charging Cable',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-brio-100',
      slug: 'logitech-brio-100-full-hd-webcam',
      name: 'Logitech Brio 100 Full HD Webcam',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'webcams',
      partNumber: '960-001585',
      modelCode: 'Brio 100',
      color: 'Graphite',
      connectivityType: 'USB-A Wired with Built-in Privacy Shutter',
      price: 50750,
      originalPrice: 65000,
      rating: 4.9,
      reviewCount: 72,
      stockCount: 10,
      badge: '10 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Full HD 1080p • Auto-light balance • Built-in privacy shutter • Integrated mic',
      image: '/images/gadgets/logitech-brio-100-webcam.jpg',
      images: [
        '/images/gadgets/logitech-brio-100-webcam.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Graphite (P/N 960-001585)', priceDelta: 0 },
      ],
      highlights: [
        'Crisp Full HD 1080p resolution brings sharper clarity and lifelike detail to your video calls',
        'RightLight auto-light balance increases brightness by up to 50% to reduce shadows in dim rooms',
        'Integrated physical privacy shutter slides closed for complete peace of mind when not on a call',
        'Built-in omnidirectional microphone captures your voice naturally with background noise reduction',
        '10 units available in Lagos warehouse',
      ],
      description: 'Look, sound, and feel better on every video call with Logitech Brio 100. Featuring Full HD 1080p streaming, automatic light correction, built-in microphone, and an easy-sliding privacy shutter.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '960-001585' },
        { key: 'Warehouse Inventory', val: '10 Units In Stock (Lagos Stock)' },
        { key: 'Resolution', val: '1080p Full HD @ 30fps / 720p HD @ 30fps' },
        { key: 'Diagonal Field of View', val: '58 degrees' },
        { key: 'Light Correction', val: 'RightLight 2 Auto-exposure' },
        { key: 'Privacy Shutter', val: 'Integrated physical slide shutter' },
        { key: 'Compatibility', val: 'Windows, macOS, ChromeOS, Zoom, Teams, Meet' },
      ],
      boxContents: [
        'Logitech Brio 100 Webcam with attached 1.5m USB-A cable',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-c270',
      slug: 'logitech-c270-hd-webcam',
      name: 'Logitech HD Webcam C270',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'webcams',
      partNumber: '960-001063',
      modelCode: 'C270 WIN 10',
      color: 'Black',
      connectivityType: 'USB-A Wired (1.5m cable)',
      price: 28200,
      originalPrice: 35000,
      rating: 4.8,
      reviewCount: 110,
      stockCount: 10,
      badge: '10 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'HD 720p @ 30fps • Built-in noise-reducing mic • RightLight auto-exposure',
      image: '/images/gadgets/logitech-c270-webcam.jpg',
      images: [
        '/images/gadgets/logitech-c270-webcam.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Standard HD (P/N 960-001063)', priceDelta: 0 },
      ],
      highlights: [
        'Crisp widescreen HD 720p video calls at a smooth 30 frames per second',
        'Built-in noise-reducing microphone ensures your voice comes through clearly even in busy rooms',
        'Automatic RightLight light correction adjusts to dim lighting conditions',
        'Universal clip securely attaches to laptop screens and external desktop monitors',
        '10 units available in Lagos warehouse',
      ],
      description: 'Logitech HD Webcam C270 gives you sharp, smooth conference calling in widescreen 720p format. Automatic light correction shows you in natural, vibrant colors, while the built-in noise-reducing mic keeps communication crystal-clear.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '960-001063' },
        { key: 'Warehouse Inventory', val: '10 Units In Stock (Lagos Stock)' },
        { key: 'Max Resolution', val: '720p / 30fps' },
        { key: 'Field of View', val: '60 degrees' },
        { key: 'Microphone', val: 'Mono Noise-Reducing Mic (3m range)' },
        { key: 'Mount', val: 'Universal Mounting Clip for Laptops & Monitors' },
        { key: 'Compatibility', val: 'Windows 11/10, macOS, ChromeOS' },
      ],
      boxContents: [
        'Logitech C270 HD Webcam with attached 1.5m cable',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-c920s',
      slug: 'logitech-c920s-pro-hd-webcam',
      name: 'Logitech C920S Pro HD Webcam',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'webcams',
      partNumber: '960-001252',
      modelCode: 'C920S PRO',
      color: 'Black',
      connectivityType: 'USB-A Wired with Detachable Privacy Shutter',
      price: 119200,
      originalPrice: 145000,
      rating: 4.9,
      reviewCount: 156,
      stockCount: 10,
      badge: '10 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Full HD 1080p Glass Lens • Dual stereo mics • Privacy cover • RightLight 2',
      image: '/images/gadgets/logitech-c920s-pro-webcam.jpg',
      images: [
        '/images/gadgets/logitech-c920s-pro-webcam.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'C920S with Privacy Shutter (P/N 960-001252)', priceDelta: 0 },
      ],
      highlights: [
        'Full HD 1080p video calling at 30 fps with premium 5-element glass lens and autofocus',
        'Dual omnidirectional stereo microphones capture natural sound from every angle',
        'Includes detachable privacy shutter to protect the lens and ensure complete security',
        'Automatic RightLight 2 HD light correction adjusts to uneven room lighting',
        '10 units in stock in Lagos warehouse',
      ],
      description: 'Logitech C920S Pro HD Webcam delivers remarkably crisp and detailed Full HD video (1080p at 30fps) with a full HD glass lens, 78° field of view, and HD auto light correction—plus dual mics for clear stereo sound and a privacy shutter.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '960-001252' },
        { key: 'Warehouse Inventory', val: '10 Units In Stock (Lagos Stock)' },
        { key: 'Resolution', val: '1080p/30fps – 720p/30fps' },
        { key: 'Lens', val: 'Full HD Glass Lens with Premium Autofocus' },
        { key: 'Audio', val: 'Dual Stereo Omnidirectional Mics' },
        { key: 'Field of View', val: '78 degrees' },
        { key: 'Privacy Shutter', val: 'Included Detachable Shutter' },
      ],
      boxContents: [
        'C920S Webcam with attached 1.5m cable',
        'Privacy Shutter',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-r400',
      slug: 'logitech-wireless-presenter-r400',
      name: 'Logitech Wireless Presenter R400',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'presenter',
      partNumber: '910-001356',
      modelCode: 'R400',
      color: 'Black',
      connectivityType: '2.4GHz Wireless with Brilliant Red Laser Pointer',
      price: 36900,
      originalPrice: 48000,
      rating: 4.9,
      reviewCount: 52,
      stockCount: 5,
      badge: '5 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Brilliant red laser pointer • Intuitive slideshow controls • 15m (50ft) wireless range',
      image: '/images/gadgets/logitech-r400-presenter.webp',
      images: [
        '/images/gadgets/logitech-r400-presenter.webp',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Black (P/N 910-001356)', priceDelta: 0 },
      ],
      highlights: [
        'Brilliant red laser pointer makes it easy for your audience to see exactly what you\'re pointing to',
        'Up to 15 meters (50 feet) of wireless freedom to move around the conference room or auditorium',
        'Intuitive slideshow controls: buttons are easy to find by touch with smooth contours that feel great in your hand',
        'Plug-and-play wireless receiver stores neatly inside the presenter body when not in use',
        '5 units available in Lagos warehouse',
      ],
      description: 'Logitech Wireless Presenter R400 helps you make your point with confidence. Intuitive slideshow controls and a brilliant red laser pointer let you move freely through your presentations from up to 15 meters away.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '910-001356' },
        { key: 'Warehouse Inventory', val: '5 Units In Stock (Lagos Stock)' },
        { key: 'Laser Class', val: 'Class 2 Laser (Brilliant Red)' },
        { key: 'Wireless Range', val: '15 meters (50 feet) 2.4 GHz' },
        { key: 'Battery', val: '2x AAA Batteries with Battery Indicator' },
        { key: 'Receiver Storage', val: 'Internal Storable USB Receiver' },
        { key: 'Compatibility', val: 'Windows, PowerPoint, Keynote, Google Slides' },
      ],
      boxContents: [
        'Logitech Wireless Presenter R400',
        'Wireless Mini-Receiver',
        '2 AAA Batteries',
        'Carrying Case',
        'Quick Start Guide',
      ],
    },
    {
      id: 'dp-gad-logi-g502hero',
      slug: 'logitech-g502-hero-gaming-mouse',
      name: 'Logitech G502 HERO High Performance Gaming Mouse',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'gaming',
      partNumber: '910-005471',
      modelCode: 'G502 HERO',
      color: 'Black',
      connectivityType: 'USB-A Wired with Braided Cable',
      price: 49950,
      originalPrice: 62000,
      rating: 5.0,
      reviewCount: 185,
      stockCount: 10,
      badge: '10 In Stock',
      badgeTone: 'gold',
      featured: true,
      shortSpec: 'HERO 25,600 DPI Sensor • 11 programmable buttons • Tunable weights • LIGHTSYNC RGB',
      image: '/images/gadgets/logitech-g502-hero-mouse.jpg',
      images: [
        '/images/gadgets/logitech-g502-hero-mouse.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Standard Edition (P/N 910-005471)', priceDelta: 0 },
      ],
      highlights: [
        'Next-gen HERO 25K optical sensor delivers sub-micron tracking with zero smoothing or acceleration',
        '11 fully programmable buttons with on-board memory to save your custom gaming profiles',
        'Adjustable weight system: includes five 3.6g removable weights to fine-tune balance and feel',
        'Dual-mode hyper-fast scroll wheel unlocks friction-free continuous spin or click-to-click precision',
        '10 units available in Lagos warehouse',
      ],
      description: 'Logitech G502 HERO features our most advanced HERO 25K optical sensor with sub-micron tracking, customizable LIGHTSYNC RGB lighting, up to 5 individual 3.6g weights, and 11 programmable buttons.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '910-005471' },
        { key: 'Warehouse Inventory', val: '10 Units In Stock (Lagos Stock)' },
        { key: 'Sensor', val: 'HERO 25K (100 – 25,600 DPI)' },
        { key: 'Max Acceleration / Speed', val: '>40G / >400 IPS' },
        { key: 'Buttons', val: '11 Programmable Mechanical Buttons' },
        { key: 'Weight System', val: '5x 3.6g Removable Weights' },
        { key: 'Cable', val: '2.10m Braided High-Durability USB Cable' },
      ],
      boxContents: [
        'G502 HERO Gaming Mouse',
        'Optional 5x 3.6g Weights & Case',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-g102',
      slug: 'logitech-g102-lightsync-gaming-mouse',
      name: 'Logitech G102 LIGHTSYNC Gaming Mouse',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'gaming',
      partNumber: '910-005823',
      modelCode: 'G102 LIGHTSYNC',
      color: 'Black',
      connectivityType: 'USB-A Wired (2m cable)',
      price: 28230,
      originalPrice: 36000,
      rating: 4.9,
      reviewCount: 92,
      stockCount: 20,
      badge: '20 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Gaming-grade 8,000 DPI sensor • 16.8M Color Wave RGB • 6 programmable buttons',
      image: '/images/gadgets/logitech-g102-mouse.jpg',
      images: [
        '/images/gadgets/logitech-g102-mouse.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Black (P/N 910-005823)', priceDelta: 0 },
      ],
      highlights: [
        'Gaming-grade optical sensor with adjustable 200 – 8,000 DPI sensitivity',
        'Vibrant LIGHTSYNC RGB color wave lighting customizable across 16.8 million colors',
        'Classic, tournament-tested 6-button layout with mechanical metal spring button tensioning',
        'Onboard memory lets you take your custom sensitivity settings wherever you compete',
        '20 units available in Lagos warehouse',
      ],
      description: 'Make the most of your game time with Logitech G102 gaming mouse featuring LIGHTSYNC technology, a gaming-grade 8,000 DPI sensor, and a classic 6-button design with crisp metal-spring actuation.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '910-005823' },
        { key: 'Warehouse Inventory', val: '20 Units In Stock (Lagos Stock)' },
        { key: 'Sensor', val: 'Gaming-Grade Optical (200 – 8,000 DPI)' },
        { key: 'Lighting', val: 'LIGHTSYNC RGB Color Wave (16.8M colors)' },
        { key: 'Buttons', val: '6 Programmable Buttons with Metal Spring Tensioning' },
        { key: 'Report Rate', val: '1,000 Hz (1ms response time)' },
      ],
      boxContents: [
        'G102 LIGHTSYNC Gaming Mouse',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-g413se',
      slug: 'logitech-g413-se-mechanical-gaming-keyboard',
      name: 'Logitech G413 SE Mechanical Gaming Keyboard',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'gaming',
      partNumber: '920-010437',
      modelCode: 'G413 SE',
      color: 'Black',
      connectivityType: 'USB-A Corded (1.8m)',
      price: 104930,
      originalPrice: 130000,
      rating: 4.9,
      reviewCount: 48,
      stockCount: 5,
      badge: '5 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Tactile mechanical switches • PBT keycaps • Aircraft-grade black brushed aluminum',
      image: '/images/gadgets/logitech-g413-se-keyboard.jpg',
      images: [
        '/images/gadgets/logitech-g413-se-keyboard.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Black (P/N 920-010437)', priceDelta: 0 },
      ],
      highlights: [
        'Tactile mechanical switches provide subtle feedback through the actuation moment for competitive precision',
        'Durable PBT keycaps resist heat and wear for long-term endurance without fading or shine',
        'Brushed aircraft-grade 5052 black aluminum top case delivers rigid, minimal-flex durability',
        'White LED backlighting enhances focus and clarity during late-night gaming sessions',
        '5 units in stock in Lagos warehouse',
      ],
      description: 'Meet the Logitech G413 SE full-size mechanical gaming keyboard. Built for game performance with tactile mechanical switches, 6-key rollover anti-ghosting, PBT keycaps, and a durable black brushed aluminum alloy top case.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '920-010437' },
        { key: 'Warehouse Inventory', val: '5 Units In Stock (Lagos Stock)' },
        { key: 'Switches', val: 'Tactile Mechanical Switches (Actuation distance: 1.9 mm)' },
        { key: 'Keycaps', val: 'Heat and Wear Resistant PBT Keycaps' },
        { key: 'Top Case', val: 'Aircraft-grade 5052 Brushed Aluminum-Magnesium Alloy' },
        { key: 'Lighting', val: 'Clean White LED Backlighting' },
        { key: 'Rollover', val: '6-Key Rollover Anti-Ghosting' },
      ],
      boxContents: [
        'G413 SE Mechanical Gaming Keyboard',
        'Attached 1.8m USB Cable',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-logi-g240',
      slug: 'logitech-g240-cloth-gaming-mousepad',
      name: 'Logitech G240 Cloth Gaming Mousepad',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'gaming',
      partNumber: '943-000785',
      modelCode: 'G240',
      color: 'Black',
      connectivityType: 'Accessories / Surface',
      price: 24160,
      originalPrice: 30000,
      rating: 4.9,
      reviewCount: 62,
      stockCount: 8,
      badge: '8 In Stock',
      badgeTone: 'green',
      featured: true,
      shortSpec: 'Moderate surface friction • Consistent surface texture • Stable non-slip rubber base',
      image: '/images/gadgets/logitech-g240-mousepad.jpg',
      images: [
        '/images/gadgets/logitech-g240-mousepad.jpg',
        '/images/gadgets/logitech-official-logo.jpg',
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Standard Cloth (P/N 943-000785)', priceDelta: 0 },
      ],
      highlights: [
        'Moderate surface friction gives the right amount of resistance to mouse feet when starting or stopping low-DPI maneuvers',
        'Consistent tracking surface calibrated specifically for Logitech G gaming mouse sensors',
        'Stable non-slip rubber base keeps the flexible cloth surface in place during intense gaming',
        'Ultra-thin 1mm profile ensures smooth wrist transitions across the desk edge',
        '8 units in stock in Lagos warehouse',
      ],
      description: 'The cloth surface of the Logitech G240 provides ideal surface friction for low-DPI gaming, improving mouse control and precise cursor placement. Matched to Logitech G mouse sensors with a non-slip rubber base.',
      specs: [
        { key: 'Official Part Number (P/N)', val: '943-000785' },
        { key: 'Warehouse Inventory', val: '8 Units In Stock (Lagos Stock)' },
        { key: 'Dimensions', val: '340 mm x 280 mm x 1 mm (13.4 x 11.0 x 0.04 in)' },
        { key: 'Weight', val: '90 g approx' },
        { key: 'Surface', val: 'Heat-treated clean cloth weave' },
        { key: 'Base', val: 'Natural non-slip rubber backing' },
      ],
      boxContents: [
        'Logitech G240 Cloth Gaming Mousepad',
        'User Documentation',
      ],
    },
    {
      id: 'dp-gad-sam-s25u',
      slug: 'samsung-galaxy-s25-ultra-5g',
      name: 'Samsung Galaxy S25 Ultra 5G (Titanium Frame • S-Pen)',
      brand: 'Samsung',
      category: 'smartphones',
      categoryLabel: 'Smartphones',
      price: 1890000,
      originalPrice: 2150000,
      rating: 4.9,
      reviewCount: 89,
      stockCount: 6,
      badge: 'Flagship 5G',
      badgeTone: 'gold',
      featured: true,
      shortSpec: '6.9" Dynamic AMOLED 120Hz • 200MP Quad Cam • Snapdragon 8 Elite',
      image: '/images/gadgets/phone-flagship-titanium.jpg',
      images: [
        '/images/gadgets/phone-flagship-titanium.jpg',
        '/images/gadgets/phone-pro-obsidian.jpg',
        '/images/gadgets/hero-gadgets-showcase.jpg'
      ],
      warranty: '1-Year Official Samsung Care & DEVICE PRO Seal Warranty',
      variants: [
        { label: '256GB / 12GB RAM — Titanium Gray', priceDelta: 0 },
        { label: '512GB / 12GB RAM — Titanium Black', priceDelta: 195000 },
        { label: '1TB / 12GB RAM — Titanium Silverblue', priceDelta: 460000 }
      ],
      highlights: [
        '6.9-inch Anti-Reflective QHD+ Dynamic AMOLED 2X display (1–120Hz)',
        '200MP ProVisual Engine camera with 5x Optical Periscope Telephoto zoom',
        'Integrated S-Pen stylus for precision notes, PDF signing, and sketching',
        'Snapdragon 8 Elite for Galaxy with Galaxy AI real-time translation & productivity',
        '5,000mAh all-day battery with 45W Super Fast Charging & IP68 water resistance'
      ],
      description: 'The ultimate productivity and photography powerhouse. Crafted with aerospace-grade titanium and Corning Gorilla Armor 2, the Samsung Galaxy S25 Ultra combines desktop-class Snapdragon performance, an integrated S-Pen, and a 200MP studio-grade camera system.',
      specs: [
        { key: 'Display', val: '6.9" Dynamic LTPO AMOLED 2X, 120Hz, 2600 nits peak' },
        { key: 'Processor', val: 'Qualcomm Snapdragon 8 Elite (3nm)' },
        { key: 'Camera System', val: '200MP Main + 50MP Ultrawide + 50MP 5x + 10MP 3x' },
        { key: 'Battery & Charging', val: '5,000mAh • 45W Wired • 15W Qi2 Wireless' },
        { key: 'Build & Protection', val: 'Titanium Frame • IP68 Dust/Water Resistant' },
        { key: 'Network', val: 'Dual SIM / eSIM • Full Nigerian 5G / 4G LTE Bands' }
      ],
      boxContents: [
        'Samsung Galaxy S25 Ultra 5G (Factory Sealed)',
        'Integrated S-Pen Stylus',
        'USB-C to USB-C Data/Charging Cable',
        'SIM Ejection Pin & Official Warranty Documentation'
      ]
    },
    {
      id: 'dp-gad-apple-16pm',
      slug: 'apple-iphone-16-pro-max',
      name: 'Apple iPhone 16 Pro Max (A18 Pro • Grade 5 Titanium)',
      brand: 'Apple',
      category: 'smartphones',
      categoryLabel: 'Smartphones',
      price: 1980000,
      originalPrice: 2220000,
      rating: 5.0,
      reviewCount: 112,
      stockCount: 5,
      badge: 'Factory Sealed',
      badgeTone: 'blue',
      featured: true,
      shortSpec: '6.9" Super Retina XDR • A18 Pro • 48MP Fusion • 4K120 Dolby Vision',
      image: '/images/gadgets/phone-pro-obsidian.jpg',
      images: [
        '/images/gadgets/phone-pro-obsidian.jpg',
        '/images/gadgets/phone-flagship-titanium.jpg'
      ],
      warranty: '1-Year Apple Limited Warranty + DEVICE PRO Verification',
      variants: [
        { label: '256GB — Black Titanium (Physical SIM + eSIM)', priceDelta: 0 },
        { label: '256GB — Desert Titanium', priceDelta: 25000 },
        { label: '512GB — Natural Titanium', priceDelta: 260000 }
      ],
      highlights: [
        '6.9-inch Super Retina XDR OLED with ProMotion 120Hz & ultra-thin borders',
        'A18 Pro chip with 6-core GPU delivers console-level performance & Apple Intelligence',
        'Dedicated Camera Control button + 4K 120fps Dolby Vision cinema video capture',
        'Best battery life ever on an iPhone — up to 33 hours video playback',
        'USB-C (USB 3 10Gb/s) fast transfer & MagSafe 25W wireless charging'
      ],
      description: 'Forged in Grade 5 titanium with a refined microblasted finish, iPhone 16 Pro Max pairs Apple’s largest Super Retina XDR display with the powerhouse A18 Pro chip and studio-quality 48MP Fusion + 5x Telephoto optics.',
      specs: [
        { key: 'Display', val: '6.9" Super Retina XDR OLED, ProMotion 120Hz' },
        { key: 'Chipset', val: 'Apple A18 Pro (3nm) with 16-Core Neural Engine' },
        { key: 'Rear Cameras', val: '48MP Fusion + 48MP Ultra Wide + 12MP 5x Telephoto' },
        { key: 'Connector', val: 'USB-C (USB 3 up to 10Gb/s) + MagSafe 25W' },
        { key: 'Durability', val: 'Grade 5 Titanium + Latest Ceramic Shield • IP68' }
      ],
      boxContents: [
        'Apple iPhone 16 Pro Max (Brand New Factory Sealed)',
        'USB-C Braided Charge Cable (1m)',
        'Official Apple Documentation'
      ]
    },
    {
      id: 'dp-gad-xiaomi-rn14p',
      slug: 'xiaomi-redmi-note-14-pro-plus-5g',
      name: 'Xiaomi Redmi Note 14 Pro+ 5G (200MP • 120W HyperCharge)',
      brand: 'Xiaomi',
      category: 'smartphones',
      categoryLabel: 'Smartphones',
      price: 545000,
      originalPrice: 620000,
      rating: 4.8,
      reviewCount: 67,
      stockCount: 16,
      badge: 'Hot Value',
      badgeTone: 'green',
      featured: false,
      shortSpec: '6.67" 1.5K Curved AMOLED • 120W Fast Charge • IP68 • 512GB',
      image: '/images/gadgets/phone-flagship-titanium.jpg',
      images: [
        '/images/gadgets/phone-flagship-titanium.jpg',
        '/images/gadgets/phone-pro-obsidian.jpg'
      ],
      warranty: '1-Year Official Xiaomi Nigeria Warranty',
      variants: [
        { label: '256GB / 8GB RAM — Midnight Black', priceDelta: 0 },
        { label: '512GB / 12GB RAM — Frost Blue', priceDelta: 65000 }
      ],
      highlights: [
        '120W HyperCharge fills the 5,110mAh battery from 0% to 100% in ~22 minutes',
        '200MP OIS Flagship Camera with AI Erase & crisp night mode photography',
        'Flagship IP68 water & dust resistance + Corning Gorilla Glass Victus 2',
        'Silky 1.5K 120Hz CrystalRes Curved AMOLED display (3,000 nits peak)'
      ],
      description: 'Flagship durability, blistering 120W charging, and a 200MP OIS camera at an unbeatable mid-range price. The Redmi Note 14 Pro+ 5G is engineered for non-stop Nigerian power-users who demand speed and battery longevity.',
      specs: [
        { key: 'Display', val: '6.67" 1.5K Curved AMOLED, 120Hz, Dolby Vision' },
        { key: 'Processor', val: 'Snapdragon 7s Gen 3 (4nm 5G)' },
        { key: 'Camera', val: '200MP OIS Main + 8MP Ultrawide + 2MP Macro' },
        { key: 'Charging', val: '120W HyperCharge Adapter Included in Box' },
        { key: 'Protection', val: 'IP68 Waterproof + Gorilla Glass Victus 2' }
      ],
      boxContents: [
        'Redmi Note 14 Pro+ 5G Smartphone',
        '120W Fast Wall Adapter + USB-C Cable',
        'Protective Case & SIM Tool'
      ]
    },

    // =========================================================================
    // 3. LAPTOPS
    // =========================================================================
    {
      id: 'dp-gad-apple-mba-m3',
      slug: 'apple-macbook-air-15-m3',
      name: 'Apple MacBook Air 15" M3 (16GB Unified Memory • 512GB SSD)',
      brand: 'Apple',
      category: 'laptops',
      categoryLabel: 'Laptops',
      price: 2180000,
      originalPrice: 2420000,
      rating: 5.0,
      reviewCount: 74,
      stockCount: 8,
      badge: 'Creator Favorite',
      badgeTone: 'gold',
      featured: true,
      shortSpec: 'Apple M3 8-Core CPU / 10-Core GPU • 15.3" Liquid Retina • 18hr Battery',
      image: '/images/gadgets/laptop-ultrabook-silver.jpg',
      images: [
        '/images/gadgets/laptop-ultrabook-silver.jpg',
        '/images/gadgets/laptop-business-pro.jpg',
        '/images/gadgets/hero-gadgets-showcase.jpg'
      ],
      warranty: '1-Year Official Apple Warranty + DEVICE PRO Lagos Support',
      variants: [
        { label: '16GB RAM / 256GB SSD — Midnight', priceDelta: -210000 },
        { label: '16GB RAM / 512GB SSD — Starlight / Silver', priceDelta: 0 },
        { label: '24GB RAM / 512GB SSD — Space Gray', priceDelta: 280000 }
      ],
      highlights: [
        'Blazing-fast Apple M3 chip handles 4K video editing, coding, and multitasking silently (fanless)',
        'Expansive 15.3-inch Liquid Retina display supporting 1 billion colors',
        'Up to 18 hours battery life — power through an entire workday off-grid',
        'MagSafe 3 magnetic charging + 2× Thunderbolt / USB 4 ports + Wi-Fi 6E',
        'Six-speaker Spatial Audio sound system with force-canceling woofers'
      ],
      description: 'Strikingly thin at just 11.5mm yet impossibly capable, the 15-inch MacBook Air with M3 gives professionals, engineers, and creatives an expansive Liquid Retina canvas and 18-hour battery endurance ideal for hybrid work in Nigeria.',
      specs: [
        { key: 'Processor', val: 'Apple M3 (8-Core CPU, 10-Core GPU, 16-Core Neural Engine)' },
        { key: 'Memory & Storage', val: '16GB Unified Memory • 512GB NVMe SSD' },
        { key: 'Display', val: '15.3" Liquid Retina IPS (2880 × 1864, 500 nits, P3 Wide Color)' },
        { key: 'Battery Life', val: 'Up to 18 Hours Apple TV / 15 Hours Wireless Web' },
        { key: 'Ports', val: 'MagSafe 3, 2× Thunderbolt / USB 4, 3.5mm Hi-Impedance Audio' },
        { key: 'Webcam & Audio', val: '1080p FaceTime HD Camera • 6-Speaker Spatial Audio' }
      ],
      boxContents: [
        'Apple MacBook Air 15-inch (M3)',
        '35W Dual USB-C Port Compact Power Adapter',
        'USB-C to MagSafe 3 Braided Cable (2m)'
      ]
    },
    {
      id: 'dp-gad-hp-elite840',
      slug: 'hp-elitebook-840-g10-core-i7',
      name: 'HP EliteBook 840 G10 Business Laptop (Intel Core i7-1355U)',
      brand: 'HP',
      category: 'laptops',
      categoryLabel: 'Laptops',
      price: 1385000,
      originalPrice: 1560000,
      rating: 4.8,
      reviewCount: 53,
      stockCount: 9,
      badge: 'Enterprise Pro',
      badgeTone: 'blue',
      featured: false,
      shortSpec: '14" WUXGA Anti-Glare • 16GB DDR5 • 512GB NVMe • Thunderbolt 4',
      image: '/images/gadgets/laptop-business-pro.jpg',
      images: [
        '/images/gadgets/laptop-business-pro.jpg',
        '/images/gadgets/laptop-ultrabook-silver.jpg'
      ],
      warranty: '1-Year Official HP Commercial Warranty',
      variants: [
        { label: '16GB DDR5 / 512GB SSD — Win 11 Pro', priceDelta: 0 },
        { label: '32GB DDR5 / 1TB SSD — Win 11 Pro', priceDelta: 185000 }
      ],
      highlights: [
        '13th Gen Intel Core i7-1355U 10-core enterprise processor with vPro security',
        'CNC aluminum chassis tested to MIL-STD-810H military durability standards',
        'Dual Thunderbolt 4 USB-C ports + HDMI 2.1 + dual USB-A (zero dongle stress)',
        '5MP IR auto-framing webcam with Bang & Olufsen dual stereo speakers'
      ],
      description: 'Built for Nigerian corporate executives, engineers, and consultants, the HP EliteBook 840 G10 delivers rock-solid aluminum build quality, HP Wolf hardware security, effortless upgradeability, and all-day battery life.',
      specs: [
        { key: 'Processor', val: 'Intel Core i7-1355U (10 Cores, up to 5.0 GHz Turbo)' },
        { key: 'RAM', val: '16GB DDR5-5200 MHz (Dual SO-DIMM Upgradeable)' },
        { key: 'Storage', val: '512GB PCIe Gen4 NVMe M.2 SSD' },
        { key: 'Display', val: '14" WUXGA (1920 × 1200) IPS Anti-Glare 16:10' },
        { key: 'Operating System', val: 'Genuine Windows 11 Pro 64-Bit' },
        { key: 'Ports', val: '2× Thunderbolt 4, 2× USB-A 5Gbps, HDMI 2.1, Audio Jack' }
      ],
      boxContents: [
        'HP EliteBook 840 G10 Laptop',
        '65W USB-C Original HP Fast Charger',
        'Warranty Guide & Documentation'
      ]
    },
    {
      id: 'dp-gad-lenovo-x1c',
      slug: 'lenovo-thinkpad-x1-carbon-gen-11',
      name: 'Lenovo ThinkPad X1 Carbon Gen 11 (Core i7 • Carbon Fiber)',
      brand: 'Lenovo',
      category: 'laptops',
      categoryLabel: 'Laptops',
      price: 1690000,
      originalPrice: 1890000,
      rating: 4.9,
      reviewCount: 41,
      stockCount: 5,
      badge: 'Ultra-Light 1.12kg',
      badgeTone: 'navy',
      featured: false,
      shortSpec: '14" WUXGA 400-nit • Core i7 • 16GB LPDDR5 • 1TB SSD • 1.12kg',
      image: '/images/gadgets/laptop-business-pro.jpg',
      images: [
        '/images/gadgets/laptop-business-pro.jpg',
        '/images/gadgets/laptop-ultrabook-silver.jpg'
      ],
      warranty: '1-Year Lenovo Premier Warranty Support',
      variants: [
        { label: '16GB / 512GB SSD — Matte Black', priceDelta: -95000 },
        { label: '16GB / 1TB SSD — Matte Black', priceDelta: 0 }
      ],
      highlights: [
        'Carbon-fiber reinforced ultralight chassis weighing just 1.12 kg',
        'Legendary spill-resistant ThinkPad backlit keyboard with TrackPoint',
        'Intel Evo certified for instant wake, rapid charging, and all-day endurance',
        'Dolby Atmos 4-speaker array & 360-degree quad-mic conferencing'
      ],
      description: 'The gold standard of executive computing. Weighing barely over a kilogram, the ThinkPad X1 Carbon Gen 11 merges aerospace carbon weave durability with Intel Evo responsiveness and the industry’s best tactile keyboard.',
      specs: [
        { key: 'Processor', val: 'Intel Core i7-1365U vPro (13th Gen)' },
        { key: 'Memory & Storage', val: '16GB LPDDR5-6000 • 1TB PCIe Gen4 SSD' },
        { key: 'Display', val: '14" WUXGA IPS 400 nits Low-Power 100% sRGB' },
        { key: 'Weight', val: '1.12 kg (Ultra-Portable)' },
        { key: 'Connectivity', val: 'Wi-Fi 6E, Bluetooth 5.3, 2× Thunderbolt 4, HDMI 2.1' }
      ],
      boxContents: [
        'Lenovo ThinkPad X1 Carbon Gen 11',
        '65W Slim USB-C Power Adapter',
        'Official Warranty Documentation'
      ]
    },

    // =========================================================================
    // 4. POWERBANKS (HIGH-CAPACITY & LAPTOP PD)
    // =========================================================================
    {
      id: 'dp-gad-anker-27650',
      slug: 'anker-prime-27650mah-250w-powerbank',
      name: 'Anker Prime 27,650mAh 250W PD Smart Digital Powerbank',
      brand: 'Anker',
      category: 'powerbanks',
      categoryLabel: 'Powerbanks',
      price: 215000,
      originalPrice: 248000,
      rating: 4.9,
      reviewCount: 128,
      stockCount: 18,
      badge: 'Laptop Fast Charge',
      badgeTone: 'gold',
      featured: true,
      shortSpec: '250W Total Output • 140W Single USB-C • Smart OLED App Display',
      image: '/images/gadgets/powerbank-pd-digital.jpg',
      images: [
        '/images/gadgets/powerbank-pd-digital.jpg',
        '/images/gadgets/accessories-gan-hub.jpg'
      ],
      warranty: '18-Month Official Anker Warranty via DEVICE PRO',
      variants: [
        { label: 'Powerbank Only (250W PD 3.1)', priceDelta: 0 },
        { label: 'With 100W Charging Base Dock', priceDelta: 62000 }
      ],
      highlights: [
        'Massive 250W multi-device output charges MacBook Pro 16" + iPhone + iPad simultaneously',
        '140W PD 3.1 single-port output charges a MacBook Pro 16" to 50% in just 28 minutes',
        'Smart real-time OLED display + Anker Bluetooth App shows exact wattage, temp & battery health',
        '99.54Wh airline-approved capacity — carry on any local or international flight',
        'Dual-port 170W rapid recharge refills the entire powerbank in just 37 minutes'
      ],
      description: 'Never let a power outage interrupt a deadline again. The Anker Prime 27,650mAh packs 250W of intelligent Power Delivery 3.1 into a soda-can footprint, easily powering high-draw laptops, Starlink Mini kits, smartphones, and cameras.',
      specs: [
        { key: 'Capacity', val: '27,650mAh / 99.54Wh (TSA / Airline Compliant)' },
        { key: 'Total Max Output', val: '250W Combined (2× USB-C + 1× USB-A)' },
        { key: 'Single Port Max', val: '140W USB-C PD 3.1 Bi-Directional' },
        { key: 'Fast Recharge Input', val: 'Up to 170W Dual USB-C (0–100% in 37 mins)' },
        { key: 'Smart Features', val: 'Live Wattage OLED Screen + Bluetooth App + ActiveShield 2.0' }
      ],
      boxContents: [
        'Anker Prime 27,650mAh 250W Powerbank',
        '140W USB-C to USB-C Braided Cable',
        'Protective Velvet Travel Pouch & Guide'
      ]
    },
    {
      id: 'dp-gad-oraimo-40k',
      slug: 'oraimo-traveler-40000mah-65w-powerbank',
      name: 'Oraimo Traveler Link 40,000mAh 65W Laptop & Phone Powerbank',
      brand: 'Oraimo',
      category: 'powerbanks',
      categoryLabel: 'Powerbanks',
      price: 78000,
      originalPrice: 92000,
      rating: 4.8,
      reviewCount: 215,
      stockCount: 34,
      badge: 'Nigeria #1 Pick',
      badgeTone: 'green',
      featured: false,
      shortSpec: '40,000mAh Ultra Capacity • 65W PD Output • LED Flashlight • 4 Ports',
      image: '/images/gadgets/powerbank-pd-digital.jpg',
      images: [
        '/images/gadgets/powerbank-pd-digital.jpg'
      ],
      warranty: '1-Year Official Oraimo Nigeria Warranty',
      variants: [
        { label: '40,000mAh — 65W Laptop Fast Charge', priceDelta: 0 },
        { label: '27,000mAh — 22.5W AniFast Compact', priceDelta: -36000 }
      ],
      highlights: [
        'Colossal 40,000mAh battery recharges smartphones up to 8–10 full times',
        '65W USB-C PD output powers Ultrabooks, MacBook Air, iPads & MiFi routers',
        'Built-in bright emergency LED camping torch with SOS mode',
        'AniFast smart IC automatically detects and matches fast-charge protocols'
      ],
      description: 'Built for multi-day trips and reliable backup across Nigeria, the Oraimo Traveler 40,000mAh 65W powerbank keeps your laptop, two smartphones, and Wi-Fi router running continuously without touching a wall socket.',
      specs: [
        { key: 'Battery Capacity', val: '40,000mAh High-Density Lithium Polymer' },
        { key: 'Max Output', val: '65W USB-C PD + Triple USB-A Quick Charge' },
        { key: 'Display', val: 'Crisp Digital LED Percentage Readout' },
        { key: 'Extras', val: 'High-Lumen Built-in LED Emergency Light & Carry Strap' }
      ],
      boxContents: [
        'Oraimo 40,000mAh 65W Powerbank',
        'USB-C Fast Charging Cable',
        '365-Day Oraimo Warranty Card'
      ]
    },
    {
      id: 'dp-gad-baseus-blade',
      slug: 'baseus-blade-hd-20000mah-100w-slim-powerbank',
      name: 'Baseus Blade HD 20,000mAh 100W Ultra-Slim Laptop Powerbank',
      brand: 'Baseus',
      category: 'powerbanks',
      categoryLabel: 'Powerbanks',
      price: 118000,
      originalPrice: 138000,
      rating: 4.8,
      reviewCount: 83,
      stockCount: 15,
      badge: 'Ultra-Slim 18mm',
      badgeTone: 'blue',
      featured: false,
      shortSpec: '100W PD Output • 18mm Flat Laptop Sleeve Design • Dual USB-C',
      image: '/images/gadgets/powerbank-pd-digital.jpg',
      images: [
        '/images/gadgets/powerbank-pd-digital.jpg'
      ],
      warranty: '1-Year Official Baseus & DEVICE PRO Warranty',
      variants: [
        { label: 'Matte Black — 100W HD Edition', priceDelta: 0 }
      ],
      highlights: [
        'Only 18mm thin — slides flat inside any laptop sleeve without bulging',
        'True 100W USB-C Power Delivery keeps MacBooks, Dell XPS & HP laptops topped up',
        'Digital dashboard displays remaining battery %, live voltage, current & time left',
        '65W self-recharging refills from 0–100% in ~90 minutes'
      ],
      description: 'Tired of bulky brick-shaped powerbanks? The Baseus Blade HD delivers a full 100W of laptop-grade power in an ultra-flat architectural slate that glides smoothly right beside your ultrabook.',
      specs: [
        { key: 'Capacity', val: '20,000mAh / 74Wh' },
        { key: 'Output Ports', val: '2× USB-C (100W Max) + 2× USB-A (30W Max)' },
        { key: 'Thickness', val: '18mm Ultra-Slim Profile (445g)' },
        { key: 'Display', val: 'LED Power, Current & Remaining Time Telemetry' }
      ],
      boxContents: [
        'Baseus Blade HD 100W Powerbank',
        '100W E-Marker USB-C Cable',
        'Soft Travel Sleeve & Manual'
      ]
    },

    // =========================================================================
    // 5. BLUETOOTH SPEAKERS
    // =========================================================================
    {
      id: 'dp-gad-jbl-charge5',
      slug: 'jbl-charge-5-portable-bluetooth-speaker',
      name: 'JBL Charge 5 Portable Waterproof Bluetooth Speaker',
      brand: 'JBL',
      category: 'speakers',
      categoryLabel: 'Bluetooth Speakers',
      price: 228000,
      originalPrice: 260000,
      rating: 4.9,
      reviewCount: 164,
      stockCount: 13,
      badge: 'IP67 Waterproof',
      badgeTone: 'blue',
      featured: true,
      shortSpec: '40W JBL Original Pro Sound • 20hr Playtime • Built-in Powerbank',
      image: '/images/gadgets/speaker-bluetooth-navy.jpg',
      images: [
        '/images/gadgets/speaker-bluetooth-navy.jpg',
        '/images/gadgets/hero-gadgets-showcase.jpg'
      ],
      warranty: '1-Year Original JBL Verification Warranty',
      variants: [
        { label: 'Squad Navy Blue', priceDelta: 0 },
        { label: 'Midnight Black', priceDelta: 0 },
        { label: 'JBL Charge 5 Wi-Fi Edition', priceDelta: 48000 }
      ],
      highlights: [
        '40W RMS JBL Pro Sound with separate tweeter, racetrack driver & dual bass radiators',
        'IP67 fully waterproof and dustproof — poolside, beach, and outdoor ready',
        '20-hour continuous battery life plus built-in USB powerbank to charge your phone',
        'PartyBoost pairs wirelessly with multiple JBL speakers for stereo or party sound'
      ],
      description: 'Take bold JBL Original Pro Sound wherever life moves. With an optimized long-excursion driver, crisp dedicated tweeter, and pumping dual bass radiators, the JBL Charge 5 fills living rooms and outdoor hangouts effortlessly for up to 20 hours.',
      specs: [
        { key: 'Output Power', val: '30W RMS Woofer + 10W RMS Tweeter (40W Total)' },
        { key: 'Battery Life', val: 'Up to 20 Hours (7,500mAh Li-ion Polymer)' },
        { key: 'Water/Dust Rating', val: 'IP67 Submersible Waterproof & Dustproof' },
        { key: 'Bluetooth Version', val: 'Bluetooth 5.1 + PartyBoost Multi-Speaker Pairing' },
        { key: 'Extras', val: 'Built-in USB-A Powerbank Out + USB-C Charging' }
      ],
      boxContents: [
        'JBL Charge 5 Portable Speaker (Original Sealed)',
        'Type-C USB Charging Cable',
        'Safety Sheet & Quick Start Guide'
      ]
    },
    {
      id: 'dp-gad-sony-xg300',
      slug: 'sony-srs-xg300-x-series-bluetooth-speaker',
      name: 'Sony SRS-XG300 X-Series Wireless Mega Bass Speaker',
      brand: 'Sony',
      category: 'speakers',
      categoryLabel: 'Bluetooth Speakers',
      price: 345000,
      originalPrice: 395000,
      rating: 4.8,
      reviewCount: 49,
      stockCount: 8,
      badge: '25hr Mega Bass',
      badgeTone: 'navy',
      featured: false,
      shortSpec: 'X-Balanced Drivers • 25hr Battery • Retractable Handle • Ambient LEDs',
      image: '/images/gadgets/speaker-bluetooth-navy.jpg',
      images: [
        '/images/gadgets/speaker-bluetooth-navy.jpg'
      ],
      warranty: '1-Year Official Sony Warranty',
      variants: [
        { label: 'Midnight Black', priceDelta: 0 },
        { label: 'Light Gray', priceDelta: 5000 }
      ],
      highlights: [
        'X-Balanced Speaker Unit + front tweeters deliver club-level clarity & MEGA BASS punch',
        '25 hours battery life + 10-minute quick charge gives 70 minutes of music',
        'Retractable integrated carry handle & subtle beat-synced ambient ring lighting',
        'IP67 waterproof, dustproof & echo-canceling speakerphone for crisp calls'
      ],
      description: 'Engineered for powerful, distortion-free room-filling audio, the Sony SRS-XG300 packs X-Balanced acoustic engineering, 25-hour endurance, and a sleek retractable carry handle into one modern centerpiece.',
      specs: [
        { key: 'Acoustic Engine', val: 'Dual X-Balanced Woofers + Dual Tweeters + MEGA BASS' },
        { key: 'Battery Endurance', val: 'Up to 25 Hours + Quick Charge' },
        { key: 'Protection', val: 'IP67 Waterproof & Dustproof' },
        { key: 'Connectivity', val: 'Bluetooth 5.2, LDAC Hi-Res, AUX 3.5mm, Party Connect' }
      ],
      boxContents: [
        'Sony SRS-XG300 Portable Speaker',
        'Original AC Power Adapter',
        'Documentation & Warranty'
      ]
    },
    {
      id: 'dp-gad-hk-onyx8',
      slug: 'harman-kardon-onyx-studio-8-speaker',
      name: 'Harman Kardon Onyx Studio 8 Designer Bluetooth Speaker',
      brand: 'Harman Kardon',
      category: 'speakers',
      categoryLabel: 'Bluetooth Speakers',
      price: 385000,
      originalPrice: 440000,
      rating: 4.9,
      reviewCount: 58,
      stockCount: 6,
      badge: 'Luxury Acoustic',
      badgeTone: 'gold',
      featured: false,
      shortSpec: '50W RMS Studio Sound • Anodized Aluminum Handle • Auto-Room Tuning',
      image: '/images/gadgets/speaker-bluetooth-navy.jpg',
      images: [
        '/images/gadgets/speaker-bluetooth-navy.jpg'
      ],
      warranty: '1-Year Official Harman Kardon Warranty',
      variants: [
        { label: 'Champagne / Midnight Black', priceDelta: 0 },
        { label: 'Deep Dark Blue', priceDelta: 8000 }
      ],
      highlights: [
        '50W RMS acoustic powerhouse with 120mm woofer & dual 20mm tweeters',
        'Automatic self-calibration tunes acoustic response to every room you place it in',
        'Sculpted anodized aluminum ring handle doubles as a minimalist designer stand',
        'Dual-microphone array for crystal-clear executive conference calls'
      ],
      description: 'An architectural statement for modern apartments and executive offices. The Harman Kardon Onyx Studio 8 wraps sustainable woven acoustic fabric around 50W of rich, auto-calibrated Hi-Fi stereo sound.',
      specs: [
        { key: 'Output Power', val: '50W RMS (120mm Woofer + 2× 20mm Tweeters)' },
        { key: 'Battery Life', val: 'Up to 8 Hours Wireless Playback' },
        { key: 'Self-Tuning', val: 'Automatic Room Acoustic Calibration on Power-On' },
        { key: 'Connectivity', val: 'Bluetooth 5.2 (Dual Device Pairing) + Wireless Stereo' }
      ],
      boxContents: [
        'Harman Kardon Onyx Studio 8 Speaker',
        'AC Power Cable',
        'Quick Start Guide & Warranty Card'
      ]
    },

    // =========================================================================
    // 6. MONITORS
    // =========================================================================
    {
      id: 'dp-gad-dell-u2723qe',
      slug: 'dell-ultrasharp-27-4k-usbc-hub-monitor',
      name: 'Dell UltraSharp 27" 4K UHD USB-C Hub Monitor (U2723QE)',
      brand: 'Dell',
      category: 'monitors',
      categoryLabel: 'Monitors',
      price: 895000,
      originalPrice: 990000,
      rating: 4.9,
      reviewCount: 62,
      stockCount: 7,
      badge: 'IPS Black 4K',
      badgeTone: 'blue',
      featured: true,
      shortSpec: '27" 4K IPS Black • 90W USB-C Charging • Built-in RJ45 Hub • 98% DCI-P3',
      image: '/images/gadgets/monitor-4k-ultrasharp.jpg',
      images: [
        '/images/gadgets/monitor-4k-ultrasharp.jpg',
        '/images/gadgets/hero-gadgets-showcase.jpg'
      ],
      warranty: '2-Year Dell & DEVICE PRO Pixel Warranty',
      variants: [
        { label: '27-inch 4K UHD (U2723QE)', priceDelta: 0 },
        { label: '32-inch 4K UHD (U3223QE)', priceDelta: 340000 }
      ],
      highlights: [
        'Groundbreaking IPS Black panel delivers 2000:1 contrast ratio with deeper blacks',
        'Single-cable USB-C transmits 4K video, high-speed data & 90W laptop charging simultaneously',
        'Built-in RJ45 Gigabit Ethernet, KVM switch, and 5× USB 10Gbps hub ports',
        'Factory color-calibrated 98% DCI-P3 & 100% sRGB with ComfortView Plus low blue light'
      ],
      description: 'The ultimate single-cable productivity monitor for MacBook and Windows workstations. Plug in one USB-C cable to drive crisp 4K UHD visuals, charge your laptop at 90W, and connect your keyboard, mouse, and wired Ethernet.',
      specs: [
        { key: 'Panel Size & Resolution', val: '27" 4K UHD (3840 × 2160) IPS Black Anti-Glare' },
        { key: 'Contrast & Color', val: '2000:1 Static Contrast • 98% DCI-P3 • VESA DisplayHDR 400' },
        { key: 'USB-C Power Delivery', val: 'Up to 90W Single-Cable Laptop Power + Video' },
        { key: 'Integrated Hub', val: 'HDMI 2.0, DP 1.4 In/Out, RJ45 Ethernet, 5× USB-A, 2× USB-C' },
        { key: 'Ergonomics', val: 'Height, Tilt, Swivel & 90° Vertical Pivot Stand' }
      ],
      boxContents: [
        'Dell UltraSharp 27" 4K Monitor + Ergonomic Stand',
        'USB-C to USB-C 90W Cable + DisplayPort Cable + Power Cord',
        'Factory Color Calibration Report'
      ]
    },
    {
      id: 'dp-gad-lg-ug27',
      slug: 'lg-ultragear-27-qhd-165hz-gaming-monitor',
      name: 'LG UltraGear 27" QHD 165Hz 1ms Nano IPS Gaming Monitor',
      brand: 'LG',
      category: 'monitors',
      categoryLabel: 'Monitors',
      price: 485000,
      originalPrice: 545000,
      rating: 4.8,
      reviewCount: 47,
      stockCount: 10,
      badge: '165Hz • 1ms',
      badgeTone: 'navy',
      featured: false,
      shortSpec: '27" 2560×1440 QHD • 165Hz Refresh • 1ms GtG • G-Sync & FreeSync',
      image: '/images/gadgets/monitor-4k-ultrasharp.jpg',
      images: [
        '/images/gadgets/monitor-4k-ultrasharp.jpg'
      ],
      warranty: '1-Year Official LG Warranty',
      variants: [
        { label: '27" QHD 165Hz IPS', priceDelta: 0 },
        { label: '32" QHD 165Hz IPS', priceDelta: 115000 }
      ],
      highlights: [
        'Silky 165Hz refresh rate + true 1ms GtG response time eliminates motion blur',
        'Sharp 2560×1440 QHD resolution with HDR10 & 99% sRGB vibrant color',
        'NVIDIA G-SYNC Compatible & AMD FreeSync Premium tear-free gameplay',
        '3-side virtually borderless design with height & pivot ergonomic stand'
      ],
      description: 'Built for fluid competitive gaming and buttery-smooth creative timelines, the LG UltraGear 27" QHD monitor pairs a blazing 165Hz IPS panel with pro ergonomics and wide color accuracy.',
      specs: [
        { key: 'Resolution', val: '2560 × 1440 (QHD 16:9) IPS' },
        { key: 'Refresh / Response', val: '165Hz Refresh Rate • 1ms Gray-to-Gray' },
        { key: 'Adaptive Sync', val: 'NVIDIA G-SYNC Compatible + AMD FreeSync Premium' },
        { key: 'Inputs', val: '2× HDMI 2.0, 1× DisplayPort 1.4, Headphone Out' }
      ],
      boxContents: [
        'LG UltraGear 27" Monitor & Stand',
        'DisplayPort Cable + Power Adapter',
        'Quick Setup Guide'
      ]
    },
    {
      id: 'dp-gad-sam-m8',
      slug: 'samsung-smart-monitor-m8-32-4k',
      name: 'Samsung Smart Monitor M8 32" 4K UHD (Built-in Smart TV & USB-C)',
      brand: 'Samsung',
      category: 'monitors',
      categoryLabel: 'Monitors',
      price: 760000,
      originalPrice: 840000,
      rating: 4.8,
      reviewCount: 39,
      stockCount: 5,
      badge: 'Work + Smart TV',
      badgeTone: 'gold',
      featured: false,
      shortSpec: '32" 4K HDR10+ • 65W USB-C • SlimFit Magnetic Webcam • Tizen OS',
      image: '/images/gadgets/monitor-4k-ultrasharp.jpg',
      images: [
        '/images/gadgets/monitor-4k-ultrasharp.jpg'
      ],
      warranty: '1-Year Official Samsung Warranty',
      variants: [
        { label: '32" 4K — Warm White', priceDelta: 0 },
        { label: '32" 4K — Space Slate', priceDelta: 15000 }
      ],
      highlights: [
        'Work by day with 65W USB-C + stream Netflix, YouTube & Prime Video without a PC',
        'Includes magnetic 1080p SlimFit webcam & built-in stereo speakers',
        'Ultra-slim iconic minimalist profile with matching SolarCell remote control',
        'Built-in AirPlay 2 & Wireless DeX for instant phone/Mac screen mirroring'
      ],
      description: 'The all-in-one do-it-all screen for modern apartments and studios. Connect your laptop via single-cable USB-C for 4K productivity, then pick up the remote to enjoy built-in 4K streaming apps after hours.',
      specs: [
        { key: 'Screen Size', val: '32" 4K UHD (3840 × 2160) HDR10+' },
        { key: 'Smart Platform', val: 'Tizen Smart TV OS + AirPlay 2 + Microsoft 365 Web' },
        { key: 'Ports', val: 'USB-C (65W PD), Micro HDMI, 2× USB-A Hub, Wi-Fi 5, BT 5.2' },
        { key: 'Included Camera', val: 'Magnetic Snap-On Full HD SlimFit Webcam' }
      ],
      boxContents: [
        'Samsung Smart Monitor M8 32"',
        'Magnetic SlimFit Camera + SolarCell Remote',
        'USB-C Cable + HDMI Cable + Power Brick'
      ]
    },

    // =========================================================================
    // 7. PRINTERS
    // =========================================================================
    {
      id: 'dp-gad-hp-4103fdw',
      slug: 'hp-laserjet-pro-mfp-4103fdw-wireless-printer',
      name: 'HP LaserJet Pro MFP 4103fdw Wireless Duplex Office Printer',
      brand: 'HP',
      category: 'printers',
      categoryLabel: 'Printers',
      price: 685000,
      originalPrice: 765000,
      rating: 4.9,
      reviewCount: 44,
      stockCount: 8,
      badge: '40 ppm Fast Laser',
      badgeTone: 'blue',
      featured: true,
      shortSpec: 'Print • Scan • Copy • Fax • Auto Duplex • Dual-Band Wi-Fi & Ethernet',
      image: '/images/gadgets/printer-wireless-mfp.jpg',
      images: [
        '/images/gadgets/printer-wireless-mfp.jpg'
      ],
      warranty: '1-Year Official HP Nigeria Warranty',
      variants: [
        { label: 'Printer + Pre-Installed Starter Toner', priceDelta: 0 },
        { label: 'Bundle + Extra Genuine HP 151A Toner', priceDelta: 118000 }
      ],
      highlights: [
        'Blistering 40 pages-per-minute laser print speed built for busy offices',
        'Automatic two-sided (duplex) printing & 50-sheet dual-side ADF scanner',
        'Print directly from smartphones & laptops via Dual-Band Wi-Fi, AirPrint & HP Smart App',
        'HP Wolf Pro Security protects corporate networks & sensitive office documents'
      ],
      description: 'Engineered for high-volume Nigerian offices, law firms, clinics, and enterprises, the HP LaserJet Pro MFP 4103fdw delivers crisp laser text at 40 ppm with zero-hassle wireless, Gigabit Ethernet, and automatic duplex efficiency.',
      specs: [
        { key: 'Functions', val: 'Print, Copy, Scan (Dual-Side ADF), Fax' },
        { key: 'Print Speed', val: 'Up to 40 ppm (A4 Monochrome Laser)' },
        { key: 'Duplex Printing', val: 'Automatic Two-Sided Print & Scan' },
        { key: 'Connectivity', val: 'Dual-Band Wi-Fi, Gigabit Ethernet, Hi-Speed USB 2.0, Walk-up USB' },
        { key: 'Monthly Duty Cycle', val: 'Up to 80,000 Pages (Recommended 750–4,000/mo)' }
      ],
      boxContents: [
        'HP LaserJet Pro MFP 4103fdw Printer',
        'Pre-installed Original HP Black LaserJet Toner',
        'Power Cord, USB Cable & Setup Guide'
      ]
    },
    {
      id: 'dp-gad-epson-l3250',
      slug: 'epson-ecotank-l3250-wifi-all-in-one-printer',
      name: 'Epson EcoTank L3250 Wi-Fi Direct All-in-One Ink Tank Printer',
      brand: 'Epson',
      category: 'printers',
      categoryLabel: 'Printers',
      price: 315000,
      originalPrice: 358000,
      rating: 4.9,
      reviewCount: 131,
      stockCount: 21,
      badge: 'Ultra-Low Ink Cost',
      badgeTone: 'green',
      featured: false,
      shortSpec: 'Color Print/Scan/Copy • 4,500 B&W / 7,500 Color Yield • Wi-Fi Direct',
      image: '/images/gadgets/printer-wireless-mfp.jpg',
      images: [
        '/images/gadgets/printer-wireless-mfp.jpg'
      ],
      warranty: '1-Year Official Epson Nigeria Warranty',
      variants: [
        { label: 'L3250 Wi-Fi + Full 4-Bottle Ink Set', priceDelta: 0 },
        { label: 'L3250 + Extra 4-Color Refill Pack', priceDelta: 38000 }
      ],
      highlights: [
        'Cartridge-free EcoTank system prints up to 4,500 black & 7,500 color pages per refill',
        'Heat-Free Micro Piezo technology draws ultra-low wattage — ideal for solar/inverter power!',
        'Spill-free keyed ink bottles prevent messy refills or wrong color pours',
        'Seamless Wi-Fi & Wi-Fi Direct printing straight from iPhone, Android, or laptop'
      ],
      description: 'The smartest color printer for Nigerian homes, schools, and growing businesses. Epson’s Heat-Free EcoTank L3250 slashes printing costs by up to 90% and consumes minimal power (just 12W operating), running effortlessly on small solar power stations.',
      specs: [
        { key: 'Functions', val: 'Color Print, Scan, Copy (Borderless Photo Support)' },
        { key: 'Power Consumption', val: '12W Operating (100% Solar & Inverter Friendly!)' },
        { key: 'Ink Yield (Included)', val: 'Up to 4,500 Black / 7,500 Color Pages' },
        { key: 'Connectivity', val: 'Wi-Fi, Wi-Fi Direct, Epson Smart Panel App, USB' }
      ],
      boxContents: [
        'Epson EcoTank L3250 Wi-Fi Printer',
        '4× Genuine Epson 003 Ink Bottles (BK, C, M, Y)',
        'Power Cable, USB Cable & Manual'
      ]
    },
    {
      id: 'dp-gad-canon-g3470',
      slug: 'canon-pixma-g3470-megatank-wireless-printer',
      name: 'Canon PIXMA G3470 MegaTank Wireless 3-in-1 Color Printer',
      brand: 'Canon',
      category: 'printers',
      categoryLabel: 'Printers',
      price: 298000,
      originalPrice: 340000,
      rating: 4.7,
      reviewCount: 52,
      stockCount: 12,
      badge: 'Inverter Friendly',
      badgeTone: 'blue',
      featured: false,
      shortSpec: 'MegaTank Refillable • 1.3" LCD Screen • AirPrint & Mopria Wi-Fi',
      image: '/images/gadgets/printer-wireless-mfp.jpg',
      images: [
        '/images/gadgets/printer-wireless-mfp.jpg'
      ],
      warranty: '1-Year Official Canon Warranty',
      variants: [
        { label: 'Matte Black Edition', priceDelta: 0 },
        { label: 'Crisp White Edition', priceDelta: 5000 }
      ],
      highlights: [
        'High-yield MegaTank prints up to 6,000 black / 7,700 color pages per full bottle set',
        'Crisp 1.35" square LCD screen for effortless standalone copying & Wi-Fi setup',
        'User-replaceable maintenance cartridge maximizes printer lifespan',
        'Supports Apple AirPrint, Mopria Android & Canon PRINT app'
      ],
      description: 'Fast, vivid, and economical. The Canon PIXMA G3470 brings crisp document text, vibrant borderless photos, and ultra-low operating power draw to home offices and creative studios.',
      specs: [
        { key: 'Functions', val: 'Wireless Print, Copy, Scan' },
        { key: 'Print Speed', val: '11 ipm Mono / 6 ipm Color' },
        { key: 'Connectivity', val: 'Wi-Fi, AirPrint, Mopria, Cloud Link, USB' },
        { key: 'Power Draw', val: '14W Active (Safe for Small Inverters)' }
      ],
      boxContents: [
        'Canon PIXMA G3470 MegaTank Printer',
        '4× High-Yield GI-41 Ink Bottles',
        'Power Cord & Documentation'
      ]
    },

    // =========================================================================
    // 8. HEADPHONES & PERSONAL AUDIO
    // =========================================================================
    {
      id: 'dp-gad-sony-xm5',
      slug: 'sony-wh-1000xm5-wireless-anc-headphones',
      name: 'Sony WH-1000XM5 Wireless Industry-Leading ANC Headphones',
      brand: 'Sony',
      category: 'audio',
      categoryLabel: 'Headphones & Audio',
      price: 495000,
      originalPrice: 560000,
      rating: 4.9,
      reviewCount: 119,
      stockCount: 10,
      badge: '#1 Noise Canceling',
      badgeTone: 'gold',
      featured: true,
      shortSpec: '8-Mic Auto NC Optimizer • 30hr Battery • Multipoint BT • LDAC Hi-Res',
      image: '/images/gadgets/audio-headphones-anc.jpg',
      images: [
        '/images/gadgets/audio-headphones-anc.jpg',
        '/images/gadgets/hero-gadgets-showcase.jpg'
      ],
      warranty: '1-Year Official Sony Warranty',
      variants: [
        { label: 'Midnight Black', priceDelta: 0 },
        { label: 'Midnight Blue', priceDelta: 10000 },
        { label: 'Platinum Silver', priceDelta: 10000 }
      ],
      highlights: [
        'Dual processors + 8 microphones silence generator hum, traffic, and cabin noise effortlessly',
        'Ultra-lightweight 250g soft-fit leatherette cushions for zero-fatigue all-day wear',
        '30 hours continuous ANC playback + 3-minute USB-C PD charge gives 3 hours of listening',
        'Multipoint Bluetooth connects seamlessly to your laptop & smartphone simultaneously'
      ],
      description: 'Block out the world and step into studio serenity. Sony’s flagship WH-1000XM5 delivers unmatched active noise cancellation, crystal-clear 4-beamforming call quality, and warm LDAC high-resolution audio.',
      specs: [
        { key: 'Noise Cancellation', val: 'Integrated V1 + QN1 Processors with 8 Microphones' },
        { key: 'Battery Life', val: 'Up to 30 Hours (ANC On) / 40 Hours (ANC Off)' },
        { key: 'Audio Codecs', val: 'LDAC Hi-Res Wireless, AAC, SBC + 3.5mm Wired' },
        { key: 'Multipoint', val: 'Connect 2 Bluetooth Devices Simultaneously' }
      ],
      boxContents: [
        'Sony WH-1000XM5 Wireless Headphones',
        'Collapsible Hard Carry Case',
        'USB-C Charging Cable + 3.5mm Audio Cable'
      ]
    },
    {
      id: 'dp-gad-apple-ap2',
      slug: 'apple-airpods-pro-2-usbc',
      name: 'Apple AirPods Pro (2nd Gen) with MagSafe USB-C Case',
      brand: 'Apple',
      category: 'audio',
      categoryLabel: 'Headphones & Audio',
      price: 365000,
      originalPrice: 415000,
      rating: 4.9,
      reviewCount: 156,
      stockCount: 17,
      badge: 'Original Sealed',
      badgeTone: 'blue',
      featured: false,
      shortSpec: 'Apple H2 Chip • 2x Active Noise Cancellation • Adaptive Audio • IP54',
      image: '/images/gadgets/audio-headphones-anc.jpg',
      images: [
        '/images/gadgets/audio-headphones-anc.jpg'
      ],
      warranty: '1-Year Apple Limited Warranty',
      variants: [
        { label: 'USB-C MagSafe Case (White)', priceDelta: 0 }
      ],
      highlights: [
        'H2 chip delivers up to 2× stronger Active Noise Cancellation & Adaptive Transparency',
        'Conversation Awareness lowers volume automatically when you speak to someone',
        'Precision Finding U1 chip & built-in speaker in the MagSafe USB-C case',
        'Up to 6 hours listening per charge (30 hours total with charging case)'
      ],
      description: 'Re-engineered for richer bass, crystal highs, and intelligent noise control. Apple AirPods Pro 2 with USB-C pair instantaneously with iPhone, iPad, and Mac while keeping you immersed anywhere.',
      specs: [
        { key: 'Chipset', val: 'Apple H2 Audio Chip + U1 Precision Finding Case' },
        { key: 'Battery Life', val: '6 Hours Buds / 30 Hours Total with MagSafe Case' },
        { key: 'Resistance', val: 'IP54 Dust, Sweat & Water Resistant (Buds & Case)' },
        { key: 'Charging', val: 'USB-C, MagSafe, Apple Watch Charger & Qi Wireless' }
      ],
      boxContents: [
        'AirPods Pro (2nd Generation)',
        'MagSafe Charging Case (USB-C)',
        '4 Pairs Silicone Ear Tips (XS, S, M, L) + USB-C Cable'
      ]
    },

    // =========================================================================
    // 9. SMART HUBS, GaN CHARGERS & WORKSPACE ACCESSORIES
    // =========================================================================
    {
      id: 'dp-gad-anker-100w-gan',
      slug: 'anker-prime-100w-gan-3-port-charger',
      name: 'Anker Prime 100W GaN 3-Port Ultra-Compact Fast Wall Charger',
      brand: 'Anker',
      category: 'accessories',
      categoryLabel: 'GaN Chargers & Hubs',
      price: 89000,
      originalPrice: 108000,
      rating: 4.9,
      reviewCount: 94,
      stockCount: 24,
      badge: 'GaNPrime Tech',
      badgeTone: 'gold',
      featured: false,
      shortSpec: '100W 3-Port (2× USB-C + 1× USB-A) • ActiveShield 2.0 • UK 3-Pin Plug',
      image: '/images/gadgets/accessories-gan-hub.jpg',
      images: [
        '/images/gadgets/accessories-gan-hub.jpg',
        '/images/gadgets/powerbank-pd-digital.jpg'
      ],
      warranty: '18-Month Official Anker Warranty',
      variants: [
        { label: '100W 3-Port UK 3-Pin Plug', priceDelta: 0 },
        { label: '100W Charger + 240W Braided USB-C Cable', priceDelta: 16000 }
      ],
      highlights: [
        'Replace 3 bulky bricks with one pocket-sized 100W GaN charger for laptop, phone & earbuds',
        '43% smaller than standard 96W laptop adapters with solid Nigerian UK 3-pin fit',
        'ActiveShield 2.0 monitors temperature 3 million times daily to protect expensive devices',
        'Intelligent PowerIQ 4.0 dynamically balances wattage across all 3 connected ports'
      ],
      description: 'Clean up your power strip and travel lighter. Anker Prime 100W GaN delivers blazing fast charging to MacBooks, HP/Dell USB-C laptops, iPhones, and Samsung Super Fast Charge devices simultaneously.',
      specs: [
        { key: 'Max Power Output', val: '100W Total (Single USB-C up to 100W)' },
        { key: 'Ports', val: '2× USB-C PD + 1× USB-A Fast Charge' },
        { key: 'Plug Type', val: 'UK 3-Pin (Nigeria Standard Wall Socket)' },
        { key: 'Safety Suite', val: 'ActiveShield 2.0 Thermal & Surge Protection' }
      ],
      boxContents: [
        'Anker Prime 100W GaN Wall Charger',
        'Welcome Guide & 18-Month Warranty'
      ]
    },
    {
      id: 'dp-gad-ugreen-9in1',
      slug: 'ugreen-revodok-pro-9in1-usbc-docking-hub',
      name: 'UGREEN Revodok Pro 9-in-1 USB-C Hub (4K@60Hz • 100W PD • Gigabit)',
      brand: 'UGREEN',
      category: 'accessories',
      categoryLabel: 'GaN Chargers & Hubs',
      price: 68000,
      originalPrice: 82000,
      rating: 4.8,
      reviewCount: 71,
      stockCount: 27,
      badge: 'Essential Dock',
      badgeTone: 'blue',
      featured: false,
      shortSpec: '4K@60Hz HDMI • 100W PD Pass-Through • 1Gbps Ethernet • 10Gbps USB',
      image: '/images/gadgets/accessories-gan-hub.jpg',
      images: [
        '/images/gadgets/accessories-gan-hub.jpg'
      ],
      warranty: '1-Year Official UGREEN Warranty',
      variants: [
        { label: '9-in-1 Pro (4K60 + Ethernet + SD/TF)', priceDelta: 0 },
        { label: '7-in-1 Compact (4K60 + 100W PD)', priceDelta: -21000 }
      ],
      highlights: [
        'Expand 1 laptop USB-C port into 9 pro connections instantly (zero drivers needed)',
        'Crisp 4K@60Hz HDMI output for external monitors & boardroom projectors',
        '10Gbps USB-C & USB-A data ports transfer a 20GB video file in ~16 seconds',
        '1000Mbps Gigabit Ethernet + SD/microSD card reader + 100W PD charging pass-through'
      ],
      description: 'Machined from heat-dissipating space-gray aluminum, the UGREEN Revodok Pro 9-in-1 transforms your MacBook, iPad Pro, or Windows ultrabook into a complete desktop workstation anywhere.',
      specs: [
        { key: 'Video Output', val: 'HDMI 2.0 up to 4K @ 60Hz' },
        { key: 'Data Ports', val: '1× USB-C 10Gbps, 2× USB-A 10Gbps, 1× USB-A 5Gbps' },
        { key: 'Network & Cards', val: 'RJ45 1000Mbps Ethernet + Dual SD/TF UHS-I Slots' },
        { key: 'Power Delivery', val: '100W USB-C PD Pass-Through Charging' }
      ],
      boxContents: [
        'UGREEN Revodok Pro 9-in-1 USB-C Hub',
        'User Manual & Warranty Card'
      ]
    },
    {
      id: 'dp-gad-sandisk-2tb',
      slug: 'sandisk-extreme-portable-ssd-2tb',
      name: 'SanDisk Extreme Portable SSD 2TB (1050MB/s • IP65 Rugged)',
      brand: 'SanDisk',
      category: 'accessories',
      categoryLabel: 'GaN Chargers & Hubs',
      price: 258000,
      originalPrice: 295000,
      rating: 4.9,
      reviewCount: 86,
      stockCount: 14,
      badge: '1050MB/s NVMe',
      badgeTone: 'navy',
      featured: false,
      shortSpec: '2TB NVMe SSD • 1050MB/s Read • 3m Drop Proof • Hardware AES-256',
      image: '/images/gadgets/accessories-gan-hub.jpg',
      images: [
        '/images/gadgets/accessories-gan-hub.jpg'
      ],
      warranty: '2-Year Official SanDisk Warranty',
      variants: [
        { label: '1TB Rugged NVMe', priceDelta: -102000 },
        { label: '2TB Rugged NVMe', priceDelta: 0 },
        { label: '4TB Rugged NVMe', priceDelta: 245000 }
      ],
      highlights: [
        'Blazing 1,050MB/s NVMe read & 1,000MB/s write speeds edit 4K ProRes directly off drive',
        'IP65 water & dust resistance + up to 3-meter rugged drop protection',
        '256-bit AES hardware password encryption keeps sensitive files secure',
        'Works natively with iPhone 15/16 Pro, Mac, Windows & Android via USB-C'
      ],
      description: 'Pocket-sized speed built for photographers, videographers, and engineers. Back up huge project libraries in seconds and carry 2TB of rugged NVMe storage clipped right to your bag.',
      specs: [
        { key: 'Capacity', val: '2TB Solid-State NVMe' },
        { key: 'Transfer Speed', val: 'Up to 1,050 MB/s Read / 1,000 MB/s Write' },
        { key: 'Interface', val: 'USB 3.2 Gen 2 Type-C (USB-A Adapter Included)' },
        { key: 'Durability', val: 'IP65 Water/Dust Resistant + 3m Drop Rated' }
      ],
      boxContents: [
        'SanDisk Extreme Portable SSD 2TB',
        'USB-C to USB-C Cable + USB-C to USB-A Adapter',
        'Safety & Warranty Guide'
      ]
    },
    {
      id: 'dp-gad-logi-brio4k',
      slug: 'logitech-mx-brio-4k-ultra-hd-webcam',
      name: 'Logitech MX Brio 4K Ultra HD Webcam',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      subCategory: 'webcams',
      partNumber: '960-001559',
      modelCode: 'EMEA28i-935',
      color: 'Graphite',
      connectivityType: 'USB-C Detachable (1.5m)',
      price: 246490,
      originalPrice: 285000,
      rating: 4.9,
      reviewCount: 43,
      stockCount: 10,
      badge: 'P/N: 960-001559',
      badgeTone: 'gold',
      featured: true,
      shortSpec: '4K UHD@30fps / 1080p@60fps • Show Mode Tilt • Dual Beamforming Mics • P/N: 960-001559',
      image: '/images/gadgets/logitech-mx-brio-4k-webcam.jpg',
      images: [
        '/images/gadgets/logitech-mx-brio-4k-webcam.jpg',
        '/images/gadgets/logitech-mx-brio-4k-webcam-alt.jpg'
      ],
      warranty: '1-Year Official Logitech Warranty',
      variants: [
        { label: 'Graphite Aluminum', priceDelta: 0 }
      ],
      highlights: [
        '70% larger Sony STARVIS 4K sensor delivers 2× sharper visibility in dim rooms',
        'Built-in Show Mode tilts down to share sketches, hardware, or documents on your desk',
        'Integrated twist privacy shutter & dual noise-reducing beamforming microphones',
        'Certified for Microsoft Teams, Zoom, Google Meet & OBS Studio'
      ],
      description: 'Command every boardroom call and live presentation with Logitech’s flagship 4K webcam. Factory-sealed official warehouse stock with P/N 960-001559, crafted in sleek machined aluminum.',
      specs: [
        { key: 'Part Number', val: '960-001559' },
        { key: 'Model Code', val: 'EMEA28i-935' },
        { key: 'Video Resolution', val: '4K UHD @ 30fps / 1080p Full HD @ 60fps' },
        { key: 'Microphones', val: 'Dual Beamforming Noise-Reducing Mics' },
        { key: 'Privacy', val: 'Integrated Mechanical Twist Privacy Shutter' },
        { key: 'Connection', val: 'Detachable USB-C 3.0 Cable (1.5m)' },
        { key: 'Stock Availability', val: '10 units in Lagos warehouse' }
      ],
      boxContents: [
        'Logitech MX Brio 4K Webcam',
        'Magnetic Monitor Mount Clip',
        'USB-C to USB-C 3.0 Cable & Guide'
      ]
    }
  ];

  // Utility Helpers
  function formatNaira(amount) {
    return '₦' + Number(amount || 0).toLocaleString('en-NG');
  }

  function getDiscountPct(price, originalPrice) {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  function getAll() {
    return GADGETS.slice();
  }

  function getBySlug(slug) {
    if (!slug) return null;
    const normalized = String(slug).trim().toLowerCase();
    return GADGETS.find(g => g.slug.toLowerCase() === normalized || g.id.toLowerCase() === normalized) || null;
  }

  function getByCategory(catId) {
    if (!catId || catId === 'all') return GADGETS.slice();
    return GADGETS.filter(g => g.category === catId);
  }

  function getRelated(gadget, limit) {
    const max = limit || 4;
    if (!gadget) return GADGETS.slice(0, max);
    const sameCat = GADGETS.filter(g => g.slug !== gadget.slug && g.category === gadget.category);
    const sameBrand = GADGETS.filter(g => g.slug !== gadget.slug && g.category !== gadget.category && g.brand === gadget.brand);
    const others = GADGETS.filter(g => g.slug !== gadget.slug && g.category !== gadget.category && g.brand !== gadget.brand);
    return [...sameCat, ...sameBrand, ...others].slice(0, max);
  }

  function getCategoriesWithCounts() {
    return CATEGORIES.map(cat => ({
      ...cat,
      count: cat.id === 'all' ? GADGETS.length : GADGETS.filter(g => g.category === cat.id).length
    }));
  }

  function getLogitech() {
    return GADGETS.filter(g => g.brand.toLowerCase() === 'logitech' || g.category === 'logitech');
  }

  function getBrands() {
    const counts = {};
    GADGETS.forEach(g => {
      counts[g.brand] = (counts[g.brand] || 0) + 1;
    });
    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .map(brand => ({ name: brand, count: counts[brand] }));
  }

  global.DeviceProGadgets = {
    CATEGORIES,
    GADGETS,
    formatNaira,
    getDiscountPct,
    getAll,
    getBySlug,
    getByCategory,
    getLogitech,
    getRelated,
    getCategoriesWithCounts,
    getBrands
  };
})(window);
