const bcrypt = require('bcryptjs');
const createError = require('http-errors');
const User = require('../models/User');
const createToken = require('../helpers/createToken');
const getCookieOptions = require('../helpers/cookieOptions');
const toPublicUser = require('../helpers/publicUser');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw createError(409, 'An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashedPassword });

    const token = createToken(user._id);
    res.cookie('token', token, getCookieOptions());
    res.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw createError(401, 'Invalid email or password');
    }

    const token = createToken(user._id);
    res.cookie('token', token, getCookieOptions());
    res.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

function logout(req, res) {
  const options = getCookieOptions();
  delete options.maxAge;
  res.clearCookie('token', options);
  res.status(200).json({ message: 'Logged out successfully' });
}

module.exports = { register, login, logout };
