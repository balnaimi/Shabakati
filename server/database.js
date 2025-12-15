import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// إنشاء اتصال بقاعدة البيانات
const db = new Database(join(__dirname, 'network.db'));

// إنشاء الجدول إذا لم يكن موجوداً
db.exec(`
  CREATE TABLE IF NOT EXISTS hosts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ip TEXT NOT NULL,
    description TEXT,
    url TEXT,
    status TEXT NOT NULL DEFAULT 'online',
    tags TEXT,
    created_at TEXT NOT NULL,
    last_checked TEXT,
    ping_latency REAL,
    packet_loss REAL,
    uptime_percentage REAL DEFAULT 100.0
  )
`);

// إضافة الأعمدة الجديدة للقواعد الموجودة
try {
  db.exec('ALTER TABLE hosts ADD COLUMN last_checked TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE hosts ADD COLUMN ping_latency REAL');
} catch (e) {}
try {
  db.exec('ALTER TABLE hosts ADD COLUMN packet_loss REAL');
} catch (e) {}
try {
  db.exec('ALTER TABLE hosts ADD COLUMN uptime_percentage REAL DEFAULT 100.0');
} catch (e) {}

// إنشاء جدول لتاريخ الحالات (للإحصائيات)
db.exec(`
  CREATE TABLE IF NOT EXISTS host_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    checked_at TEXT NOT NULL,
    ping_latency REAL,
    FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE
  )
`);

// إضافة عمود tags إذا لم يكن موجوداً (للقواعد الموجودة)
try {
  db.exec('ALTER TABLE hosts ADD COLUMN tags TEXT');
} catch (e) {
  // العمود موجود بالفعل
}

// ترحيل البيانات من tag إلى tags (إذا كان tag موجوداً)
try {
  db.exec(`
    UPDATE hosts 
    SET tags = CASE 
      WHEN tag IS NOT NULL AND tag != '' THEN '["' || tag || '"]'
      ELSE '[]'
    END
    WHERE tags IS NULL OR tags = ''
  `);
} catch (e) {
  // تجاهل الخطأ
}

// إنشاء جدول tags
db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#4a9eff',
    created_at TEXT NOT NULL
  )
`);

// إنشاء جدول host_tags للربط بين hosts و tags
db.exec(`
  CREATE TABLE IF NOT EXISTS host_tags (
    host_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (host_id, tag_id),
    FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )
