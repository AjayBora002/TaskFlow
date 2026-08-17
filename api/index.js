const mongoose = require('mongoose');
const app = require('../server/server');

let isConnected = 0;

async function connectDB() {
  if (isConnected) return;
  if (process.env.MONGO_URI) {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false,
    });
    isConnected = db.connections[0].readyState;
  }
}

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Vercel Serverless Mongo connection error:', err);
  }
  return app(req, res);
};
