import rateLimit from 'express-rate-limit';
import { Msg } from './apiMessages.js';

/**
 * Login / visitor auth — limits brute-force attempts per IP.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: Msg.rateLimitLogin, code: 'RATE_LIMIT_LOGIN' }
});

/**
 * Admin password step after visitor session — separate bucket.
 */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: Msg.rateLimitAdminLogin, code: 'RATE_LIMIT_ADMIN_LOGIN' }
});

/**
 * First-time setup (creates accounts) — stricter.
 */
export const setupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: Msg.rateLimitSetup, code: 'RATE_LIMIT_SETUP' }
});
