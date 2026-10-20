const app = require('../server');
const { connectMongo } = require('../db/mongo/connection');

// Cache the connection promise across serverless invocations
let connectionPromise = null;

module.exports = async (req, res) => {
  try {
    if (process.env.MONGODB_URI) {
      if (!connectionPromise) {
        connectionPromise = connectMongo().catch(err => {
          console.error('[VERCEL] MongoDB connection error:', err.message);
          connectionPromise = null;
          return null;
        });
      }
      if (connectionPromise) {
        await connectionPromise;
      }
    } else {
      console.warn('[VERCEL WARNING] MONGODB_URI environment variable is not defined in Vercel settings.');
    }
    return app(req, res);
  } catch (err) {
    console.error('[VERCEL HANDLER ERROR]:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
};
