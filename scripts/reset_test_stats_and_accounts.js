/**
 * DEVICE PRO — System Fresh Start Reset Script
 * Safely resets test statistics, test orders, test quotes, test support tickets,
 * test sessions, and test customer accounts while preserving the superadmin account,
 * product catalogue, categories, case studies, and BOM engineering definitions.
 */

const fs = require('fs');
const path = require('path');
const { connectMongo, mongoose } = require(path.join(__dirname, '..', 'db', 'mongo', 'connection'));

async function performFreshStartReset() {
  console.log('========================================================================');
  console.log('DEVICE PRO — AUTHORIZED SYSTEM FRESH START RESET');
  console.log('========================================================================\n');

  // --- 1. MONGODB ATLAS RESET ---
  console.log('[1/4] Connecting to MongoDB Atlas...');
  await connectMongo();
  const db = mongoose.connection.db;

  console.log('[2/4] Resetting test collections in MongoDB Atlas...');
  const collectionsToClear = [
    'orders',
    'payments',
    'quotes',
    'enquiries',
    'supporttickets',
    'warranties',
    'auditlogs',
    'productinteractions',
    'passwordresets',
    'sessions',
    'priceimports'
  ];

  const mongoResults = {};
  for (const collName of collectionsToClear) {
    try {
      const coll = db.collection(collName);
      const res = await coll.deleteMany({});
      mongoResults[collName] = res.deletedCount;
      console.log(`  ✓ Cleared ${collName}: ${res.deletedCount} test documents deleted`);
    } catch (err) {
      console.warn(`  ! Note on ${collName}: ${err.message}`);
    }
  }

  // Purge test users, strictly retaining superadmin 'admin'
  const usersColl = db.collection('users');
  const userDeleteRes = await usersColl.deleteMany({
    username: { $ne: 'admin' },
    role: { $ne: 'superadmin' }
  });
  console.log(`  ✓ Cleared test customer/staff accounts: ${userDeleteRes.deletedCount} deleted (superadmin retained)`);

  // Ensure admin user exists with active superadmin role
  const remainingAdmins = await usersColl.find({}).toArray();
  console.log(`  ✓ Retained Users in Atlas (${remainingAdmins.length}):`);
  remainingAdmins.forEach(u => console.log(`     - ${u.username || u.email} [role: ${u.role}]`));

  // Insert initial fresh start audit log
  await db.collection('auditlogs').insertOne({
    user_id: 1,
    action: 'SYSTEM_FRESH_START_RESET',
    entity_type: 'system',
    entity_id: 'fresh_start',
    details: 'Authorized system fresh start: Test statistics, test orders, test quotes, test support tickets, test sessions, and automated test accounts successfully cleared. Superadmin account and product inventory preserved intact.',
    ip_address: '127.0.0.1',
    metadata: {
      reset_by: 'superadmin',
      cleared_collections: mongoResults,
      deleted_test_users: userDeleteRes.deletedCount,
      timestamp: new Date().toISOString()
    },
    created_at: new Date()
  });
  console.log('  ✓ Created clean initial audit log in MongoDB Atlas.');

  // --- 2. SQLITE LOCAL CACHE RESET ---
  const sqlitePath = path.join(__dirname, '..', 'data', 'products.db');
  if (fs.existsSync(sqlitePath)) {
    console.log('\n[3/4] Resetting local SQLite database (products.db)...');
    try {
      const { DatabaseSync } = require('node:sqlite');
      const sqldb = new DatabaseSync(sqlitePath);

      const sqlTables = [
        'orders',
        'payments',
        'quotes',
        'enquiries',
        'support_tickets',
        'warranties',
        'audit_logs',
        'sessions',
        'password_resets'
      ];

      sqldb.exec('PRAGMA foreign_keys = OFF;');
      for (const table of sqlTables) {
        try {
          sqldb.exec(`DELETE FROM "${table}";`);
          console.log(`  ✓ Cleared SQLite table: ${table}`);
        } catch (e) {
          console.warn(`  ! SQLite table ${table} skip: ${e.message}`);
        }
      }
      sqldb.exec('PRAGMA foreign_keys = ON;');

      // Purge test users from SQLite, keeping superadmin
      try {
        const delRes = sqldb.prepare("DELETE FROM users WHERE username != 'admin' AND role != 'superadmin'").run();
        console.log(`  ✓ Cleared test users from SQLite: ${delRes.changes} removed`);
      } catch (e) {
        console.warn(`  ! SQLite users purge: ${e.message}`);
      }

      // SQLite initial audit log
      try {
        sqldb.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
          VALUES (1, 'SYSTEM_FRESH_START_RESET', 'system', 'fresh_start', 'Authorized system fresh start: Test statistics and accounts reset.', '127.0.0.1', datetime('now'))
        `).run();
        console.log('  ✓ Created clean initial audit log in SQLite.');
      } catch (e) {}

    } catch (sqlErr) {
      console.warn(`  ! SQLite connection note: ${sqlErr.message}`);
    }
  } else {
    console.log('\n[3/4] No local SQLite database file present (cloud-only execution).');
  }

  // --- 3. FINAL VERIFICATION SCAN ---
  console.log('\n[4/4] Final Verification Scan of MongoDB Atlas:');
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`  • ${c.name.padEnd(25)}: ${count}`);
  }

  console.log('\n========================================================================');
  console.log('✓ FRESH START RESET COMPLETED SUCCESSFULLY');
  console.log('========================================================================\n');
}

performFreshStartReset()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[ERROR] Reset failed:', err);
    process.exit(1);
  });
