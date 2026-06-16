import { useState, useEffect } from 'react'
import { apiGet } from '../utils/api'
import { useTranslation } from '../hooks/useTranslation'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import IpAddress from '../components/IpAddress'
import HostHistoryModal from '../components/HostHistoryModal'
import { formatClientError } from '../utils/formatClientError'
import { ChartIcon, AlertIcon } from '../components/Icons'

function UptimeDashboard() {
  const { t } = useTranslation()
  const [hosts, setHosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [historyHost, setHistoryHost] = useState(null)

  useEffect(() => {
    apiGet('/uptime')
      .then(setHosts)
      .catch((err) => setError(formatClientError(err, t)))
      .finally(() => setLoading(false))
  }, [t])

  if (loading) return <LoadingSpinner fullPage />

  const avg = hosts.length
    ? hosts.reduce((s, h) => s + (h.uptimePercentage ?? 100), 0) / hosts.length
    : 100

  return (
    <div className="container">
      <div className="header">
        <h1>{t('pages.uptime.title')}</h1>
        <p>{t('pages.uptime.subtitle')}</p>
      </div>

      {error && (
        <div className="error-message"><AlertIcon size={18} /><span>{error}</span></div>
      )}

      <div className="stats" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
        <div className="stat-item">
          <p className="stat-label">{t('pages.uptime.avgUptime')}</p>
          <p className="stat-value">{avg.toFixed(1)}%</p>
        </div>
        <div className="stat-item">
          <p className="stat-label">{t('pages.uptime.trackedHosts')}</p>
          <p className="stat-value">{hosts.length}</p>
        </div>
      </div>

      {hosts.length === 0 ? (
        <EmptyState icon="device" title={t('pages.uptime.noHosts')} />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('common.ip')}</th>
                <th>{t('common.status')}</th>
                <th>{t('pages.uptime.uptime24h')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {hosts.map((host) => (
                <tr key={host.id}>
                  <td><strong>{host.name}</strong></td>
                  <td><IpAddress>{host.ip}</IpAddress></td>
                  <td>
                    <span className={`status-badge ${host.status === 'online' ? 'status-online' : 'status-offline'}`}>
                      {host.status === 'online' ? t('common.online') : t('common.offline')}
                    </span>
                  </td>
                  <td>
                    <div className="uptime-bar-cell">
                      <div className="uptime-bar-track">
                        <div
                          className="uptime-bar-fill"
                          style={{
                            width: `${Math.min(100, host.uptimePercentage ?? 100)}%`,
                            backgroundColor: (host.uptimePercentage ?? 100) >= 95
                              ? 'var(--success)'
                              : (host.uptimePercentage ?? 100) >= 80
                                ? 'var(--warning, #eab308)'
                                : 'var(--danger)'
                          }}
                        />
                      </div>
                      <span>{(host.uptimePercentage ?? 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td>
                    <button type="button" className="btn-secondary btn-small" onClick={() => setHistoryHost(host)}>
                      <ChartIcon size={14} />
                      <span>{t('history.view')}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historyHost && (
        <HostHistoryModal host={historyHost} onClose={() => setHistoryHost(null)} />
      )}
    </div>
  )
}

export default UptimeDashboard
