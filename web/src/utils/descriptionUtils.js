/**
 * Get description text based on language
 * @param {string} description - Description from database (can be JSON or plain text)
 * @param {string} language - Current language ('ar' or 'en')
 * @returns {string} - Description text in the requested language
 */
export function getDescription(description, language = 'ar') {
  if (!description) return '';
  
  try {
    // Try to parse as JSON (system-generated description)
    const parsed = JSON.parse(description);
    if (parsed.type === 'system' && parsed[language]) {
      return parsed[language];
    }
    // If it's JSON but not system type, return the whole object as string (fallback)
    if (parsed.type === 'system') {
      // If language not found, fallback to Arabic
      return parsed.ar || parsed.en || description;
    }
  } catch (e) {
    // Not JSON, return as-is (user-written description)
  }
  
  // Return as-is for user-written descriptions
  return description;
}

/** Optional discoveryTcpPort on system-generated descriptions (network scan). */
export function parseSystemDiscoveryTcpPort(description) {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description);
    if (parsed?.type !== 'system' || parsed.discoveryTcpPort == null) return null;
    const n = Number(parsed.discoveryTcpPort);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
