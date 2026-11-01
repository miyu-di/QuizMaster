const mongoose = require('mongoose');
const createError = require('http-errors');

function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params[paramName])) {
      return next(createError(400, `Invalid ${paramName}`));
    }
    next();
  };
}

module.exports = validateObjectId;
