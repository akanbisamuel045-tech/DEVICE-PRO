const mongoose = require('mongoose');

// 1. Category Schema
const categorySchema = new mongoose.Schema({
  id: { type: Number, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  icon: { type: String, default: '📦' },
  description: { type: String },
  display_order: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 2. Product Schema
const productSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  brand: { type: String, index: true },
  category: { type: String, required: true, index: true },
  category_label: { type: String },
  sku: { type: String, index: true },
  description: { type: String },
  price_ngn: { type: Number, required: true },
  previous_price_ngn: { type: Number },
  power_rating: { type: String },
  power_tier: { type: String, index: true },
  specifications: { type: String },
  image_url: { type: String },
  cost_price_ngn: { type: Number, default: 0 },
  warranty_years: { type: Number, default: 5 },
  stock_status: { type: String, default: 'in_stock', index: true },
  stock_quantity: { type: Number, default: 50 },
  featured: { type: Number, default: 0, index: true },
  published: { type: Number, default: 1, index: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 3. CaseStudy Schema
const caseStudySchema = new mongoose.Schema({
  id: { type: Number, index: true },
  slug: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  sector: { type: String, index: true },
  location: { type: String },
  client_type: { type: String },
  capacity_kva: { type: Number },
  solar_kwp: { type: Number },
  battery_kwh: { type: Number },
  diesel_saved_pct: { type: Number },
  thumbnail_url: { type: String },
  challenge: { type: String },
  solution: { type: String },
  equipment_specs: { type: String },
  outcomes: { type: String },
  published: { type: Number, default: 1, index: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 4. Enquiry Schema
const enquirySchema = new mongoose.Schema({
  id: { type: Number, index: true },
  reference_id: { type: String, required: true, unique: true, index: true },
  name: { type: String },
  full_name: { type: String },
  email: { type: String, index: true },
  phone: { type: String, required: true, index: true },
  state: { type: String },
  subject: { type: String },
  service_type: { type: String },
  system_scale: { type: String },
  estimated_budget: { type: String },
  message: { type: String, required: true },
  status: { type: String, default: 'new', index: true },
  admin_notes: { type: String },
  ip_address: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 5. Quote Schema
const quoteSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  reference_id: { type: String, required: true, unique: true, index: true },
  name: { type: String },
  customer_name: { type: String },
  phone: { type: String, required: true, index: true },
  email: { type: String, index: true },
  state: { type: String },
  property_type: { type: String },
  sector: { type: String, default: 'residential' },
  package_id: { type: Number },
  package_slug: { type: String },
  package_name: { type: String },
  load_details: { type: String },
  indicative_inverter_kva: { type: Number },
  indicative_battery_kwh: { type: Number },
  indicative_solar_kwp: { type: Number },
  recommended_inverter_kva: { type: Number },
  recommended_battery_kwh: { type: Number },
  recommended_panels_kwp: { type: Number },
  daily_energy_kwh: { type: Number },
  peak_power_kw: { type: Number },
  estimated_price_ngn: { type: Number },
  appliances_json: { type: String },
  notes: { type: String },
  status: { type: String, default: 'new', index: true },
  admin_notes: { type: String },
  ip_address: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 6. Order Schema
const orderSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  order_number: { type: String, required: true, unique: true, index: true },
  customer_name: { type: String, required: true },
  customer_phone: { type: String, required: true, index: true },
  customer_email: { type: String, index: true },
  delivery_address: { type: String, required: true },
  delivery_state: { type: String, required: true },
  items_json: { type: String, required: true },
  subtotal_ngn: { type: Number, required: true },
  delivery_fee_ngn: { type: Number, default: 0 },
  installation_fee_ngn: { type: Number, default: 0 },
  installation_option: { type: String, default: 'supply_only' },
  total_ngn: { type: Number, required: true },
  payment_method: { type: String, default: 'transfer' },
  payment_status: { type: String, default: 'pending', index: true },
  order_status: { type: String, default: 'pending', index: true },
  waybill_number: { type: String },
  courier_partner: { type: String },
  estimated_delivery: { type: String },
  assigned_engineer: { type: String },
  engineer_phone: { type: String },
  installation_scheduled_date: { type: String },
  commissioning_status: { type: String, default: 'pending' },
  commissioning_tests: { type: String },
  commissioning_date: { type: String },
  commissioning_certificate_id: { type: String },
  admin_notes: { type: String },
  notes: { type: String },
  ip_address: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 7. Payment Schema
const paymentSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  order_id: { type: Number },
  order_number: { type: String, required: true, index: true },
  gateway: { type: String, default: 'paystack' },
  reference: { type: String, required: true, unique: true, index: true },
  amount_kobo: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  status: { type: String, default: 'initialized', index: true },
  channel: { type: String },
  customer_email: { type: String },
  metadata_json: { type: String },
  raw_response_json: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 8. Warranty Schema
const warrantySchema = new mongoose.Schema({
  id: { type: Number, index: true },
  order_id: { type: Number },
  order_number: { type: String, required: true, index: true },
  product_id: { type: Number },
  product_name: { type: String, required: true },
  product_category: { type: String },
  product_sku: { type: String },
  serial_number: { type: String, required: true, unique: true, index: true },
  warranty_code: { type: String, required: true, unique: true, index: true },
  customer_name: { type: String, required: true },
  customer_phone: { type: String, required: true },
  customer_email: { type: String },
  installation_address: { type: String },
  start_date: { type: String },
  end_date: { type: String },
  expiry_date: { type: String },
  warranty_duration_months: { type: Number, default: 24 },
  warranty_years: { type: Number },
  coverage_summary: { type: String },
  status: { type: String, default: 'active', index: true },
  qr_code_data: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 9. Support Ticket Schema
const supportTicketSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  ticket_number: { type: String, required: true, unique: true, index: true },
  order_id: { type: Number },
  order_number: { type: String, index: true },
  serial_number: { type: String, index: true },
  customer_name: { type: String, required: true },
  customer_phone: { type: String, required: true },
  customer_email: { type: String },
  issue_category: { type: String, required: true },
  priority: { type: String, default: 'medium' },
  subject: { type: String },
  description: { type: String, required: true },
  status: { type: String, default: 'open', index: true },
  assigned_engineer: { type: String },
  assigned_technician: { type: String },
  resolution_notes: { type: String },
  sla_target_hours: { type: Number, default: 48 },
  resolved_at: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 10. User Schema
const userSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  username: { type: String, unique: true, sparse: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  normalized_email: { type: String, unique: true, sparse: true, index: true },
  phone: { type: String },
  password_hash: { type: String },
  salt: { type: String },
  full_name: { type: String, required: true },
  role: { type: String, default: 'customer', index: true },
  google_subject: { type: String, unique: true, sparse: true, index: true },
  email_verified: { type: Boolean, default: false },
  reset_token_hash: { type: String, index: true },
  reset_token_expires: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 11. Session Schema (Stage 2 Persistent Sessions with Hashed Tokens & TTL Expiry)
const sessionSchema = new mongoose.Schema({
  token: { type: String, sparse: true, index: true },
  token_hash: { type: String, required: true, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  expires_at: { type: Date, required: true, index: true },
  ip_address: { type: String },
  user_agent: { type: String }
}, { timestamps: { createdAt: 'created_at' } });

// Background cleanup TTL index on expires_at (MongoDB automatically purges expired sessions)
sessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// 12. AuditLog Schema
const auditLogSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  user_id: { type: Number },
  action: { type: String, required: true, index: true },
  entity_type: { type: String, index: true },
  entity_id: { type: String, index: true },
  details: { type: String },
  ip_address: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: { createdAt: 'created_at' } });

// 13. PasswordReset Schema (Stage 20 Verification Code System)
const passwordResetSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  user_id: { type: Number, index: true },
  code_hash: { type: String, required: true },
  code_salt: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  max_attempts: { type: Number, default: 5 },
  expires_at: { type: Date, required: true, index: true },
  resend_available_at: { type: Date, required: true },
  reset_token_hash: { type: String, sparse: true, index: true },
  reset_token_expires_at: { type: Date },
  used: { type: Boolean, default: false, index: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Background cleanup TTL index on created_at (1 hour)
passwordResetSchema.index({ created_at: 1 }, { expireAfterSeconds: 3600 });

// 14. PriceImport Schema (Stage 5 & Stage 6 Supplier Price Review, Approval & Controlled Application)
const priceImportSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  import_id: { type: String, index: true },
  filename: { type: String, default: 'supplier_prices.xlsx' },
  original_filename: { type: String, default: 'supplier_prices.xlsx' },
  file_format: { type: String, default: 'xlsx', enum: ['xlsx', 'xls', 'csv'], index: true },
  file_size_bytes: { type: Number, default: 0 },
  supplier_name: { type: String, default: 'Generic Supplier' },
  uploaded_by: { type: mongoose.Schema.Types.Mixed, default: null },
  uploaded_by_email: { type: String, default: '' },
  uploaded_by_name: { type: String, default: 'Administrator' },
  uploaded_by_role: { type: String, default: 'admin' },
  status: {
    type: String,
    default: 'analysed',
    enum: [
      'analysed',
      'awaiting_approval',
      'approved_for_application',
      'applying',
      'successfully_applied',
      'partially_applied',
      'failed',
      'cancelled'
    ],
    index: true
  },
  mapping_config: { type: mongoose.Schema.Types.Mixed, default: {} },
  summary: {
    total_rows: { type: Number, default: 0 },
    valid_rows: { type: Number, default: 0 },
    matched_rows: { type: Number, default: 0 },
    unmatched_rows: { type: Number, default: 0 },
    duplicate_in_file_rows: { type: Number, default: 0 },
    duplicate_in_catalog_rows: { type: Number, default: 0 },
    invalid_rows: { type: Number, default: 0 },
    requires_review_rows: { type: Number, default: 0 },
    // Stage 6 metrics
    eligible_for_approval_rows: { type: Number, default: 0 },
    approved_rows: { type: Number, default: 0 },
    applied_rows: { type: Number, default: 0 },
    failed_rows: { type: Number, default: 0 },
    skipped_rows: { type: Number, default: 0 },
    high_variance_rows: { type: Number, default: 0 }
  },
  // Review metadata
  reviewed_by: { type: mongoose.Schema.Types.Mixed, default: null },
  reviewed_by_email: { type: String, default: '' },
  reviewed_at: { type: Date, default: null },
  // Approval metadata
  approved_by: { type: mongoose.Schema.Types.Mixed, default: null },
  approved_by_email: { type: String, default: '' },
  approved_by_role: { type: String, default: '' },
  approved_at: { type: Date, default: null },
  approved_row_count: { type: Number, default: 0 },
  approval_notes: { type: String, default: '' },
  // Application metadata
  applied_by: { type: mongoose.Schema.Types.Mixed, default: null },
  applied_by_email: { type: String, default: '' },
  applied_by_role: { type: String, default: '' },
  applied_at: { type: Date, default: null },
  applied_row_count: { type: Number, default: 0 },
  failed_row_count: { type: Number, default: 0 },
  skipped_row_count: { type: Number, default: 0 },
  application_notes: { type: String, default: '' },
  // Cancellation metadata
  cancelled_by: { type: mongoose.Schema.Types.Mixed, default: null },
  cancelled_by_email: { type: String, default: '' },
  cancelled_at: { type: Date, default: null },
  cancellation_reason: { type: String, default: '' },
  rows_preview: [{
    row_number: Number,
    raw_sku: String,
    normalized_sku: String,
    raw_name: String,
    raw_brand: String,
    raw_category: String,
    raw_cost: mongoose.Schema.Types.Mixed,
    normalized_cost_ngn: Number,
    currency: String,
    stock_info: String,
    supplier_ref: String,
    matched_product_id: mongoose.Schema.Types.Mixed,
    matched_product_name: String,
    matched_product_sku: String,
    matched_current_price_ngn: Number,
    matched_current_cost_ngn: Number,
    matching_method: String,
    status: String,
    validation_errors: [String],
    warnings: [String],
    // Stage 6 review & approval fields
    cost_diff_ngn: { type: Number, default: 0 },
    cost_diff_percent: { type: Number, default: 0 },
    is_eligible_for_approval: { type: Boolean, default: false },
    variance_warning: { type: String, default: 'NONE' },
    approval_status: { type: String, default: 'unapproved', enum: ['unapproved', 'approved', 'rejected', 'ineligible'] },
    approved_cost_ngn: { type: Number, default: null },
    approved_previous_cost_ngn: { type: Number, default: null },
    approved_at: { type: Date, default: null },
    approved_by_email: { type: String, default: '' },
    application_status: { type: String, default: 'pending', enum: ['pending', 'applied', 'failed', 'skipped'] },
    application_error: { type: String, default: '' },
    applied_at: { type: Date, default: null },
    applied_previous_cost_ngn: { type: Number, default: null }
  }],
  notes: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 15. PriceIntelligenceSettings Schema (Stage 7 Margin Configuration)
const priceIntelligenceSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true, index: true },
  target_margin_percent: { type: Number, default: 15.0, min: 1, max: 99 },
  warning_low_margin_threshold: { type: Number, default: 10.0, min: 1, max: 99 },
  significant_cost_increase_percent: { type: Number, default: 20.0, min: 1, max: 500 },
  updated_by_email: { type: String, default: '' },
  updated_by_role: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = {
  Category: mongoose.models.Category || mongoose.model('Category', categorySchema),
  Product: mongoose.models.Product || mongoose.model('Product', productSchema),
  CaseStudy: mongoose.models.CaseStudy || mongoose.model('CaseStudy', caseStudySchema),
  Enquiry: mongoose.models.Enquiry || mongoose.model('Enquiry', enquirySchema),
  Quote: mongoose.models.Quote || mongoose.model('Quote', quoteSchema),
  Order: mongoose.models.Order || mongoose.model('Order', orderSchema),
  Payment: mongoose.models.Payment || mongoose.model('Payment', paymentSchema),
  Warranty: mongoose.models.Warranty || mongoose.model('Warranty', warrantySchema),
  SupportTicket: mongoose.models.SupportTicket || mongoose.model('SupportTicket', supportTicketSchema),
  User: mongoose.models.User || mongoose.model('User', userSchema),
  Session: mongoose.models.Session || mongoose.model('Session', sessionSchema),
  AuditLog: mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema),
  PasswordReset: mongoose.models.PasswordReset || mongoose.model('PasswordReset', passwordResetSchema),
  PriceImport: mongoose.models.PriceImport || mongoose.model('PriceImport', priceImportSchema),
  PriceIntelligenceSettings: mongoose.models.PriceIntelligenceSettings || mongoose.model('PriceIntelligenceSettings', priceIntelligenceSettingsSchema)
};

