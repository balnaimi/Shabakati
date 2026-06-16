#!/usr/bin/env node
/**
 * Comprehensive API scenario tests with realistic fake data.
 * Run against a fresh server: scripts/run-all-tests.mjs
 * Or: node server/scripts/scenario-test.mjs http://127.0.0.1:3099
 */
const BASE = (process.argv[2] || 'http://127.0.0.1:3099').replace(/\/$/, '');

const VISITOR_PW = 'vis1234';
const ADMIN_PW = 'adm1234';

let passed = 0;
let failed = 0;
const failures = [];

function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}

function fail(name, detail) {
  failed++;
  failures.push({ name, detail });
  console.log(`  ✗ ${name}: ${detail}`);
}

async function req(method, path, { body, token, expectStatus } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (expectStatus !== undefined && res.status !== expectStatus) {
    throw new Error(`expected ${expectStatus}, got ${res.status}: ${JSON.stringify(data)}`);
  }
  return { status: res.status, data };
}

async function main() {
  console.log(`\nScenario tests → ${BASE}\n`);

  let visitorToken = null;
  let adminToken = null;
  const ids = {
    netLan: null,
    netGuest: null,
    tagServer: null,
    tagMobile: null,
    groupOps: null,
    hosts: {},
    favoriteId: null
  };

  // ── Auth & setup ──────────────────────────────────────────────
  try {
    const { data: setup } = await req('GET', '/api/auth/check-setup', { expectStatus: 200 });
    if (setup.setupRequired) {
      await req('POST', '/api/auth/setup', {
        body: { visitorPassword: VISITOR_PW, adminPassword: ADMIN_PW },
        expectStatus: 200
      });
      ok('fresh setup with test passwords');
    } else {
      ok('setup already done — using existing passwords');
    }
  } catch (e) {
    fail('setup', e.message);
  }

  try {
    const { data } = await req('POST', '/api/auth/login', {
      body: { password: VISITOR_PW },
      expectStatus: 200
    });
    visitorToken = data.token;
    ok('visitor login');
  } catch (e) {
    fail('visitor login', e.message);
  }

  try {
    const { data } = await req('POST', '/api/auth/admin-login', {
      body: { password: ADMIN_PW },
      token: visitorToken,
      expectStatus: 200
    });
    adminToken = data.token;
    ok('admin login');
  } catch (e) {
    fail('admin login', e.message);
  }

  // ── Networks (2 subnets) ──────────────────────────────────────
  try {
    const { data: lan } = await req('POST', '/api/networks', {
      token: adminToken,
      body: {
        name: 'Scenario LAN',
        networkId: '10.10.1.0',
        subnet: 24,
        dhcp_range_start: '10.10.1.100',
        dhcp_range_end: '10.10.1.150'
      },
      expectStatus: 201
    });
    ids.netLan = lan.id;

    const { data: guest } = await req('POST', '/api/networks', {
      token: adminToken,
      body: {
        name: 'Scenario Guest WiFi',
        networkId: '10.10.2.0',
        subnet: 24
      },
      expectStatus: 201
    });
    ids.netGuest = guest.id;
    ok('create 2 networks (LAN + Guest)');
  } catch (e) {
    fail('networks create', e.message);
  }

  // ── Tags ──────────────────────────────────────────────────────
  try {
    const { data: t1 } = await req('POST', '/api/tags', {
      token: adminToken,
      body: { name: 'scenario-server', color: '#2563eb' },
      expectStatus: 201
    });
    ids.tagServer = t1.id;
    const { data: t2 } = await req('POST', '/api/tags', {
      token: adminToken,
      body: { name: 'scenario-mobile', color: '#16a34a' },
      expectStatus: 201
    });
    ids.tagMobile = t2.id;
    ok('create tags (server + mobile)');
  } catch (e) {
    fail('tags create', e.message);
  }

  // ── Hosts covering all display states ─────────────────────────
  try {
    const scenarios = [
      {
        key: 'samsungOnline',
        name: 'Samsung',
        ip: '10.10.1.10',
        status: 'online',
        vendor: 'Samsung',
        mac_address: '00:16:32:AA:BB:CC',
        device_category: 'mobile',
        tagIds: [ids.tagMobile]
      },
      {
        key: 'tplinkOffline',
        name: 'Host 20',
        ip: '10.10.1.20',
        status: 'offline',
        vendor: 'TP-Link',
        mac_address: '001E58AABBCC',
        device_category: 'network',
        tagIds: [ids.tagServer]
      },
      {
        key: 'linuxServer',
        name: 'Host 30',
        ip: '10.10.1.30',
        status: 'online',
        vendor: null,
        device_category: 'server',
        tagIds: [ids.tagServer]
      },
      {
        key: 'guestDevice',
        name: 'Guest Phone',
        ip: '10.10.2.5',
        status: 'offline',
        vendor: 'Apple',
        mac_address: '00:03:93:12:34:56',
        device_category: 'apple',
        tagIds: []
      },
      {
        key: 'unknownOffline',
        name: 'Host 99',
        ip: '10.10.1.99',
        status: 'offline',
        vendor: null,
        device_category: 'unknown',
        tagIds: []
      }
    ];

    for (const s of scenarios) {
      const { data } = await req('POST', '/api/hosts', {
        token: adminToken,
        body: {
          name: s.name,
          ip: s.ip,
          description: JSON.stringify({ en: 'Scenario seed', ar: 'بيانات تجريبية' }),
          url: '',
          status: s.status,
          tagIds: s.tagIds.filter(Boolean),
          mac_address: s.mac_address,
          vendor: s.vendor,
          device_category: s.device_category
        },
        expectStatus: 201
      });
      ids.hosts[s.key] = data.id;
    }
    ok('seed 5 hosts (online/offline, vendor, categories, 2 networks)');
  } catch (e) {
    fail('hosts seed', e.message);
  }

  // ── Uptime: offline must not show 100% ────────────────────────
  try {
    const { data: uptime } = await req('GET', '/api/uptime', { token: visitorToken, expectStatus: 200 });
    const tplink = uptime.find((h) => h.ip === '10.10.1.20');
    const unknown = uptime.find((h) => h.ip === '10.10.1.99');
    if (!tplink || tplink.uptimePercentage >= 100) {
      throw new Error(`offline TP-Link uptime should be <100, got ${tplink?.uptimePercentage}`);
    }
    if (!unknown || unknown.uptimePercentage >= 100) {
      throw new Error(`offline unknown host uptime should be <100, got ${unknown?.uptimePercentage}`);
    }
    const samsung = uptime.find((h) => h.ip === '10.10.1.10');
    if (!samsung || samsung.uptimePercentage < 0 || samsung.uptimePercentage > 100) {
      throw new Error('online host uptime out of range');
    }
    ok('uptime: offline hosts not 100%');
  } catch (e) {
    fail('uptime offline check', e.message);
  }

  // ── Uptime: record check → history updates percentage ─────────
  try {
    const hostId = ids.hosts.tplinkOffline;
    await req('PUT', `/api/hosts/${hostId}`, {
      token: adminToken,
      body: {
        name: 'TP-Link',
        ip: '10.10.1.20',
        description: '',
        url: '',
        status: 'offline',
        tagIds: ids.tagServer ? [ids.tagServer] : [],
        lastChecked: new Date().toISOString()
      },
      expectStatus: 200
    });
    const { data: uptime2 } = await req('GET', '/api/uptime', { token: visitorToken, expectStatus: 200 });
    const tplink2 = uptime2.find((h) => h.ip === '10.10.1.20');
    if (tplink2?.uptimePercentage !== 0) {
      throw new Error(`offline after check should be 0%, got ${tplink2?.uptimePercentage}`);
    }
    ok('uptime: offline stays 0% after status check recorded');
  } catch (e) {
    fail('uptime after check', e.message);
  }

  // ── Toggle online → uptime improves ───────────────────────────
  try {
    const hostId = ids.hosts.unknownOffline;
    await req('PATCH', `/api/hosts/${hostId}/toggle-status`, {
      token: adminToken,
      expectStatus: 200
    });
    await req('PUT', `/api/hosts/${hostId}`, {
      token: adminToken,
      body: {
        name: 'Host 99',
        ip: '10.10.1.99',
        description: '',
        url: '',
        status: 'online',
        tagIds: [],
        lastChecked: new Date().toISOString()
      },
      expectStatus: 200
    });
    const { data: uptime3 } = await req('GET', '/api/uptime', { token: visitorToken, expectStatus: 200 });
    const h = uptime3.find((x) => x.ip === '10.10.1.99');
    if (!h || h.status !== 'online') throw new Error('toggle did not set online');
    ok('host toggle-status + online check');
  } catch (e) {
    fail('toggle status', e.message);
  }

  // ── Network filter in uptime data ─────────────────────────────
  try {
    const { data: uptime } = await req('GET', '/api/uptime', { token: visitorToken, expectStatus: 200 });
    const guest = uptime.find((h) => h.ip === '10.10.2.5');
    if (!guest?.networkName?.includes('Guest')) {
      throw new Error('guest host missing networkName');
    }
    ok('uptime includes networkName per host');
  } catch (e) {
    fail('uptime networkName', e.message);
  }

  // ── Search (name, IP, vendor, MAC) ────────────────────────────
  try {
    const { data: byVendor } = await req('GET', '/api/search?q=samsung', {
      token: visitorToken,
      expectStatus: 200
    });
    if (!byVendor.some((h) => h.ip === '10.10.1.10')) throw new Error('search by vendor failed');

    const { data: byIp } = await req('GET', '/api/search?q=10.10.1.20', {
      token: visitorToken,
      expectStatus: 200
    });
    if (!byIp.some((h) => h.ip === '10.10.1.20')) throw new Error('search by IP failed');

    await req('GET', '/api/search?q=a', { token: visitorToken, expectStatus: 200 });
    ok('search: vendor, IP, short query');
  } catch (e) {
    fail('search', e.message);
  }

  // ── Groups & favorites ────────────────────────────────────────
  try {
    const { data: group } = await req('POST', '/api/groups', {
      token: adminToken,
      body: { name: 'Scenario Ops' },
      expectStatus: 201
    });
    ids.groupOps = group.id;

    await req('POST', '/api/favorites', {
      token: adminToken,
      body: { hostId: ids.hosts.samsungOnline, groupId: group.id, customName: 'Main TV' },
      expectStatus: 201
    });
    const { data: favs } = await req('GET', '/api/favorites', { token: visitorToken, expectStatus: 200 });
    const fav = favs.find((f) => f.hostId === ids.hosts.samsungOnline);
    if (!fav || fav.customName !== 'Main TV') throw new Error('favorite custom name missing');
    ids.favoriteId = fav.id;
    ok('groups + favorites with custom name');
  } catch (e) {
    fail('groups/favorites', e.message);
  }

  // ── Bulk tags ─────────────────────────────────────────────────
  try {
    await req('PUT', '/api/hosts/bulk-tags', {
      token: adminToken,
      body: {
        hostIds: [ids.hosts.linuxServer, ids.hosts.guestDevice].filter(Boolean),
        tagIds: [ids.tagServer].filter(Boolean)
      },
      expectStatus: 200
    });
    const { data: host } = await req('GET', `/api/hosts/${ids.hosts.linuxServer}`, {
      token: visitorToken,
      expectStatus: 200
    });
    if (!host.tags?.some((t) => t.id === ids.tagServer)) throw new Error('bulk-tags not applied');
    ok('bulk tag assignment');
  } catch (e) {
    fail('bulk tags', e.message);
  }

  // ── Auto-scan toggle ──────────────────────────────────────────
  if (ids.netLan) {
    try {
      await req('POST', `/api/networks/${ids.netLan}/auto-scan`, {
        token: adminToken,
        body: { enabled: true, interval: 600000 },
        expectStatus: 200
      });
      await req('POST', `/api/networks/${ids.netLan}/auto-scan`, {
        token: adminToken,
        body: { enabled: false, interval: 600000 },
        expectStatus: 200
      });
      ok('auto-scan enable/disable');
    } catch (e) {
      fail('auto-scan', e.message);
    }
  }

  // ── Scan progress (idle) ──────────────────────────────────────
  if (ids.netLan) {
    try {
      const { data } = await req('GET', `/api/networks/${ids.netLan}/scan/progress`, {
        token: visitorToken,
        expectStatus: 200
      });
      if (data.status !== 'idle') throw new Error(`expected idle, got ${data.status}`);
      ok('scan progress idle');
    } catch (e) {
      fail('scan progress', e.message);
    }
  }

  // ── Admin settings ────────────────────────────────────────────
  try {
    await req('GET', '/api/settings/webhook', { token: adminToken, expectStatus: 200 });
    await req('PUT', '/api/settings/webhook', {
      token: adminToken,
      body: { url: 'https://example.com/hook' },
      expectStatus: 200
    });
    await req('PUT', '/api/settings/webhook', {
      token: adminToken,
      body: { url: '' },
      expectStatus: 200
    });
    await req('GET', '/api/settings/telegram', { token: adminToken, expectStatus: 200 });
    ok('webhook + telegram settings (admin)');
  } catch (e) {
    fail('settings', e.message);
  }

  // ── System health (admin only) ────────────────────────────────
  try {
    await req('GET', '/api/system-health', { token: visitorToken, expectStatus: 403 });
    const { data: health } = await req('GET', '/api/system-health', {
      token: adminToken,
      expectStatus: 200
    });
    if (!health.version || !health.database || health.data.hosts < 5) {
      throw new Error('system-health incomplete');
    }
    ok('system-health admin + auth guard');
  } catch (e) {
    fail('system health', e.message);
  }

  // ── Alerts ────────────────────────────────────────────────────
  try {
    const { data: alerts } = await req('GET', '/api/alerts?since=0', {
      token: visitorToken,
      expectStatus: 200
    });
    if (!Array.isArray(alerts)) throw new Error('alerts not array');
    ok('GET /api/alerts');
  } catch (e) {
    fail('alerts', e.message);
  }

  // ── Export / import round-trip ──────────────────────────────────
  try {
    const { data: exported } = await req('GET', '/api/export', {
      token: visitorToken,
      expectStatus: 200
    });
    if ((exported.hosts?.length ?? 0) < 5) throw new Error('export missing hosts');
    await req('POST', '/api/import', {
      token: adminToken,
      body: { hosts: [], tags: exported.tags || [] },
      expectStatus: 200
    });
    ok('export/import round-trip');
  } catch (e) {
    fail('export/import', e.message);
  }

  // ── Stats & metrics ───────────────────────────────────────────
  try {
    const { data: stats } = await req('GET', '/api/stats', { token: visitorToken, expectStatus: 200 });
    if (stats.totalHosts < 5) throw new Error('stats totalHosts too low');
    const metrics = await req('GET', '/api/metrics', { token: visitorToken, expectStatus: 200 });
    if (!String(metrics.data).includes('shabakati_hosts_total')) {
      throw new Error('metrics missing prometheus lines');
    }
    ok('stats + metrics');
  } catch (e) {
    fail('stats/metrics', e.message);
  }

  // ── Network hosts filter ────────────────────────────────────────
  if (ids.netLan) {
    try {
      const { data: lanHosts } = await req('GET', `/api/networks/${ids.netLan}/hosts`, {
        token: visitorToken,
        expectStatus: 200
      });
      if (!lanHosts.every((h) => h.ip.startsWith('10.10.1.'))) {
        throw new Error('network hosts filter leaked guest subnet');
      }
      if (lanHosts.some((h) => h.ip === '10.10.2.5')) {
        throw new Error('guest IP in LAN network list');
      }
      ok('network hosts scoped to subnet');
    } catch (e) {
      fail('network hosts scope', e.message);
    }
  }

  // ── Validation errors ─────────────────────────────────────────
  try {
    await req('POST', '/api/networks', {
      token: adminToken,
      body: { name: 'Bad', networkId: '10.0.0.0', subnet: 24, dhcp_range_start: '10.0.0.99', dhcp_range_end: '10.0.0.1' },
      expectStatus: 400
    });
    await req('POST', '/api/tags', {
      token: adminToken,
      body: { name: '', color: '#fff' },
      expectStatus: 400
    });
    ok('validation rejects bad DHCP and empty tag');
  } catch (e) {
    fail('validation', e.message);
  }

  // ── Cleanup scenario data ─────────────────────────────────────
  try {
    if (ids.favoriteId) {
      await req('DELETE', `/api/favorites/${ids.favoriteId}`, { token: adminToken, expectStatus: 200 });
    }
    for (const hostId of Object.values(ids.hosts)) {
      if (hostId) await req('DELETE', `/api/hosts/${hostId}`, { token: adminToken, expectStatus: 200 });
    }
    if (ids.tagServer) await req('DELETE', `/api/tags/${ids.tagServer}`, { token: adminToken, expectStatus: 200 });
    if (ids.tagMobile) await req('DELETE', `/api/tags/${ids.tagMobile}`, { token: adminToken, expectStatus: 200 });
    if (ids.groupOps) await req('DELETE', `/api/groups/${ids.groupOps}`, { token: adminToken, expectStatus: 200 });
    if (ids.netLan) await req('DELETE', `/api/networks/${ids.netLan}`, { token: adminToken, expectStatus: 200 });
    if (ids.netGuest) await req('DELETE', `/api/networks/${ids.netGuest}`, { token: adminToken, expectStatus: 200 });
    ok('cleanup scenario data');
  } catch (e) {
    fail('cleanup', e.message);
  }

  console.log(`\n--- Scenario results: ${passed} passed, ${failed} failed ---\n`);
  if (failures.length) {
    failures.forEach((f) => console.log(`  • ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
