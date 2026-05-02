/**
 * Validation utilities for input sanitization and validation.
 * On failure return `apiDef` ({ code, message, details? }) for apiThrow / JSON errors.
 */

import { Err } from './apiMessages.js';

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
  if (!url || typeof url !== 'string' || url.trim() === '') return true;

  try {
    const urlObj = new URL(url.trim());
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitize string input (remove HTML tags and dangerous characters)
 * @param {string} input - Input to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, maxLength = 1000) {
  if (!input || typeof input !== 'string') return '';

  let sanitized = input.replace(/<[^>]*>/g, '');
  sanitized = sanitized.replace(/[<>\"']/g, '');
  sanitized = sanitized.trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * @param {string} name
 * @returns {{ valid: boolean, sanitized: string, apiDef?: object }}
 */
export function validateHostName(name) {
  const MAX_NAME_LENGTH = 100;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { valid: false, sanitized: '', apiDef: Err.hostNameRequired };
  }

  const sanitized = sanitizeString(name, MAX_NAME_LENGTH);

  if (sanitized.length === 0) {
    return { valid: false, sanitized: '', apiDef: Err.invalidHostName };
  }

  return { valid: true, sanitized };
}

/**
 * @param {string} description
 * @returns {{ valid: boolean, sanitized: string, apiDef?: object }}
 */
export function validateDescription(description) {
  const MAX_DESCRIPTION_LENGTH = 500;

  if (!description || description.trim() === '') {
    return { valid: true, sanitized: '' };
  }

  const sanitized = sanitizeString(description, MAX_DESCRIPTION_LENGTH);
  return { valid: true, sanitized };
}

/**
 * @param {string} url
 * @returns {{ valid: boolean, sanitized: string, apiDef?: object }}
 */
export function validateURL(url) {
  const MAX_URL_LENGTH = 2048;

  if (!url || url.trim() === '') {
    return { valid: true, sanitized: '' };
  }

  if (!isValidURL(url)) {
    return { valid: false, sanitized: '', apiDef: Err.invalidUrlFormat };
  }

  const sanitized = url.trim();
  if (sanitized.length > MAX_URL_LENGTH) {
    return {
      valid: false,
      sanitized: '',
      apiDef: { ...Err.urlTooLong, details: { max: MAX_URL_LENGTH } }
    };
  }

  return { valid: true, sanitized };
}

/**
 * @param {string} networkId
 * @returns {{ valid: boolean, apiDef?: object }}
 */
export function validateNetworkID(networkId) {
  if (!networkId || typeof networkId !== 'string' || networkId.trim() === '') {
    return { valid: false, apiDef: Err.networkIdRequiredField };
  }

  if (!isValidIP(networkId)) {
    return { valid: false, apiDef: Err.networkIdInvalidIp };
  }

  return { valid: true };
}

/**
 * @param {number|string} subnet
 * @returns {{ valid: boolean, apiDef?: object }}
 */
export function validateSubnet(subnet) {
  const subnetNum = parseInt(subnet, 10);

  if (isNaN(subnetNum)) {
    return { valid: false, apiDef: Err.subnetNotNumber };
  }

  if (subnetNum < 0 || subnetNum > 32) {
    return { valid: false, apiDef: Err.subnetBetween0And32 };
  }

  return { valid: true };
}

/**
 * @param {string} name
 * @returns {{ valid: boolean, sanitized: string, apiDef?: object }}
 */
export function validateTagName(name) {
  const MAX_TAG_NAME_LENGTH = 50;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { valid: false, sanitized: '', apiDef: Err.tagNameRequiredField };
  }

  const sanitized = sanitizeString(name, MAX_TAG_NAME_LENGTH);

  if (sanitized.length === 0) {
    return { valid: false, sanitized: '', apiDef: Err.invalidTagName };
  }

  return { valid: true, sanitized };
}

/**
 * @param {string} color
 * @returns {{ valid: boolean, apiDef?: object }}
 */
export function validateColor(color) {
  if (!color || typeof color !== 'string') {
    return { valid: false, apiDef: Err.colorRequiredField };
  }

  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexRegex.test(color.trim())) {
    return { valid: false, apiDef: Err.invalidColorHex };
  }

  return { valid: true };
}
