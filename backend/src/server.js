require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  if (!process.env.JWT_SECRET) {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }
  if (!process.env.CLIENT_URL) {
    throw new Error('Missing required environment variable: CLIENT_URL');
  }

  await connectDB();

  app.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
