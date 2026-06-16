import { useState, useEffect, useMemo } from 'react'
import { apiGet } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../hooks/useTranslation'
import LoadingSpinner from '../components/LoadingSpinner'
import { AlertIcon, CheckIcon, InfoIcon } from '../components/Icons'
import { formatClientError } from '../utils/formatClientError'
import { formatDateTime } from '../utils/dateFormat'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function StatusBadge({ ok, label }) {
  return (
    <span className={`status-badge ${ok ? 'status-online' : 'status-offline'}`}>
      {ok ? <CheckIcon size={14} /> : <AlertIcon size={14} />}
      <span>{label}</span>
    </span>
  )
}

function SystemHealth() {
  const { isAdmin } = useAuth()
  const { t, language } = useTranslation()
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAdmin) return
    apiGet('/system-health')
      .then(setHealth)
      .catch((err) => setError(formatClientError(err, t)))
      .finally(() => setLoading(false))
  }, [isAdmin, t])

  const netRawLabel = useMemo(() => {
    if (!health) return ''
    if (health.netRaw.available === true) return t('systemHealth.netRawYes')
    if (health.netRaw.available === false) return t('systemHealth.netRawNo')
    return t('systemHealth.netRawUnknown')
  }, [health, t])

  if (!isAdmin) {
    return (
      <div className="container">
        <p>{t('systemHealth.adminOnly')}</p>
      </div>
    )
  }

  if (loading) return <LoadingSpinner fullPage />

  return (
    <div className="container">
      <div className="header">
        <h1>{t('systemHealth.title')}</h1>
        <p>{t('systemHealth.subtitle')}</p>
      </div>

      {error && (
        <div className="error-message">
          <AlertIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {health && (
        <>
          <section className="card" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
            <h2 className="card-title">{t('systemHealth.overview')}</h2>
            <dl className="settings-meta">
              <div>
                <dt>{t('settings.serverVersion')}</dt>
                <dd>v{health.version}</dd>
              </div>
              <div>
                <dt>{t('systemHealth.environment')}</dt>
                <dd>{health.environment}</dd>
              </div>
              <div>
                <dt>{t('systemHealth.uptime')}</dt>
                <dd>{Math.floor(health.uptimeSeconds / 60)} {t('systemHealth.minutes')}</dd>
              </div>
            </dl>
          </section>

          <section className="card" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
            <h2 className="card-title">{t('systemHealth.checks')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                <strong>{t('systemHealth.database')}</strong>
                <StatusBadge ok={health.database.ok} label={formatBytes(health.database.sizeBytes)} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                <strong>{t('systemHealth.jwt')}</strong>
                <StatusBadge
                  ok={health.jwt.ok}
                  label={health.jwt.configured ? t('systemHealth.jwtOk') : t('systemHealth.jwtMissing')}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                <strong>{t('systemHealth.netRaw')}</strong>
                <StatusBadge ok={health.netRaw.available === true} label={netRawLabel} />
              </div>
              <p className="settings-hint">
                <InfoIcon size={16} />
                {health.netRaw.note}
              </p>
            </div>
          </section>

          <section className="card" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
            <h2 className="card-title">{t('systemHealth.data')}</h2>
            <div className="stats">
              <div className="stat-item">
                <p className="stat-label">{t('common.hosts')}</p>
                <p className="stat-value">{health.data.hosts}</p>
              </div>
              <div className="stat-item">
                <p className="stat-label">{t('common.networks')}</p>
                <p className="stat-value">{health.data.networks}</p>
              </div>
              <div className="stat-item">
                <p className="stat-label">{t('common.online')}</p>
                <p className="stat-value">{health.data.onlineHosts}</p>
              </div>
              <div className="stat-item">
                <p className="stat-label">{t('common.offline')}</p>
                <p className="stat-value">{health.data.offlineHosts}</p>
              </div>
            </div>
          </section>

          <section className="card" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
            <h2 className="card-title">{t('systemHealth.scans')}</h2>
            <p className="settings-hint" style={{ marginTop: 0 }}>
              {t('systemHealth.autoScanNetworks', { count: health.scans.autoScanNetworks })}
            </p>
            {health.scans.lastScans.length === 0 ? (
              <p>{t('systemHealth.noScans')}</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>{t('common.network')}</th>
                      <th>{t('pages.networksList.lastScanned')}</th>
                      <th>{t('pages.networkView.autoScan')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {health.scans.lastScans.map((row) => (
                      <tr key={row.networkId}>
                        <td>{row.networkName}</td>
                        <td>{row.lastScanned ? formatDateTime(row.lastScanned, language) : '—'}</td>
                        <td>{row.autoScanEnabled ? t('common.yes') : t('common.no')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">{t('systemHealth.integrations')}</h2>
            <ul>
              <li>{t('systemHealth.webhook')}: {health.integrations.webhookConfigured ? t('common.yes') : t('common.no')}</li>
              <li>{t('systemHealth.telegram')}: {health.integrations.telegramConfigured ? t('common.yes') : t('common.no')}</li>
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

export default SystemHealth
