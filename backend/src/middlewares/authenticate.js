const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const User = require('../models/User');

async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      throw createError(401, 'Authentication required');
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_error) {
      throw createError(401, 'Invalid or expired authentication token');
    }

    const user = await User.findById(payload.id);
    if (!user) {
      throw createError(401, 'User for this token no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;
