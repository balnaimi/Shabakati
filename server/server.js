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
app.use(express.json({ limit: '10mb' })); // زيادة حد حجم البيانات

// Routes

// الحصول على جميع المضيفين (مع دعم pagination)
app.get('/api/hosts', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || null; // null يعني جلب الكل
    const offset = limit ? (page - 1) * limit : 0;
    
    const hosts = dbFunctions.getAllHosts(limit, offset);
    
    // إذا كان هناك pagination، أرسل معلومات إضافية
    if (limit) {
      const totalStmt = db.prepare('SELECT COUNT(*) as total FROM hosts');
      const total = totalStmt.get().total;
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

// التحقق من حالة مضيف معين (يجب أن يكون قبل /api/hosts/:id)
app.post('/api/hosts/:id/check-status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const host = dbFunctions.getHostById(id);
    
    if (!host) {
      return res.status(404).json({ error: 'المضيف غير موجود' });
    }

    // التحقق من حالة المضيف
    let checkResult = { status: 'offline', latency: null, packetLoss: 100 };
    try {
      checkResult = await checkHost(host.ip, host.url || null);
    } catch (error) {
      console.error('خطأ في التحقق من حالة المضيف:', error);
      checkResult = { status: 'offline', latency: null, packetLoss: 100 };
    }

    // حفظ تاريخ الحالة
    dbFunctions.addStatusHistory(id, checkResult.status, checkResult.latency);

    // تحديث الحالة في قاعدة البيانات
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

// تغيير حالة المضيف (يجب أن يكون قبل /api/hosts/:id)
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

// الحصول على مضيف واحد
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

// إضافة مضيف جديد
app.post('/api/hosts', async (req, res) => {
  try {
    const { name, ip, description, url, tagIds } = req.body;
    
    if (!name || !ip) {
      return res.status(400).json({ error: 'اسم الجهاز وعنوان IP مطلوبان' });
    }

    // التحقق من وجود جهاز بنفس IP
    const existingHosts = dbFunctions.getAllHosts();
    const existingHost = existingHosts.find(h => h.ip === ip);
    if (existingHost) {
      return res.status(400).json({ error: `الجهاز موجود مسبقاً: ${existingHost.name} (${ip})` });
    }

    // التحقق تلقائياً من حالة المضيف
    let checkResult = { status: 'offline', latency: null, packetLoss: 100 };
    try {
      checkResult = await checkHost(ip, url || null);
    } catch (error) {
      console.error('خطأ في التحقق من حالة المضيف:', error);
      // في حالة الخطأ، نضع offline كحالة افتراضية
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

// تحديث مضيف
app.put('/api/hosts/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, ip, description, url, status, tagIds } = req.body;
    console.log('استقبال طلب تحديث:', { id, tagIds, body: req.body });

    if (!name || !ip) {
      return res.status(400).json({ error: 'اسم المضيف وعنوان IP مطلوبان' });
    }

    // جلب الجهاز الحالي للحفاظ على القيم الموجودة
    const existingHost = dbFunctions.getHostById(id);
    if (!existingHost) {
      return res.status(404).json({ error: 'المضيف غير موجود' });
    }

    // التأكد من أن tagIds مصفوفة
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

// حذف مضيف
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


// ========== API للوسوم ==========

// الحصول على جميع الوسوم
app.get('/api/tags', (req, res) => {
  try {
    const tags = dbFunctions.getAllTags();
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// الحصول على وسم واحد
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

// إضافة وسم جديد
app.post('/api/tags', (req, res) => {
  try {
    const { name, color } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم الوسم مطلوب' });
    }

    // التحقق من وجود وسم بنفس الاسم
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

// تحديث وسم
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

    // التحقق من وجود وسم آخر بنفس الاسم
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

// حذف وسم
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

// الحصول على تاريخ الحالات لمضيف
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

// تصدير البيانات (JSON)
app.get('/api/export', (req, res) => {
  try {
    const hosts = dbFunctions.getAllHosts();
    const tags = dbFunctions.getAllTags();
    res.json({ hosts, tags, exportedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// استيراد البيانات (JSON)
app.post('/api/import', async (req, res) => {
  try {
    const { hosts, tags } = req.body;
    let imported = 0;
    
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        try {
          dbFunctions.addTag({ name: tag.name, color: tag.color });
        } catch (e) {
          // تجاهل إذا كان موجوداً
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
          console.error('خطأ في استيراد مضيف:', e);
        }
      }
    }
    
    res.json({ message: `تم استيراد ${imported} مضيف بنجاح` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// إحصائيات شاملة
app.get('/api/stats', (req, res) => {
  try {
    const networks = dbFunctions.getAllNetworks();
    const allHosts = dbFunctions.getAllHosts();
    
    // حساب الإحصائيات العامة
    const totalNetworks = networks.length;
    const totalHosts = allHosts.length;
    const onlineHosts = allHosts.filter(h => h.status === 'online').length;
    const offlineHosts = allHosts.filter(h => h.status === 'offline').length;
    
    // حساب الإحصائيات لكل شبكة
    const networksWithStats = networks.map(network => {
      // فلترة الأجهزة التي IPها ضمن نطاق الشبكة
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

// مسح الشبكة
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

// ========== APIs للشبكات ==========

// جلب جميع الشبكات
app.get('/api/networks', (req, res) => {
  try {
    const networks = dbFunctions.getAllNetworks();
    res.json(networks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// جلب شبكة معينة
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

// إضافة شبكة جديدة
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

// تحديث شبكة
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

// حذف أجهزة شبكة معينة (بدون حذف الشبكة نفسها)
app.delete('/api/networks/:id/hosts', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json({ error: 'الشبكة غير موجودة' });
    }
    
    // جلب جميع الأجهزة المرتبطة بالشبكة
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

// حذف شبكة مع جميع أجهزتها
app.delete('/api/networks/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json({ error: 'الشبكة غير موجودة' });
    }
    
    // حذف جميع الأجهزة المرتبطة بالشبكة
    const allHosts = dbFunctions.getAllHosts();
    const networkHosts = allHosts.filter(host => 
      isIPInNetwork(host.ip, network.network_id, network.subnet)
    );
    
    let deletedHostsCount = 0;
    networkHosts.forEach(host => {
      dbFunctions.deleteHost(host.id);
      deletedHostsCount++;
    });
    
    // حذف الشبكة
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

// جلب الأجهزة المرتبطة بالشبكة (ربط تلقائي)
app.get('/api/networks/:id/hosts', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const network = dbFunctions.getNetworkById(id);
    if (!network) {
      return res.status(404).json({ error: 'الشبكة غير موجودة' });
    }

    // جلب جميع الأجهزة وفلترتها بناءً على IP range
    const allHosts = dbFunctions.getAllHosts();
    const networkHosts = allHosts.filter(host => 
      isIPInNetwork(host.ip, network.network_id, network.subnet)
    );

    res.json(networkHosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// مسح الشبكة
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

    // حساب CIDR notation
    const cidr = getNetworkCIDR(network.network_id, network.subnet);
    console.log(`[Scan] Starting scan for network ${id}: ${cidr}, timeout: ${scanTimeout}s, addHosts: ${shouldAddHosts}`);
    
    // مسح الشبكة
    const activeHosts = await scanNetwork(cidr, scanTimeout);
    console.log(`[Scan] Found ${activeHosts.length} active hosts`);

    // تحديث last_scanned
    dbFunctions.updateNetwork(id, {
      name: network.name,
      networkId: network.network_id,
      subnet: network.subnet,
      lastScanned: new Date().toISOString()
    });

    // إضافة الأجهزة المكتشفة تلقائياً (دائماً)
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
            existingIPs.add(host.ip); // تحديث القائمة لتجنب التكرار
          } catch (error) {
            console.error(`خطأ في إضافة الجهاز ${host.ip}:`, error);
          }
        }
      }
      console.log(`[Scan] Added ${addedCount} new hosts to database`);
    }

    // تحديث حالة جميع الأجهزة المرتبطة بالشبكة
    const allNetworkHosts = dbFunctions.getAllHosts().filter(host => 
      isIPInNetwork(host.ip, network.network_id, network.subnet)
    );
    
    let updatedCount = 0;
    for (const host of allNetworkHosts) {
      const isOnline = discoveredIPs.has(host.ip);
      const newStatus = isOnline ? 'online' : 'offline';
      const activeHost = activeHosts.find(h => h.ip === host.ip);
      
      try {
        // الحصول على tagIds
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
        console.error(`خطأ في تحديث حالة الجهاز ${host.ip}:`, error);
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

// مسح جميع البيانات
app.delete('/api/data/all', (req, res) => {
  try {
    // حذف جميع الأجهزة
    const allHosts = dbFunctions.getAllHosts();
    allHosts.forEach(host => dbFunctions.deleteHost(host.id));
    
    // حذف جميع الشبكات
    const allNetworks = dbFunctions.getAllNetworks();
    allNetworks.forEach(network => dbFunctions.deleteNetwork(network.id));
    
    // حذف جميع الوسوم
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

// بدء الخادم
app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`📡 API متاح على: http://localhost:${PORT}/api`);
});

