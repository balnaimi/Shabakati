/**
 * Simple in-memory cache for API responses
 * Used to cache frequently accessed data like stats, tags, and networks
 */

class SimpleCache {
  constructor(defaultTTL = 60000) { // Default 1 minute
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if expired/not found
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = null) {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache size
   * @returns {number} Number of items in cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Clean expired entries
   */
  clean() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Create singleton instance
const cache = new SimpleCache(60000); // 1 minute default TTL

// Clean expired entries every 5 minutes
setInterval(() => {
  cache.clean();
}, 5 * 60 * 1000);

export default cache;
