-- =========================================================================
-- DEVICE PRO — Database Schema (SQLite / Node.js native DatabaseSync)
-- Stage 12: Data Model, Migrations, and Persistence Architecture
-- =========================================================================

-- 1. Schema Migrations Tracker
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT DEFAULT (datetime('now'))
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 3. Products (Expanded for full inventory tracking)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  category_label TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  price_ngn INTEGER NOT NULL,
  previous_price_ngn INTEGER,
  power_rating TEXT,
  power_tier TEXT,
  specifications TEXT,
  image_url TEXT NOT NULL,
  stock_status TEXT DEFAULT 'in_stock',
  stock_quantity INTEGER DEFAULT 50,
  featured INTEGER DEFAULT 0,
  published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. Customer Enquiries & Contact Messages
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  state TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'new', -- 'new', 'in_progress', 'contacted', 'resolved', 'archived'
  admin_notes TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 5. Formal Solar Quotation & Site Audit Requests
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  state TEXT,
  property_type TEXT,
  sector TEXT DEFAULT 'residential', -- 'residential', 'commercial', 'industrial', 'agriculture'
  package_id INTEGER,
  package_slug TEXT,
  package_name TEXT,
  load_details TEXT,
  indicative_inverter_kva REAL,
  indicative_battery_kwh REAL,
  indicative_solar_kwp REAL,
  status TEXT DEFAULT 'new', -- 'new', 'under_review', 'survey_scheduled', 'proposal_sent', 'accepted', 'declined'
  admin_notes TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (package_id) REFERENCES products(id) ON DELETE SET NULL
);

-- 6. Equipment Orders (Direct Commerce)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  delivery_address TEXT NOT NULL,
  delivery_state TEXT NOT NULL,
  items_json TEXT NOT NULL, -- JSON array of items: [{id, name, price, qty, subtotal}]
  subtotal_ngn INTEGER NOT NULL,
  delivery_fee_ngn INTEGER DEFAULT 0,
  total_ngn INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'transfer', -- 'transfer', 'card', 'pod'
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'failed', 'refunded'
  order_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'dispatched', 'delivered', 'cancelled'
  -- Fulfillment & Logistics Tracking (Stage 16)
  waybill_number TEXT,
  courier_partner TEXT,
  estimated_delivery TEXT,
  -- Certified Installation & Commissioning (Stage 16)
  assigned_engineer TEXT,
  engineer_phone TEXT,
  installation_scheduled_date TEXT,
  commissioning_status TEXT DEFAULT 'pending', -- 'pending', 'scheduled', 'in_progress', 'commissioned'
  commissioning_tests TEXT, -- JSON checklist of electrical & safety tests
  commissioning_date TEXT,
  commissioning_certificate_id TEXT,
  admin_notes TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 7. Staff & Admin User Authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales', -- 'superadmin', 'engineer', 'sales', 'support'
  is_active INTEGER DEFAULT 1,
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 8. Active Sessions
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Projects & Case Studies
CREATE TABLE IF NOT EXISTS case_studies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  sector TEXT NOT NULL,
  location TEXT NOT NULL,
  client_type TEXT,
  capacity_kva REAL,
  solar_kwp REAL,
  battery_kwh REAL,
  diesel_saved_pct INTEGER,
  thumbnail_url TEXT,
  challenge TEXT,
  solution TEXT,
  equipment_specs TEXT,
  outcomes TEXT,
  published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 10. Administrative Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. Payments & Gateway Transactions
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  order_number TEXT NOT NULL,
  gateway TEXT NOT NULL DEFAULT 'paystack', -- 'paystack' | 'flutterwave' | 'bank_transfer'
  reference TEXT NOT NULL UNIQUE,
  amount_kobo INTEGER NOT NULL,
  currency TEXT DEFAULT 'NGN',
  status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed', 'abandoned'
  channel TEXT, -- 'card', 'bank', 'ussd', 'qr'
  gateway_response TEXT,
  paid_at TEXT,
  customer_email TEXT,
  metadata_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- 12. Support & Warranty Claim Tickets (Stage 16)
CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL UNIQUE,
  order_number TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  issue_category TEXT NOT NULL, -- 'technical', 'warranty', 'installation', 'billing', 'maintenance'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  assigned_engineer TEXT,
  resolution_notes TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 13. Digital Equipment Warranties (Stage 16)
CREATE TABLE IF NOT EXISTS warranties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  warranty_code TEXT NOT NULL UNIQUE,
  order_number TEXT,
  serial_number TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  warranty_years INTEGER DEFAULT 5,
  coverage_summary TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'voided', 'claimed'
  start_date TEXT DEFAULT (datetime('now')),
  end_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_enquiries_ref ON enquiries(reference_id);
CREATE INDEX IF NOT EXISTS idx_quotes_ref ON quotes(reference_id);
CREATE INDEX IF NOT EXISTS idx_orders_num ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_num ON support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_phone ON support_tickets(customer_phone);
CREATE INDEX IF NOT EXISTS idx_warranties_code ON warranties(warranty_code);
CREATE INDEX IF NOT EXISTS idx_warranties_serial ON warranties(serial_number);
CREATE INDEX IF NOT EXISTS idx_warranties_order ON warranties(order_number);

