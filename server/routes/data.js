import { Router } from 'express';
import { dbFunctions } from '../database.js';
import db from '../database.js';
import { scanNetwork, summarizeDetectionMethods } from '../networkScanner.js';
import { filterHostsInNetwork } from '../networkUtils.js';
import { requireAdmin, requireVisitor } from '../middleware.js';
import logger from '../logger.js';
import { asyncHandler, apiThrow, jsonError, jsonInternalError } from '../errorHandler.js';
import { invalidateDataCaches } from '../cacheInvalidation.js';
import { Err, Msg, importedHostsCount } from '../apiMessages.js';
import cache from '../cache.js';

const router = Router();

router.get('/export', requireVisitor, (req, res) => {
  try {
    const hosts = dbFunctions.getAllHosts();
    const tags = dbFunctions.getAllTags();
    res.json({ hosts, tags, exportedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.post('/import', requireAdmin, async (req, res) => {
  try {
    const { hosts, tags } = req.body;
    let imported = 0;

    const tagNameToId = new Map();
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        if (!tag?.name) continue;
        try {
          const added = dbFunctions.addTag({ name: tag.name, color: tag.color || '#4a9eff' });
          tagNameToId.set(tag.name, added.id);
        } catch (e) {
          const existing = dbFunctions.getAllTags().find((t) => t.name === tag.name);
          if (existing) tagNameToId.set(tag.name, existing.id);
        }
      }
    }
    for (const t of dbFunctions.getAllTags()) {
      tagNameToId.set(t.name, t.id);
    }

    if (hosts && Array.isArray(hosts)) {
      for (const host of hosts) {
        try {
          const tagIds = (host.tags || [])
            .map((t) => {
              if (typeof t === 'object' && t?.name) return tagNameToId.get(t.name);
              if (typeof t === 'string') return tagNameToId.get(t);
              return null;
            })
            .filter(Boolean);
          dbFunctions.addHost({
            name: host.name,
            ip: host.ip,
            description: host.description || '',
            url: host.url || '',
            status: host.status || 'offline',
            tagIds: tagIds,
            createdAt: host.createdAt || new Date().toISOString()
          });
          imported++;
        } catch (e) {
          logger.error('Error importing host:', { error: e.message, host: host.ip });
        }
      }
    }

    invalidateDataCaches();
    res.json({ message: importedHostsCount(imported) });
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.get('/stats', requireVisitor, (req, res) => {
  try {
    const cacheKey = 'stats';
    let stats = cache.get(cacheKey);

    if (!stats) {
      const networks = dbFunctions.getAllNetworks();
      const allHosts = dbFunctions.getAllHosts();

      const totalNetworks = networks.length;
      const totalHosts = allHosts.length;
      const onlineHosts = allHosts.filter(h => h.status === 'online').length;
      const offlineHosts = allHosts.filter(h => h.status === 'offline').length;

      const networksWithStats = networks.map(network => {
        const networkHosts = filterHostsInNetwork(allHosts, network);

        const networkOnlineHosts = networkHosts.filter(h => h.status === 'online').length;
        const networkOfflineHosts = networkHosts.filter(h => h.status === 'offline').length;

        return {
          networkId: network.id,
          networkName: network.name,
          networkCIDR: `${network.network_id}/${network.subnet}`,
          totalHosts: networkHosts.length,
          onlineHosts: networkOnlineHosts,
          offlineHosts: networkOfflineHosts
        };
      });

      stats = {
        totalNetworks,
        totalHosts,
        onlineHosts,
        offlineHosts,
        networksWithStats
      };

      cache.set(cacheKey, stats, 10000);
    }

    res.json(stats);
  } catch (error) {
    logger.error('Error in GET /api/stats:', { error: error.message });
    res.status(500).json(jsonInternalError(error));
  }
});

router.post('/network/scan', requireAdmin, async (req, res) => {
  try {
    const { networkRange, timeout } = req.body;

    if (!networkRange) {
      return res.status(400).json(jsonError(Err.networkRangeRequired));
    }

    const usePing = req.body.usePing !== false;
    const useTcpPorts = req.body.useTcpPorts !== false;
    if (!usePing && !useTcpPorts) {
      return res.status(400).json(jsonError(Err.enablePingOrTcp));
    }

    const scanTimeout = timeout || 2;
    const scanOptions = { usePing, useTcpPorts };
    const activeHosts = await scanNetwork(networkRange, scanTimeout, scanOptions);
    const detectionSummary = summarizeDetectionMethods(activeHosts);

    res.json({
      success: true,
      count: activeHosts.length,
      hosts: activeHosts,
      scanOptionsUsed: scanOptions,
      detectionSummary
    });
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.get('/auto-scan-overview', requireVisitor, (req, res) => {
  try {
    const overview = dbFunctions.getAutoScanOverview();
    res.json(overview);
  } catch (error) {
    logger.error('Error in GET /api/auto-scan-overview:', { error: error.message });
    res.status(500).json(jsonInternalError(error));
  }
});

router.delete('/data/all', requireAdmin, asyncHandler((req, res) => {
  try {
    db.exec('BEGIN TRANSACTION');

    try {
      db.exec('DELETE FROM host_tags');
      db.exec('DELETE FROM host_status_history');
      db.exec('DELETE FROM favorites');
      db.exec('DELETE FROM hosts');
      db.exec('DELETE FROM networks');
      db.exec('DELETE FROM tags');
      db.exec('DELETE FROM groups');

      db.exec('COMMIT');

      cache.clear();

      logger.info('All data deleted successfully', {
        deleted: {
          hosts: 'all',
          networks: 'all',
          tags: 'all',
          groups: 'all',
          favorites: 'all'
        }
      });

      res.json({
        success: true,
        message: Msg.allDataDeleted
      });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Error in DELETE /api/data/all:', { error: error.message });
    apiThrow(500, { code: 'DELETE_ALL_FAILED', message: `Error deleting data: ${error.message}` });
  }
}));

export default router;
