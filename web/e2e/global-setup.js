/**
 * Prepare auth + sample network for E2E.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.E2E_PORT || '3199'
const BASE = `http://127.0.0.1:${PORT}`

async function postJson(url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`${url} failed: ${r.status}`)
  return r.json()
}

export default async function globalSetup() {
  const setupRes = await fetch(`${BASE}/api/auth/check-setup`)
  const setup = await setupRes.json()
  if (setup.setupRequired) {
    await postJson(`${BASE}/api/auth/setup`, {
      visitorPassword: 'vis1234',
      adminPassword: 'adm1234'
    })
  }

  const { token: visitorToken } = await postJson(`${BASE}/api/auth/login`, {
    password: 'vis1234'
  })

  const { token: adminToken } = await postJson(
    `${BASE}/api/auth/admin-login`,
    { password: 'adm1234' },
    visitorToken
  )

  await postJson(
    `${BASE}/api/networks`,
    {
      name: 'E2E Network',
      networkId: '192.168.55.0',
      subnet: 24
    },
    adminToken
  ).catch(async () => {
    const nets = await fetch(`${BASE}/api/networks`, {
      headers: { Authorization: `Bearer ${visitorToken}` }
    }).then((r) => r.json())
    if (!Array.isArray(nets) || nets.length === 0) throw new Error('Failed to seed E2E network')
  })

  const authDir = path.join(__dirname, '.auth')
  fs.mkdirSync(authDir, { recursive: true })
  fs.writeFileSync(
    path.join(authDir, 'visitor.json'),
    JSON.stringify({ visitorToken }, null, 2)
  )
}
