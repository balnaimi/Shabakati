import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiGet, apiDelete } from '../utils/api'

function HostsList() {
  const navigate = useNavigate()
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
    const confirmMessage = 'تحذير: سيتم حذف جميع الأجهزة والشبكات والوسوم.\n\nهل أنت متأكد تماماً من حذف جميع البيانات؟'
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      setError(null)
      await apiDelete('/data/all')
      
      // إعادة جلب الإحصائيات بعد الحذف
      await fetchStats()
      
      alert('تم حذف جميع البيانات بنجاح')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="loading">جاري التحميل...</div>
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>لوحة تحكم الشبكة</h1>
          <p>نظرة عامة على الشبكات والأجهزة</p>
        </div>
        <div className="controls">
          <button onClick={() => navigate('/networks')}>إدارة الشبكات</button>
          <button onClick={() => navigate('/tags')}>إدارة الوسوم</button>
          <button 
            onClick={handleClearAllData} 
            style={{ backgroundColor: '#dc3545', color: 'white' }}
          >
            حذف جميع البيانات
          </button>
        </div>
        
        <div className="stats">
          <div className="stat-item">
            <p>عدد الشبكات</p>
            <p>{stats.totalNetworks}</p>
          </div>
          <div className="stat-item">
            <p>إجمالي الأجهزة</p>
            <p>{stats.totalHosts}</p>
          </div>
          <div className="stat-item">
            <p>متصلة</p>
            <p>{stats.onlineHosts}</p>
          </div>
          <div className="stat-item">
            <p>غير متصلة</p>
            <p>{stats.offlineHosts}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div>
        <h2>الشبكات ({stats.networksWithStats.length})</h2>
        
        {stats.networksWithStats.length === 0 ? (
          <div className="empty-state">
            <p>لا توجد شبكات. اذهب إلى إدارة الشبكات لإضافة شبكة جديدة.</p>
            <button onClick={() => navigate('/networks')}>إدارة الشبكات</button>
          </div>
        ) : (
          <div className="tags-list">
            {stats.networksWithStats.map(network => (
              <div key={network.networkId} className="tag-item">
                <div>
                  <h3>{network.networkName}</h3>
                  <p>{network.networkCIDR}</p>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '15px', fontSize: '14px' }}>
                    <span>الأجهزة: {network.totalHosts}</span>
                    <span style={{ color: '#28a745' }}>متصل: {network.onlineHosts}</span>
                    <span style={{ color: '#dc3545' }}>غير متصل: {network.offlineHosts}</span>
                  </div>
                </div>
                <div className="tag-actions">
                  <button onClick={() => navigate(`/networks/${network.networkId}`)}>عرض</button>
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
