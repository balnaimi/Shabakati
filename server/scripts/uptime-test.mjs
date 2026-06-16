#!/usr/bin/env node
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';

const db = new Database(':memory:');
db.exec(`
  CREATE TABLE hosts (id INTEGER PRIMARY KEY, status TEXT NOT NULL);
  CREATE TABLE host_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    checked_at TEXT NOT NULL,
    ping_latency REAL
  );
`);

function computeUptimePercentage(hostId, currentStatus = null) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare(`
    SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'online' THEN 1 END) as online
    FROM host_status_history WHERE host_id = ? AND checked_at >= ?
  `).get(hostId, oneDayAgo);
  if (result?.total > 0) return (result.online / result.total) * 100;
  const status = currentStatus ?? db.prepare('SELECT status FROM hosts WHERE id = ?').get(hostId)?.status;
  return status === 'offline' ? 0 : 100;
}

db.prepare('INSERT INTO hosts (id, status) VALUES (1, ?)').run('offline');
assert.equal(computeUptimePercentage(1, 'offline'), 0, 'offline with no history → 0%');

db.prepare('INSERT INTO hosts (id, status) VALUES (2, ?)').run('online');
assert.equal(computeUptimePercentage(2, 'online'), 100, 'online with no history → 100%');

const now = new Date().toISOString();
db.prepare('INSERT INTO host_status_history (host_id, status, checked_at) VALUES (3, ?, ?)').run('online', now);
db.prepare('INSERT INTO host_status_history (host_id, status, checked_at) VALUES (3, ?, ?)').run('offline', now);
assert.equal(computeUptimePercentage(3, 'offline'), 50, 'half online samples → 50%');

console.log('uptime logic tests passed');
