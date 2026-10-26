function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = err.message;
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  }

  if (err.code === 11000) {
    status = 409;
    message = 'A record with these details already exists';
  }

  if (status < 400 || status > 599) {
    status = 500;
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') {
      message = 'Internal Server Error';
    }
  }

  res.status(status).json({ message });
}

module.exports = errorHandler;
