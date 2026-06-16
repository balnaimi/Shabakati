import { Router } from 'express';
import { dbFunctions } from '../database.js';
import { checkHost } from '../hostChecker.js';
import { requireAdmin, requireVisitor } from '../middleware.js';
import logger from '../logger.js';
import { asyncHandler, apiThrow, jsonError, jsonInternalError } from '../errorHandler.js';
import { invalidateDataCaches } from '../cacheInvalidation.js';
import {
  isValidIP,
  validateHostName,
  validateDescription,
  validateURL
} from '../validators.js';
import { Err, Msg, errHostAlreadyExists } from '../apiMessages.js';
import cache from '../cache.js';

const router = Router();

router.get('/', requireVisitor, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || null;
    const offset = limit ? (page - 1) * limit : 0;

    const hosts = dbFunctions.getAllHosts(limit, offset);

    if (limit) {
      const allHosts = dbFunctions.getAllHosts();
      const total = allHosts.length;
      res.json({
        hosts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } else {
      res.json(hosts);
    }
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.post('/:id/check-status', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const host = dbFunctions.getHostById(id);

    if (!host) {
      return res.status(404).json(jsonError(Err.hostNotFound));
    }

    let checkResult = { status: 'offline', latency: null, packetLoss: 100 };
    try {
      checkResult = await checkHost(host.ip, host.url || null);
    } catch (error) {
      logger.error('Error checking host status:', { error: error.message, hostId: id });
      checkResult = { status: 'offline', latency: null, packetLoss: 100 };
    }

    dbFunctions.addStatusHistory(id, checkResult.status, checkResult.latency);

    const updatedHost = dbFunctions.updateHost(id, {
      ...host,
      status: checkResult.status,
      lastChecked: new Date().toISOString(),
      pingLatency: checkResult.latency,
      packetLoss: checkResult.packetLoss
    });

    invalidateDataCaches();
    res.json(updatedHost);
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.patch('/:id/toggle-status', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const host = dbFunctions.toggleHostStatus(id);

    if (!host) {
      return res.status(404).json(jsonError(Err.hostNotFound));
    }

    invalidateDataCaches();
    res.json(host);
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.get('/:id/history', requireVisitor, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 100;
    const history = dbFunctions.getStatusHistory(id, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.get('/:id', requireVisitor, (req, res) => {
  try {
    const host = dbFunctions.getHostById(parseInt(req.params.id));
    if (!host) {
      return res.status(404).json(jsonError(Err.hostNotFound));
    }
    res.json(host);
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const { name, ip, description, url, tagIds, status: requestedStatus } = req.body;

  const nameValidation = validateHostName(name);
  if (!nameValidation.valid) {
    apiThrow(400, nameValidation.apiDef);
  }

  if (!ip || !isValidIP(ip)) {
    apiThrow(400, Err.invalidIPAddress);
  }

  const descValidation = validateDescription(description);

  const urlValidation = validateURL(url);
  if (!urlValidation.valid) {
    apiThrow(400, urlValidation.apiDef);
  }

  const existingHosts = dbFunctions.getAllHosts();
  const existingHost = existingHosts.find(h => h.ip === ip.trim());
  if (existingHost) {
    apiThrow(400, errHostAlreadyExists(existingHost.name, ip));
  }

  let checkResult = { status: 'offline', latency: null, packetLoss: 100 };
  try {
    checkResult = await checkHost(ip.trim(), urlValidation.sanitized || null);
  } catch (error) {
    logger.error('Error checking host status:', { error: error.message, ip });
    checkResult = { status: 'offline', latency: null, packetLoss: 100 };
  }

  const status =
    requestedStatus === 'online' || requestedStatus === 'offline'
      ? requestedStatus
      : (checkResult.status || 'offline');

  const newHost = {
    name: nameValidation.sanitized,
    ip: ip.trim(),
    description: descValidation.sanitized,
    url: urlValidation.sanitized,
    tagIds: Array.isArray(tagIds) ? tagIds : [],
    status,
    createdAt: new Date().toISOString(),
    lastChecked: new Date().toISOString(),
    pingLatency: checkResult.latency || null,
    packetLoss: checkResult.packetLoss || null,
    mac_address: req.body.mac_address ?? req.body.macAddress ?? null,
    vendor: req.body.vendor ?? null,
    device_category: req.body.device_category ?? req.body.deviceCategory ?? null
  };

  const host = dbFunctions.addHost(newHost);
  invalidateDataCaches();
  logger.info('Host added', { hostId: host.id, ip: host.ip, name: host.name });
  res.status(201).json(host);
}));

router.put('/bulk-tags', requireAdmin, asyncHandler(async (req, res) => {
  const ids = req.body.ids ?? req.body.hostIds;
  const { tagIds } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    apiThrow(400, Err.hostIdsRequired);
  }
  if (ids.length > 500) {
    apiThrow(400, Err.maxHostsPerOperation);
  }
  const tagIdsArray = Array.isArray(tagIds) ? tagIds : (tagIds ? [tagIds] : []);

  let updated = 0;
  const errors = [];
  for (const rawId of ids) {
    const hid = parseInt(rawId, 10);
    if (Number.isNaN(hid)) continue;
    const existingHost = dbFunctions.getHostById(hid);
    if (!existingHost) {
      errors.push({ id: hid, error: 'not_found' });
      continue;
    }
    try {
      dbFunctions.updateHost(hid, {
        name: existingHost.name,
        ip: existingHost.ip,
        description: existingHost.description || '',
        url: existingHost.url || '',
        status: existingHost.status,
        tagIds: tagIdsArray,
        lastChecked: existingHost.lastChecked || null,
        pingLatency: existingHost.pingLatency ?? null,
        packetLoss: existingHost.packetLoss ?? null
      });
      updated++;
    } catch (e) {
      errors.push({ id: hid, error: e.message });
    }
  }

  cache.delete('tags');
  cache.delete('stats');
  res.json({ updated, count: updated, errors: errors.length ? errors : undefined });
}));

router.put('/:id', requireAdmin, asyncHandler((req, res) => {
  const id = parseInt(req.params.id);
  const { name, ip, description, url, status, tagIds } = req.body;

  const nameValidation = validateHostName(name);
  if (!nameValidation.valid) {
    apiThrow(400, nameValidation.apiDef);
  }

  if (!ip || !isValidIP(ip)) {
    apiThrow(400, Err.invalidIPAddress);
  }

  const descValidation = validateDescription(description);

  const urlValidation = validateURL(url);
  if (!urlValidation.valid) {
    apiThrow(400, urlValidation.apiDef);
  }

  const existingHost = dbFunctions.getHostById(id);
  if (!existingHost) {
    apiThrow(404, Err.hostNotFound);
  }

  const trimmedIp = ip.trim();
  if (trimmedIp !== existingHost.ip) {
    const dup = dbFunctions.getHostByIp(trimmedIp);
    if (dup && dup.id !== id) {
      const other = dbFunctions.getHostById(dup.id);
      apiThrow(400, errHostAlreadyExists(other?.name || 'Host', trimmedIp));
    }
  }

  const tagIdsArray = Array.isArray(tagIds) ? tagIds : (tagIds ? [tagIds] : []);

  const updatedHost = dbFunctions.updateHost(id, {
    name: nameValidation.sanitized,
    ip: trimmedIp,
    description: descValidation.sanitized,
    url: urlValidation.sanitized,
    tagIds: tagIdsArray,
    status: status !== undefined && status !== null && status !== '' ? status : existingHost.status,
    lastChecked: req.body.lastChecked !== undefined ? req.body.lastChecked : existingHost.lastChecked || null,
    pingLatency: req.body.pingLatency !== undefined ? req.body.pingLatency : existingHost.pingLatency || null,
    packetLoss: req.body.packetLoss !== undefined ? req.body.packetLoss : existingHost.packetLoss || null,
    mac_address: req.body.mac_address ?? req.body.macAddress,
    vendor: req.body.vendor,
    device_category: req.body.device_category ?? req.body.deviceCategory
  });

  if (!updatedHost) {
    apiThrow(404, Err.hostNotFound);
  }

  invalidateDataCaches();
  logger.info('Host updated', { hostId: id, ip: updatedHost.ip });
  res.json(updatedHost);
}));

router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = dbFunctions.deleteHost(id);

    if (result.changes === 0) {
      return res.status(404).json(jsonError(Err.hostNotFound));
    }

    invalidateDataCaches();
    res.json({ message: Msg.hostDeleted });
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

export default router;
