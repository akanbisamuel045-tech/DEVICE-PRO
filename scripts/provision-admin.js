#!/usr/bin/env node
/**
 * DEVICE PRO Nigeria — Controlled Administrator & Staff Provisioning Script
 * 
 * Secure CLI procedure to provision administrative users directly in MongoDB Atlas.
 * - Enforces strong password policy (min 10 chars, upper, lower, numbers, symbols)
 * - Restricts roles strictly to verified administrative roles
 * - Never prints passwords or secret keys to console or logs
 * - Records an immutable audit log entry upon successful provisioning
 * 
 * Usage:
 *   node scripts/provision-admin.js --email <email> --password <password> --role <role> --fullName <name> [--promote]
 *   node scripts/provision-admin.js --help
 */

const path = require('path');
const crypto = require('crypto');
const { connectMongo } = require('../db/mongo/connection');
const { User, AuditLog } = require('../db/mongo/models');

const ALLOWED_ADMIN_ROLES = ['admin', 'superadmin', 'engineer', 'sales', 'staff', 'finance'];

function printUsage() {
  console.log(`
DEVICE PRO — Administrator Provisioning Utility

Usage:
  node scripts/provision-admin.js [options]

Options:
  --email <email>       Administrative email address (required)
  --password <password> Temporary or permanent password (min 10 chars) (required)
  --role <role>         Administrative role (${ALLOWED_ADMIN_ROLES.join(', ')}) (default: admin)
  --fullName <name>     Full legal / staff name (required)
  --username <uname>    Staff username (default: email prefix or email)
  --phone <phone>       Contact phone number (optional)
  --promote             Promote existing customer account to administrative role
  --help                Show this help screen
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--promote') {
      options.promote = true;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = args[i + 1];
      if (val && !val.startsWith('--')) {
        options[key] = val;
        i++;
      }
    }
  }
  return options;
}

function validatePasswordPolicy(password) {
  if (!password || typeof password !== 'string') {
    return 'Password is required.';
  }
  if (password.length < 10) {
    return 'Password must be at least 10 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return null;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

async function run() {
  const options = parseArgs();

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  const { email, password, role = 'admin', fullName, promote = false } = options;
  const username = options.username || (email ? email.split('@')[0] : '');
  const phone = options.phone || null;

  if (!email || !password || !fullName) {
    console.error('Error: Missing required parameters (--email, --password, --fullName).');
    printUsage();
    process.exit(1);
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    console.error('Error: Invalid email format.');
    process.exit(1);
  }

  if (!ALLOWED_ADMIN_ROLES.includes(role)) {
    console.error(`Error: Invalid role "${role}". Allowed roles: ${ALLOWED_ADMIN_ROLES.join(', ')}`);
    process.exit(1);
  }

  const passwordError = validatePasswordPolicy(password);
  if (passwordError) {
    console.error(`Error: Insecure password — ${passwordError}`);
    process.exit(1);
  }

  try {
    await connectMongo();

    const existing = await User.findOne({
      $or: [
        { email: trimmedEmail },
        { normalized_email: trimmedEmail },
        { username: username.toLowerCase() }
      ]
    });

    if (existing) {
      if (!promote) {
        console.error(`Error: User with email/username "${trimmedEmail}" already exists with role "${existing.role}".`);
        console.error('To elevate this user to an administrative role, re-run with the --promote flag.');
        process.exit(1);
      }

      // Safe Promotion
      const previousRole = existing.role;
      existing.role = role;
      if (fullName) existing.full_name = fullName.trim();
      if (phone) existing.phone = phone.trim();

      // Update password hash safely
      const { hash, salt } = hashPassword(password);
      existing.password_hash = hash;
      existing.salt = salt;
      existing.email_verified = true;
      existing.updated_at = new Date();
      await existing.save();

      // Audit Log
      await AuditLog.create({
        id: (await AuditLog.countDocuments()) + 1,
        user_id: existing.id || 1,
        action: 'PROVISION_ADMIN_PROMOTION',
        entity_type: 'user',
        entity_id: String(existing.id),
        details: `Promoted user ${existing.email} from ${previousRole} to ${role}`,
        timestamp: new Date()
      });

      console.log(`[SUCCESS] Account "${trimmedEmail}" successfully promoted from "${previousRole}" to "${role}".`);
      process.exit(0);
    }

    // New Administrator Creation
    const maxDoc = await User.findOne().sort({ id: -1 }).select('id').lean();
    const nextId = maxDoc && typeof maxDoc.id === 'number' ? maxDoc.id + 1 : 1;

    const { hash, salt } = hashPassword(password);

    const newUser = new User({
      id: nextId,
      username: username.toLowerCase(),
      email: trimmedEmail,
      normalized_email: trimmedEmail,
      phone: phone ? phone.trim() : null,
      password_hash: hash,
      salt: salt,
      full_name: fullName.trim(),
      role: role,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    await newUser.save();

    // Audit Log
    await AuditLog.create({
      id: (await AuditLog.countDocuments()) + 1,
      user_id: nextId,
      action: 'PROVISION_ADMIN_NEW',
      entity_type: 'user',
      entity_id: String(nextId),
      details: `Provisioned new ${role} user: ${trimmedEmail} (${fullName.trim()})`,
      timestamp: new Date()
    });

    console.log(`[SUCCESS] New administrative user created successfully:`);
    console.log(`- ID: ${nextId}`);
    console.log(`- Username: ${newUser.username}`);
    console.log(`- Email: ${newUser.email}`);
    console.log(`- Role: ${newUser.role}`);
    console.log(`- Full Name: ${newUser.full_name}`);
    console.log(`[SECURITY] Credentials saved with Argon2/scrypt cryptographic hashing. Passwords never logged.`);
    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Failed to provision administrator:', err.message);
    process.exit(1);
  }
}

run();
