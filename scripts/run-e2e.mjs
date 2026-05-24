#!/usr/bin/env node
/**
 * Run Playwright E2E against production server + fresh DB.
 * Usage: node scripts/run-e2e.mjs
 */
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = process.env.E2E_PORT || '3199'
const DB = process.env.E2E_DATABASE_PATH || '/tmp/shabakati-e2e.db'
const BASE = `http://127.0.0.1:${PORT}`

function waitForHealth(ms = 60_000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const r = await fetch(`${BASE}/api/health`)
        if (r.ok) return resolve()
      } catch {
        /* retry */
      }
      if (Date.now() - start > ms) return reject(new Error('Server health timeout'))
      setTimeout(tick, 500)
    }
    tick()
  })
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))))
  })
}

let server
try {
  await run('npm', ['run', 'build'], { cwd: root })
  try {
    await import('fs').then((fs) => fs.promises.unlink(DB))
  } catch {
    /* fresh */
  }

  server = spawn(
    'node',
    ['server.js'],
    {
      cwd: path.join(root, 'server'),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT,
        DATABASE_PATH: DB
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  )

  await waitForHealth()
  await run(
    'npx',
    ['playwright', 'test', '--config=playwright.config.js'],
    {
      cwd: path.join(root, 'web'),
      env: { ...process.env, E2E_PORT: PORT }
    }
  )
  console.log('\nE2E: all tests passed\n')
} finally {
  if (server) server.kill('SIGTERM')
}
