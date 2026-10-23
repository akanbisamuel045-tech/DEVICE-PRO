const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    } catch (e) {}
  }
}

// Auto-load .env if available
loadEnvFile();

let isConnected = false;
let connectionPromise = null;

/**
 * Connect to MongoDB Atlas (or local MongoDB instance)
 * @param {string} [uri] Optional URI override, defaults to process.env.MONGODB_URI
 */
async function connectMongo(uri = process.env.MONGODB_URI) {
  loadEnvFile();
  const effectiveUri = uri || process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'devicepro';

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  if (!effectiveUri) {
    console.log('[DATABASE] No MONGODB_URI configured. Operating in SQLite mode.');
    return null;
  }

  connectionPromise = (async () => {
    try {
      console.log(`[DATABASE] Connecting to MongoDB Atlas (database: ${dbName})...`);
      const conn = await mongoose.connect(effectiveUri, {
        dbName,
        serverSelectionTimeoutMS: 8000,
        autoIndex: false
      });
      isConnected = true;
      console.log(`[DATABASE] MongoDB Atlas connected successfully: ${conn.connection.host}/${conn.connection.name}`);
      return conn.connection;
    } catch (error) {
      console.error('[DATABASE ERROR] Failed to connect to MongoDB Atlas:', error.message);
      isConnected = false;
      connectionPromise = null;
      return null;
    }
  })();

  return connectionPromise;
}

/**
 * Check if MongoDB Atlas is currently connected
 */
function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Disconnect from MongoDB Atlas
 */
async function disconnectMongo() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

/**
 * Safety guard: Asserts that test execution is isolated and refuses to run
 * destructive or test operations against a live production environment.
 */
function assertTestEnvironmentIsolated() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw new Error('[SAFETY GUARD] Destructive test execution blocked: Refusing to run tests against a production environment (NODE_ENV or VERCEL_ENV is production).');
  }
}

module.exports = {
  connectMongo,
  isMongoConnected,
  disconnectMongo,
  assertTestEnvironmentIsolated,
  mongoose
};

