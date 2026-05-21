/** Minimum password length for visitor and admin accounts. */
export const MIN_PASSWORD_LENGTH = 6;

export function isPasswordLongEnough(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
}
