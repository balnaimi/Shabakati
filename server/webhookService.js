import logger from './logger.js'
import { dbFunctions } from './database.js'

function getWebhookUrl() {
  const fromEnv = process.env.WEBHOOK_URL?.trim()
  if (fromEnv) return fromEnv
  return dbFunctions.getAppSetting('webhook_url') || null
}

export async function sendWebhook(event, payload) {
  const url = getWebhookUrl()
  if (!url) return

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        app: 'shabakati',
        ...payload
      }),
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) {
      logger.warn(`Webhook ${event} failed: HTTP ${res.status}`)
    }
  } catch (error) {
    logger.warn(`Webhook ${event} error: ${error.message}`)
  }
}
