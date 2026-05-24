#!/usr/bin/env node
/**
 * API smoke test — run with server on PORT (default 3001).
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */
const BASE = (process.argv[2] || 'http://127.0.0.1:3001').replace(/\/$/, '');

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
  console.log(`\nSmoke test → ${BASE}\n`);

  let visitorToken = null;
  let adminToken = null;
  let networkId = null;
  let hostId = null;
  let tagId = null;
  let groupId = null;
  let favoriteId = null;

  // --- Setup / auth ---
  try {
    const { data } = await req('GET', '/api/auth/check-setup', { expectStatus: 200 });
    if (data.setupRequired) {
      try {
        await req('POST', '/api/auth/setup', {
          body: { visitorPassword: 'ab', adminPassword: 'adm1234' },
          expectStatus: 400
        });
        ok('POST /api/auth/setup rejects short password');
      } catch (e) {
        fail('setup password policy', e.message);
      }
      await req('POST', '/api/auth/setup', {
        body: { visitorPassword: 'vis1234', adminPassword: 'adm1234' },
        expectStatus: 200
      });
      ok('POST /api/auth/setup');
    } else {
      ok('GET /api/auth/check-setup (already configured)');
    }
  } catch (e) {
    fail('setup', e.message);
  }

  try {
    const { data } = await req('POST', '/api/auth/login', {
      body: { password: 'vis1234' },
      expectStatus: 200
    });
    visitorToken = data.token;
    ok('POST /api/auth/login (visitor)');
  } catch (e) {
    fail('visitor login', e.message);
  }

  try {
    const { data } = await req('POST', '/api/auth/admin-login', {
      body: { password: 'adm1234' },
      token: visitorToken,
      expectStatus: 200
    });
    adminToken = data.token;
    ok('POST /api/auth/admin-login');
  } catch (e) {
    fail('admin login', e.message);
  }

  try {
    await req('GET', '/api/auth/status', { token: adminToken, expectStatus: 200 });
    ok('GET /api/auth/status');
  } catch (e) {
    fail('auth status', e.message);
  }

  // --- Stats / public read ---
  try {
    await req('GET', '/api/hosts', { expectStatus: 401 });
    ok('GET /api/hosts without token → 401');
  } catch (e) {
    fail('hosts auth', e.message);
  }

  try {
    await req('POST', '/api/hosts', {
      body: { name: 'Dup', ip: '192.168.99.99', description: '', url: '', status: 'offline' },
      token: adminToken,
      expectStatus: 201
    });
    await req('POST', '/api/hosts', {
      body: { name: 'Dup2', ip: '192.168.99.99', description: '', url: '', status: 'offline' },
      token: adminToken,
      expectStatus: 400
    });
    ok('POST /api/hosts rejects duplicate IP');
    const dupHost = (await req('GET', '/api/hosts', { token: visitorToken })).data.find(
      (h) => h.ip === '192.168.99.99'
    );
    if (dupHost) await req('DELETE', `/api/hosts/${dupHost.id}`, { token: adminToken, expectStatus: 200 });
  } catch (e) {
    fail('duplicate IP', e.message);
  }

  for (const [name, path, token] of [
    ['GET /api/stats', '/api/stats', visitorToken],
    ['GET /api/hosts', '/api/hosts', visitorToken],
    ['GET /api/networks', '/api/networks', visitorToken],
    ['GET /api/tags', '/api/tags', visitorToken],
    ['GET /api/favorites', '/api/favorites', visitorToken],
    ['GET /api/groups', '/api/groups', visitorToken],
    ['GET /api/auto-scan-overview', '/api/auto-scan-overview', visitorToken]
  ]) {
    try {
      await req('GET', path, { token, expectStatus: 200 });
      ok(name);
    } catch (e) {
      fail(name, e.message);
    }
  }

  // --- Network CRUD ---
  try {
    const { data } = await req('POST', '/api/networks', {
      token: adminToken,
      body: {
        name: 'Smoke Test Net',
        networkId: '192.168.99.0',
        subnet: 24,
        dhcp_range_start: '192.168.99.100',
        dhcp_range_end: '192.168.99.110'
      },
      expectStatus: 201
    });
    networkId = data.id;
    ok('POST /api/networks (with DHCP range)');
  } catch (e) {
    fail('POST /api/networks', e.message);
  }

  if (networkId) {
    try {
      const { data } = await req('GET', `/api/networks/${networkId}`, {
        token: visitorToken,
        expectStatus: 200
      });
      if (data.dhcp_range_start !== '192.168.99.100') {
        throw new Error('dhcp_range_start not persisted');
      }
      ok('GET /api/networks/:id (DHCP fields)');
    } catch (e) {
      fail('GET /api/networks/:id', e.message);
    }

    try {
      await req('PUT', `/api/networks/${networkId}`, {
        token: adminToken,
        body: {
          name: 'Smoke Test Net Updated',
          networkId: '192.168.99.0',
          subnet: 24,
          dhcp_range_start: '192.168.99.100',
          dhcp_range_end: '192.168.99.110',
          scan_use_ping: true,
          scan_use_tcp: false,
          offline_release_after_ms: null
        },
        expectStatus: 200
      });
      ok('PUT /api/networks/:id');
    } catch (e) {
      fail('PUT /api/networks/:id', e.message);
    }

    try {
      await req('GET', `/api/networks/${networkId}/hosts`, {
        token: visitorToken,
        expectStatus: 200
      });
      ok('GET /api/networks/:id/hosts');
    } catch (e) {
      fail('GET /api/networks/:id/hosts', e.message);
    }

    try {
      await req('GET', `/api/networks/${networkId}/auto-scan-results`, {
        token: visitorToken,
        expectStatus: 200
      });
      ok('GET /api/networks/:id/auto-scan-results');
    } catch (e) {
      fail('auto-scan-results', e.message);
    }

    try {
      await req('POST', `/api/networks/${networkId}/auto-scan`, {
        token: adminToken,
        body: { enabled: false, interval: 300000 },
        expectStatus: 200
      });
      ok('POST /api/networks/:id/auto-scan');
    } catch (e) {
      fail('auto-scan toggle', e.message);
    }
  }

  // --- DHCP validation ---
  try {
    await req('POST', '/api/networks', {
      token: adminToken,
      body: {
        name: 'Bad DHCP',
        networkId: '10.0.0.0',
        subnet: 24,
        dhcp_range_start: '10.0.0.50',
        dhcp_range_end: '10.0.0.10'
      },
      expectStatus: 400
    });
    ok('POST /api/networks rejects reversed DHCP range');
  } catch (e) {
    fail('DHCP order validation', e.message);
  }

  // --- Tag ---
  try {
    const { data } = await req('POST', '/api/tags', {
      token: adminToken,
      body: { name: 'smoke-tag', color: '#ff5500' },
      expectStatus: 201
    });
    tagId = data.id;
    ok('POST /api/tags');
  } catch (e) {
    fail('POST /api/tags', e.message);
  }

  // --- Host ---
  if (networkId) {
    try {
      const { data } = await req('POST', '/api/hosts', {
        token: adminToken,
        body: {
          name: 'Smoke Host',
          ip: '192.168.99.50',
          description: 'test',
          url: '',
          status: 'offline',
          tagIds: tagId ? [tagId] : []
        },
        expectStatus: 201
      });
      hostId = data.id;
      ok('POST /api/hosts');
    } catch (e) {
      fail('POST /api/hosts', e.message);
    }
  }

  if (hostId) {
    try {
      await req('GET', `/api/hosts/${hostId}`, { token: visitorToken, expectStatus: 200 });
      ok('GET /api/hosts/:id');
    } catch (e) {
      fail('GET /api/hosts/:id', e.message);
    }

    try {
      await req('PUT', `/api/hosts/${hostId}`, {
        token: adminToken,
        body: {
          name: 'Smoke Host Updated',
          ip: '192.168.99.50',
          description: '',
          url: '',
          status: 'offline',
          tagIds: tagId ? [tagId] : []
        },
        expectStatus: 200
      });
      ok('PUT /api/hosts/:id');
    } catch (e) {
      fail('PUT /api/hosts/:id', e.message);
    }

    try {
      const { data: other } = await req('POST', '/api/hosts', {
        token: adminToken,
        body: {
          name: 'Other Host',
          ip: '192.168.99.51',
          description: '',
          url: '',
          status: 'offline'
        },
        expectStatus: 201
      });
      await req('PUT', `/api/hosts/${other.id}`, {
        token: adminToken,
        body: {
          name: 'Other Host',
          ip: '192.168.99.50',
          description: '',
          url: '',
          status: 'offline'
        },
        expectStatus: 400
      });
      await req('DELETE', `/api/hosts/${other.id}`, { token: adminToken, expectStatus: 200 });
      ok('PUT /api/hosts/:id rejects duplicate IP');
    } catch (e) {
      fail('PUT duplicate IP', e.message);
    }

    try {
      await req('GET', `/api/hosts/${hostId}/history`, {
        token: visitorToken,
        expectStatus: 200
      });
      ok('GET /api/hosts/:id/history');
    } catch (e) {
      fail('host history', e.message);
    }

    try {
      await req('POST', '/api/favorites', {
        token: adminToken,
        body: { hostId },
        expectStatus: 201
      });
      const favs = await req('GET', '/api/favorites', { token: visitorToken, expectStatus: 200 });
      favoriteId = favs.data?.[0]?.id;
      ok('POST /api/favorites');
    } catch (e) {
      fail('favorites', e.message);
    }

    try {
      await req('POST', '/api/favorites/bulk', {
        token: adminToken,
        body: { hostIds: [hostId], action: 'add' },
        expectStatus: 200
      });
      ok('POST /api/favorites/bulk');
    } catch (e) {
      fail('favorites bulk', e.message);
    }
  }

  // --- Group ---
  try {
    const { data } = await req('POST', '/api/groups', {
      token: adminToken,
      body: { name: 'Smoke Group' },
      expectStatus: 201
    });
    groupId = data.id;
    ok('POST /api/groups');
  } catch (e) {
    fail('POST /api/groups', e.message);
  }

  // --- Export ---
  try {
    await req('GET', '/api/export', { expectStatus: 401 });
    ok('GET /api/export without token → 401');
    await req('GET', '/api/export', { token: visitorToken, expectStatus: 200 });
    ok('GET /api/export (authenticated)');
  } catch (e) {
    fail('export', e.message);
  }

  try {
    await req('GET', '/api/health', { expectStatus: 200 });
    ok('GET /api/health');
  } catch (e) {
    fail('health', e.message);
  }

  // --- Unauthorized ---
  try {
    await req('POST', '/api/networks', {
      body: { name: 'x', networkId: '1.2.3.4', subnet: 24 },
      expectStatus: 401
    });
    ok('POST /api/networks without token → 401');
  } catch (e) {
    fail('auth guard', e.message);
  }

  // --- Cleanup ---
  if (favoriteId) {
    try {
      await req('DELETE', `/api/favorites/${favoriteId}`, {
        token: adminToken,
        expectStatus: 200
      });
      ok('DELETE /api/favorites/:id');
    } catch (e) {
      fail('delete favorite', e.message);
    }
  }

  if (hostId && networkId) {
    try {
      await req('POST', `/api/networks/${networkId}/hosts/bulk-delete`, {
        token: adminToken,
        body: { ids: [hostId] },
        expectStatus: 200
      });
      ok('POST bulk-delete hosts');
    } catch (e) {
      fail('bulk-delete', e.message);
    }
  }

  if (tagId) {
    try {
      await req('DELETE', `/api/tags/${tagId}`, { token: adminToken, expectStatus: 200 });
      ok('DELETE /api/tags/:id');
    } catch (e) {
      fail('delete tag', e.message);
    }
  }

  if (groupId) {
    try {
      await req('DELETE', `/api/groups/${groupId}`, { token: adminToken, expectStatus: 200 });
      ok('DELETE /api/groups/:id');
    } catch (e) {
      fail('delete group', e.message);
    }
  }

  if (networkId) {
    try {
      await req('DELETE', `/api/networks/${networkId}`, {
        token: adminToken,
        expectStatus: 200
      });
      ok('DELETE /api/networks/:id');
    } catch (e) {
      fail('DELETE /api/networks/:id', e.message);
    }
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
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
