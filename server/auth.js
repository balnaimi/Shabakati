import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION = '24h'; // 24 hours

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
export function generateToken(username) {
  return jwt.sign(
    { username, type: 'admin' },
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

