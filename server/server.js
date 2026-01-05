import express from 'express';
import cors from 'cors';
import { dbFunctions } from './database.js';
import { checkHost } from './hostChecker.js';
import { scanNetwork } from './networkScanner.js';
import { getNetworkCIDR, isIPInNetwork, calculateIPRange } from './networkUtils.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase data size limit

// Root route - redirect to frontend
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'This is the API server. Please access the frontend at http://localhost:5173',
    api: 'http://localhost:3001/api',
    frontend: 'http://localhost:5173'
  });
});

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
app.post('/api/hosts/:id/check-status', async (req, res) => {
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
      console.error('Error checking host status:', error);
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
app.patch('/api/hosts/:id/toggle-status', (req, res) => {
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
app.post('/api/hosts', async (req, res) => {
  try {
    const { name, ip, description, url, tagIds } = req.body;
    
    if (!name || !ip) {
      return res.status(400).json({ error: 'اسم الجهاز وعنوان IP مطلوبان' });
    }

    // Check for existing host with same IP
    const existingHosts = dbFunctions.getAllHosts();
    const existingHost = existingHosts.find(h => h.ip === ip);
    if (existingHost) {
      return res.status(400).json({ error: `الجهاز موجود مسبقاً: ${existingHost.name} (${ip})` });
    }

    // Automatically check host status
    let checkResult = { status: 'offline', latency: null, packetLoss: 100 };
    try {
      checkResult = await checkHost(ip, url || null);
    } catch (error) {
      console.error('Error checking host status:', error);
      // On error, set offline as default status
      checkResult = { status: 'offline', latency: null, packetLoss: 100 };
    }

    const newHost = {
      name,
      ip,
      description: description || '',
      url: url || '',
      tagIds: tagIds || [],
      status: checkResult.status || 'offline',
      createdAt: new Date().toISOString(),
      lastChecked: new Date().toISOString(),
      pingLatency: checkResult.latency || null,
      packetLoss: checkResult.packetLoss || null
    };

    const host = dbFunctions.addHost(newHost);
    res.status(201).json(host);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update host
app.put('/api/hosts/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, ip, description, url, status, tagIds } = req.body;
    console.log('Received update request:', { id, tagIds, body: req.body });

    if (!name || !ip) {
      return res.status(400).json({ error: 'اسم المضيف وعنوان IP مطلوبان' });
    }

    // Get current host to preserve existing values
    const existingHost = dbFunctions.getHostById(id);
    if (!existingHost) {
      return res.status(404).json({ error: 'المضيف غير موجود' });
    }

    // Ensure tagIds is an array
    const tagIdsArray = Array.isArray(tagIds) ? tagIds : (tagIds ? [tagIds] : []);

    const updatedHost = dbFunctions.updateHost(id, {
      name,
      ip,
      description: description || '',
      url: url || '',
      tagIds: tagIdsArray,
      status: status || 'online',
      lastChecked: req.body.lastChecked !== undefined ? req.body.lastChecked : existingHost.lastChecked || null,
      pingLatency: req.body.pingLatency !== undefined ? req.body.pingLatency : existingHost.pingLatency || null,
      packetLoss: req.body.packetLoss !== undefined ? req.body.packetLoss : existingHost.packetLoss || null
    });

    if (!updatedHost) {
      return res.status(404).json({ error: 'المضيف غير موجود' });
    }

    res.json(updatedHost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete host
app.delete('/api/hosts/:id', (req, res) => {
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

// Get all tags
app.get('/api/tags', (req, res) => {
  try {
    const tags = dbFunctions.getAllTags();
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
app.post('/api/tags', (req, res) => {
  try {
    const { name, color } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم الوسم مطلوب' });
    }

    // Check for existing tag with same name
    const existingTag = dbFunctions.getTagByName(name.trim());
    if (existingTag) {
      return res.status(400).json({ error: 'الوسم موجود بالفعل' });
    }

    const newTag = {
      name: name.trim(),
      color: color || '#4a9eff',
      createdAt: new Date().toISOString()
    };

    const tag = dbFunctions.addTag(newTag);
    res.status(201).json(tag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update tag
app.put('/api/tags/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم الوسم مطلوب' });
    }

    const existingTag = dbFunctions.getTagById(id);
    if (!existingTag) {
      return res.status(404).json({ error: 'الوسم غير موجود' });
    }

    // Check for another tag with same name
    const tagWithSameName = dbFunctions.getTagByName(name.trim());
    if (tagWithSameName && tagWithSameName.id !== id) {
      return res.status(400).json({ error: 'الوسم موجود بالفعل' });
    }

    const updatedTag = dbFunctions.updateTag(id, {
      name: name.trim(),
      color: color || '#4a9eff'
    });

    res.json(updatedTag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete tag
app.delete('/api/tags/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = dbFunctions.deleteTag(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'الوسم غير موجود' });
    }

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
app.post('/api/import', async (req, res) => {
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
          console.error('Error importing host:', e);
        }
      }
    }
    
    res.json({ message: `تم استيراد ${imported} مضيف بنجاح` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistics
app.get('/api/stats', (req, res) => {
  try {
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
    
    res.json({
      totalNetworks,
      totalHosts,
      onlineHosts,
      offlineHosts,
      networksWithStats
    });
  } catch (error) {
    console.error('Error in GET /api/stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Network scan
app.post('/api/network/scan', async (req, res) => {
  try {
    const { networkRange, timeout } = req.body;
    
    if (!networkRange) {
      return res.status(400).json({ error: 'نطاق الشبكة مطلوب (مثال: 192.168.30.0/24 أو 192.168.30.1-254)' });
    }

    const scanTimeout = timeout || 2;
    const activeHosts = await scanNetwork(networkRange, scanTimeout);
    
    res.json({
      success: true,
      count: activeHosts.length,
      hosts: activeHosts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Networks API ==========

// Get all networks
app.get('/api/networks', (req, res) => {
  try {
    const networks = dbFunctions.getAllNetworks();
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
app.post('/api/networks', (req, res) => {
  try {
    const { name, networkId, subnet } = req.body;
    
    if (!name || !networkId || !subnet) {
      return res.status(400).json({ error: 'اسم الشبكة و Network ID و Subnet مطلوبون' });
    }

    if (subnet < 0 || subnet > 32) {
      return res.status(400).json({ error: 'Subnet يجب أن يكون بين 0 و 32' });
    }

    const network = {
      name: name.trim(),
      networkId: networkId.trim(),
      subnet: parseInt(subnet),
      createdAt: new Date().toISOString()
    };

    const newNetwork = dbFunctions.addNetwork(network);
    res.status(201).json(newNetwork);
  } catch (error) {
    console.error('Error in POST /api/networks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update network
app.put('/api/networks/:id', (req, res) => {
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

    const network = {
      name: name !== undefined ? name.trim() : existingNetwork.name,
      networkId: networkId !== undefined ? networkId.trim() : existingNetwork.network_id,
      subnet: subnet !== undefined ? parseInt(subnet) : existingNetwork.subnet,
      lastScanned: lastScanned !== undefined ? lastScanned : existingNetwork.last_scanned
    };

    const updatedNetwork = dbFunctions.updateNetwork(id, network);
    res.json(updatedNetwork);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete network hosts (without deleting the network itself)
app.delete('/api/networks/:id/hosts', (req, res) => {
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
    console.error('Error in DELETE /api/networks/:id/hosts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete network with all its hosts
app.delete('/api/networks/:id', (req, res) => {
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
    console.error('Error in DELETE /api/networks/:id:', error);
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

// Scan network
app.post('/api/networks/:id/scan', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json({ error: 'الشبكة غير موجودة' });
    }

    const { timeout, addHosts } = req.body;
    const scanTimeout = timeout || 2;
    const shouldAddHosts = addHosts === true;

    // Calculate CIDR notation
    const cidr = getNetworkCIDR(network.network_id, network.subnet);
    console.log(`[Scan] Starting scan for network ${id}: ${cidr}, timeout: ${scanTimeout}s, addHosts: ${shouldAddHosts}`);
    
    // Scan network
    const activeHosts = await scanNetwork(cidr, scanTimeout);
    console.log(`[Scan] Found ${activeHosts.length} active hosts`);

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
              description: host.description || `تم اكتشافه من فحص الشبكة ${network.name}`,
              url: '',
              status: 'online',
              tagIds: [],
              createdAt: new Date().toISOString(),
              lastChecked: new Date().toISOString(),
              pingLatency: host.pingLatency || null,
              packetLoss: null
            });
            addedCount++;
            existingIPs.add(host.ip); // Update list to avoid duplicates
          } catch (error) {
            console.error(`Error adding host ${host.ip}:`, error);
          }
        }
      }
      console.log(`[Scan] Added ${addedCount} new hosts to database`);
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
          packetLoss: null
        });
        updatedCount++;
      } catch (error) {
        console.error(`Error updating host ${host.ip} status:`, error);
      }
    }
    console.log(`[Scan] Updated status for ${updatedCount} existing hosts`);

    res.json({
      success: true,
      count: activeHosts.length,
      hosts: activeHosts,
      addedCount: addedCount,
      updatedCount: updatedCount,
      addedHosts: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all data
app.delete('/api/data/all', (req, res) => {
  try {
    // Delete all hosts
    const allHosts = dbFunctions.getAllHosts();
    allHosts.forEach(host => dbFunctions.deleteHost(host.id));
    
    // Delete all networks
    const allNetworks = dbFunctions.getAllNetworks();
    allNetworks.forEach(network => dbFunctions.deleteNetwork(network.id));
    
    // Delete all tags
    const allTags = dbFunctions.getAllTags();
    allTags.forEach(tag => dbFunctions.deleteTag(tag.id));
    
    res.json({ 
      success: true, 
      message: 'تم حذف جميع البيانات بنجاح' 
    });
  } catch (error) {
    console.error('Error in DELETE /api/data/all:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== Favorites API ==========

// Get all favorites
app.get('/api/favorites', (req, res) => {
  try {
    const favorites = dbFunctions.getAllFavorites();
    res.json(favorites);
  } catch (error) {
    console.error('Error in GET /api/favorites:', error);
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
    console.error('Error in GET /api/favorites/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add favorite
app.post('/api/favorites', (req, res) => {
  try {
    const { hostId, url, groupId, displayOrder } = req.body;
    
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
      displayOrder: displayOrder || 0
    });
    
    res.status(201).json(favorite);
  } catch (error) {
    console.error('Error in POST /api/favorites:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update favorite
app.put('/api/favorites/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { url, groupId, displayOrder } = req.body;
    
    const favorite = dbFunctions.getFavoriteById(id);
    if (!favorite) {
      return res.status(404).json({ error: 'المفضلة غير موجودة' });
    }
    
    const updated = dbFunctions.updateFavorite(id, {
      url: url !== undefined ? url : favorite.url,
      groupId: groupId !== undefined ? (groupId ? parseInt(groupId) : null) : favorite.groupId,
      displayOrder: displayOrder !== undefined ? displayOrder : favorite.displayOrder
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error in PUT /api/favorites/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete favorite
app.delete('/api/favorites/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const favorite = dbFunctions.getFavoriteById(id);
    if (!favorite) {
      return res.status(404).json({ error: 'المفضلة غير موجودة' });
    }
    
    dbFunctions.deleteFavorite(id);
    res.json({ success: true, message: 'تم حذف المفضلة بنجاح' });
  } catch (error) {
    console.error('Error in DELETE /api/favorites/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== Groups API ==========

// Get all groups
app.get('/api/groups', (req, res) => {
  try {
    const groups = dbFunctions.getAllGroups();
    res.json(groups);
  } catch (error) {
    console.error('Error in GET /api/groups:', error);
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
    console.error('Error in GET /api/groups/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create group
app.post('/api/groups', (req, res) => {
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
    
    res.status(201).json(group);
  } catch (error) {
    console.error('Error in POST /api/groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update group
app.put('/api/groups/:id', (req, res) => {
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
    
    res.json(updated);
  } catch (error) {
    console.error('Error in PUT /api/groups/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete group
app.delete('/api/groups/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const group = dbFunctions.getGroupById(id);
    if (!group) {
      return res.status(404).json({ error: 'المجموعة غير موجودة' });
    }
    
    dbFunctions.deleteGroup(id);
    res.json({ success: true, message: 'تم حذف المجموعة بنجاح' });
  } catch (error) {
    console.error('Error in DELETE /api/groups/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle Chrome DevTools .well-known requests (to avoid 404 errors)
app.get('/.well-known/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available on all interfaces: http://0.0.0.0:${PORT}/api`);
  console.log(`🌐 Access from local network at: http://<SERVER_IP>:${PORT}/api`);
}).on('error', (err) => {
  console.error('Failed to start server:', err);
});

