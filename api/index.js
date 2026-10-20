const app = require('../server');
const { connectMongo } = require('../db/mongo/connection');

// Cache the connection promise across serverless invocations
let connectionPromise = null;

module.exports = async (req, res) => {
  try {
    // Restore original URL when rewritten by Vercel serverless proxy
    const originalUrl = req.headers['x-original-url'] || req.headers['x-matched-path'];
    if (originalUrl) {
      const currentQuery = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
      const targetPath = originalUrl.split('?')[0];
      const targetQuery = originalUrl.includes('?') ? originalUrl.substring(originalUrl.indexOf('?')) : currentQuery;
      req.url = `${targetPath}${targetQuery}`;
    }

    // Normalize URL if Vercel serverless routing passes function path prefix
    if (req.url.startsWith('/api/index/')) {
      req.url = req.url.replace('/api/index/', '/api/');
    } else if (req.url === '/api/index') {
      req.url = '/api';
    }

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
