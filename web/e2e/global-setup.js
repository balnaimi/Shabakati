/**
 * Prepare auth + rich fake data for E2E.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.E2E_PORT || '3199'
const BASE = `http://127.0.0.1:${PORT}`

async function api(method, urlPath, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const r = await fetch(`${BASE}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  if (!r.ok) throw new Error(`${method} ${urlPath} → ${r.status}`)
  const text = await r.text()
  return text ? JSON.parse(text) : null
}

export default async function globalSetup() {
  const setup = await fetch(`${BASE}/api/auth/check-setup`).then((r) => r.json())
  if (setup.setupRequired) {
    await api('POST', '/api/auth/setup', {
      visitorPassword: 'vis1234',
      adminPassword: 'adm1234'
    })
  }

  const { token: visitorToken } = await api('POST', '/api/auth/login', { password: 'vis1234' })
  const { token: adminToken } = await api('POST', '/api/auth/admin-login', { password: 'adm1234' }, visitorToken)

  let nets = await api('GET', '/api/networks', undefined, visitorToken)
  if (!Array.isArray(nets) || nets.length === 0) {
    await api(
      'POST',
      '/api/networks',
      { name: 'E2E Network', networkId: '192.168.55.0', subnet: 24 },
      adminToken
    )
    nets = await api('GET', '/api/networks', undefined, visitorToken)
  }

  let tag = (await api('GET', '/api/tags', undefined, visitorToken)).find((t) => t.name === 'e2e-tag')
  if (!tag) {
    tag = await api('POST', '/api/tags', { name: 'e2e-tag', color: '#4a9eff' }, adminToken)
  }

  const hosts = await api('GET', '/api/hosts', undefined, visitorToken)
  const byIp = (ip) => hosts.find((h) => h.ip === ip)

  if (!byIp('192.168.55.10')) {
    await api(
      'POST',
      '/api/hosts',
      {
        name: 'Samsung',
        ip: '192.168.55.10',
        description: '',
        url: '',
        status: 'online',
        tagIds: [tag.id],
        vendor: 'Samsung',
        mac_address: '00:16:32:AA:BB:CC',
        device_category: 'mobile'
      },
      adminToken
    )
  }

  if (!byIp('192.168.55.20')) {
    await api(
      'POST',
      '/api/hosts',
      {
        name: 'Host 20',
        ip: '192.168.55.20',
        description: '',
        url: '',
        status: 'offline',
        tagIds: [],
        vendor: 'TP-Link',
        device_category: 'network'
      },
      adminToken
    )
  }

  const authDir = path.join(__dirname, '.auth')
  fs.mkdirSync(authDir, { recursive: true })
  fs.writeFileSync(path.join(authDir, 'visitor.json'), JSON.stringify({ visitorToken }, null, 2))
}
