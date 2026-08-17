const mongoose = require('mongoose');
const app = require('../server/server');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is missing in Vercel settings.');
    }

    cached.promise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    }).then((mongooseInstance) => {
      console.log('✅ Serverless MongoDB Connected');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('❌ Vercel Serverless Database Connection Error:', err.message);
    return res.status(500).json({
      message: `Database Connection Error: ${err.message}. If MONGO_URI is added, please check MongoDB Atlas Network Access IP Whitelist (0.0.0.0/0).`,
    });
  }

  return app(req, res);
};
