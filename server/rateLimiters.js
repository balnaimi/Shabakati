import rateLimit from 'express-rate-limit';

const jsonMessage = (ar, en) => ({ error: ar, errorEn: en });

/**
 * Login / visitor auth — limits brute-force attempts per IP.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage(
    'عدد كبير من محاولات تسجيل الدخول. انتظر قليلاً ثم أعد المحاولة.',
    'Too many login attempts. Please try again later.'
  )
});

/**
 * Admin password step after visitor session — separate bucket.
 */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage(
    'عدد كبير من محاولات تسجيل دخول المسؤول. انتظر قليلاً.',
    'Too many admin login attempts. Please try again later.'
  )
});

/**
 * First-time setup (creates accounts) — stricter.
 */
export const setupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage(
    'محاولات إعداد كثيرة. انتظر ثم أعد المحاولة.',
    'Too many setup attempts. Please try again later.'
  )
});
