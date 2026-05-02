import { Router } from 'express';
import { createHash } from 'node:crypto';
import { dbFunctions } from '../database.js';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../auth.js';
import { requireAdmin, requireVisitor } from '../middleware.js';
import logger from '../logger.js';
import { asyncHandler, apiThrow, jsonInternalError } from '../errorHandler.js';
import { Err, Msg } from '../apiMessages.js';
import cache from '../cache.js';
import { loginLimiter, adminLoginLimiter, setupLimiter } from '../rateLimiters.js';

const router = Router();

const AUTH_STATUS_PREFIX = 'auth_status:';
const AUTH_STATUS_TTL_MS = 10_000;

function authStatusCacheKey(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return `${AUTH_STATUS_PREFIX}anon`;
  }
  const token = authHeader.substring(7);
  const hash = createHash('sha256').update(token).digest('hex');
  return `${AUTH_STATUS_PREFIX}${hash}`;
}

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password) {
      apiThrow(400, Err.passwordRequired);
    }

    const visitor = dbFunctions.verifyVisitorPasswordOnly(password, comparePassword);
    if (!visitor) {
      logger.warn('Failed visitor login attempt', { ip: req.ip });
      apiThrow(401, Err.incorrectVisitorPassword);
    }

    const token = generateToken(visitor.username, 'visitor');
    logger.info('Visitor logged in', { username: visitor.username, ip: req.ip });

    res.json({
      token,
      username: visitor.username,
      userType: 'visitor',
      message: Msg.loggedInVisitor
    });
  })
);

router.post(
  '/admin-login',
  adminLoginLimiter,
  requireVisitor,
  asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password) {
      apiThrow(400, Err.adminPasswordRequired);
    }

    const admin = dbFunctions.verifyAdminPasswordOnlyForAdmin(password, comparePassword);
    if (!admin) {
      logger.warn('Failed admin login attempt', { ip: req.ip, username: req.user.username });
      apiThrow(401, Err.incorrectAdminPassword);
    }

    const token = generateToken(admin.username, 'admin');
    logger.info('Admin logged in', { username: admin.username, ip: req.ip });

    res.json({
      token,
      username: admin.username,
      userType: 'admin',
      message: Msg.loggedInAdmin
    });
  })
);

router.get('/status', (req, res) => {
  try {
    const cacheKey = authStatusCacheKey(req);
    const cached = cache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const result = { authenticated: false, userType: null };
      cache.set(cacheKey, result, AUTH_STATUS_TTL_MS);
      return res.json(result);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      const result = { authenticated: false, userType: null };
      cache.set(cacheKey, result, AUTH_STATUS_TTL_MS);
      return res.json(result);
    }

    const result = {
      authenticated: true,
      username: decoded.username,
      userType: decoded.type || 'visitor',
      isAdmin: decoded.type === 'admin'
    };
    cache.set(cacheKey, result, AUTH_STATUS_TTL_MS);
    res.json(result);
  } catch {
    const cacheKey = authStatusCacheKey(req);
    const result = { authenticated: false, userType: null };
    cache.set(cacheKey, result, AUTH_STATUS_TTL_MS);
    res.json(result);
  }
});

router.get('/check-setup', (req, res) => {
  try {
    const cacheKey = 'check_setup';
    const cached = cache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const setupRequired = dbFunctions.isSetupRequired();
    const result = { setupRequired };
    cache.set(cacheKey, result, 30000);
    res.json(result);
  } catch (error) {
    logger.error('Error checking setup status:', { error: error.message });
    res.status(500).json(jsonInternalError(error));
  }
});

router.post(
  '/setup',
  setupLimiter,
  asyncHandler(async (req, res) => {
    const { visitorPassword, adminPassword } = req.body;

    if (!dbFunctions.isSetupRequired()) {
      apiThrow(400, Err.setupAlreadyComplete);
    }

    if (!visitorPassword || visitorPassword.length < 3) {
      apiThrow(400, Err.visitorPasswordMinLength);
    }

    if (!adminPassword || adminPassword.length < 3) {
      apiThrow(400, Err.adminPasswordMinLength);
    }

    const visitorPasswordHash = hashPassword(visitorPassword);
    const visitor = dbFunctions.createAdmin('visitor', visitorPasswordHash, 'visitor');

    const adminPasswordHash = hashPassword(adminPassword);
    dbFunctions.createAdmin('admin', adminPasswordHash, 'admin');

    cache.delete('check_setup');

    logger.info('Setup completed', { visitorCreated: true, adminCreated: true });

    const token = generateToken(visitor.username, 'visitor');
    res.json({
      token,
      username: visitor.username,
      userType: 'visitor',
      message: Msg.passwordsCreated
    });
  })
);

router.post(
  '/change-password',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      apiThrow(400, Err.currentAndNewPasswordRequired);
    }

    if (newPassword.length < 3) {
      apiThrow(400, Err.newPasswordMinLength);
    }

    const admin = dbFunctions.verifyAdminPasswordOnlyForAdmin(currentPassword, comparePassword);
    if (!admin) {
      apiThrow(401, Err.currentPasswordIncorrect);
    }

    const newPasswordHash = hashPassword(newPassword);
    const updatedAdmin = dbFunctions.updateAdminPassword(admin.id, newPasswordHash);

    if (!updatedAdmin) {
      apiThrow(500, Err.failedUpdatePassword);
    }

    cache.deleteByPrefix(AUTH_STATUS_PREFIX);

    logger.info('Admin password changed', { username: updatedAdmin.username });
    res.json({ message: Msg.passwordChanged });
  })
);

router.post(
  '/change-visitor-password',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword) {
      apiThrow(400, Err.newPasswordRequired);
    }

    if (newPassword.length < 3) {
      apiThrow(400, Err.newPasswordMinLength);
    }

    const visitor = dbFunctions.getAdminByType('visitor');
    if (!visitor) {
      apiThrow(404, Err.visitorAccountNotFound);
    }

    const newPasswordHash = hashPassword(newPassword);
    const updatedVisitor = dbFunctions.updateAdminPassword(visitor.id, newPasswordHash);

    if (!updatedVisitor) {
      apiThrow(500, Err.failedUpdateVisitorPassword);
    }

    cache.deleteByPrefix(AUTH_STATUS_PREFIX);

    logger.info('Visitor password changed', { username: updatedVisitor.username });
    res.json({ message: Msg.visitorPasswordUpdated });
  })
);

export default router;