`);

// ========== إضافة فهارس لتحسين الأداء ==========
// فهرس على IP للبحث السريع
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_hosts_ip ON hosts(ip)');
} catch (e) {}

// فهرس على status للفلترة السريعة
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_hosts_status ON hosts(status)');
} catch (e) {}

// فهرس على created_at للترتيب السريع
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_hosts_created_at ON hosts(created_at DESC)');
} catch (e) {}

// فهرس على host_id في host_tags للربط السريع
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_host_tags_host_id ON host_tags(host_id)');
} catch (e) {}

// فهرس على tag_id في host_tags
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_host_tags_tag_id ON host_tags(tag_id)');
} catch (e) {}

// فهرس على host_id في host_status_history
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_status_history_host_id ON host_status_history(host_id)');
} catch (e) {}

// فهرس على checked_at في host_status_history للترتيب السريع
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_status_history_checked_at ON host_status_history(host_id, checked_at DESC)');
} catch (e) {}

// دوال قاعدة البيانات
export const dbFunctions = {
  // الحصول على جميع المضيفين (محسّن - جلب الوسوم بشكل batch)
  getAllHosts(limit = null, offset = 0) {
    let query = 'SELECT * FROM hosts ORDER BY id DESC';
    if (limit) {
      query += ` LIMIT ? OFFSET ?`;
    }
    const stmt = limit ? db.prepare(query) : db.prepare('SELECT * FROM hosts ORDER BY id DESC');
    const hosts = limit ? stmt.all(limit, offset) : stmt.all();
    
    // جلب جميع الوسوم دفعة واحدة بدلاً من loop
    const hostIds = hosts.map(h => h.id);
    let allHostTags = {};
    
    if (hostIds.length > 0) {
      // استخدام IN clause لجلب جميع الوسوم دفعة واحدة
      const placeholders = hostIds.map(() => '?').join(',');
      const tagsStmt = db.prepare(`
        SELECT ht.host_id, t.* 
        FROM host_tags ht
        INNER JOIN tags t ON ht.tag_id = t.id
        WHERE ht.host_id IN (${placeholders})
        ORDER BY t.name ASC
      `);
      const tagsResults = tagsStmt.all(...hostIds);
      
      // تجميع الوسوم حسب host_id
      tagsResults.forEach(tag => {
        if (!allHostTags[tag.host_id]) {
          allHostTags[tag.host_id] = [];
        }
        allHostTags[tag.host_id].push({
          id: tag.id,
          name: tag.name,
          color: tag.color,
          createdAt: tag.created_at
        });
      });
    }
    
    return hosts.map(host => {
      const { created_at, tags, tag, last_checked, ping_latency, packet_loss, uptime_percentage, ...rest } = host;
      return { 
        ...rest, 
        tags: allHostTags[host.id] || [], 
        createdAt: created_at,
        lastChecked: last_checked,
        pingLatency: ping_latency,
        packetLoss: packet_loss,
        uptimePercentage: uptime_percentage || 100.0
      };
    });
  },

  // الحصول على مضيف واحد
  getHostById(id) {
    const stmt = db.prepare('SELECT * FROM hosts WHERE id = ?');
    const host = stmt.get(id);
    if (!host) return null;
    const { created_at, tags, tag, last_checked, ping_latency, packet_loss, uptime_percentage, ...rest } = host;
    // الحصول على الوسوم من جدول host_tags
    const hostTags = this.getHostTags(id);
    return { 
      ...rest, 
      tags: hostTags, 
      createdAt: created_at,
      lastChecked: last_checked,
      pingLatency: ping_latency,
      packetLoss: packet_loss,
      uptimePercentage: uptime_percentage || 100.0
    };
  },

  // إضافة مضيف جديد
  addHost(host) {
    const stmt = db.prepare(`
      INSERT INTO hosts (name, ip, description, url, status, tags, created_at, last_checked, ping_latency, packet_loss)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      host.name,
      host.ip,
      host.description || null,
      host.url || null,
      host.status || 'online',
      '[]', // نترك tags فارغة في hosts، نستخدم host_tags
      host.createdAt || new Date().toISOString(),
      host.lastChecked || null,
      host.pingLatency || null,
      host.packetLoss || null
    );
    const hostId = result.lastInsertRowid;
    
    // ربط الوسوم بالمضيف
    if (host.tagIds && Array.isArray(host.tagIds) && host.tagIds.length > 0) {
      this.updateHostTags(hostId, host.tagIds);
    }
    
    // حفظ تاريخ الحالة الأولية
    if (host.status) {
      this.addStatusHistory(hostId, host.status, host.pingLatency);
    }
    
    return this.getHostById(hostId);
  },

  // تحديث مضيف
  updateHost(id, host) {
    const stmt = db.prepare(`
      UPDATE hosts 
      SET name = ?, ip = ?, description = ?, url = ?, status = ?, tags = ?,
          last_checked = ?, ping_latency = ?, packet_loss = ?
      WHERE id = ?
    `);
    stmt.run(
      host.name,
      host.ip,
      host.description || null,
      host.url || null,
      host.status,
      '[]', // نترك tags فارغة في hosts، نستخدم host_tags
      host.lastChecked || null,
      host.pingLatency || null,
      host.packetLoss || null,
      id
    );
    
    // تحديث وسوم المضيف
    if (host.tagIds !== undefined) {
      const tagIds = Array.isArray(host.tagIds) ? host.tagIds : [];
      this.updateHostTags(id, tagIds);
    }
    
    // تحديث uptime_percentage
    this.updateUptimePercentage(id);
    
    return this.getHostById(id);
  },

  // حذف مضيف
  deleteHost(id) {
    const stmt = db.prepare('DELETE FROM hosts WHERE id = ?');
    return stmt.run(id);
  },

  // تغيير حالة المضيف
  toggleHostStatus(id) {
    const host = this.getHostById(id);
    if (!host) return null;
    const newStatus = host.status === 'online' ? 'offline' : 'online';
    return this.updateHost(id, { ...host, status: newStatus });
  },

  // ========== دوال الوسوم ==========
  
  // الحصول على جميع الوسوم
  getAllTags() {
    const stmt = db.prepare('SELECT * FROM tags ORDER BY name ASC');
    return stmt.all();
  },

  // الحصول على وسم واحد
  getTagById(id) {
    const stmt = db.prepare('SELECT * FROM tags WHERE id = ?');
    return stmt.get(id);
  },

  // الحصول على وسم بالاسم
  getTagByName(name) {
    const stmt = db.prepare('SELECT * FROM tags WHERE name = ?');
    return stmt.get(name);
  },

  // إضافة وسم جديد
  addTag(tag) {
    const stmt = db.prepare(`
      INSERT INTO tags (name, color, created_at)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(
      tag.name,
      tag.color || '#4a9eff',
      tag.createdAt || new Date().toISOString()
    );
    return this.getTagById(result.lastInsertRowid);
  },

  // تحديث وسم
  updateTag(id, tag) {
    const stmt = db.prepare(`
      UPDATE tags 
      SET name = ?, color = ?
      WHERE id = ?
    `);
    stmt.run(tag.name, tag.color || '#4a9eff', id);
    return this.getTagById(id);
  },

  // حذف وسم
  deleteTag(id) {
    const stmt = db.prepare('DELETE FROM tags WHERE id = ?');
    return stmt.run(id);
  },

  // الحصول على وسوم مضيف معين (محسّن - استخدام الفهرس)
  getHostTags(hostId) {
    const stmt = db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN host_tags ht ON t.id = ht.tag_id
      WHERE ht.host_id = ?
      ORDER BY t.name ASC
    `);
    // الفهرس idx_host_tags_host_id يحسن الأداء هنا
    return stmt.all(hostId);
  },

  // ربط وسم بمضيف
  addTagToHost(hostId, tagId) {
    try {
      const stmt = db.prepare(`
        INSERT INTO host_tags (host_id, tag_id)
        VALUES (?, ?)
      `);
      stmt.run(hostId, tagId);
      return true;
    } catch (e) {
      // الرابط موجود بالفعل
      return false;
    }
  },

  // إزالة وسم من مضيف
  removeTagFromHost(hostId, tagId) {
    const stmt = db.prepare(`
      DELETE FROM host_tags
      WHERE host_id = ? AND tag_id = ?
    `);
    return stmt.run(hostId, tagId);
  },

  // تحديث وسوم مضيف
  updateHostTags(hostId, tagIds) {
    // حذف جميع الروابط الحالية
    const deleteStmt = db.prepare('DELETE FROM host_tags WHERE host_id = ?');
    deleteStmt.run(hostId);
    
    // إضافة الروابط الجديدة
    if (tagIds && tagIds.length > 0) {
      const insertStmt = db.prepare('INSERT INTO host_tags (host_id, tag_id) VALUES (?, ?)');
      const insertMany = db.transaction((hostId, tagIds) => {
        for (const tagId of tagIds) {
          insertStmt.run(hostId, tagId);
        }
      });
      insertMany(hostId, tagIds);
    }
  },

  // إضافة سجل حالة (محسّن - حذف القديم بشكل أكثر كفاءة)
  addStatusHistory(hostId, status, latency) {
    const stmt = db.prepare(`
      INSERT INTO host_status_history (host_id, status, checked_at, ping_latency)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(hostId, status, new Date().toISOString(), latency);
    
    // حذف السجلات القديمة بشكل أكثر كفاءة (الاحتفاظ بآخر 1000 سجل)
    // استخدام استعلام محسّن بدلاً من NOT IN
    const deleteOldStmt = db.prepare(`
      DELETE FROM host_status_history 
      WHERE host_id = ? 
      AND id NOT IN (
        SELECT id FROM (
          SELECT id FROM host_status_history 
          WHERE host_id = ? 
          ORDER BY checked_at DESC 
          LIMIT 1000
        )
      )
    `);
    try {
      // تنفيذ الحذف فقط إذا كان هناك أكثر من 1000 سجل
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM host_status_history WHERE host_id = ?');
      const count = countStmt.get(hostId);
      if (count && count.count > 1000) {
        deleteOldStmt.run(hostId, hostId);
      }
    } catch (e) {
      // تجاهل الخطأ إذا كان الجدول فارغاً
    }
  },

  // الحصول على تاريخ الحالات لمضيف
  getStatusHistory(hostId, limit = 100) {
    const stmt = db.prepare(`
      SELECT * FROM host_status_history 
      WHERE host_id = ? 
      ORDER BY checked_at DESC 
      LIMIT ?
    `);
    return stmt.all(hostId, limit);
  },

  // تحديث نسبة Uptime (محسّن - استخدام استعلام أكثر كفاءة)
  updateUptimePercentage(hostId) {
    // حساب نسبة Uptime من آخر 24 ساعة
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // تحسين: استخدام COUNT مع CASE بدلاً من COUNT(*) ثم SUM
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'online' THEN 1 END) as online
      FROM host_status_history
      WHERE host_id = ? AND checked_at >= ?
    `);
    const result = stmt.get(hostId, oneDayAgo);
    
    const uptimePercentage = result && result.total > 0 
      ? (result.online / result.total) * 100 
      : 100.0;
    
    const updateStmt = db.prepare('UPDATE hosts SET uptime_percentage = ? WHERE id = ?');
    updateStmt.run(uptimePercentage, hostId);
  }
};

export default db;

