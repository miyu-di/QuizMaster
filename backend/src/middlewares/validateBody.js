const createError = require('http-errors');

function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      convert: true,
      stripUnknown: true
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join('; ');
      return next(createError(400, message));
    }

    req.body = value;
    next();
  };
}

module.exports = validateBody;
