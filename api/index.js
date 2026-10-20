const app = require('../server');
const { connectMongo } = require('../db/mongo/connection');

// Cache the connection promise across serverless invocations
let connectionPromise = null;

module.exports = async (req, res) => {
  if (process.env.MONGODB_URI && !connectionPromise) {
    connectionPromise = connectMongo().catch(err => {
      console.error('[VERCEL] MongoDB connection error:', err.message);
      connectionPromise = null;
    });
  }
  if (connectionPromise) {
    await connectionPromise;
  }
  return app(req, res);
};
