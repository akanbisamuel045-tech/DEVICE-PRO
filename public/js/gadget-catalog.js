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
      id: 'dp-gad-logi-mx3s',
      slug: 'logitech-mx-master-3s-wireless-mouse',
      name: 'Logitech MX Master 3S Wireless Performance Mouse',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      price: 168000,
      originalPrice: 195000,
      rating: 4.9,
      reviewCount: 142,
      stockCount: 14,
      badge: 'Logitech Official',
      badgeTone: 'gold',
      featured: true,
      shortSpec: '8,000 DPI Darkfield • Quiet Clicks • MagSpeed Scroll • USB-C',
      image: '/images/gadgets/logitech-mx-mouse.jpg',
      images: [
        '/images/gadgets/logitech-mx-mouse.jpg',
        '/images/gadgets/logitech-mx-keyboard.jpg',
        '/images/gadgets/hero-gadgets-showcase.jpg'
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Graphite (Logi Bolt + BT)', priceDelta: 0 },
        { label: 'Pale Gray (Logi Bolt + BT)', priceDelta: 4000 },
        { label: 'For Mac — Space Gray', priceDelta: 6000 }
      ],
      highlights: [
        '8,000 DPI optical sensor tracks seamlessly on any surface — even clear glass',
        'Quiet Click buttons deliver tactile precision with 90% less click noise',
        'MagSpeed electromagnetic steel wheel scrolls 1,000 lines per second silently',
        'Pair & switch instantly across 3 devices (Windows, macOS, Linux, iPadOS)',
        'USB-C quick charge: 1 minute of charging gives 3 hours of use; up to 70 days per full charge'
      ],
      description: 'Engineered for creators, developers, and executive workspaces, the Logitech MX Master 3S redefines ergonomic precision. Sculpted to support your palm and wrist through long sessions, it pairs an ultra-accurate 8K DPI Darkfield sensor with machined steel MagSpeed scrolling and Logi Options+ app-specific workflow shortcuts.',
      specs: [
        { key: 'Sensor Technology', val: 'Darkfield High Precision Optical (200 – 8,000 DPI)' },
        { key: 'Scroll Wheel', val: 'MagSpeed Electromagnetic Steel + Side Thumb Wheel' },
        { key: 'Buttons', val: '7 Programmable Buttons + Gesture Thumb Button (Quiet Click)' },
        { key: 'Connectivity', val: 'Bluetooth Low Energy + Logi Bolt USB Receiver' },
        { key: 'Multi-Device', val: 'Easy-Switch up to 3 Computers + Logitech Flow' },
        { key: 'Battery Life', val: 'Rechargeable Li-Po (500 mAh) — up to 70 days' },
        { key: 'Charging Port', val: 'USB-C Fast Charge (Cable Included)' },
        { key: 'Compatibility', val: 'Windows 10/11, macOS 10.15+, Linux, ChromeOS, iPadOS' }
      ],
      boxContents: [
        'Logitech MX Master 3S Wireless Mouse',
        'Logi Bolt USB-A Receiver',
        'USB-C to USB-A Charging Cable',
        'Official User Documentation & Warranty Card'
      ]
    },
    {
      id: 'dp-gad-logi-mxkeys',
      slug: 'logitech-mx-keys-s-wireless-keyboard',
      name: 'Logitech MX Keys S Wireless Illuminated Keyboard',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      price: 185000,
      originalPrice: 215000,
      rating: 4.9,
      reviewCount: 98,
      stockCount: 11,
      badge: 'Best Seller',
      badgeTone: 'blue',
      featured: true,
      shortSpec: 'Smart Backlighting • Spherically-Dished Keys • Multi-OS • USB-C',
      image: '/images/gadgets/logitech-mx-keyboard.jpg',
      images: [
        '/images/gadgets/logitech-mx-keyboard.jpg',
        '/images/gadgets/logitech-mx-mouse.jpg',
        '/images/gadgets/hero-gadgets-showcase.jpg'
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Graphite (Full Size)', priceDelta: 0 },
        { label: 'Pale Gray (Full Size)', priceDelta: 5000 },
        { label: 'MX Keys Mini Compact', priceDelta: -22000 }
      ],
      highlights: [
        'Fluid, whisper-quiet laptop-style typing with spherically-dished keys shaped for fingertips',
        'Proximity-sensing smart backlighting illuminates keys as your hands approach',
        'Programmable Smart Actions via Logi Options+ automate repetitive multi-step tasks',
        'Single anodized metal chassis provides rock-solid desk stability',
        'Connect up to 3 devices via Bluetooth Low Energy or included Logi Bolt receiver'
      ],
      description: 'Master your flow with the Logitech MX Keys S. Built around a solid metallic plate with precision Perfect Stroke scissor switches, every keystroke feels responsive, crisp, and effortless. Intelligent ambient light sensors automatically adjust backlighting brightness so you stay productive day and night.',
      specs: [
        { key: 'Key Switch Type', val: 'Perfect Stroke Low-Profile Scissor Keys' },
        { key: 'Backlighting', val: 'Hand-Proximity & Ambient Light Auto-Adjusting White LED' },
        { key: 'Connectivity', val: 'Bluetooth Low Energy + Logi Bolt USB Receiver' },
        { key: 'Multi-Device', val: 'Easy-Switch across 3 paired devices' },
        { key: 'Battery Life', val: 'Up to 10 days (backlit) / 5 months (backlight off)' },
        { key: 'Charging Interface', val: 'USB-C Rechargeable (Cable Included)' },
        { key: 'Layout', val: 'Full-Size with Dual Windows & macOS Legend Keys' },
        { key: 'Dimensions', val: '430.2 × 131.6 × 20.5 mm (810 g)' }
      ],
      boxContents: [
        'Logitech MX Keys S Illuminated Wireless Keyboard',
        'Logi Bolt USB Receiver',
        'USB-C Charging Cable',
        'Quick Start Guide & Warranty Card'
      ]
    },
    {
      id: 'dp-gad-logi-pebble2',
      slug: 'logitech-pebble-2-combo-keyboard-mouse',
      name: 'Logitech Pebble 2 Combo Minimalist Keyboard & Mouse',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      price: 92000,
      originalPrice: 110000,
      rating: 4.8,
      reviewCount: 76,
      stockCount: 19,
      badge: 'Combo Value',
      badgeTone: 'green',
      featured: false,
      shortSpec: 'Ultra-Slim K380s + M350s • Silent Touch • 3-Device Switch',
      image: '/images/gadgets/logitech-mx-keyboard.jpg',
      images: [
        '/images/gadgets/logitech-mx-keyboard.jpg',
        '/images/gadgets/logitech-mx-mouse.jpg'
      ],
      warranty: '1-Year Official Logitech & DEVICE PRO Warranty',
      variants: [
        { label: 'Tonal Graphite Combo', priceDelta: 0 },
        { label: 'Tonal White Combo', priceDelta: 0 }
      ],
      highlights: [
        'Complete portable workspace: Pebble Keys 2 K380s + Pebble Mouse 2 M350s',
        'Silent Touch technology cuts click and typing noise by 90%',
        'Switch between laptop, tablet, and smartphone with one tap',
        'Up to 36 months keyboard battery life & 24 months mouse battery life'
      ],
      description: 'Defy the boring desk setup with the ultra-slim, lightweight Logitech Pebble 2 Combo. Designed to slip effortlessly into any laptop bag while offering multi-OS compatibility across Windows, macOS, iPadOS, and Android.',
      specs: [
        { key: 'Included Devices', val: 'Pebble Keys 2 K380s + Pebble Mouse 2 M350s' },
        { key: 'Connectivity', val: 'Bluetooth Low Energy + Logi Bolt USB Receiver' },
        { key: 'Noise Reduction', val: 'Silent Touch Quiet Clicks & Low-Profile Keys' },
        { key: 'Mouse DPI', val: '400 – 4,000 DPI High-Precision Optical' },
        { key: 'Battery Life', val: '36 Months (Keyboard) / 24 Months (Mouse)' }
      ],
      boxContents: [
        'Logitech Pebble Keys 2 K380s Keyboard',
        'Logitech Pebble Mouse 2 M350s',
        'Logi Bolt USB Receiver',
        'Pre-installed Alkaline Batteries & Guide'
      ]
    },
    {
      id: 'dp-gad-logi-gpro2',
      slug: 'logitech-g-pro-x-superlight-2-gaming-mouse',
      name: 'Logitech G PRO X Superlight 2 Wireless Esports Mouse',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      price: 235000,
      originalPrice: 265000,
      rating: 5.0,
      reviewCount: 64,
      stockCount: 7,
      badge: 'Pro Esports',
      badgeTone: 'navy',
      featured: false,
      shortSpec: '60g Ultra-Light • HERO 2 32K Sensor • LIGHTSPEED 4KHz • USB-C',
      image: '/images/gadgets/logitech-mx-mouse.jpg',
      images: [
        '/images/gadgets/logitech-mx-mouse.jpg',
        '/images/gadgets/hero-gadgets-showcase.jpg'
      ],
      warranty: '1-Year Official Logitech Warranty',
      variants: [
        { label: 'Matte Black', priceDelta: 0 },
        { label: 'Matte White', priceDelta: 5000 }
      ],
      highlights: [
        'Featherweight 60-gram chassis co-engineered with world esports champions',
        'HERO 2 sensor tracks up to 32,000 DPI at over 500 IPS with zero smoothing',
        'LIGHTFORCE hybrid optical-mechanical switches for crisp, instant actuation',
        'Up to 95 hours continuous wireless play with USB-C fast charging'
      ],
      description: 'Built for zero hesitation and tournament-grade accuracy, the Logitech G PRO X Superlight 2 pairs an ultra-light 60g frame with pro-grade LIGHTSPEED wireless reliability and zero-additive PTFE glide feet.',
      specs: [
        { key: 'Weight', val: '60 grams' },
        { key: 'Sensor', val: 'HERO 2 Optical (100 – 32,000 DPI)' },
        { key: 'Switches', val: 'LIGHTFORCE Hybrid Optical-Mechanical' },
        { key: 'Wireless Tech', val: 'Pro-Grade LIGHTSPEED Wireless (up to 4,000 Hz polling)' },
        { key: 'Battery Life', val: 'Up to 95 Hours Continuous Motion (USB-C)' }
      ],
      boxContents: [
        'Logitech G PRO X Superlight 2 Mouse',
        'LIGHTSPEED Wireless Receiver & Extension Adapter',
        'USB-A to USB-C Charging/Data Cable',
        'Optional Grip Tape & PTFE Aperture Door'
      ]
    },

    // =========================================================================
    // 2. SMARTPHONES
    // =========================================================================
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
      name: 'Logitech MX Brio Ultra HD 4K Pro Webcam (AI Face Clarity)',
      brand: 'Logitech',
      category: 'logitech',
      categoryLabel: 'Logitech Gear',
      price: 278000,
      originalPrice: 315000,
      rating: 4.9,
      reviewCount: 43,
      stockCount: 9,
      badge: '4K Studio Cam',
      badgeTone: 'gold',
      featured: false,
      shortSpec: '4K@30fps / 1080p@60fps • Show Mode Tilt • Dual Beamforming Mics',
      image: '/images/gadgets/logitech-mx-mouse.jpg',
      images: [
        '/images/gadgets/logitech-mx-mouse.jpg',
        '/images/gadgets/monitor-4k-ultrasharp.jpg'
      ],
      warranty: '1-Year Official Logitech Warranty',
      variants: [
        { label: 'Graphite Aluminum', priceDelta: 0 },
        { label: 'Pale Gray Aluminum', priceDelta: 6000 }
      ],
      highlights: [
        '70% larger Sony STARVIS 4K sensor delivers 2× sharper visibility in dim rooms',
        'Built-in Show Mode tilts down to share sketches, hardware, or documents on your desk',
        'Integrated twist privacy shutter & dual noise-reducing beamforming microphones',
        'Certified for Microsoft Teams, Zoom, Google Meet & OBS Studio'
      ],
      description: 'Command every boardroom call and live presentation with Logitech’s flagship 4K webcam. Crafted in sleek machined aluminum to match your MX Master 3S and MX Keys S desk setup.',
      specs: [
        { key: 'Video Resolution', val: '4K UHD @ 30fps / 1080p Full HD @ 60fps' },
        { key: 'Microphones', val: 'Dual Beamforming Noise-Reducing Mics' },
        { key: 'Privacy', val: 'Integrated Mechanical Twist Privacy Shutter' },
        { key: 'Connection', val: 'Detachable USB-C 3.0 Cable (1.5m)' }
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
    getRelated,
    getCategoriesWithCounts,
    getBrands
  };
})(window);
