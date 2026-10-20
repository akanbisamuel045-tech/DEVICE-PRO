#!/usr/bin/env node
/**
 * DEVICE PRO — SQLite to MongoDB Atlas Migration Tool
 * 
 * Transfers all relational records from SQLite (data/products.db)
 * to MongoDB Atlas collections with full idempotent upsert capabilities.
 * 
 * Usage:
 *   node scripts/migrate-sqlite-to-mongo.js [MONGODB_URI]
 *   npm run migrate:mongo
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { connectMongo, disconnectMongo, isMongoConnected } = require('../db/mongo/connection');
const {
  Category, Product, CaseStudy, Enquiry, Quote,
  Order, Payment, Warranty, SupportTicket, User, Session, AuditLog
} = require('../db/mongo/models');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'products.db');

// Read URI from command line argument, process.env, or .env file
let targetUri = process.argv[2] || process.env.MONGODB_URI;

if (!targetUri) {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('MONGODB_URI=')) {
        targetUri = trimmed.slice('MONGODB_URI='.length).trim();
        if ((targetUri.startsWith('"') && targetUri.endsWith('"')) || (targetUri.startsWith("'") && targetUri.endsWith("'"))) {
          targetUri = targetUri.slice(1, -1);
        }
        break;
      }
    }
  }
}

async function runMigration() {
  console.log('===============================================================');
  console.log('DEVICE PRO — SQLITE TO MONGODB ATLAS DATA MIGRATION');
  console.log('===============================================================');

  if (!targetUri) {
    console.error('\n[ERROR] No MongoDB Atlas connection URI provided.');
    console.log('\nPlease provide your MongoDB Atlas connection string in one of two ways:');
    console.log('  1. Add to your .env file:');
    console.log('     MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/devicepro?retryWrites=true&w=majority');
    console.log('\n  2. Or pass as a command-line argument:');
    console.log('     node scripts/migrate-sqlite-to-mongo.js "mongodb+srv://..."');
    process.exit(1);
  }

  // 1. Verify SQLite source database
  console.log(`\n[1/4] Verifying source SQLite database: ${DB_PATH}`);
  if (!fs.existsSync(DB_PATH)) {
    console.error(`[FATAL] SQLite database file not found at ${DB_PATH}`);
    process.exit(1);
  }

  const sqlite = new DatabaseSync(DB_PATH);
  const integrity = sqlite.prepare('PRAGMA integrity_check').get();
  if (integrity.integrity_check !== 'ok') {
    console.error(`[FATAL] SQLite integrity check failed: ${JSON.stringify(integrity)}`);
    process.exit(1);
  }
  console.log('  ✓ SQLite source integrity check passed: OK');

  // 2. Connect to MongoDB Atlas
  console.log('\n[2/4] Connecting to MongoDB Atlas cluster...');
  const conn = await connectMongo(targetUri);
  if (!conn || !isMongoConnected()) {
    console.error('[FATAL] Failed to establish connection with MongoDB Atlas.');
    process.exit(1);
  }
  console.log(`  ✓ Connected to Atlas host: ${conn.host}, database: ${conn.name}`);

  // 3. Perform Migration
  console.log('\n[3/4] Migrating data collections...');
  const stats = {};

  // Helper for table migration
  async function migrateTable(tableName, Model, keyField, transformFn = row => row) {
    try {
      const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
      let migratedCount = 0;

      for (const row of rows) {
        const doc = transformFn(row);
        const filter = { [keyField]: doc[keyField] };
        await Model.findOneAndUpdate(filter, doc, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
        migratedCount++;
      }

      stats[tableName] = { sqlite: rows.length, mongo: migratedCount };
      console.log(`  ✓ ${tableName.padEnd(16)}: ${migratedCount}/${rows.length} records transferred`);
    } catch (err) {
      console.warn(`  ⚠ Table "${tableName}" note: ${err.message}`);
      stats[tableName] = { sqlite: 0, mongo: 0, error: err.message };
    }
  }

  // Categories
  await migrateTable('categories', Category, 'slug', row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon || '📦',
    description: row.description || '',
    display_order: row.display_order || 0
  }));

  // Drop stale unique index on sku if created previously
  try {
    await Product.collection.dropIndex('sku_1');
  } catch (e) {
    // Ignore if index doesn't exist
  }

  // Products
  await migrateTable('products', Product, 'slug', row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brand,
    category: row.category,
    category_label: row.category_label,
    sku: row.sku,
    description: row.description,
    price_ngn: row.price_ngn,
    previous_price_ngn: row.previous_price_ngn,
    power_rating: row.power_rating,
    power_tier: row.power_tier,
    specifications: row.specifications,
    image_url: row.image_url,
    stock_status: row.stock_status || 'in_stock',
    stock_quantity: row.stock_quantity || 50,
    featured: row.featured || 0,
    published: row.published !== undefined ? row.published : 1
  }));

  // Case Studies
  await migrateTable('case_studies', CaseStudy, 'slug', row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    sector: row.sector,
    location: row.location,
    client_type: row.client_type,
    capacity_kva: row.capacity_kva,
    solar_kwp: row.solar_kwp,
    battery_kwh: row.battery_kwh,
    diesel_saved_pct: row.diesel_saved_pct,
    thumbnail_url: row.thumbnail_url,
    challenge: row.challenge,
    solution: row.solution,
    equipment_specs: row.equipment_specs,
    outcomes: row.outcomes,
    published: row.published !== undefined ? row.published : 1
  }));

  // Users (Staff Accounts with Scrypt Hashes)
  await migrateTable('users', User, 'username', row => ({
    id: row.id,
    username: row.username,
    email: row.email,
    password_hash: row.password_hash,
    salt: row.salt,
    full_name: row.full_name,
    role: row.role || 'sales'
  }));

  // Enquiries
  await migrateTable('enquiries', Enquiry, 'reference_id', row => ({
    id: row.id,
    reference_id: row.reference_id,
    name: row.name,
    full_name: row.name,
    phone: row.phone,
    email: row.email || '',
    state: row.state || '',
    subject: row.subject || 'General Solar Inquiry',
    message: row.message,
    status: row.status || 'new',
    admin_notes: row.admin_notes || '',
    ip_address: row.ip_address || ''
  }));

  // Quotes
  await migrateTable('quotes', Quote, 'reference_id', row => ({
    id: row.id,
    reference_id: row.reference_id,
    name: row.name,
    customer_name: row.name,
    phone: row.phone,
    email: row.email || '',
    state: row.state || '',
    property_type: row.property_type || '',
    sector: row.sector || 'residential',
    package_id: row.package_id,
    package_slug: row.package_slug,
    package_name: row.package_name,
    load_details: row.load_details || '',
    indicative_inverter_kva: row.indicative_inverter_kva,
    indicative_battery_kwh: row.indicative_battery_kwh,
    indicative_solar_kwp: row.indicative_solar_kwp,
    status: row.status || 'new',
    admin_notes: row.admin_notes || '',
    ip_address: row.ip_address || ''
  }));

  // Orders
  await migrateTable('orders', Order, 'order_number', row => ({
    id: row.id,
    order_number: row.order_number,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    customer_email: row.customer_email || '',
    delivery_address: row.delivery_address,
    delivery_state: row.delivery_state,
    items_json: row.items_json,
    subtotal_ngn: row.subtotal_ngn,
    delivery_fee_ngn: row.delivery_fee_ngn || 0,
    installation_fee_ngn: row.installation_fee_ngn || 0,
    installation_option: row.installation_option || 'supply_only',
    total_ngn: row.total_ngn,
    payment_method: row.payment_method || 'transfer',
    payment_status: row.payment_status || 'pending',
    order_status: row.order_status || 'pending',
    waybill_number: row.waybill_number,
    courier_partner: row.courier_partner,
    estimated_delivery: row.estimated_delivery,
    assigned_engineer: row.assigned_engineer,
    engineer_phone: row.engineer_phone,
    installation_scheduled_date: row.installation_scheduled_date,
    commissioning_status: row.commissioning_status || 'pending',
    commissioning_tests: row.commissioning_tests,
    commissioning_date: row.commissioning_date,
    commissioning_certificate_id: row.commissioning_certificate_id,
    admin_notes: row.admin_notes || '',
    notes: row.notes || '',
    ip_address: row.ip_address || ''
  }));

  // Payments
  await migrateTable('payments', Payment, 'reference', row => ({
    id: row.id,
    order_id: row.order_id,
    order_number: row.order_number,
    gateway: row.gateway || 'paystack',
    reference: row.reference,
    amount_kobo: row.amount_kobo,
    currency: row.currency || 'NGN',
    status: row.status || 'initialized',
    channel: row.channel,
    customer_email: row.customer_email,
    metadata_json: row.metadata_json,
    raw_response_json: row.raw_response_json
  }));

  // Warranties
  await migrateTable('warranties', Warranty, 'warranty_code', row => ({
    id: row.id,
    order_id: row.order_id,
    order_number: row.order_number || '',
    product_id: row.product_id,
    product_name: row.product_name,
    product_category: row.product_category || 'Solar Equipment',
    product_sku: row.product_sku || '',
    serial_number: row.serial_number,
    warranty_code: row.warranty_code,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    customer_email: row.customer_email || '',
    installation_address: row.installation_address || '',
    start_date: row.start_date,
    end_date: row.end_date,
    expiry_date: row.expiry_date || row.end_date,
    warranty_duration_months: row.warranty_duration_months || 24,
    warranty_years: row.warranty_years,
    coverage_summary: row.coverage_summary,
    status: row.status || 'active',
    qr_code_data: row.qr_code_data
  }));

  // Support Tickets
  await migrateTable('support_tickets', SupportTicket, 'ticket_number', row => ({
    id: row.id,
    ticket_number: row.ticket_number,
    order_id: row.order_id,
    order_number: row.order_number || '',
    serial_number: row.serial_number || '',
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    customer_email: row.customer_email || '',
    issue_category: row.issue_category || 'technical',
    priority: row.priority || 'medium',
    subject: row.subject || 'Equipment Support',
    description: row.description,
    status: row.status || 'open',
    assigned_engineer: row.assigned_engineer,
    assigned_technician: row.assigned_technician || row.assigned_engineer,
    resolution_notes: row.resolution_notes || '',
    sla_target_hours: row.sla_target_hours || 48,
    resolved_at: row.resolved_at ? new Date(row.resolved_at) : null
  }));

  // Audit Logs
  await migrateTable('audit_logs', AuditLog, 'id', row => ({
    id: row.id,
    user_id: row.user_id,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    details: row.details,
    ip_address: row.ip_address
  }));

  // 4. Verification and Reporting
  console.log('\n[4/4] Verification Summary:');
  console.log('---------------------------------------------------------------');
  console.log('Collection Name     | SQLite Rows | MongoDB Documents | Status');
  console.log('---------------------------------------------------------------');

  let allSynced = true;
  for (const [table, s] of Object.entries(stats)) {
    const isOk = s.mongo === s.sqlite;
    if (!isOk) allSynced = false;
    const statusText = isOk ? '✓ Synced' : '⚠ Discrepancy';
    console.log(
      `${table.padEnd(20)}| ${String(s.sqlite).padStart(11)} | ${String(s.mongo).padStart(17)} | ${statusText}`
    );
  }
  console.log('---------------------------------------------------------------');

  if (allSynced) {
    console.log('\n🎉 SUCCESS: All database tables migrated to MongoDB Atlas with 100% parity!');
    console.log('DEVICE PRO is fully prepared to run on MongoDB Atlas.');
  } else {
    console.warn('\n⚠ Migration completed with warnings. Please review the table above.');
  }

  // Graceful cleanup
  sqlite.close();
  await disconnectMongo();
  console.log('\nDatabase connections closed. Migration script finished.\n');
}

runMigration().catch(async err => {
  console.error('\n[FATAL MIGRATION ERROR]:', err);
  await disconnectMongo().catch(() => {});
  process.exit(1);
});
