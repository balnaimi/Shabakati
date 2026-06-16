import { mkdirSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { dbFunctions } from './database.js'
import logger from './logger.js'

function backupDir() {
  if (process.env.BACKUP_DIR) return process.env.BACKUP_DIR
  if (process.env.DATABASE_PATH) {
    return join(dirname(process.env.DATABASE_PATH), 'backups')
  }
  return join(process.cwd(), 'data', 'backups')
}

function retentionCount() {
  const n = parseInt(process.env.BACKUP_RETENTION_COUNT || '7', 10)
  return Number.isFinite(n) && n > 0 ? n : 7
}

export function collectBackupPayload() {
  return {
    format: 'shabakati-backup',
    version: 2,
    exportedAt: new Date().toISOString(),
    hosts: dbFunctions.getAllHosts(),
    tags: dbFunctions.getAllTags(),
    networks: dbFunctions.getAllNetworks(),
    groups: dbFunctions.getAllGroups(),
    favorites: dbFunctions.getAllFavorites()
  }
}

function pruneOldBackups(dir, keep) {
  try {
    const files = readdirSync(dir)
      .filter((f) => f.startsWith('shabakati-backup-') && f.endsWith('.json'))
      .map((f) => ({ f, mtime: statSync(join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
    for (const old of files.slice(keep)) {
      unlinkSync(join(dir, old.f))
    }
  } catch (error) {
    logger.warn(`Backup retention cleanup failed: ${error.message}`)
  }
}

export function runBackup() {
  const dir = backupDir()
  mkdirSync(dir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `shabakati-backup-${ts}.json`
  const filePath = join(dir, filename)
  writeFileSync(filePath, JSON.stringify(collectBackupPayload(), null, 2), 'utf8')
  pruneOldBackups(dir, retentionCount())
  logger.info(`Scheduled backup written: ${filePath}`)
  return { filename, path: filePath, exportedAt: new Date().toISOString() }
}

export function listBackups() {
  const dir = backupDir()
  try {
    mkdirSync(dir, { recursive: true })
    return readdirSync(dir)
      .filter((f) => f.startsWith('shabakati-backup-') && f.endsWith('.json'))
      .map((f) => {
        const full = join(dir, f)
        const st = statSync(full)
        return { filename: f, size: st.size, createdAt: st.mtime.toISOString() }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch {
    return []
  }
}

let timer = null

export function startBackupScheduler() {
  const hours = parseFloat(process.env.BACKUP_INTERVAL_HOURS ?? '24', 10)
  if (!Number.isFinite(hours) || hours <= 0) {
    logger.info('Scheduled backups disabled (BACKUP_INTERVAL_HOURS <= 0)')
    return
  }
  const ms = hours * 60 * 60 * 1000
  const tick = () => {
    try {
      runBackup()
    } catch (error) {
      logger.error(`Scheduled backup failed: ${error.message}`)
    }
  }
  timer = setInterval(tick, ms)
  if (timer.unref) timer.unref()
  logger.info(`Scheduled backups every ${hours}h → ${backupDir()} (keep ${retentionCount()})`)
  setTimeout(tick, 60_000)
}

export function stopBackupScheduler() {
  if (timer) clearInterval(timer)
  timer = null
}
