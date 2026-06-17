import { useState, useEffect, useMemo } from 'react'
import { apiGet } from '../utils/api'
import { useTranslation } from '../hooks/useTranslation'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import IpAddress from '../components/IpAddress'
import HostHistoryModal from '../components/HostHistoryModal'
import DeviceSummaryCell from '../components/DeviceSummaryCell'
import { getHostDisplayName } from '../utils/hostDisplay'
import { formatClientError } from '../utils/formatClientError'
import { ChartIcon, AlertIcon } from '../components/Icons'

function UptimeDashboard() {
  const { t, language } = useTranslation()
  const [hosts, setHosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [historyHost, setHistoryHost] = useState(null)
  const [networkFilter, setNetworkFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [offlineOnly, setOfflineOnly] = useState(false)
  const [sortBy, setSortBy] = useState('worst')

  useEffect(() => {
    apiGet('/uptime')
      .then(setHosts)
      .catch((err) => setError(formatClientError(err, t)))
      .finally(() => setLoading(false))
  }, [t])

  const networks = useMemo(() => {
    const map = new Map()
    for (const h of hosts) {
      if (h.networkId != null) {
        map.set(h.networkId, h.networkName || `#${h.networkId}`)
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [hosts])

  const tags = useMemo(() => {
    const map = new Map()
    for (const h of hosts) {
      for (const tag of h.tags || []) {
        map.set(String(tag.id), tag.name)
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [hosts])

  const filtered = useMemo(() => {
    let list = [...hosts]
    if (networkFilter !== 'all') {
      list = list.filter((h) => String(h.networkId) === networkFilter)
    }
    if (tagFilter !== 'all') {
      list = list.filter((h) => (h.tags || []).some((tag) => String(tag.id) === tagFilter))
    }
    if (offlineOnly) {
      list = list.filter((h) => h.status === 'offline')
    }
    if (sortBy === 'worst') {
      list.sort((a, b) => (a.uptimePercentage ?? 100) - (b.uptimePercentage ?? 100))
    } else if (sortBy === 'best') {
      list.sort((a, b) => (b.uptimePercentage ?? 100) - (a.uptimePercentage ?? 100))
    } else if (sortBy === 'name') {
      list.sort((a, b) => getHostDisplayName(a).localeCompare(getHostDisplayName(b)))
    }
    return list
  }, [hosts, networkFilter, tagFilter, offlineOnly, sortBy])

  if (loading) return <LoadingSpinner fullPage />

  const avg = filtered.length
    ? filtered.reduce((s, h) => s + (h.uptimePercentage ?? 100), 0) / filtered.length
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

      <div className="filter-bar">
        <div className="filters filters-compact uptime-filters">
          <select className="filter-select" value={networkFilter} onChange={(e) => setNetworkFilter(e.target.value)} aria-label={t('pages.uptime.allNetworks')}>
            <option value="all">{t('pages.uptime.allNetworks')}</option>
            {networks.map(([id, name]) => (
              <option key={id} value={String(id)}>{name}</option>
            ))}
          </select>
          <select className="filter-select" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} aria-label={t('pages.uptime.allTags')}>
            <option value="all">{t('pages.uptime.allTags')}</option>
            {tags.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label={t('pages.uptime.sortWorst')}>
            <option value="worst">{t('pages.uptime.sortWorst')}</option>
            <option value="best">{t('pages.uptime.sortBest')}</option>
            <option value="name">{t('pages.uptime.sortName')}</option>
          </select>
          <label className="filter-check">
            <input type="checkbox" checked={offlineOnly} onChange={(e) => setOfflineOnly(e.target.checked)} />
            <span>{t('pages.uptime.offlineOnly')}</span>
          </label>
        </div>
        <div className="filter-bar-aside" aria-label={t('pages.uptime.title')}>
          <span className="toolbar-stat-chip">
            {t('pages.uptime.avgUptime')}: <strong>{avg.toFixed(1)}%</strong>
          </span>
          <span className="toolbar-stat-chip">
            {t('pages.uptime.trackedHosts')}: <strong>{filtered.length}</strong>
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="device" title={t('pages.uptime.noHosts')} />
      ) : (
        <div className="table-container">
          <table className="table-compact">
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('common.ip')}</th>
                <th className="col-hide-md">{t('common.network')}</th>
                <th>{t('common.status')}</th>
                <th>{t('pages.uptime.uptime24h')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((host) => (
                <tr key={host.id}>
                  <td>
                    <DeviceSummaryCell host={host} language={language} t={t} showDiscovery={false} showDescription={false} />
                  </td>
                  <td><IpAddress>{host.ip}</IpAddress></td>
                  <td className="col-hide-md">{host.networkName || '—'}</td>
                  <td>
                    <span className={`status-badge status-badge-compact ${host.status === 'online' ? 'status-online' : 'status-offline'}`}>
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
                      <span style={{ fontSize: 'var(--font-size-xs)' }}>{(host.uptimePercentage ?? 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td>
                    <button type="button" className="btn-secondary btn-icon-small" onClick={() => setHistoryHost(host)} title={t('history.view')}>
                      <ChartIcon size={14} />
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
