const jwt = require('jsonwebtoken');

function createToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }

  return jwt.sign({ id: userId.toString() }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

module.exports = createToken;
