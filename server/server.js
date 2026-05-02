import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { dbFunctions } from './database.js';
import db from './database.js';
import { checkHost } from './hostChecker.js';
import { scanNetwork, summarizeDetectionMethods } from './networkScanner.js';
import { getNetworkCIDR, isIPInNetwork, calculateIPRange } from './networkUtils.js';
import { initializeAutoScans, startAutoScan, stopAutoScan } from './autoScanService.js';
import { requireAdmin } from './middleware.js';
import authRouter from './routes/auth.js';
import logger from './logger.js';
import { errorHandler, notFoundHandler, asyncHandler, ApiError } from './errorHandler.js';
import cache from './cache.js';
import {
  isValidIP,
  validateHostName,
  validateDescription,
  validateURL,
  validateNetworkID,
  validateSubnet,
  validateTagName,
  validateColor
} from './validators.js';

// Translation object for scan descriptions
const scanDescriptions = {
  ar: (networkName) => `تم اكتشافه من فحص الشبكة ${networkName}`,
  en: (networkName) => `Discovered from network scan ${networkName}`
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Built SPA output: Docker (/app/dist), legacy repo root dist/, or web/dist/. */
function resolveFrontendDistPath() {
  const candidates = [
    join(__dirname, 'dist'),
    join(__dirname, '..', 'dist'),
    join(__dirname, '..', 'web', 'dist'),
  ];
  for (const distPath of candidates) {
    if (existsSync(join(distPath, 'index.html'))) {
      return distPath;
    }
  }
  return candidates[0];
}

const app = express();
const PORT = process.env.PORT || 3001;

if (process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Configure CORS
const isDevelopment = process.env.NODE_ENV !== 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : isDevelopment 
    ? ['http://localhost:5173', 'http://localhost:3000'] 
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development mode, allow all origins for easier testing
    if (isDevelopment) {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Compression middleware
app.use(compression());

// Body parser
app.use(express.json({ limit: '10mb' })); // Increase data size limit

// Root route - redirect to frontend
app.get('/', (req, res) => {
  // In production, serve the frontend directly
  if (process.env.NODE_ENV === 'production') {
    const distPath = resolveFrontendDistPath();
    return res.sendFile(join(distPath, 'index.html'));
  }
  
  // In development, show API info with dynamic URLs
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  
  res.status(200).json({
    message: `This is the API server. Please access the frontend at http://localhost:5173`,
    api: `${baseUrl}/api`,
    frontend: 'http://localhost:5173'
  });
});

app.use('/api/auth', authRouter);

// Routes

// Get all hosts (with pagination support)
app.get('/api/hosts', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || null; // null means fetch all
    const offset = limit ? (page - 1) * limit : 0;
    
    const hosts = dbFunctions.getAllHosts(limit, offset);
    
    // If pagination is enabled, send additional info
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
    res.status(500).json({ error: error.message });
  }
});

// Check host status (must be before /api/hosts/:id)
app.post('/api/hosts/:id/check-status', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const host = dbFunctions.getHostById(id);
    
    if (!host) {
      return res.status(404).json({ error: 'المضيف غير موجود' });
    }

    // Check host status
    let checkResult = { status: 'offline', latency: null, packetLoss: 100 };
    try {
      checkResult = await checkHost(host.ip, host.url || null);
    } catch (error) {
      logger.error('Error checking host status:', { error: error.message, hostId: id });
      checkResult = { status: 'offline', latency: null, packetLoss: 100 };
    }

    // Save status history
    dbFunctions.addStatusHistory(id, checkResult.status, checkResult.latency);

    // Update status in database
    const updatedHost = dbFunctions.updateHost(id, {
      ...host,
      status: checkResult.status,
      lastChecked: new Date().toISOString(),
      pingLatency: checkResult.latency,
      packetLoss: checkResult.packetLoss
    });

    res.json(updatedHost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle host status (must be before /api/hosts/:id)
app.patch('/api/hosts/:id/toggle-status', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const host = dbFunctions.toggleHostStatus(id);
    
    if (!host) {
      return res.status(404).json({ error: 'المضيف غير موجود' });
    }

    res.json(host);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single host
app.get('/api/hosts/:id', (req, res) => {
  try {
    const host = dbFunctions.getHostById(parseInt(req.params.id));
    if (!host) {
      return res.status(404).json({ error: 'المضيف غير موجود' });
    }
    res.json(host);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new host
app.post('/api/hosts', requireAdmin, asyncHandler(async (req, res) => {
  const { name, ip, description, url, tagIds } = req.body;
  
  // Validate host name
  const nameValidation = validateHostName(name);
  if (!nameValidation.valid) {
    throw new ApiError(400, nameValidation.error);
  }
  
  // Validate IP
  if (!ip || !isValidIP(ip)) {
    throw new ApiError(400, 'عنوان IP غير صحيح');
  }
  
  // Validate description
  const descValidation = validateDescription(description);
  if (!descValidation.valid) {
    throw new ApiError(400, descValidation.error);
  }
  
  // Validate URL
  const urlValidation = validateURL(url);
  if (!urlValidation.valid) {
    throw new ApiError(400, urlValidation.error);
  }

  // Check for existing host with same IP
  const existingHosts = dbFunctions.getAllHosts();
  const existingHost = existingHosts.find(h => h.ip === ip.trim());
  if (existingHost) {
    throw new ApiError(400, `الجهاز موجود مسبقاً: ${existingHost.name} (${ip})`);
  }

  // Automatically check host status
  let checkResult = { status: 'offline', latency: null, packetLoss: 100 };
  try {
    checkResult = await checkHost(ip.trim(), urlValidation.sanitized || null);
  } catch (error) {
    logger.error('Error checking host status:', { error: error.message, ip });
    // On error, set offline as default status
    checkResult = { status: 'offline', latency: null, packetLoss: 100 };
  }

  const newHost = {
    name: nameValidation.sanitized,
    ip: ip.trim(),
    description: descValidation.sanitized,
    url: urlValidation.sanitized,
    tagIds: Array.isArray(tagIds) ? tagIds : [],
    status: checkResult.status || 'offline',
    createdAt: new Date().toISOString(),
    lastChecked: new Date().toISOString(),
    pingLatency: checkResult.latency || null,
    packetLoss: checkResult.packetLoss || null
  };

  const host = dbFunctions.addHost(newHost);
  cache.delete('stats'); // Invalidate stats cache
  logger.info('Host added', { hostId: host.id, ip: host.ip, name: host.name });
  res.status(201).json(host);
}));

// Bulk update tags for multiple hosts (must be before /api/hosts/:id)
app.put('/api/hosts/bulk-tags', requireAdmin, asyncHandler(async (req, res) => {
  const { ids, tagIds } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'قائمة معرفات الأجهزة مطلوبة');
  }
  if (ids.length > 500) {
    throw new ApiError(400, 'الحد الأقصى 500 جهاز في العملية الواحدة');
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

// Update host
app.put('/api/hosts/:id', requireAdmin, asyncHandler((req, res) => {
  const id = parseInt(req.params.id);
  const { name, ip, description, url, status, tagIds } = req.body;

  // Validate host name
  const nameValidation = validateHostName(name);
  if (!nameValidation.valid) {
    throw new ApiError(400, nameValidation.error);
  }
  
  // Validate IP
  if (!ip || !isValidIP(ip)) {
    throw new ApiError(400, 'عنوان IP غير صحيح');
  }
  
  // Validate description
  const descValidation = validateDescription(description);
  if (!descValidation.valid) {
    throw new ApiError(400, descValidation.error);
  }
  
  // Validate URL
  const urlValidation = validateURL(url);
  if (!urlValidation.valid) {
    throw new ApiError(400, urlValidation.error);
  }

  // Get current host to preserve existing values
  const existingHost = dbFunctions.getHostById(id);
  if (!existingHost) {
    throw new ApiError(404, 'المضيف غير موجود');
  }

  // Ensure tagIds is an array
  const tagIdsArray = Array.isArray(tagIds) ? tagIds : (tagIds ? [tagIds] : []);

  const updatedHost = dbFunctions.updateHost(id, {
    name: nameValidation.sanitized,
    ip: ip.trim(),
    description: descValidation.sanitized,
    url: urlValidation.sanitized,
    tagIds: tagIdsArray,
    status: status || 'online',
    lastChecked: req.body.lastChecked !== undefined ? req.body.lastChecked : existingHost.lastChecked || null,
    pingLatency: req.body.pingLatency !== undefined ? req.body.pingLatency : existingHost.pingLatency || null,
    packetLoss: req.body.packetLoss !== undefined ? req.body.packetLoss : existingHost.packetLoss || null
  });

  if (!updatedHost) {
    throw new ApiError(404, 'المضيف غير موجود');
  }

  logger.info('Host updated', { hostId: id, ip: updatedHost.ip });
  res.json(updatedHost);
}));

// Delete host
app.delete('/api/hosts/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = dbFunctions.deleteHost(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'المضيف غير موجود' });
    }

    res.json({ message: 'تم حذف المضيف بنجاح' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ========== Tags API ==========

// Get all tags (with caching)
app.get('/api/tags', (req, res) => {
  try {
    const cacheKey = 'tags';
    let tags = cache.get(cacheKey);
    
    if (!tags) {
      tags = dbFunctions.getAllTags();
      cache.set(cacheKey, tags, 30000); // Cache for 30 seconds
    }
    
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single tag
app.get('/api/tags/:id', (req, res) => {
  try {
    const tag = dbFunctions.getTagById(parseInt(req.params.id));
    if (!tag) {
      return res.status(404).json({ error: 'الوسم غير موجود' });
    }
    res.json(tag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new tag
app.post('/api/tags', requireAdmin, asyncHandler((req, res) => {
  const { name, color } = req.body;
  
  // Validate tag name
  const nameValidation = validateTagName(name);
  if (!nameValidation.valid) {
    throw new ApiError(400, nameValidation.error);
  }
  
  // Validate color
  const colorValidation = validateColor(color || '#4a9eff');
  if (!colorValidation.valid) {
    throw new ApiError(400, colorValidation.error);
  }

  // Check for existing tag with same name
  const existingTag = dbFunctions.getTagByName(nameValidation.sanitized);
  if (existingTag) {
    throw new ApiError(400, 'الوسم موجود بالفعل');
  }

  const newTag = {
    name: nameValidation.sanitized,
    color: color || '#4a9eff',
    createdAt: new Date().toISOString()
  };

  const tag = dbFunctions.addTag(newTag);
  cache.delete('tags'); // Invalidate tags cache
  logger.info('Tag added', { tagId: tag.id, name: tag.name });
  res.status(201).json(tag);
}));

// Update tag
app.put('/api/tags/:id', requireAdmin, asyncHandler((req, res) => {
  const id = parseInt(req.params.id);
  const { name, color } = req.body;

  // Validate tag name
  const nameValidation = validateTagName(name);
  if (!nameValidation.valid) {
    throw new ApiError(400, nameValidation.error);
  }
  
  // Validate color
  const colorValidation = validateColor(color || '#4a9eff');
  if (!colorValidation.valid) {
    throw new ApiError(400, colorValidation.error);
  }

  const existingTag = dbFunctions.getTagById(id);
  if (!existingTag) {
    throw new ApiError(404, 'الوسم غير موجود');
  }

  // Check for another tag with same name
  const tagWithSameName = dbFunctions.getTagByName(nameValidation.sanitized);
  if (tagWithSameName && tagWithSameName.id !== id) {
    throw new ApiError(400, 'الوسم موجود بالفعل');
  }

  const updatedTag = dbFunctions.updateTag(id, {
    name: nameValidation.sanitized,
    color: color || '#4a9eff'
  });

  cache.delete('tags'); // Invalidate tags cache
  logger.info('Tag updated', { tagId: id, name: updatedTag.name });
  res.json(updatedTag);
}));

// Delete tag
app.delete('/api/tags/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = dbFunctions.deleteTag(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'الوسم غير موجود' });
    }

    cache.delete('tags'); // Invalidate tags cache
    cache.delete('stats'); // Invalidate stats cache
    res.json({ message: 'تم حذف الوسم بنجاح' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get host status history
app.get('/api/hosts/:id/history', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 100;
    const history = dbFunctions.getStatusHistory(id, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export data (JSON)
app.get('/api/export', (req, res) => {
  try {
    const hosts = dbFunctions.getAllHosts();
    const tags = dbFunctions.getAllTags();
    res.json({ hosts, tags, exportedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import data (JSON)
app.post('/api/import', requireAdmin, async (req, res) => {
  try {
    const { hosts, tags } = req.body;
    let imported = 0;
    
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        try {
          dbFunctions.addTag({ name: tag.name, color: tag.color });
        } catch (e) {
          // Ignore if already exists
        }
      }
    }
    
    if (hosts && Array.isArray(hosts)) {
      for (const host of hosts) {
        try {
          const tagIds = host.tags ? host.tags.map(t => typeof t === 'object' ? t.id : t).filter(Boolean) : [];
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
    
    res.json({ message: `تم استيراد ${imported} مضيف بنجاح` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistics (with caching)
app.get('/api/stats', (req, res) => {
  try {
    const cacheKey = 'stats';
    let stats = cache.get(cacheKey);
    
    if (!stats) {
      const networks = dbFunctions.getAllNetworks();
      const allHosts = dbFunctions.getAllHosts();
      
      // Calculate general statistics
      const totalNetworks = networks.length;
      const totalHosts = allHosts.length;
      const onlineHosts = allHosts.filter(h => h.status === 'online').length;
      const offlineHosts = allHosts.filter(h => h.status === 'offline').length;
      
      // Calculate statistics for each network
      const networksWithStats = networks.map(network => {
        // Filter hosts whose IP is within network range
        const networkHosts = allHosts.filter(host => 
          isIPInNetwork(host.ip, network.network_id, network.subnet)
        );
        
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
      
      cache.set(cacheKey, stats, 10000); // Cache for 10 seconds
    }
    
    res.json(stats);
  } catch (error) {
    logger.error('Error in GET /api/stats:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Network scan
app.post('/api/network/scan', requireAdmin, async (req, res) => {
  try {
    const { networkRange, timeout } = req.body;
    
    if (!networkRange) {
      return res.status(400).json({ error: 'نطاق الشبكة مطلوب (مثال: 192.168.30.0/24 أو 192.168.30.1-254)' });
    }

    const usePing = req.body.usePing !== false;
    const useTcpPorts = req.body.useTcpPorts !== false;
    if (!usePing && !useTcpPorts) {
      return res.status(400).json({ error: 'يجب تفعيل Ping أو فحص المنافذ (أو كليهما)' });
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
    res.status(500).json({ error: error.message });
  }
});

// ========== Networks API ==========

// Get all networks (with caching)
app.get('/api/networks', (req, res) => {
  try {
    const cacheKey = 'networks';
    let networks = cache.get(cacheKey);
    
    if (!networks) {
      networks = dbFunctions.getAllNetworks();
      cache.set(cacheKey, networks, 30000); // Cache for 30 seconds
    }
    
    res.json(networks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single network
app.get('/api/networks/:id', (req, res) => {
  try {
    const network = dbFunctions.getNetworkById(parseInt(req.params.id));
    if (!network) {
      return res.status(404).json({ error: 'الشبكة غير موجودة' });
    }
    res.json(network);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new network
app.post('/api/networks', requireAdmin, asyncHandler((req, res) => {
  const { name, networkId, subnet } = req.body;
  
  if (!name || !networkId || subnet === undefined) {
    throw new ApiError(400, 'اسم الشبكة و Network ID و Subnet مطلوبون');
  }

  // Validate network ID
  const networkIdValidation = validateNetworkID(networkId);
  if (!networkIdValidation.valid) {
    throw new ApiError(400, networkIdValidation.error);
  }

  // Validate subnet
  const subnetValidation = validateSubnet(subnet);
  if (!subnetValidation.valid) {
    throw new ApiError(400, subnetValidation.error);
  }

  // Validate and sanitize name
  const nameValidation = validateHostName(name); // Reuse host name validation
  if (!nameValidation.valid) {
    throw new ApiError(400, 'اسم الشبكة غير صحيح');
  }

  const network = {
    name: nameValidation.sanitized,
    networkId: networkId.trim(),
    subnet: parseInt(subnet),
    createdAt: new Date().toISOString()
  };

  const newNetwork = dbFunctions.addNetwork(network);
  cache.delete('networks'); // Invalidate networks cache
  cache.delete('stats'); // Invalidate stats cache
  logger.info('Network added', { networkId: newNetwork.id, name: newNetwork.name });
  res.status(201).json(newNetwork);
}));

// Update network
app.put('/api/networks/:id', requireAdmin, (req, res) => {
  try {
    const { name, networkId, subnet, lastScanned } = req.body;
    const id = parseInt(req.params.id);
    
    const existingNetwork = dbFunctions.getNetworkById(id);
    if (!existingNetwork) {
      return res.status(404).json({ error: 'الشبكة غير موجودة' });
    }

    if (subnet && (subnet < 0 || subnet > 32)) {
      return res.status(400).json({ error: 'Subnet يجب أن يكون بين 0 و 32' });
    }

    const { scan_use_ping, scan_use_tcp } = req.body;

    const network = {
      name: name !== undefined ? name.trim() : existingNetwork.name,
      networkId: networkId !== undefined ? networkId.trim() : existingNetwork.network_id,
      subnet: subnet !== undefined ? parseInt(subnet) : existingNetwork.subnet,
      lastScanned: lastScanned !== undefined ? lastScanned : existingNetwork.last_scanned,
      scan_use_ping: scan_use_ping !== undefined ? (scan_use_ping ? 1 : 0) : undefined,
      scan_use_tcp: scan_use_tcp !== undefined ? (scan_use_tcp ? 1 : 0) : undefined
    };

    const updatedNetwork = dbFunctions.updateNetwork(id, network);
    cache.delete('networks');
    res.json(updatedNetwork);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete network hosts (without deleting the network itself)
app.delete('/api/networks/:id/hosts', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json({ error: 'الشبكة غير موجودة' });
    }
    
    // Get all hosts associated with the network
    const allHosts = dbFunctions.getAllHosts();
    const networkHosts = allHosts.filter(host => 
      isIPInNetwork(host.ip, network.network_id, network.subnet)
    );
    
    let deletedCount = 0;
    networkHosts.forEach(host => {
      dbFunctions.deleteHost(host.id);
      deletedCount++;
    });
    
    res.json({ 
      success: true, 
      message: `تم حذف ${deletedCount} جهاز بنجاح`,
      deletedCount 
    });
  } catch (error) {
    logger.error('Error in DELETE /api/networks/:id/hosts:', { error: error.message, networkId: id });
    res.status(500).json({ error: error.message });
  }
});

// Delete network with all its hosts
app.delete('/api/networks/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json({ error: 'الشبكة غير موجودة' });
    }
    
    // Delete all hosts associated with the network
    const allHosts = dbFunctions.getAllHosts();
    const networkHosts = allHosts.filter(host => 
      isIPInNetwork(host.ip, network.network_id, network.subnet)
    );
    
    let deletedHostsCount = 0;
    networkHosts.forEach(host => {
      dbFunctions.deleteHost(host.id);
      deletedHostsCount++;
    });
    
    // Delete the network
    dbFunctions.deleteNetwork(id);
    
    res.json({ 
      success: true, 
      message: `تم حذف الشبكة و ${deletedHostsCount} جهاز بنجاح`,
      deletedHostsCount 
    });
  } catch (error) {
    logger.error('Error in DELETE /api/networks/:id:', { error: error.message, networkId: id });
    res.status(500).json({ error: error.message });
  }
});

// Get hosts associated with network (automatic linking)
app.get('/api/networks/:id/hosts', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json({ error: 'الشبكة غير موجودة' });
    }

    // Get all hosts and filter based on IP range
    const allHosts = dbFunctions.getAllHosts();
    const networkHosts = allHosts.filter(host => 
      isIPInNetwork(host.ip, network.network_id, network.subnet)
    );

    res.json(networkHosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete hosts in this network (subset of IPs)
app.post('/api/networks/:id/hosts/bulk-delete', requireAdmin, asyncHandler(async (req, res) => {
  const networkId = parseInt(req.params.id, 10);
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'قائمة معرفات الأجهزة مطلوبة');
  }
  if (ids.length > 500) {
    throw new ApiError(400, 'الحد الأقصى 500 جهاز في العملية الواحدة');
  }

  const network = dbFunctions.getNetworkById(networkId);
  if (!network) {
    throw new ApiError(404, 'الشبكة غير موجودة');
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
    return res.json({ deletedCount: 0, message: 'لم يُحذف أي جهاز' });
  }

  const deletedCount = dbFunctions.deleteHostsBulkIds(toDelete);
  cache.delete('stats');
  cache.delete('tags');
  cache.delete('favorites');
  cache.delete('networks');
  logger.info('Bulk delete hosts', { networkId, deletedCount, requested: ids.length });
  res.json({ deletedCount, message: `تم حذف ${deletedCount} جهاز` });
}));

// Scan network
app.post('/api/networks/:id/scan', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json({ error: 'الشبكة غير موجودة' });
    }

    const { timeout, addHosts, language = 'ar' } = req.body;
    const userLanguage = (language === 'en' || language === 'ar') ? language : 'ar';
    const scanTimeout = timeout || 2;
    const shouldAddHosts = addHosts === true;

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
      return res.status(400).json({ error: 'يجب تفعيل Ping أو فحص المنافذ (أو كليهما)' });
    }

    const scanOptions = { usePing, useTcpPorts };

    // Calculate CIDR notation
    const cidr = getNetworkCIDR(network.network_id, network.subnet);
    logger.info(`[Scan] Starting scan for network ${id}: ${cidr}, timeout: ${scanTimeout}s, addHosts: ${shouldAddHosts}, scanOptions: ${JSON.stringify(scanOptions)}`);
    
    // Scan network
    const activeHosts = await scanNetwork(cidr, scanTimeout, scanOptions);
    const detectionSummary = summarizeDetectionMethods(activeHosts);
    logger.info(`[Scan] Found ${activeHosts.length} active hosts`);

    // Update last_scanned
    dbFunctions.updateNetwork(id, {
      name: network.name,
      networkId: network.network_id,
      subnet: network.subnet,
      lastScanned: new Date().toISOString()
    });

    // Automatically add discovered hosts (always)
    let addedCount = 0;
    const discoveredIPs = new Set(activeHosts.map(h => h.ip));
    
    if (activeHosts.length > 0) {
      const allHosts = dbFunctions.getAllHosts();
      const existingIPs = new Set(allHosts.map(h => h.ip));

      for (const host of activeHosts) {
        if (!existingIPs.has(host.ip) && !host.isExisting) {
          try {
            dbFunctions.addHost({
              name: host.hostname || host.existingName || `Host ${host.ip.split('.').pop()}`,
              ip: host.ip,
              description: host.description || JSON.stringify({
                type: 'system',
                ar: scanDescriptions.ar(network.name),
                en: scanDescriptions.en(network.name)
              }),
              url: '',
              status: 'online',
              tagIds: [],
              createdAt: new Date().toISOString(),
              lastChecked: new Date().toISOString(),
              pingLatency: host.pingLatency || null,
              packetLoss: null,
              discoveryMethod: host.detectionMethod || null
            });
            addedCount++;
            existingIPs.add(host.ip); // Update list to avoid duplicates
          } catch (error) {
            logger.error(`Error adding host ${host.ip}:`, { error: error.message, ip: host.ip });
          }
        }
      }
      logger.info(`[Scan] Added ${addedCount} new hosts to database`);
    }

    // Update status for all hosts associated with the network
    const allNetworkHosts = dbFunctions.getAllHosts().filter(host => 
      isIPInNetwork(host.ip, network.network_id, network.subnet)
    );
    
    let updatedCount = 0;
    for (const host of allNetworkHosts) {
      const isOnline = discoveredIPs.has(host.ip);
      const newStatus = isOnline ? 'online' : 'offline';
      const activeHost = activeHosts.find(h => h.ip === host.ip);
      
      try {
        // Get tagIds
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
            : undefined
        });
        updatedCount++;
      } catch (error) {
        logger.error(`Error updating host ${host.ip} status:`, { error: error.message, ip: host.ip });
      }
    }
    logger.info(`[Scan] Updated status for ${updatedCount} existing hosts`);

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
    res.status(500).json({ error: error.message });
  }
});

// Enable/disable auto scan for network
app.post('/api/networks/:id/auto-scan', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { enabled, interval } = req.body;
  
  const network = dbFunctions.getNetworkById(id);
  if (!network) {
    throw new ApiError(404, 'الشبكة غير موجودة');
  }
  
  const scanInterval = interval || 300000; // Default 5 minutes
  
  if (scanInterval < 60000) { // Minimum 1 minute
    throw new ApiError(400, 'فترة الفحص يجب أن تكون دقيقة واحدة على الأقل');
  }
  
  // Update database
  dbFunctions.updateNetworkAutoScan(id, enabled, scanInterval);
  
  // Start or stop auto scan service
  if (enabled) {
    startAutoScan(id);
  } else {
    stopAutoScan(id);
  }
  
  const updatedNetwork = dbFunctions.getNetworkById(id);
  cache.delete('networks');
  
  logger.info(`Auto scan ${enabled ? 'enabled' : 'disabled'} for network ${id}`);
  res.json(updatedNetwork);
}));

// Get auto scan results for network
app.get('/api/networks/:id/auto-scan-results', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { type } = req.query; // 'new_device' or 'disconnected'
    
    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json({ error: 'الشبكة غير موجودة' });
    }
    
    const results = dbFunctions.getAutoScanResults(id, type || null);
    
    // Get host details for each result
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
    res.status(500).json({ error: error.message });
  }
});

// Clear auto scan results for network
app.delete('/api/networks/:id/auto-scan-results', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { type } = req.query; // 'new_device' or 'disconnected'
    
    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json({ error: 'الشبكة غير موجودة' });
    }
    
    dbFunctions.clearAutoScanResults(id, type || null);
    res.json({ success: true, message: 'تم حذف النتائج بنجاح' });
  } catch (error) {
    logger.error('Error in DELETE /api/networks/:id/auto-scan-results:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Delete all data
app.delete('/api/data/all', requireAdmin, asyncHandler((req, res) => {
  try {
    // Use database transaction to ensure all data is deleted
    // Start transaction
    db.exec('BEGIN TRANSACTION');
    
    try {
      // Delete all data in correct order (respecting foreign keys)
      // 1. Delete host_tags (junction table) - must be deleted first
      db.exec('DELETE FROM host_tags');
      
      // 2. Delete host_status_history
      db.exec('DELETE FROM host_status_history');
      
      // 3. Delete favorites (references hosts)
      db.exec('DELETE FROM favorites');
      
      // 4. Delete hosts
      db.exec('DELETE FROM hosts');
      
      // 5. Delete networks
      db.exec('DELETE FROM networks');
      
      // 6. Delete tags - now safe to delete since host_tags is already deleted
      db.exec('DELETE FROM tags');
      
      // 7. Delete groups
      db.exec('DELETE FROM groups');
      
      // Commit transaction
      db.exec('COMMIT');
      
      // Clear cache
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
        message: 'تم حذف جميع البيانات بنجاح (الأجهزة، الشبكات، الوسوم، المجموعات، المفضلة)' 
      });
    } catch (error) {
      // Rollback on error
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Error in DELETE /api/data/all:', { error: error.message });
    throw new ApiError(500, `خطأ في حذف البيانات: ${error.message}`);
  }
}));

// ========== Favorites API ==========

// Get all favorites (with caching)
app.get('/api/favorites', (req, res) => {
  try {
    const cacheKey = 'favorites';
    let favorites = cache.get(cacheKey);
    
    if (!favorites) {
      favorites = dbFunctions.getAllFavorites();
      cache.set(cacheKey, favorites, 30000); // Cache for 30 seconds
    }
    
    res.json(favorites);
  } catch (error) {
    logger.error('Error in GET /api/favorites:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get favorite by ID
app.get('/api/favorites/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const favorite = dbFunctions.getFavoriteById(id);
    if (!favorite) {
      return res.status(404).json({ error: 'المفضلة غير موجودة' });
    }
    res.json(favorite);
  } catch (error) {
    logger.error('Error in GET /api/favorites/:id:', { error: error.message, favoriteId: id });
    res.status(500).json({ error: error.message });
  }
});

// Bulk add/remove favorites (must be before /api/favorites/:id)
app.post('/api/favorites/bulk', requireAdmin, asyncHandler(async (req, res) => {
  const { hostIds, action } = req.body;
  if (!Array.isArray(hostIds) || hostIds.length === 0) {
    throw new ApiError(400, 'قائمة hostIds مطلوبة');
  }
  if (hostIds.length > 500) {
    throw new ApiError(400, 'الحد الأقصى 500 جهاز');
  }
  if (action !== 'add' && action !== 'remove') {
    throw new ApiError(400, 'action يجب أن يكون add أو remove');
  }

  const unique = [...new Set(hostIds.map((x) => parseInt(x, 10)).filter((n) => !Number.isNaN(n) && n > 0))];
  let affected = 0;
  let skipped = 0;

  for (const hid of unique) {
    const host = dbFunctions.getHostById(hid);
    if (!host) {
      skipped++;
      continue;
    }
    if (action === 'add') {
      if (dbFunctions.isHostFavorite(hid)) {
        skipped++;
        continue;
      }
      try {
        dbFunctions.addFavorite({ hostId: hid });
        affected++;
      } catch {
        skipped++;
      }
    } else {
      const r = dbFunctions.deleteFavoriteByHostId(hid);
      if (r.changes > 0) affected++;
      else skipped++;
    }
  }

  cache.delete('favorites');
  res.json({ affected, skipped, action });
}));

// Add favorite
app.post('/api/favorites', requireAdmin, (req, res) => {
  try {
    const { hostId, url, groupId, displayOrder, customName, description } = req.body;
    
    if (!hostId) {
      return res.status(400).json({ error: 'hostId مطلوب' });
    }
    
    // Check if host exists
    const host = dbFunctions.getHostById(hostId);
    if (!host) {
      return res.status(404).json({ error: 'الجهاز غير موجود' });
    }
    
    const favorite = dbFunctions.addFavorite({
      hostId: parseInt(hostId),
      url: url || null,
      groupId: groupId ? parseInt(groupId) : null,
      displayOrder: displayOrder || 0,
      customName: customName || null,
      description: description || null
    });
    
    cache.delete('favorites'); // Invalidate favorites cache
    res.status(201).json(favorite);
  } catch (error) {
    logger.error('Error in POST /api/favorites:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Update favorite
app.put('/api/favorites/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { url, groupId, displayOrder, customName, description } = req.body;
    
    const favorite = dbFunctions.getFavoriteById(id);
    if (!favorite) {
      return res.status(404).json({ error: 'المفضلة غير موجودة' });
    }
    
    const updated = dbFunctions.updateFavorite(id, {
      url: url !== undefined ? url : favorite.url,
      groupId: groupId !== undefined ? (groupId ? parseInt(groupId) : null) : favorite.groupId,
      displayOrder: displayOrder !== undefined ? displayOrder : favorite.displayOrder,
      customName: customName !== undefined ? customName : favorite.customName,
      description: description !== undefined ? description : favorite.description
    });
    
    cache.delete('favorites'); // Invalidate favorites cache
    res.json(updated);
  } catch (error) {
    logger.error('Error in PUT /api/favorites/:id:', { error: error.message, favoriteId: id });
    res.status(500).json({ error: error.message });
  }
});

// Delete favorite
app.delete('/api/favorites/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const favorite = dbFunctions.getFavoriteById(id);
    if (!favorite) {
      return res.status(404).json({ error: 'المفضلة غير موجودة' });
    }
    
    dbFunctions.deleteFavorite(id);
    cache.delete('favorites'); // Invalidate favorites cache
    res.json({ success: true, message: 'تم حذف المفضلة بنجاح' });
  } catch (error) {
    logger.error('Error in DELETE /api/favorites/:id:', { error: error.message, favoriteId: id });
    res.status(500).json({ error: error.message });
  }
});

// ========== Groups API ==========

// Get all groups (with caching)
app.get('/api/groups', (req, res) => {
  try {
    const cacheKey = 'groups';
    let groups = cache.get(cacheKey);
    
    if (!groups) {
      groups = dbFunctions.getAllGroups();
      cache.set(cacheKey, groups, 30000); // Cache for 30 seconds
    }
    
    res.json(groups);
  } catch (error) {
    logger.error('Error in GET /api/groups:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get group by ID
app.get('/api/groups/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const group = dbFunctions.getGroupById(id);
    if (!group) {
      return res.status(404).json({ error: 'المجموعة غير موجودة' });
    }
    res.json(group);
  } catch (error) {
    logger.error('Error in GET /api/groups/:id:', { error: error.message, groupId: id });
    res.status(500).json({ error: error.message });
  }
});

// Create group
app.post('/api/groups', requireAdmin, (req, res) => {
  try {
    const { name, color, displayOrder } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'اسم المجموعة مطلوب' });
    }
    
    const group = dbFunctions.addGroup({
      name: name.trim(),
      color: color || '#4a9eff',
      displayOrder: displayOrder || 0
    });
    
    cache.delete('groups'); // Invalidate groups cache
    res.status(201).json(group);
  } catch (error) {
    logger.error('Error in POST /api/groups:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Update group
app.put('/api/groups/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, color, displayOrder } = req.body;
    
    const group = dbFunctions.getGroupById(id);
    if (!group) {
      return res.status(404).json({ error: 'المجموعة غير موجودة' });
    }
    
    if (name && name.trim() === '') {
      return res.status(400).json({ error: 'اسم المجموعة لا يمكن أن يكون فارغاً' });
    }
    
    const updated = dbFunctions.updateGroup(id, {
      name: name !== undefined ? name.trim() : group.name,
      color: color !== undefined ? color : group.color,
      displayOrder: displayOrder !== undefined ? displayOrder : group.display_order
    });
    
    cache.delete('groups'); // Invalidate groups cache
    res.json(updated);
  } catch (error) {
    logger.error('Error in PUT /api/groups/:id:', { error: error.message, groupId: id });
    res.status(500).json({ error: error.message });
  }
});

// Delete group
app.delete('/api/groups/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const group = dbFunctions.getGroupById(id);
    if (!group) {
      return res.status(404).json({ error: 'المجموعة غير موجودة' });
    }
    
    dbFunctions.deleteGroup(id);
    cache.delete('groups'); // Invalidate groups cache
    res.json({ success: true, message: 'تم حذف المجموعة بنجاح' });
  } catch (error) {
    logger.error('Error in DELETE /api/groups/:id:', { error: error.message, groupId: id });
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from dist (for production)
if (process.env.NODE_ENV === 'production') {
  const distPath = resolveFrontendDistPath();
  app.use(express.static(distPath));
  
  // Serve index.html for all non-API routes (SPA routing)
  app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(distPath, 'index.html'));
    } else {
      next();
    }
  });
}

// Handle Chrome DevTools .well-known requests (to avoid 404 errors)
app.get('/.well-known/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Handle favicon.ico requests (browsers automatically request this)
app.get('/favicon.ico', (req, res) => {
  // Try multiple possible paths for favicon
  const possiblePaths = [
    join(__dirname, '..', 'web', 'public', 'favicon.svg'),
    join(__dirname, '..', 'web', 'dist', 'favicon.svg'),
    join(__dirname, '..', 'public', 'favicon.svg'),
    join(__dirname, '..', 'dist', 'favicon.svg'),
    join(__dirname, 'dist', 'favicon.svg'),
    join(__dirname, '..', 'web', 'public', 'favicon.ico'),
    join(__dirname, '..', 'web', 'dist', 'favicon.ico'),
    join(__dirname, '..', 'public', 'favicon.ico'),
    join(__dirname, '..', 'dist', 'favicon.ico'),
    join(__dirname, 'dist', 'favicon.ico'),
  ];
  
  for (const faviconPath of possiblePaths) {
    if (existsSync(faviconPath)) {
      return res.sendFile(faviconPath);
    }
  }
  
  // Return 204 No Content to silently handle the request without logging an error
  res.status(204).end();
});

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 API available on all interfaces: http://0.0.0.0:${PORT}/api`);
  logger.info(`🌐 Access from local network at: http://<SERVER_IP>:${PORT}/api`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize auto scans
  initializeAutoScans();
}).on('error', (err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

