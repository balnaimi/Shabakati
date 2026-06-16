import logger from './logger.js'
import { dbFunctions } from './database.js'

function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()
  if (token && chatId) {
    return { token, chatId, source: 'env' }
  }
  const dbToken = dbFunctions.getAppSetting('telegram_bot_token') || ''
  const dbChatId = dbFunctions.getAppSetting('telegram_chat_id') || ''
  if (dbToken && dbChatId) {
    return { token: dbToken, chatId: dbChatId, source: 'db' }
  }
  return null
}

export function getTelegramSettings() {
  const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const envChatId = process.env.TELEGRAM_CHAT_ID?.trim()
  if (envToken || envChatId) {
    return {
      botToken: envToken ? '••••••••' : '',
      chatId: envChatId || '',
      configured: Boolean(envToken && envChatId),
      source: 'env'
    }
  }
  const botToken = dbFunctions.getAppSetting('telegram_bot_token') || ''
  const chatId = dbFunctions.getAppSetting('telegram_chat_id') || ''
  return {
    botToken: botToken ? '••••••••' : '',
    chatId,
    configured: Boolean(botToken && chatId),
    source: 'db'
  }
}

export function saveTelegramSettings({ botToken, chatId }) {
  if (process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_CHAT_ID) {
    throw new Error('TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID set in environment')
  }
  const token = String(botToken || '').trim()
  const id = String(chatId || '').trim()
  if (token && !/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error('Invalid bot token format')
  }
  if (id && !/^-?\d+$/.test(id)) {
    throw new Error('Invalid chat id')
  }
  dbFunctions.setAppSetting('telegram_bot_token', token)
  dbFunctions.setAppSetting('telegram_chat_id', id)
  return { configured: Boolean(token && id) }
}

/** @param {string} text */
export async function sendTelegramMessage(text) {
  const cfg = getTelegramConfig()
  if (!cfg) return false

  try {
    const res = await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text,
        disable_web_page_preview: true
      }),
      signal: AbortSignal.timeout(12_000)
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn(`Telegram send failed: HTTP ${res.status} ${body.slice(0, 120)}`)
      return false
    }
    return true
  } catch (error) {
    logger.warn(`Telegram send error: ${error.message}`)
    return false
  }
}

/** @param {{ networkName: string, newDevicesCount: number, disconnectedCount: number }} payload */
export async function sendAutoScanTelegramAlert(payload) {
  const lines = [
    '🔔 Shabakati — auto-scan',
    `Network: ${payload.networkName}`,
    payload.newDevicesCount > 0 ? `✅ ${payload.newDevicesCount} new device(s)` : null,
    payload.disconnectedCount > 0 ? `❌ ${payload.disconnectedCount} disconnected` : null
  ].filter(Boolean)
  return sendTelegramMessage(lines.join('\n'))
}
