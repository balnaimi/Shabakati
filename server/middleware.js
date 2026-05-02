import { verifyToken } from './auth.js';
import { Err } from './apiMessages.js';
import { jsonError } from './errorHandler.js';

/**
 * Middleware to require visitor authentication (visitor or admin)
 * Checks for JWT token in Authorization header
 */
export function requireVisitor(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(jsonError(Err.unauthorized));
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json(jsonError(Err.invalidToken));
  }
  
  // Check if user is visitor or admin
  if (decoded.type !== 'visitor' && decoded.type !== 'admin') {
    return res.status(403).json(jsonError(Err.invalidUserType));
  }
  
  // Add user info to request object
  req.user = decoded;
  next();
}

/**
 * Middleware to require admin authentication
 * Checks for JWT token in Authorization header and verifies admin type
 */
export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(jsonError(Err.unauthorizedAdmin));
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json(jsonError(Err.invalidToken));
  }
  
  // Check if user is admin
  if (decoded.type !== 'admin') {
    return res.status(403).json(jsonError(Err.forbiddenAdmin));
  }
  
  // Add user info to request object
  req.user = decoded;
  next();
}

/**
 * Legacy middleware - now redirects to requireAdmin for backward compatibility
 */
export function requireAuth(req, res, next) {
  return requireAdmin(req, res, next);
}
