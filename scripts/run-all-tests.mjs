#!/usr/bin/env node
/**
 * Full test suite: unit → API (smoke + scenarios) → E2E.
 * Uses isolated DB + ports so production data is untouched.
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.TEST_PORT || '3099';
const E2E_PORT = process.env.E2E_PORT || '3199';
const DB = process.env.TEST_DATABASE_PATH || '/tmp/shabakati-all-tests.db';
const E2E_DB = process.env.E2E_DATABASE_PATH || '/tmp/shabakati-e2e.db';
const BASE = `http://127.0.0.1:${PORT}`;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} → exit ${code}`))));
  });
}

function waitForHealth(base, ms = 60_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const r = await fetch(`${base}/api/health`);
        if (r.ok) return resolve();
      } catch {
        /* retry */
      }
      if (Date.now() - start > ms) return reject(new Error(`Health timeout: ${base}`));
      setTimeout(tick, 400);
    };
    tick();
  });
}

async function killPort(port) {
  try {
    const { execSync } = await import('node:child_process');
    execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
  } catch {
    /* optional */
  }
  await new Promise((r) => setTimeout(r, 800));
}

let apiServer = null;

function startServer(port, dbPath) {
  return spawn('node', ['server.js'], {
    cwd: path.join(root, 'server'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: port,
      DATABASE_PATH: dbPath,
      JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-not-for-production-use'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

try {
  console.log('\n═══════════════════════════════════════');
  console.log('  Shabakati — full test suite');
  console.log('═══════════════════════════════════════\n');

  console.log('▶ Unit tests…');
  await run('node', ['server/scripts/network-core-test.mjs'], { cwd: root });
  await run('node', ['server/scripts/host-intel-test.mjs'], { cwd: root });
  await run('node', ['server/scripts/uptime-test.mjs'], { cwd: root });
  console.log('  ✓ All unit tests passed\n');

  console.log('▶ Build frontend…');
  await run('npm', ['run', 'build'], { cwd: root });
  console.log('  ✓ Build OK\n');

  console.log('▶ Lint…');
  await run('npm', ['run', 'lint'], { cwd: root });
  console.log('  ✓ Lint OK\n');

  for (const p of [PORT, E2E_PORT]) await killPort(p);
  for (const db of [DB, E2E_DB]) {
    try {
      fs.unlinkSync(db);
    } catch {
      /* fresh */
    }
  }

  console.log(`▶ API tests (port ${PORT}, DB ${DB})…`);
  apiServer = startServer(PORT, DB);
  await waitForHealth(BASE);
  await run('node', ['server/scripts/smoke-test.mjs', BASE], { cwd: root });
  await run('node', ['server/scripts/scenario-test.mjs', BASE], { cwd: root });
  console.log('  ✓ API smoke + scenario tests passed\n');

  apiServer.kill('SIGTERM');
  apiServer = null;
  await killPort(PORT);

  console.log(`▶ E2E (port ${E2E_PORT}, DB ${E2E_DB})…`);
  await run('node', ['scripts/run-e2e.mjs'], {
    cwd: root,
    env: { ...process.env, E2E_PORT, E2E_DATABASE_PATH: E2E_DB }
  });

  console.log('\n═══════════════════════════════════════');
  console.log('  All tests passed — stable ✓');
  console.log('═══════════════════════════════════════\n');
} catch (err) {
  console.error('\n✗ Test suite failed:', err.message);
  process.exit(1);
} finally {
  if (apiServer) apiServer.kill('SIGTERM');
  await killPort(PORT);
  await killPort(E2E_PORT);
}
