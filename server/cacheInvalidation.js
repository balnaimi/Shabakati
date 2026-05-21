import cache from './cache.js';

/** Invalidate list/stats caches after data changes (hosts, networks, tags, favorites, groups). */
export function invalidateDataCaches() {
  cache.delete('stats');
  cache.delete('networks');
  cache.delete('tags');
  cache.delete('favorites');
  cache.delete('groups');
}
