import { dbFunctions } from './database.js';
import { isIPInNetwork } from './networkUtils.js';
import cache from './cache.js';
import logger from './logger.js';

/**
 * Delete offline hosts in this network that exceeded offline_release_after_ms.
 * @returns {number} deleted count
 */
export function purgeStaleOfflineHostsForNetwork(networkId) {
  const net = dbFunctions.getNetworkById(networkId);
  if (!net) return 0;

  const thresholdMs = net.offline_release_after_ms;
  if (thresholdMs === null || thresholdMs === undefined || Number(thresholdMs) <= 0) {
    return 0;
  }

  const ms = Number(thresholdMs);
  const now = Date.now();
  const allHosts = dbFunctions.getAllHosts();
  const candidates = allHosts.filter(
    (h) => h.status === 'offline' && isIPInNetwork(h.ip, net.network_id, net.subnet)
  );

  const toDelete = [];
  for (const h of candidates) {
    const sinceStr = h.offline_since || h.lastChecked || h.createdAt;
    if (!sinceStr) continue;
    const t = new Date(sinceStr).getTime();
    if (Number.isNaN(t)) continue;
    if (now - t >= ms) {
      toDelete.push(h.id);
    }
  }

  if (toDelete.length === 0) return 0;

  for (const hid of toDelete) {
    dbFunctions.deleteHost(hid);
  }

  logger.info(`[OfflineRelease] Removed ${toDelete.length} stale offline host(s) from network ${networkId}`);
  cache.delete('stats');
  cache.delete('networks');
  cache.delete('favorites');
  cache.delete('tags');

  return toDelete.length;
}

export function purgeStaleOfflineHostsAllNetworks() {
  const networks = dbFunctions.getAllNetworks();
  let total = 0;
  for (const net of networks) {
    total += purgeStaleOfflineHostsForNetwork(net.id);
  }
  return total;
}

export function startOfflineReleaseTicker(intervalMs = 15 * 60 * 1000) {
  const tick = () => {
    try {
      purgeStaleOfflineHostsAllNetworks();
    } catch (e) {
      logger.error('[OfflineRelease] Ticker error:', { error: e.message });
    }
  };
  setInterval(tick, intervalMs);
  logger.info(`[OfflineRelease] Background ticker every ${intervalMs / 60000} minutes`);
}
