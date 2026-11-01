const createError = require('http-errors');

function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      convert: true,
      stripUnknown: true
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join('; ');
      return next(createError(400, message));
    }

    req.validatedQuery = value;
    next();
  };
}

module.exports = validateQuery;
