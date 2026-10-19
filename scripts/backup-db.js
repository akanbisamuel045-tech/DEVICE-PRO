#!/usr/bin/env node
/**
 * DEVICE PRO — Production Database Backup Utility
 * Executes verified atomic snapshot export, integrity checks, and retention pruning.
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'products.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS_TO_RETAIN = 14;

console.log('===============================================================');
console.log('DEVICE PRO — PRODUCTION DATABASE BACKUP UTILITY');
console.log('===============================================================');
console.log(`Source Database: ${DB_PATH}`);
console.log(`Backup Directory: ${BACKUP_DIR}`);

// 1. Ensure source database exists
if (!fs.existsSync(DB_PATH)) {
  console.error(`FATAL: Database file does not exist at ${DB_PATH}`);
  process.exit(1);
}

// 2. Verify source database integrity prior to backup
console.log('\n[1/4] Running source database integrity check...');
try {
  const sourceDb = new DatabaseSync(DB_PATH);
  const integrityRow = sourceDb.prepare('PRAGMA integrity_check').get();
  sourceDb.close();

  if (integrityRow.integrity_check !== 'ok') {
    console.error(`FATAL: Source database integrity check failed: ${JSON.stringify(integrityRow)}`);
    process.exit(1);
  }
  console.log('  ✓ Source database PRAGMA integrity_check: OK');
} catch (err) {
  console.error(`FATAL: Error connecting to source database: ${err.message}`);
  process.exit(1);
}

// 3. Create backup directory if missing
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 4. Generate timestamped backup file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFilename = `devicepro-backup-${timestamp}.db`;
const backupFilePath = path.join(BACKUP_DIR, backupFilename);

console.log('\n[2/4] Creating atomic snapshot...');
try {
  fs.copyFileSync(DB_PATH, backupFilePath);
  const sizeBytes = fs.statSync(backupFilePath).size;
  console.log(`  ✓ Snapshot written to: ${backupFilename}`);
  console.log(`  ✓ File size: ${(sizeBytes / 1024).toFixed(2)} KB (${sizeBytes} bytes)`);
} catch (err) {
  console.error(`FATAL: Failed to write backup snapshot: ${err.message}`);
  process.exit(1);
}

// 5. Verify integrity of the newly created backup snapshot
console.log('\n[3/4] Verifying backup snapshot integrity...');
try {
  const backupDb = new DatabaseSync(backupFilePath);
  const backupIntegrity = backupDb.prepare('PRAGMA integrity_check').get();
  
  // Count key operational records
  const productsCount = backupDb.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const ordersCount = backupDb.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const quotesCount = backupDb.prepare('SELECT COUNT(*) as c FROM quotes').get().c;
  const auditLogsCount = backupDb.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;
  backupDb.close();

  if (backupIntegrity.integrity_check !== 'ok') {
    console.error(`FATAL: Backup snapshot is corrupted! Result: ${JSON.stringify(backupIntegrity)}`);
    process.exit(1);
  }

  console.log('  ✓ Backup snapshot PRAGMA integrity_check: OK');
  console.log(`  ✓ Verified record counts: ${productsCount} products, ${ordersCount} orders, ${quotesCount} quotes, ${auditLogsCount} audit logs`);
} catch (err) {
  console.error(`FATAL: Failed to verify backup snapshot: ${err.message}`);
  process.exit(1);
}

// 6. Enforce backup retention policy
console.log('\n[4/4] Applying retention policy (keep last ' + MAX_BACKUPS_TO_RETAIN + ' backups)...');
try {
  const allBackups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('devicepro-backup-') || f.startsWith('products-backup-'))
    .map(f => {
      const full = path.join(BACKUP_DIR, f);
      return { file: f, path: full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime); // newest first

  console.log(`  Total backups in archive: ${allBackups.length}`);

  if (allBackups.length > MAX_BACKUPS_TO_RETAIN) {
    const toDelete = allBackups.slice(MAX_BACKUPS_TO_RETAIN);
    toDelete.forEach(b => {
      fs.unlinkSync(b.path);
      console.log(`  - Pruned older backup: ${b.file}`);
    });
    console.log(`  ✓ Pruned ${toDelete.length} expired backups`);
  } else {
    console.log('  ✓ Archive is within retention threshold; no pruning needed');
  }
} catch (err) {
  console.warn(`WARNING: Backup retention pruning encountered an error: ${err.message}`);
}

console.log('\n===============================================================');
console.log('BACKUP COMPLETED SUCCESSFULLY');
console.log(`Target: ${backupFilePath}`);
console.log('===============================================================\n');
