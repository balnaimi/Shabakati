import express from 'express';
import cors from 'cors';
import { dbFunctions } from './database.js';
import { checkHost } from './hostChecker.js';
import { scanNetwork } from './networkScanner.js';

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
      return res.status(400).json({ error: 'اسم المضيف وعنوان IP مطلوبان' });
    }

    // التحقق تلقائياً من حالة المضيف
    let status = 'offline';
    try {
      status = await checkHost(ip, url || null);
    } catch (error) {
      console.error('خطأ في التحقق من حالة المضيف:', error);
      // في حالة الخطأ، نضع offline كحالة افتراضية
      status = 'offline';
    }

    const newHost = {
      name,
      ip,
      description: description || '',
      url: url || '',
      tagIds: tagIds || [],
      status: status,
      createdAt: new Date().toLocaleString('ar-SA')
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

    // التأكد من أن tagIds مصفوفة
    const tagIdsArray = Array.isArray(tagIds) ? tagIds : (tagIds ? [tagIds] : []);

    const updatedHost = dbFunctions.updateHost(id, {
      name,
      ip,
      description: description || '',
      url: url || '',
      tagIds: tagIdsArray,
      status: status || 'online'
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

// بدء الخادم
app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`📡 API متاح على: http://localhost:${PORT}/api`);
});

