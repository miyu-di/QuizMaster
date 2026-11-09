const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

// Для публічних ендпоінтів, які можуть відповідати по-різному для гостя і користувача.
// Валідна cookie → req.user; немає cookie, токен недійсний/прострочений або користувача
// вже немає → запит іде далі як гостьовий, без помилки. Помилки БД лишаються помилками.
async function authenticateOptional(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return next();
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_error) {
      return next();
    }

    if (!mongoose.isValidObjectId(payload?.id)) {
      return next();
    }

    const user = await User.findById(payload.id);
    if (user) {
      req.user = user;
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticateOptional;
