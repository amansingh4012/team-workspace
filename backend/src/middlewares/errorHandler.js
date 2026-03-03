/**
 * Global error-handler middleware.
 * Returns { success: false, message, errors? } with proper status codes.
 */
const errorHandler = (err, req, res, _next) => {
  console.error('Error:', err.message);

  // Sequelize field-level validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // Sequelize unique-constraint violation
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // JWT-specific errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
