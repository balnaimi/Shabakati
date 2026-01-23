import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiDelete } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../hooks/useTranslation'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { 
  NetworkIcon, 
  SettingsIcon, 
  TagIcon, 
  DeleteIcon, 
  EyeIcon,
  OnlineIcon,
  OfflineIcon,
  DeviceIcon,
  AlertIcon
} from '../components/Icons'

function HostsList() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { t } = useTranslation()
  const [stats, setStats] = useState({
    totalNetworks: 0,
    totalHosts: 0,
    onlineHosts: 0,
    offlineHosts: 0,
    networksWithStats: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiGet('/stats')
      setStats(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClearAllData = async () => {
    if (!window.confirm(t('messages.confirm.clearAllData'))) {
      return
    }

    try {
      setError(null)
      await apiDelete('/data/all')
      
      await fetchStats()
      
      alert(t('messages.success.dataCleared'))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <LoadingSpinner fullPage />
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>{t('pages.hostsList.title')}</h1>
          <p>{t('pages.hostsList.subtitle')}</p>
        </div>
        {isAdmin && (
          <div className="controls">
            <button onClick={() => navigate('/networks')} className="btn-primary">
              <SettingsIcon size={18} />
              <span>{t('pages.hostsList.manageNetworks')}</span>
            </button>
            <button onClick={() => navigate('/tags')} className="btn-primary">
              <TagIcon size={18} />
              <span>{t('pages.hostsList.manageTags')}</span>
            </button>
            <button onClick={handleClearAllData} className="btn-danger">
              <DeleteIcon size={18} />
              <span>{t('pages.hostsList.clearAllData')}</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <AlertIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      <div>
        <h2 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--spacing-sm)',
          marginBlockEnd: 'var(--spacing-lg)',
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)'
        }}>
          <NetworkIcon size={24} />
          {t('pages.hostsList.networks')} ({stats.networksWithStats.length})
        </h2>
        
        {stats.networksWithStats.length === 0 ? (
          <EmptyState
            icon="network"
            title={isAdmin ? t('pages.hostsList.noNetworks') : t('pages.hostsList.noNetworksVisitor')}
            action={isAdmin ? () => navigate('/networks') : null}
            actionLabel={t('pages.hostsList.manageNetworks')}
          />
        ) : (
          <div className="tags-list">
            {stats.networksWithStats.map(network => (
              <div key={network.networkId} className="tag-item">
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    margin: 0, 
                    marginBlockEnd: 'var(--spacing-xs)',
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--text-primary)'
                  }}>
                    {network.networkName}
                  </h3>
                  <p style={{ 
                    margin: 0, 
                    color: 'var(--text-secondary)',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'monospace'
                  }}>
                    {network.networkCIDR}
                  </p>
                  <div style={{ 
                    marginBlockStart: 'var(--spacing-md)', 
                    display: 'flex', 
                    gap: 'var(--spacing-lg)', 
                    fontSize: 'var(--font-size-sm)', 
                    flexWrap: 'wrap' 
                  }}>
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 'var(--spacing-xs)',
                      color: 'var(--text-secondary)' 
                    }}>
                      <DeviceIcon size={16} />
                      {t('pages.hostsList.hosts')}: <strong>{network.totalHosts}</strong>
                    </span>
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 'var(--spacing-xs)',
                      color: 'var(--success)' 
                    }}>
                      <OnlineIcon size={16} />
                      {t('pages.hostsList.online')}: <strong>{network.onlineHosts}</strong>
                    </span>
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 'var(--spacing-xs)',
                      color: 'var(--danger)' 
                    }}>
                      <OfflineIcon size={16} />
                      {t('pages.hostsList.offline')}: <strong>{network.offlineHosts}</strong>
                    </span>
                  </div>
                </div>
                <div className="tag-actions">
                  <button onClick={() => navigate(`/networks/${network.networkId}`)} className="btn-primary">
                    <EyeIcon size={16} />
                    <span>{t('pages.hostsList.view')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HostsList
