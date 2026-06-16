import { readFileSync, statSync } from 'fs'
import { dbFunctions, DATABASE_FILE_PATH } from './database.js'
import pkg from '../package.json' with { type: 'json' }

function checkNetRawCapability() {
  try {
    const status = readFileSync('/proc/self/status', 'utf8')
    const match = status.match(/^CapEff:\s*([0-9a-f]+)/m)
    if (!match) return null
    const capEff = BigInt(`0x${match[1]}`)
    return (capEff & (1n << 13n)) !== 0n
  } catch {
    return null
  }
}

function getDbSizeBytes() {
  try {
    return statSync(DATABASE_FILE_PATH).size
  } catch {
    return 0
  }
}

export function getSystemHealth() {
  const jwtSecret = process.env.JWT_SECRET?.trim() || ''
  const isProd = process.env.NODE_ENV === 'production'
  const jwtConfigured = Boolean(jwtSecret && jwtSecret !== 'change-me-to-a-long-random-string')

  const hosts = dbFunctions.getAllHosts()
  const networks = dbFunctions.getAllNetworks()
  const tags = dbFunctions.getAllTags()
  const favorites = dbFunctions.getAllFavorites()

  const lastScans = networks
    .map((n) => ({
      networkId: n.id,
      networkName: n.name,
      lastScanned: n.last_scanned || null,
      autoScanEnabled: n.auto_scan_enabled === 1
    }))
    .sort((a, b) => {
      const ta = a.lastScanned ? new Date(a.lastScanned).getTime() : 0
      const tb = b.lastScanned ? new Date(b.lastScanned).getTime() : 0
      return tb - ta
    })

  const webhookUrl = process.env.WEBHOOK_URL?.trim() || dbFunctions.getAppSetting('webhook_url') || ''
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || dbFunctions.getAppSetting('telegram_bot_token') || ''
  const telegramChat = process.env.TELEGRAM_CHAT_ID?.trim() || dbFunctions.getAppSetting('telegram_chat_id') || ''

  return {
    version: pkg.version,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: {
      ok: true,
      path: DATABASE_FILE_PATH,
      sizeBytes: getDbSizeBytes()
    },
    jwt: {
      configured: jwtConfigured,
      requiredInProduction: isProd,
      ok: !isProd || jwtConfigured
    },
    netRaw: {
      available: checkNetRawCapability(),
      note: 'CAP_NET_RAW is required for ICMP ping scans in Docker'
    },
    data: {
      hosts: hosts.length,
      networks: networks.length,
      tags: tags.length,
      favorites: favorites.length,
      onlineHosts: hosts.filter((h) => h.status === 'online').length,
      offlineHosts: hosts.filter((h) => h.status === 'offline').length
    },
    scans: {
      lastScans,
      autoScanNetworks: networks.filter((n) => n.auto_scan_enabled === 1).length
    },
    integrations: {
      webhookConfigured: Boolean(webhookUrl),
      telegramConfigured: Boolean(telegramToken && telegramChat)
    }
  }
}
