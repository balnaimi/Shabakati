import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const DEFAULT_JWT_SECRET = 'your-secret-key-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const JWT_EXPIRATION = '24h'; // 24 hours

export function assertJwtSecretForProduction() {
  if (process.env.NODE_ENV !== 'production') return;
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
    console.error('FATAL: Set a strong JWT_SECRET in production (see .env.example).');
    process.exit(1);
  }
}

export function getJwtSecret() {
  return JWT_SECRET;
}

/**
 * Hash password using bcrypt
 */
export function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hashSync(password, saltRounds);
}

/**
 * Compare password with hash
 */
export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

/**
 * Generate JWT token for user
 */
export function generateToken(username, type = 'admin') {
  return jwt.sign(
    { username, type },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

