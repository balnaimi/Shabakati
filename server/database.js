import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create database connection
const db = new Database(join(__dirname, 'network.db'));

// Create table if it doesn't exist
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

// Add new columns to existing databases
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

// Create status history table (for statistics)
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

// Create networks table
db.exec(`
  CREATE TABLE IF NOT EXISTS networks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    network_id TEXT NOT NULL,
    subnet INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    last_scanned TEXT
  )
`);

// Add tags column if it doesn't exist (for existing databases)
try {
  db.exec('ALTER TABLE hosts ADD COLUMN tags TEXT');
} catch (e) {
  // Column already exists
}

// Migrate data from tag to tags (if tag column exists)
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
  // Ignore error
}

// Create tags table
db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#4a9eff',
    created_at TEXT NOT NULL
  )
`);

// Create host_tags table to link hosts and tags
db.exec(`
  CREATE TABLE IF NOT EXISTS host_tags (
    host_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (host_id, tag_id),
    FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )
`);

// ========== Add indexes for performance improvement ==========
// Index on IP for fast search
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_hosts_ip ON hosts(ip)');
} catch (e) {}

// Index on status for fast filtering
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_hosts_status ON hosts(status)');
} catch (e) {}

// Index on created_at for fast sorting
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_hosts_created_at ON hosts(created_at DESC)');
} catch (e) {}

// Index on host_id in host_tags for fast linking
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_host_tags_host_id ON host_tags(host_id)');
} catch (e) {}

// Index on tag_id in host_tags
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_host_tags_tag_id ON host_tags(tag_id)');
} catch (e) {}

// Index on host_id in host_status_history
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_status_history_host_id ON host_status_history(host_id)');
} catch (e) {}

// Index on checked_at in host_status_history for fast sorting
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_status_history_checked_at ON host_status_history(host_id, checked_at DESC)');
} catch (e) {}

// Database functions
export const dbFunctions = {
  // Get all hosts (optimized - fetch tags in batch)
  getAllHosts(limit = null, offset = 0) {
    let query = 'SELECT * FROM hosts ORDER BY id DESC';
    if (limit) {
      query += ` LIMIT ? OFFSET ?`;
    }
    const stmt = limit ? db.prepare(query) : db.prepare('SELECT * FROM hosts ORDER BY id DESC');
    const hosts = limit ? stmt.all(limit, offset) : stmt.all();
    
    // Fetch all tags at once instead of loop
    const hostIds = hosts.map(h => h.id);
    let allHostTags = {};
    
    if (hostIds.length > 0) {
      // Use IN clause to fetch all tags at once
      const placeholders = hostIds.map(() => '?').join(',');
      const tagsStmt = db.prepare(`
        SELECT ht.host_id, t.* 
        FROM host_tags ht
        INNER JOIN tags t ON ht.tag_id = t.id
        WHERE ht.host_id IN (${placeholders})
        ORDER BY t.name ASC
      `);
      const tagsResults = tagsStmt.all(...hostIds);
      
      // Group tags by host_id
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

  // Get single host
  getHostById(id) {
    const stmt = db.prepare('SELECT * FROM hosts WHERE id = ?');
    const host = stmt.get(id);
    if (!host) return null;
    const { created_at, tags, tag, last_checked, ping_latency, packet_loss, uptime_percentage, ...rest } = host;
    // Get tags from host_tags table
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

  // Add new host
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
      '[]', // Leave tags empty in hosts, use host_tags
      host.createdAt || new Date().toISOString(),
      host.lastChecked || null,
      host.pingLatency || null,
      host.packetLoss || null
    );
    const hostId = result.lastInsertRowid;
    
    // Link tags to host
    if (host.tagIds && Array.isArray(host.tagIds) && host.tagIds.length > 0) {
      this.updateHostTags(hostId, host.tagIds);
    }
    
    // Save initial status history
    if (host.status) {
      this.addStatusHistory(hostId, host.status, host.pingLatency);
    }
    
    return this.getHostById(hostId);
  },

  // Update host
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
      '[]', // Leave tags empty in hosts, use host_tags
      host.lastChecked || null,
      host.pingLatency || null,
      host.packetLoss || null,
      id
    );
    
    // Update host tags
    if (host.tagIds !== undefined) {
      const tagIds = Array.isArray(host.tagIds) ? host.tagIds : [];
      this.updateHostTags(id, tagIds);
    }
    
    // Update uptime_percentage
    this.updateUptimePercentage(id);
    
    return this.getHostById(id);
  },

  // Delete host
  deleteHost(id) {
    const stmt = db.prepare('DELETE FROM hosts WHERE id = ?');
    return stmt.run(id);
  },

  // Toggle host status
  toggleHostStatus(id) {
    const host = this.getHostById(id);
    if (!host) return null;
    const newStatus = host.status === 'online' ? 'offline' : 'online';
    return this.updateHost(id, { ...host, status: newStatus });
  },

  // ========== Tags functions ==========
  
  // Get all tags
  getAllTags() {
    const stmt = db.prepare('SELECT * FROM tags ORDER BY name ASC');
    return stmt.all();
  },

  // Get single tag
  getTagById(id) {
    const stmt = db.prepare('SELECT * FROM tags WHERE id = ?');
    return stmt.get(id);
  },

  // Get tag by name
  getTagByName(name) {
    const stmt = db.prepare('SELECT * FROM tags WHERE name = ?');
    return stmt.get(name);
  },

  // Add new tag
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

  // Update tag
  updateTag(id, tag) {
    const stmt = db.prepare(`
      UPDATE tags 
      SET name = ?, color = ?
      WHERE id = ?
    `);
    stmt.run(tag.name, tag.color || '#4a9eff', id);
    return this.getTagById(id);
  },

  // Delete tag
  deleteTag(id) {
    const stmt = db.prepare('DELETE FROM tags WHERE id = ?');
    return stmt.run(id);
  },

  // Get tags for a specific host (optimized - uses index)
  getHostTags(hostId) {
    const stmt = db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN host_tags ht ON t.id = ht.tag_id
      WHERE ht.host_id = ?
      ORDER BY t.name ASC
    `);
    // Index idx_host_tags_host_id improves performance here
    return stmt.all(hostId);
  },

  // Link tag to host
  addTagToHost(hostId, tagId) {
    try {
      const stmt = db.prepare(`
        INSERT INTO host_tags (host_id, tag_id)
        VALUES (?, ?)
      `);
      stmt.run(hostId, tagId);
      return true;
    } catch (e) {
      // Link already exists
      return false;
    }
  },

  // Remove tag from host
  removeTagFromHost(hostId, tagId) {
    const stmt = db.prepare(`
      DELETE FROM host_tags
      WHERE host_id = ? AND tag_id = ?
    `);
    return stmt.run(hostId, tagId);
  },

  // Update host tags
  updateHostTags(hostId, tagIds) {
    // Delete all current links
    const deleteStmt = db.prepare('DELETE FROM host_tags WHERE host_id = ?');
    deleteStmt.run(hostId);
    
    // Add new links
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

  // Add status history record (optimized - more efficient old record deletion)
  addStatusHistory(hostId, status, latency) {
    const stmt = db.prepare(`
      INSERT INTO host_status_history (host_id, status, checked_at, ping_latency)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(hostId, status, new Date().toISOString(), latency);
    
    // Delete old records more efficiently (keep last 1000 records)
    // Use optimized query instead of NOT IN
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
      // Execute deletion only if there are more than 1000 records
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM host_status_history WHERE host_id = ?');
      const count = countStmt.get(hostId);
      if (count && count.count > 1000) {
        deleteOldStmt.run(hostId, hostId);
      }
    } catch (e) {
      // Ignore error if table is empty
    }
  },

  // Get status history for a host
  getStatusHistory(hostId, limit = 100) {
    const stmt = db.prepare(`
      SELECT * FROM host_status_history 
      WHERE host_id = ? 
      ORDER BY checked_at DESC 
      LIMIT ?
    `);
    return stmt.all(hostId, limit);
  },

  // Update Uptime percentage (optimized - use more efficient query)
  updateUptimePercentage(hostId) {
    // Calculate Uptime percentage from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // Optimization: use COUNT with CASE instead of COUNT(*) then SUM
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
  },

  // ========== Networks functions ==========
  
  // Get all networks
  getAllNetworks() {
    const stmt = db.prepare('SELECT * FROM networks ORDER BY created_at DESC');
    return stmt.all();
  },

  // Get network by ID
  getNetworkById(id) {
    const stmt = db.prepare('SELECT * FROM networks WHERE id = ?');
    return stmt.get(id);
  },

  // Add new network
  addNetwork(network) {
    const stmt = db.prepare(`
      INSERT INTO networks (name, network_id, subnet, created_at, last_scanned)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      network.name,
      network.networkId,
      network.subnet,
      network.createdAt || new Date().toISOString(),
      network.lastScanned || null
    );
    return this.getNetworkById(result.lastInsertRowid);
  },

  // Update network
  updateNetwork(id, network) {
    const stmt = db.prepare(`
      UPDATE networks 
      SET name = ?, network_id = ?, subnet = ?, last_scanned = ?
      WHERE id = ?
    `);
    stmt.run(
      network.name,
      network.networkId,
      network.subnet,
      network.lastScanned || null,
      id
    );
    return this.getNetworkById(id);
  },

  // Delete network
  deleteNetwork(id) {
    const stmt = db.prepare('DELETE FROM networks WHERE id = ?');
    return stmt.run(id);
  }
};

export default db;

