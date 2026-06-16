import logger from './logger.js'

const MIGRATIONS = [
  {
    version: 1,
    name: 'schema_migrations_table',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL
        )
      `)
    }
  },
  {
    version: 2,
    name: 'app_settings',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
    }
  }
]

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `)

  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version)
  )

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue
    try {
      migration.up(db)
      db.prepare(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
      ).run(migration.version, migration.name, new Date().toISOString())
      logger.info(`Migration ${migration.version} (${migration.name}) applied`)
    } catch (error) {
      logger.error(`Migration ${migration.version} failed: ${error.message}`)
      throw error
    }
  }
}
