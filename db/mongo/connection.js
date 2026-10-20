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

/**
 * Connect to MongoDB Atlas (or local MongoDB instance)
 * @param {string} [uri] Optional URI override, defaults to process.env.MONGODB_URI
 */
async function connectMongo(uri = process.env.MONGODB_URI) {
  loadEnvFile();
  const effectiveUri = uri || process.env.MONGODB_URI;

  if (isConnected) {
    return mongoose.connection;
  }

  if (!effectiveUri) {
    console.log('[DATABASE] No MONGODB_URI configured. Operating in SQLite mode.');
    return null;
  }

  try {
    console.log('[DATABASE] Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(effectiveUri, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: true
    });
    isConnected = true;
    console.log(`[DATABASE] MongoDB Atlas connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error('[DATABASE ERROR] Failed to connect to MongoDB Atlas:', error.message);
    console.log('[DATABASE] Falling back to local SQLite engine (data/products.db).');
    isConnected = false;
    return null;
  }
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

module.exports = {
  connectMongo,
  isMongoConnected,
  disconnectMongo,
  mongoose
};
