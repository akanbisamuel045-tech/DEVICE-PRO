#!/usr/bin/env node
/**
 * DEVICE PRO — Production Database Disaster Recovery & Restore Utility
 * Safely restores a verified snapshot into the active products.db with pre-restore safety backup.
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'products.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

console.log('===============================================================');
console.log('DEVICE PRO — PRODUCTION DATABASE RESTORE UTILITY');
console.log('===============================================================');

// 1. Identify candidate backup file
let candidateFile = process.argv[2];

if (!candidateFile) {
  // Find latest backup in BACKUP_DIR
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`FATAL: Backup directory does not exist: ${BACKUP_DIR}`);
    process.exit(1);
  }

  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const p = path.join(BACKUP_DIR, f);
      return { file: f, path: p, mtime: fs.statSync(p).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (backups.length === 0) {
    console.error(`FATAL: No database backup files found in ${BACKUP_DIR}`);
    process.exit(1);
  }

  candidateFile = backups[0].path;
  console.log(`No specific file provided. Auto-selected latest backup: ${backups[0].file}`);
} else if (!path.isAbsolute(candidateFile)) {
  candidateFile = path.join(BACKUP_DIR, candidateFile);
}

if (!fs.existsSync(candidateFile)) {
  console.error(`FATAL: Specified candidate backup file does not exist: ${candidateFile}`);
  process.exit(1);
}

console.log(`Source Snapshot: ${candidateFile}`);
console.log(`Destination DB:  ${DB_PATH}`);

// 2. Verify candidate backup integrity before touching active database
console.log('\n[1/4] Verifying candidate backup integrity...');
try {
  const candidateDb = new DatabaseSync(candidateFile);
  const integrityRow = candidateDb.prepare('PRAGMA integrity_check').get();
  const productsCount = candidateDb.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const ordersCount = candidateDb.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  candidateDb.close();

  if (integrityRow.integrity_check !== 'ok') {
    console.error(`FATAL: Candidate backup failed integrity check: ${JSON.stringify(integrityRow)}`);
    process.exit(1);
  }
  console.log('  ✓ Candidate snapshot PRAGMA integrity_check: OK');
  console.log(`  ✓ Candidate contains: ${productsCount} products, ${ordersCount} orders`);
} catch (err) {
  console.error(`FATAL: Error validating candidate backup: ${err.message}`);
  process.exit(1);
}

// 3. Create a safety backup of current active database if it exists
console.log('\n[2/4] Creating pre-restore safety copy of current active database...');
if (fs.existsSync(DB_PATH)) {
  const preRestoreName = `products-pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
  const preRestorePath = path.join(BACKUP_DIR, preRestoreName);
  try {
    fs.copyFileSync(DB_PATH, preRestorePath);
    console.log(`  ✓ Safety copy saved to: ${preRestoreName}`);
  } catch (err) {
    console.error(`FATAL: Failed to create pre-restore safety copy: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log('  Notice: No existing active database found at target path.');
}

// 4. Overwrite active database with candidate snapshot
console.log('\n[3/4] Restoring database file...');
try {
  fs.copyFileSync(candidateFile, DB_PATH);
  console.log('  ✓ Database snapshot successfully written to active target.');
} catch (err) {
  console.error(`FATAL: Failed to copy snapshot to active path: ${err.message}`);
  process.exit(1);
}

// 5. Verify integrity of newly restored active database
console.log('\n[4/4] Verifying restored active database...');
try {
  const activeDb = new DatabaseSync(DB_PATH);
  const activeIntegrity = activeDb.prepare('PRAGMA integrity_check').get();
  const tables = activeDb.prepare(
    "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).get().count;
  const products = activeDb.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const orders = activeDb.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const quotes = activeDb.prepare('SELECT COUNT(*) as c FROM quotes').get().c;
  activeDb.close();

  if (activeIntegrity.integrity_check !== 'ok') {
    console.error(`FATAL: Restored active database failed integrity check: ${JSON.stringify(activeIntegrity)}`);
    process.exit(1);
  }

  console.log('  ✓ Active database PRAGMA integrity_check: OK');
  console.log(`  ✓ Operational state verified: ${tables} tables active (${products} products, ${orders} orders, ${quotes} quotes)`);
} catch (err) {
  console.error(`FATAL: Error verifying restored active database: ${err.message}`);
  process.exit(1);
}

console.log('\n===============================================================');
console.log('DATABASE RESTORE COMPLETED SUCCESSFULLY');
console.log('The application database has been safely restored.');
console.log('===============================================================\n');
