/**
 * Centralized error handling middleware
 */

import logger from './logger.js';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(statusCode, message, meta = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = meta.code;
    this.details = meta.details;
    this.isOperational = meta.isOperational !== false;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** JSON body for manual `res.status().json(...)`. */
export function jsonError(errLike) {
  if (typeof errLike === 'string') {
    return { error: errLike };
  }
  const body = { error: errLike.message };
  if (errLike.code) body.code = errLike.code;
  if (errLike.details && Object.keys(errLike.details).length > 0) {
    body.details = errLike.details;
  }
  return body;
}

/** Safe JSON for manual `catch` blocks — same shape as the global handler’s 500 responses (no leak in production). */
export function jsonInternalError(err) {
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err?.message || 'An unexpected error occurred';
  const body = { error: message, code: 'INTERNAL_ERROR' };
  if (process.env.NODE_ENV === 'development' && err?.stack) {
    body.stack = err.stack;
  }
  return body;
}

export function apiThrow(statusCode, errLike) {
  if (typeof errLike === 'string') {
    throw new ApiError(statusCode, errLike);
  }
  throw new ApiError(statusCode, errLike.message, {
    code: errLike.code,
    details: errLike.details
  });
}

/**
 * Error handling middleware
 */
export function errorHandler(err, req, res, next) {
  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.code && { code: err.code }),
      ...(err.details && Object.keys(err.details).length > 0 && { details: err.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message || 'Validation error',
      code: 'VALIDATION_ERROR'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid authentication token',
      code: 'JWT_INVALID'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Authentication token expired',
      code: 'JWT_EXPIRED'
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    error: message,
    ...(statusCode >= 500 && { code: 'INTERNAL_ERROR' }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  });
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res, next) {
  const error = new ApiError(404, `Route not found: ${req.originalUrl}`, {
    code: 'ROUTE_NOT_FOUND'
  });
  next(error);
}
