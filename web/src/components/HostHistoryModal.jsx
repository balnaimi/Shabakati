import { useState, useEffect } from 'react'
import Modal from './Modal'
import { apiGet } from '../utils/api'
import { useTranslation } from '../hooks/useTranslation'
import LoadingSpinner from './LoadingSpinner'
import IpAddress from './IpAddress'
import { formatClientError } from '../utils/formatClientError'
import { formatDateTime } from '../utils/dateFormat'
import HostTags from './HostTags'

function HostHistoryModal({ host, onClose }) {
  const { t, language } = useTranslation()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!host?.id) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const data = await apiGet(`/hosts/${host.id}/history?limit=50`)
        if (!cancelled) setHistory(data)
      } catch (err) {
        if (!cancelled) setError(formatClientError(err, t))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [host?.id, t])

  if (!host) return null

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('history.title', { name: host.name })}
    >
      <div style={{ margin: '0 0 var(--spacing-md)', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        <IpAddress>{host.ip}</IpAddress>
        {host.uptimePercentage != null && (
          <span>
            {t('history.uptime24h')}: <strong>{host.uptimePercentage.toFixed(1)}%</strong>
          </span>
        )}
        <HostTags tags={host.tags} compact />
      </div>
      {loading && <LoadingSpinner />}
      {error && <div className="error-message"><span>{error}</span></div>}
      {!loading && !error && history.length === 0 && (
        <p style={{ color: 'var(--text-tertiary)' }}>{t('history.empty')}</p>
      )}
      {!loading && history.length > 0 && (
        <div className="table-container" style={{ maxHeight: '50vh', overflow: 'auto' }}>
          <table className="table-compact">
            <thead>
              <tr>
                <th>{t('common.status')}</th>
                <th>{t('history.checkedAt')}</th>
                <th>{t('history.latency')}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className={`status-badge ${row.status === 'online' ? 'status-online' : 'status-offline'}`}>
                      {row.status === 'online' ? t('common.online') : t('common.offline')}
                    </span>
                  </td>
                  <td>{formatDateTime(row.checked_at, language)}</td>
                  <td>{row.ping_latency != null ? `${row.ping_latency} ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

export default HostHistoryModal
