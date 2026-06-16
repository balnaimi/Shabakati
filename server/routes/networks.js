import { Router } from 'express';
import { dbFunctions } from '../database.js';
import { scanNetwork, summarizeDetectionMethods } from '../networkScanner.js';
import { getNetworkCIDR, isIPInNetwork, normalizeOptionalDhcpRange, filterHostsInNetwork } from '../networkUtils.js';
import { startAutoScan, stopAutoScan } from '../autoScanService.js';
import { ALLOWED_AUTO_SCAN_INTERVAL_SET, ALLOWED_OFFLINE_RELEASE_SET } from '../networkPolicies.js';
import { purgeStaleOfflineHostsForNetwork } from '../offlineReleaseService.js';
import { requireAdmin, requireVisitor } from '../middleware.js';
import logger from '../logger.js';
import { asyncHandler, apiThrow, jsonError, jsonInternalError } from '../errorHandler.js';
import { invalidateDataCaches } from '../cacheInvalidation.js';
import {
  validateHostName,
  validateNetworkID,
  validateSubnet
} from '../validators.js';
import { Err, Msg, deletedHostsCount } from '../apiMessages.js';
import { buildNetworkScanHostDescription } from '../discoveryDescription.js';
import { suggestHostName } from '../../shared/suggestHostName.js';
import cache from '../cache.js';

const router = Router();

