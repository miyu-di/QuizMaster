const mongoose = require('mongoose');

async function connectDB() {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error('Missing required environment variable: MONGODB_URI');
  }

  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB connected');
}

module.exports = connectDB;
