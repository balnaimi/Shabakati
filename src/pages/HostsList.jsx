import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiGet, apiDelete } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../hooks/useTranslation'

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
      
      // إعادة جلب الإحصائيات بعد الحذف
      await fetchStats()
      
      alert(t('messages.success.dataCleared'))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>{t('pages.hostsList.title')}</h1>
          <p>{t('pages.hostsList.subtitle')}</p>
        </div>
        <div className="controls">
          {isAdmin && (
            <>
              <button 
                onClick={() => navigate('/networks')} 
                className="btn-primary"
              >
                {t('pages.hostsList.manageNetworks')}
              </button>
              <button 
                onClick={() => navigate('/tags')} 
                className="btn-primary"
              >
                {t('pages.hostsList.manageTags')}
              </button>
              <button 
                onClick={handleClearAllData} 
                className="btn-danger"
              >
                {t('pages.hostsList.clearAllData')}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div>
        <h2>{t('pages.hostsList.networks')} ({stats.networksWithStats.length})</h2>
        
        {stats.networksWithStats.length === 0 ? (
          <div className="empty-state">
            {isAdmin ? (
              <>
                <p>{t('pages.hostsList.noNetworks')}</p>
                <button onClick={() => navigate('/networks')}>{t('pages.hostsList.manageNetworks')}</button>
              </>
            ) : (
              <p>{t('pages.hostsList.noNetworksVisitor')}</p>
            )}
          </div>
        ) : (
          <div className="tags-list">
            {stats.networksWithStats.map(network => (
              <div key={network.networkId} className="tag-item">
                <div>
                  <h3>{network.networkName}</h3>
                  <p>{network.networkCIDR}</p>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '15px', fontSize: '14px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('pages.hostsList.hosts')}: {network.totalHosts}</span>
                    <span style={{ color: 'var(--success)' }}>{t('pages.hostsList.online')}: {network.onlineHosts}</span>
                    <span style={{ color: 'var(--danger)' }}>{t('pages.hostsList.offline')}: {network.offlineHosts}</span>
                  </div>
                </div>
                <div className="tag-actions">
                  <button onClick={() => navigate(`/networks/${network.networkId}`)} className="btn-primary">{t('pages.hostsList.view')}</button>
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
