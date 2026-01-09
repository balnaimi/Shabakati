/**
 * Validation utilities for input sanitization and validation
 */

/**
 * Validate IP address format and range
 * @param {string} ip - IP address to validate
 * @returns {boolean} true if valid IP address
 */
export function isValidIP(ip) {
  if (!ip || typeof ip !== 'string') return false;
  
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip.trim())) return false;
  
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  
  return parts.every(part => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} true if valid URL
 */
export function isValidURL(url) {
  if (!url || typeof url !== 'string' || url.trim() === '') return true; // Empty URL is allowed
  
  try {
    const urlObj = new URL(url.trim());
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitize string input (remove HTML tags and dangerous characters)
 * @param {string} input - Input string to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, maxLength = 1000) {
  if (!input || typeof input !== 'string') return '';
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>\"']/g, '');
  
  // Trim and limit length
  sanitized = sanitized.trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validate and sanitize host name
 * @param {string} name - Host name
 * @returns {{valid: boolean, sanitized: string, error?: string}}
 */
export function validateHostName(name) {
  const MAX_NAME_LENGTH = 100;
  
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { valid: false, sanitized: '', error: 'اسم الجهاز مطلوب' };
  }
  
  const sanitized = sanitizeString(name, MAX_NAME_LENGTH);
  
  if (sanitized.length === 0) {
    return { valid: false, sanitized: '', error: 'اسم الجهاز غير صحيح' };
  }
  
  if (sanitized.length > MAX_NAME_LENGTH) {
    return { valid: false, sanitized: '', error: `اسم الجهاز طويل جداً (الحد الأقصى ${MAX_NAME_LENGTH} حرف)` };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate and sanitize description
 * @param {string} description - Description text
 * @returns {{valid: boolean, sanitized: string, error?: string}}
 */
export function validateDescription(description) {
  const MAX_DESCRIPTION_LENGTH = 500;
  
  if (!description || description.trim() === '') {
    return { valid: true, sanitized: '' }; // Description is optional
  }
  
  const sanitized = sanitizeString(description, MAX_DESCRIPTION_LENGTH);
  
  if (sanitized.length > MAX_DESCRIPTION_LENGTH) {
    return { valid: false, sanitized: '', error: `الوصف طويل جداً (الحد الأقصى ${MAX_DESCRIPTION_LENGTH} حرف)` };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate and sanitize URL
 * @param {string} url - URL to validate
 * @returns {{valid: boolean, sanitized: string, error?: string}}
 */
export function validateURL(url) {
  const MAX_URL_LENGTH = 2048;
  
  if (!url || url.trim() === '') {
    return { valid: true, sanitized: '' }; // URL is optional
  }
  
  if (!isValidURL(url)) {
    return { valid: false, sanitized: '', error: 'رابط URL غير صحيح' };
  }
  
  const sanitized = url.trim();
  if (sanitized.length > MAX_URL_LENGTH) {
    return { valid: false, sanitized: '', error: `رابط URL طويل جداً (الحد الأقصى ${MAX_URL_LENGTH} حرف)` };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate network ID (IP address)
 * @param {string} networkId - Network ID to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateNetworkID(networkId) {
  if (!networkId || typeof networkId !== 'string' || networkId.trim() === '') {
    return { valid: false, error: 'Network ID مطلوب' };
  }
  
  if (!isValidIP(networkId)) {
    return { valid: false, error: 'Network ID غير صحيح' };
  }
  
  return { valid: true };
}

/**
 * Validate subnet mask
 * @param {number} subnet - Subnet mask value
 * @returns {{valid: boolean, error?: string}}
 */
export function validateSubnet(subnet) {
  const subnetNum = parseInt(subnet, 10);
  
  if (isNaN(subnetNum)) {
    return { valid: false, error: 'Subnet يجب أن يكون رقماً' };
  }
  
  if (subnetNum < 0 || subnetNum > 32) {
    return { valid: false, error: 'Subnet يجب أن يكون بين 0 و 32' };
  }
  
  return { valid: true };
}

/**
 * Validate tag name
 * @param {string} name - Tag name
 * @returns {{valid: boolean, sanitized: string, error?: string}}
 */
export function validateTagName(name) {
  const MAX_TAG_NAME_LENGTH = 50;
  
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { valid: false, sanitized: '', error: 'اسم الوسم مطلوب' };
  }
  
  const sanitized = sanitizeString(name, MAX_TAG_NAME_LENGTH);
  
  if (sanitized.length === 0) {
    return { valid: false, sanitized: '', error: 'اسم الوسم غير صحيح' };
  }
  
  if (sanitized.length > MAX_TAG_NAME_LENGTH) {
    return { valid: false, sanitized: '', error: `اسم الوسم طويل جداً (الحد الأقصى ${MAX_TAG_NAME_LENGTH} حرف)` };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate color hex code
 * @param {string} color - Color hex code
 * @returns {{valid: boolean, error?: string}}
 */
export function validateColor(color) {
  if (!color || typeof color !== 'string') {
    return { valid: false, error: 'اللون مطلوب' };
  }
  
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexRegex.test(color.trim())) {
    return { valid: false, error: 'تنسيق اللون غير صحيح (يجب أن يكون hex مثل #4a9eff)' };
  }
  
  return { valid: true };
}
