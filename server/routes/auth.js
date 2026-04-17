import { Router } from 'express';
import { createHash } from 'node:crypto';
import { dbFunctions } from '../database.js';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../auth.js';
import { requireAdmin, requireVisitor } from '../middleware.js';
import logger from '../logger.js';
import { asyncHandler, ApiError } from '../errorHandler.js';
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
      throw new ApiError(400, 'كلمة المرور مطلوبة');
    }

    const visitor = dbFunctions.verifyVisitorPasswordOnly(password, comparePassword);
    if (!visitor) {
      logger.warn('Failed visitor login attempt', { ip: req.ip });
      throw new ApiError(401, 'كلمة مرور الزوار غير صحيحة');
    }

    const token = generateToken(visitor.username, 'visitor');
    logger.info('Visitor logged in', { username: visitor.username, ip: req.ip });

    res.json({
      token,
      username: visitor.username,
      userType: 'visitor',
      message: 'تم تسجيل الدخول كزائر بنجاح'
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
      throw new ApiError(400, 'كلمة مرور المسؤول مطلوبة');
    }

    const admin = dbFunctions.verifyAdminPasswordOnlyForAdmin(password, comparePassword);
    if (!admin) {
      logger.warn('Failed admin login attempt', { ip: req.ip, username: req.user.username });
      throw new ApiError(401, 'كلمة مرور المسؤول غير صحيحة');
    }

    const token = generateToken(admin.username, 'admin');
    logger.info('Admin logged in', { username: admin.username, ip: req.ip });

    res.json({
      token,
      username: admin.username,
      userType: 'admin',
      message: 'تم تسجيل الدخول كمسؤول بنجاح'
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
    res.status(500).json({ error: error.message });
  }
});

router.post(
  '/setup',
  setupLimiter,
  asyncHandler(async (req, res) => {
    const { visitorPassword, adminPassword } = req.body;

    if (!dbFunctions.isSetupRequired()) {
      throw new ApiError(400, 'الإعداد مكتمل بالفعل');
    }

    if (!visitorPassword || visitorPassword.length < 3) {
      throw new ApiError(400, 'كلمة مرور الزوار يجب أن تكون 3 أحرف على الأقل');
    }

    if (!adminPassword || adminPassword.length < 3) {
      throw new ApiError(400, 'كلمة مرور المسؤول يجب أن تكون 3 أحرف على الأقل');
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
      message: 'تم إنشاء كلمتي المرور بنجاح'
    });
  })
);

router.post(
  '/change-password',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ApiError(400, 'كلمة المرور الحالية والجديدة مطلوبة');
    }

    if (newPassword.length < 3) {
      throw new ApiError(400, 'كلمة المرور الجديدة يجب أن تكون 3 أحرف على الأقل');
    }

    const admin = dbFunctions.verifyAdminPasswordOnlyForAdmin(currentPassword, comparePassword);
    if (!admin) {
      throw new ApiError(401, 'كلمة المرور الحالية غير صحيحة');
    }

    const newPasswordHash = hashPassword(newPassword);
    const updatedAdmin = dbFunctions.updateAdminPassword(admin.id, newPasswordHash);

    if (!updatedAdmin) {
      throw new ApiError(500, 'فشل تحديث كلمة المرور');
    }

    cache.deleteByPrefix(AUTH_STATUS_PREFIX);

    logger.info('Admin password changed', { username: updatedAdmin.username });
    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  })
);

router.post(
  '/change-visitor-password',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword) {
      throw new ApiError(400, 'كلمة المرور الجديدة مطلوبة');
    }

    if (newPassword.length < 3) {
      throw new ApiError(400, 'كلمة المرور الجديدة يجب أن تكون 3 أحرف على الأقل');
    }

    const visitor = dbFunctions.getAdminByType('visitor');
    if (!visitor) {
      throw new ApiError(404, 'حساب الزوار غير موجود');
    }

    const newPasswordHash = hashPassword(newPassword);
    const updatedVisitor = dbFunctions.updateAdminPassword(visitor.id, newPasswordHash);

    if (!updatedVisitor) {
      throw new ApiError(500, 'فشل تحديث كلمة مرور الزوار');
    }

    cache.deleteByPrefix(AUTH_STATUS_PREFIX);

    logger.info('Visitor password changed', { username: updatedVisitor.username });
    res.json({ message: 'تم تغيير كلمة مرور الزوار بنجاح' });
  })
);

export default router;