router.get('/', requireVisitor, (req, res) => {
  try {
    const cacheKey = 'networks';
    let networks = cache.get(cacheKey);

    if (!networks) {
      networks = dbFunctions.getAllNetworks();
      cache.set(cacheKey, networks, 30000);
    }

    res.json(networks);
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.get('/:id', requireVisitor, (req, res) => {
  try {
    const network = dbFunctions.getNetworkById(parseInt(req.params.id));
    if (!network) {
      return res.status(404).json(jsonError(Err.networkNotFound));
    }
    res.json(network);
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.post('/', requireAdmin, asyncHandler((req, res) => {
  const { name, networkId, subnet } = req.body;

  if (!name || !networkId || subnet === undefined) {
    apiThrow(400, Err.networkFieldsRequired);
  }

  const networkIdValidation = validateNetworkID(networkId);
  if (!networkIdValidation.valid) {
    apiThrow(400, networkIdValidation.apiDef);
  }

  const subnetValidation = validateSubnet(subnet);
  if (!subnetValidation.valid) {
    apiThrow(400, subnetValidation.apiDef);
  }

  const nameValidation = validateHostName(name);
  if (!nameValidation.valid) {
    apiThrow(400, nameValidation.apiDef);
  }

  const dhcp = normalizeOptionalDhcpRange(
    req.body.dhcp_range_start,
    req.body.dhcp_range_end,
    networkId.trim(),
    parseInt(subnet, 10)
  );

  const network = {
    name: nameValidation.sanitized,
    networkId: networkId.trim(),
    subnet: parseInt(subnet),
    createdAt: new Date().toISOString(),
    dhcp_range_start: dhcp.start,
    dhcp_range_end: dhcp.end
  };

  const newNetwork = dbFunctions.addNetwork(network);
  cache.delete('networks');
  cache.delete('stats');
  logger.info('Network added', { networkId: newNetwork.id, name: newNetwork.name });
  res.status(201).json(newNetwork);
}));

router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { name, networkId, subnet, lastScanned } = req.body;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    apiThrow(404, Err.networkNotFound);
  }

  const existingNetwork = dbFunctions.getNetworkById(id);
  if (!existingNetwork) {
    apiThrow(404, Err.networkNotFound);
  }

  let resolvedName = existingNetwork.name;
  if (name !== undefined) {
    const nameValidation = validateHostName(name);
    if (!nameValidation.valid) {
      apiThrow(400, nameValidation.apiDef);
    }
    resolvedName = nameValidation.sanitized;
  }

  let resolvedNetworkId = existingNetwork.network_id;
  if (networkId !== undefined) {
    const networkIdValidation = validateNetworkID(networkId);
    if (!networkIdValidation.valid) {
      apiThrow(400, networkIdValidation.apiDef);
    }
    resolvedNetworkId = networkId.trim();
  }

  let resolvedSubnet = existingNetwork.subnet;
  if (subnet !== undefined) {
    const subnetValidation = validateSubnet(subnet);
    if (!subnetValidation.valid) {
      apiThrow(400, subnetValidation.apiDef);
    }
    resolvedSubnet = parseInt(subnet, 10);
  }

  const { scan_use_ping, scan_use_tcp } = req.body;

  let offline_release_patch = undefined;
  if (req.body.offline_release_after_ms !== undefined) {
    const v = req.body.offline_release_after_ms;
    if (v === null || v === '') {
      offline_release_patch = null;
    } else {
      const n = parseInt(v, 10);
      if (!ALLOWED_OFFLINE_RELEASE_SET.has(n)) {
        apiThrow(400, Err.offlineReleaseNotAllowed);
      }
      offline_release_patch = n;
    }
  }

  let dhcpStartPatch = undefined;
  let dhcpEndPatch = undefined;
  if (req.body.dhcp_range_start !== undefined || req.body.dhcp_range_end !== undefined) {
    const normalized = normalizeOptionalDhcpRange(
      req.body.dhcp_range_start,
      req.body.dhcp_range_end,
      resolvedNetworkId,
      resolvedSubnet
    );
    dhcpStartPatch = normalized.start;
    dhcpEndPatch = normalized.end;
  }

  const network = {
    name: resolvedName,
    networkId: resolvedNetworkId,
    subnet: resolvedSubnet,
    lastScanned: lastScanned !== undefined ? lastScanned : existingNetwork.last_scanned,
    scan_use_ping: scan_use_ping !== undefined ? (scan_use_ping ? 1 : 0) : undefined,
    scan_use_tcp: scan_use_tcp !== undefined ? (scan_use_tcp ? 1 : 0) : undefined,
    offline_release_after_ms: offline_release_patch,
    dhcp_range_start: dhcpStartPatch,
    dhcp_range_end: dhcpEndPatch
  };

  const updatedNetwork = dbFunctions.updateNetwork(id, network);
  cache.delete('networks');
  res.json(updatedNetwork);
}));

router.delete('/:id/hosts', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json(jsonError(Err.networkNotFound));
    }

    const allHosts = dbFunctions.getAllHosts();
    const networkHosts = filterHostsInNetwork(allHosts, network);

    let deletedCount = 0;
    networkHosts.forEach(host => {
      dbFunctions.deleteHost(host.id);
      deletedCount++;
    });

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} host(s)`,
      deletedCount
    });
  } catch (error) {
    logger.error('Error in DELETE /api/networks/:id/hosts:', { error: error.message, networkId: id });
    res.status(500).json(jsonInternalError(error));
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json(jsonError(Err.networkNotFound));
    }

    const allHosts = dbFunctions.getAllHosts();
    const networkHosts = filterHostsInNetwork(allHosts, network);

    let hostsRemoved = 0;
    networkHosts.forEach(host => {
      dbFunctions.deleteHost(host.id);
      hostsRemoved++;
    });

    dbFunctions.deleteNetwork(id);

    res.json({
      success: true,
      message: `Deleted network and ${hostsRemoved} host(s)`,
      deletedHostsCount: hostsRemoved
    });
  } catch (error) {
    logger.error('Error in DELETE /api/networks/:id:', { error: error.message, networkId: id });
    res.status(500).json(jsonInternalError(error));
  }
});

router.get('/:id/hosts', requireVisitor, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json(jsonError(Err.networkNotFound));
    }

    const allHosts = dbFunctions.getAllHosts();
    const networkHosts = filterHostsInNetwork(allHosts, network);

    res.json(networkHosts);
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.post('/:id/hosts/bulk-delete', requireAdmin, asyncHandler(async (req, res) => {
  const networkId = parseInt(req.params.id, 10);
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    apiThrow(400, Err.hostIdsRequired);
  }
  if (ids.length > 500) {
    apiThrow(400, Err.maxHostsPerOperation);
  }

  const network = dbFunctions.getNetworkById(networkId);
  if (!network) {
    apiThrow(404, Err.networkNotFound);
  }

  const toDelete = [];
  for (const rawId of ids) {
    const hid = parseInt(rawId, 10);
    if (Number.isNaN(hid)) continue;
    const host = dbFunctions.getHostById(hid);
    if (!host) continue;
    if (!isIPInNetwork(host.ip, network.network_id, network.subnet)) continue;
    toDelete.push(hid);
  }

  if (toDelete.length === 0) {
    return res.json({ deletedCount: 0, message: Msg.noHostsDeleted });
  }

  const deletedCount = dbFunctions.deleteHostsBulkIds(toDelete);
  cache.delete('stats');
  cache.delete('tags');
  cache.delete('favorites');
  cache.delete('networks');
  logger.info('Bulk delete hosts', { networkId, deletedCount, requested: ids.length });
  res.json({ deletedCount, message: deletedHostsCount(deletedCount) });
}));

router.post('/:id/scan', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json(jsonError(Err.networkNotFound));
    }

    const { timeout } = req.body;
    const scanTimeout = timeout || 2;

    let usePing = true;
    let useTcpPorts = true;
    if (req.body.usePing !== undefined) {
      usePing = !!req.body.usePing;
    } else {
      usePing = (network.scan_use_ping ?? 1) === 1;
    }
    if (req.body.useTcpPorts !== undefined) {
      useTcpPorts = !!req.body.useTcpPorts;
    } else {
      useTcpPorts = (network.scan_use_tcp ?? 1) === 1;
    }
    if (!usePing && !useTcpPorts) {
      return res.status(400).json(jsonError(Err.enablePingOrTcp));
    }

    const scanOptions = { usePing, useTcpPorts, networkId: id };

    const cidr = getNetworkCIDR(network.network_id, network.subnet);
    logger.info(`[Scan] Starting scan for network ${id}: ${cidr}, timeout: ${scanTimeout}s, scanOptions: ${JSON.stringify(scanOptions)}`);

    const activeHosts = await scanNetwork(cidr, scanTimeout, scanOptions);
    const detectionSummary = summarizeDetectionMethods(activeHosts);
    logger.info(`[Scan] Found ${activeHosts.length} active hosts`);

    dbFunctions.updateNetwork(id, {
      name: network.name,
      networkId: network.network_id,
      subnet: network.subnet,
      lastScanned: new Date().toISOString()
    });

    let addedCount = 0;
    const discoveredIPs = new Set(activeHosts.map(h => h.ip));

    if (activeHosts.length > 0) {
      const allHosts = dbFunctions.getAllHosts();
      const existingIPs = new Set(allHosts.map(h => h.ip));

      for (const host of activeHosts) {
        if (!existingIPs.has(host.ip) && !host.isExisting) {
          try {
            dbFunctions.addHost({
              name: suggestHostName({
                ip: host.ip,
                vendor: host.vendor,
                hostname: host.hostname,
                existingName: host.existingName,
                deviceCategory: host.deviceCategory
              }),
              ip: host.ip,
              description:
                host.description ||
                JSON.stringify(
                  buildNetworkScanHostDescription(network.name, host.detectionMethod, host.port, {
                    auto: false
                  })
                ),
              url: '',
              status: 'online',
              tagIds: [],
              createdAt: new Date().toISOString(),
              lastChecked: new Date().toISOString(),
              pingLatency: host.pingLatency || null,
              packetLoss: null,
              discoveryMethod: host.detectionMethod || null,
              mac_address: host.mac || null,
              vendor: host.vendor || null,
              device_category: host.deviceCategory || null
            });
            addedCount++;
            existingIPs.add(host.ip);
          } catch (error) {
            logger.error(`Error adding host ${host.ip}:`, { error: error.message, ip: host.ip });
          }
        }
      }
      logger.info(`[Scan] Added ${addedCount} new hosts to database`);
    }

    const allNetworkHosts = filterHostsInNetwork(dbFunctions.getAllHosts(), network);

    let updatedCount = 0;
    for (const host of allNetworkHosts) {
      const isOnline = discoveredIPs.has(host.ip);
      const newStatus = isOnline ? 'online' : 'offline';
      const activeHost = activeHosts.find(h => h.ip === host.ip);

      if (isOnline) {
        dbFunctions.clearAutoScanResultsForHost(id, host.id, 'disconnected');
      }

      try {
        const hostTags = dbFunctions.getHostTags(host.id);
        const tagIds = hostTags.map(tag => tag.id);

        dbFunctions.updateHost(host.id, {
          name: host.name,
          ip: host.ip,
          description: host.description || '',
          url: host.url || '',
          status: newStatus,
          tagIds: tagIds,
          lastChecked: new Date().toISOString(),
          pingLatency: activeHost?.pingLatency || null,
          packetLoss: null,
          discoveryMethod: activeHost?.detectionMethod !== undefined && activeHost?.detectionMethod !== null
            ? activeHost.detectionMethod
            : undefined,
          mac_address: activeHost?.mac || undefined,
          vendor: activeHost?.vendor || undefined,
          device_category: activeHost?.deviceCategory || undefined
        });
        updatedCount++;
      } catch (error) {
        logger.error(`Error updating host ${host.ip} status:`, { error: error.message, ip: host.ip });
      }
    }
    logger.info(`[Scan] Updated status for ${updatedCount} existing hosts`);

    purgeStaleOfflineHostsForNetwork(id);
    invalidateDataCaches();

    res.json({
      success: true,
      count: activeHosts.length,
      hosts: activeHosts,
      addedCount: addedCount,
      updatedCount: updatedCount,
      addedHosts: true,
      scanOptionsUsed: scanOptions,
      detectionSummary
    });
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.post('/:id/auto-scan', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { enabled, interval } = req.body;

  const network = dbFunctions.getNetworkById(id);
  if (!network) {
    apiThrow(404, Err.networkNotFound);
  }

  const requestedMs =
    interval !== undefined && interval !== null ? parseInt(interval, 10) : parseInt(network.auto_scan_interval, 10);
  const scanInterval = ALLOWED_AUTO_SCAN_INTERVAL_SET.has(requestedMs)
    ? requestedMs
    : parseInt(network.auto_scan_interval, 10);

  if (!ALLOWED_AUTO_SCAN_INTERVAL_SET.has(scanInterval)) {
    apiThrow(400, Err.autoScanIntervalInvalid);
  }

  dbFunctions.updateNetworkAutoScan(id, enabled, scanInterval);

  if (enabled) {
    startAutoScan(id);
  } else {
    stopAutoScan(id);
  }

  const updatedNetwork = dbFunctions.getNetworkById(id);
  invalidateDataCaches();

  logger.info(`Auto scan ${enabled ? 'enabled' : 'disabled'} for network ${id}`);
  res.json(updatedNetwork);
}));

router.get('/:id/auto-scan-results', requireVisitor, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { type } = req.query;

    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json(jsonError(Err.networkNotFound));
    }

    const results = dbFunctions.getAutoScanResults(id, type || null);

    const resultsWithHosts = results.map(result => {
      const host = dbFunctions.getHostById(result.host_id);
      return {
        ...result,
        host: host
      };
    });

    res.json(resultsWithHosts);
  } catch (error) {
    logger.error('Error in GET /api/networks/:id/auto-scan-results:', { error: error.message });
    res.status(500).json(jsonInternalError(error));
  }
});

router.delete('/:id/auto-scan-results', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { type } = req.query;

    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json(jsonError(Err.networkNotFound));
    }

    dbFunctions.clearAutoScanResults(id, type || null);
    res.json({ success: true, message: Msg.resultsCleared });
  } catch (error) {
    logger.error('Error in DELETE /api/networks/:id/auto-scan-results:', { error: error.message });
    res.status(500).json(jsonInternalError(error));
  }
});

export default router;
