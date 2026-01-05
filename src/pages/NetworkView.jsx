import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiGet, apiPost, apiDelete, apiPut } from '../utils/api'
import { calculateIPRange, getLastOctet } from '../utils/networkUtils'

function NetworkView() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [network, setNetwork] = useState(null)
  const [hosts, setHosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [ipRange, setIpRange] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState(null)
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [availableTags, setAvailableTags] = useState([])
  const [editingHostId, setEditingHostId] = useState(null)
  const [editFormData, setEditFormData] = useState({ tagIds: [] })
  const [activeTab, setActiveTab] = useState('devices') // 'devices' or 'ips'

  useEffect(() => {
    fetchNetwork()
    fetchHosts()
    fetchTags()
  }, [id])

  const fetchTags = async () => {
    try {
      const response = await fetch(`${API_URL}/tags`)
      if (response.ok) {
        const tags = await response.json()
        setAvailableTags(tags)
      }
    } catch (err) {
      console.error('Error fetching tags:', err)
    }
  }

  const fetchNetwork = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiGet(`/networks/${id}`)
      setNetwork(data)
      
      // حساب نطاق IP
      if (data) {
        const range = calculateIPRange(data.network_id, data.subnet)
        setIpRange(range)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchHosts = async () => {
    try {
      const data = await apiGet(`/networks/${id}/hosts`)
      setHosts(data)
    } catch (err) {
      console.error('Error fetching hosts:', err)
    }
  }

  const handleScan = async () => {
    try {
      setError(null)
      setScanning(true)
      
      console.log('Starting network scan for network ID:', id)
      const result = await apiPost(`/networks/${id}/scan`, {
        timeout: 2,
        addHosts: true // دائماً نضيف الأجهزة المكتشفة
      })
      
      console.log('Scan result:', result)
      
      // إضافة delay صغير للتأكد من اكتمال إضافة الأجهزة في قاعدة البيانات
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // تحديث الشبكة و الأجهزة
      await fetchNetwork()
      await fetchHosts()
      
      if (result.hosts && result.hosts.length > 0) {
        const addedCount = result.addedCount || result.hosts.length
        alert(`تم اكتشاف ${result.hosts.length} جهاز وتم إضافة ${addedCount} جهاز جديد`)
      } else {
        alert('لم يتم اكتشاف أي أجهزة')
      }
    } catch (err) {
      console.error('Scan error:', err)
      setError(err.message)
      alert(`خطأ في فحص الشبكة: ${err.message}`)
    } finally {
      setScanning(false)
    }
  }

  const handleClearNetworkHosts = async () => {
    if (!window.confirm('هل أنت متأكد من حذف جميع الأجهزة في هذه الشبكة؟')) {
      return
    }

    try {
      setError(null)
      const result = await apiDelete(`/networks/${id}/hosts`)
      
      // تحديث البيانات بعد الحذف
      await fetchHosts()
      await fetchNetwork()
      
      alert(result.message || 'تم حذف الأجهزة بنجاح')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteHost = async (hostId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الجهاز؟')) {
      return
    }

    try {
      setError(null)
      await apiDelete(`/hosts/${hostId}`)
      
      // تحديث قائمة الأجهزة بعد الحذف
      await fetchHosts()
      await fetchNetwork()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEditHost = (host) => {
    setEditingHostId(host.id)
    const tagIds = host.tags && Array.isArray(host.tags) 
      ? host.tags.map(tag => typeof tag === 'object' ? tag.id : tag)
      : []
    setEditFormData({ tagIds: tagIds })
  }

  const handleCancelEdit = () => {
    setEditingHostId(null)
    setEditFormData({ tagIds: [] })
  }

  const handleUpdateHost = async (e) => {
    e.preventDefault()
    if (!editingHostId) return

    try {
      setError(null)
      const host = hosts.find(h => h.id === editingHostId)
      if (!host) return

      await apiPut(`/hosts/${editingHostId}`, {
        name: host.name,
        ip: host.ip,
        description: host.description || '',
        url: host.url || '',
        status: host.status,
        tagIds: editFormData.tagIds
      })
      
      await fetchHosts()
      handleCancelEdit()
    } catch (err) {
      setError(err.message)
    }
  }

  const filteredHosts = useMemo(() => {
    let filtered = hosts.filter(host => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesName = host.name?.toLowerCase().includes(query)
        const matchesIP = host.ip?.toLowerCase().includes(query)
        if (!matchesName && !matchesIP) {
          return false
        }
      }
      
      // Status filter
      if (statusFilter !== 'all' && host.status !== statusFilter) {
        return false
      }
      
      // Tag filter
      if (tagFilter) {
        const hostTagIds = host.tags?.map(t => typeof t === 'object' ? t.id : t) || []
        if (!hostTagIds.includes(parseInt(tagFilter))) {
          return false
        }
      }
      
      return true
    })
    
    // Sorting
    const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' })
    return filtered.sort((a, b) => {
      let aValue, bValue
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          const nameComparison = collator.compare(aValue, bValue)
          return sortOrder === 'asc' ? nameComparison : -nameComparison
        case 'ip':
          const aParts = a.ip.split('.').map(Number)
          const bParts = b.ip.split('.').map(Number)
          for (let i = 0; i < 4; i++) {
            if (aParts[i] !== bParts[i]) {
              return sortOrder === 'asc' ? aParts[i] - bParts[i] : bParts[i] - aParts[i]
            }
          }
          return 0
        case 'status':
          aValue = a.status === 'online' ? 1 : 0
          bValue = b.status === 'online' ? 1 : 0
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
        case 'lastChecked':
          aValue = (a.lastChecked || a.last_checked) ? new Date(a.lastChecked || a.last_checked).getTime() : 0
          bValue = (b.lastChecked || b.last_checked) ? new Date(b.lastChecked || b.last_checked).getTime() : 0
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
        default:
          return 0
      }
    })
  }, [hosts, searchQuery, statusFilter, tagFilter, sortBy, sortOrder])

  const getIPStatus = (ip) => {
    const host = hosts.find(h => h.ip === ip)
    if (!host) return 'empty'
    return host.status === 'online' ? 'online' : 'offline'
  }

  if (loading) {
    return <div className="loading">جاري التحميل...</div>
  }

  if (!network) {
    return (
      <div className="container">
        <div className="empty-state">
          <h2>الشبكة غير موجودة</h2>
          <button onClick={() => navigate('/networks')}>العودة للشبكات</button>
        </div>
      </div>
    )
  }

  // حساب نطاق IP للعرض
  const range = ipRange || calculateIPRange(network.network_id, network.subnet)
  const displayRange = range.range.length > 0 ? range.range : []
  
  // إذا كان النطاق كبير جداً (/16 أو أكبر)، نعرض فقط أول 254
  const maxDisplay = network.subnet >= 24 ? displayRange.length : Math.min(254, displayRange.length)
  const displayIPs = displayRange.slice(0, maxDisplay)

  return (
    <div className="container">
      <div className="header">
        <h1>{network.name}</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/')}>العودة للعرض</button>
          <button onClick={() => navigate('/networks')}>العودة للشبكات</button>
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
        <p><strong>Network ID:</strong> {network.network_id}</p>
        <p><strong>Subnet:</strong> /{network.subnet}</p>
        <p><strong>النطاق:</strong> {range.start} - {range.end} ({range.count} عنوان)</p>
        {network.last_scanned && (
          <p><strong>آخر فحص:</strong> {new Date(network.last_scanned).toLocaleString('ar-SA')}</p>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="controls">
        <button onClick={handleScan} disabled={scanning}>
          {scanning ? 'جاري الفحص...' : 'فحص الشبكة'}
        </button>
        <button onClick={handleClearNetworkHosts} style={{ backgroundColor: '#dc3545', color: 'white' }}>
          حذف أجهزة الشبكة
        </button>
      </div>

      {/* Tabs Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginTop: '20px', 
        marginBottom: '20px',
        borderBottom: '2px solid #ddd'
      }}>
        <button
          onClick={() => setActiveTab('devices')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'devices' ? '#4a9eff' : 'transparent',
            color: activeTab === 'devices' ? 'white' : '#333',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            fontWeight: activeTab === 'devices' ? 'bold' : 'normal',
            transition: 'all 0.2s'
          }}
        >
          الأجهزة
        </button>
        <button
          onClick={() => setActiveTab('ips')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'ips' ? '#4a9eff' : 'transparent',
            color: activeTab === 'ips' ? 'white' : '#333',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            fontWeight: activeTab === 'ips' ? 'bold' : 'normal',
            transition: 'all 0.2s'
          }}
        >
          عرض IP
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'devices' && (
        <>
          {hosts.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2>الأجهزة في هذه الشبكة ({filteredHosts.length} من {hosts.length})</h2>
          
          <div className="filters" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="بحث (اسم، IP)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px', flex: '1', minWidth: '200px' }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px' }}
            >
              <option value="all">جميع الحالات</option>
              <option value="online">متصل</option>
              <option value="offline">غير متصل</option>
            </select>
            <select
              value={tagFilter || 'all'}
              onChange={(e) => setTagFilter(e.target.value === 'all' ? null : e.target.value)}
              style={{ padding: '8px' }}
            >
              <option value="all">جميع الوسوم</option>
              {availableTags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th 
                    onClick={() => {
                      if (sortBy === 'name') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('name')
                        setSortOrder('asc')
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    الاسم {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => {
                      if (sortBy === 'ip') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('ip')
                        setSortOrder('asc')
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    IP {sortBy === 'ip' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => {
                      if (sortBy === 'status') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('status')
                        setSortOrder('asc')
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    الحالة {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>الوصف</th>
                  <th>الوسوم</th>
                  <th 
                    onClick={() => {
                      if (sortBy === 'lastChecked') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('lastChecked')
                        setSortOrder('asc')
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    آخر فحص {sortBy === 'lastChecked' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredHosts.map(host => (
                  <tr key={host.id}>
                    <td><strong>{host.name}</strong></td>
                    <td>{host.ip}</td>
                    <td>
                      <span style={{ 
                        color: host.status === 'online' ? '#28a745' : '#dc3545',
                        fontWeight: 'bold'
                      }}>
                        {host.status === 'online' ? 'متصل' : 'غير متصل'}
                      </span>
                    </td>
                    <td>
                      {host.description ? (
                        <span title={host.description}>
                          {host.description.length > 50 ? `${host.description.substring(0, 50)}...` : host.description}
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td>
                      {host.tags && Array.isArray(host.tags) && host.tags.length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {host.tags.map(tag => (
                            <span 
                              key={typeof tag === 'object' ? tag.id : tag}
                              style={{
                                padding: '2px 6px',
                                backgroundColor: typeof tag === 'object' ? (tag.color || '#4a9eff') : '#4a9eff',
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}
                            >
                              {typeof tag === 'object' ? tag.name : tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td>
                      {host.lastChecked || host.last_checked ? (
                        new Date(host.lastChecked || host.last_checked).toLocaleString('ar-SA')
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleEditHost(host)} 
                          style={{ padding: '5px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          تعديل
                        </button>
                        <button 
                          onClick={() => handleDeleteHost(host.id)} 
                          style={{ backgroundColor: '#dc3545', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          )}

          {hosts.length === 0 && (
            <div className="empty-state" style={{ marginTop: '40px' }}>
              <p>لا توجد أجهزة مضافة في هذه الشبكة بعد.</p>
              <p>قم بفحص الشبكة لإضافة الأجهزة المكتشفة.</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'ips' && (
        <>
          {network.subnet < 24 ? (
            <div className="empty-state">
              <p>النطاق كبير جداً للعرض ({range.count} عنوان). الرجاء استخدام subnet /24 أو أكبر للعرض البصري.</p>
              <p>الأجهزة المكتشفة: {hosts.length}</p>
            </div>
          ) : (
            <>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', 
                gap: '5px',
                marginTop: '20px'
              }}>
                {displayIPs.map((ip, index) => {
                  const status = getIPStatus(ip)
                  const lastOctet = getLastOctet(ip)
                  const host = hosts.find(h => h.ip === ip)
                  
                  let bgColor = '#ffffff'
                  let borderColor = '#ddd'
                  let color = '#333'
                  
                  if (status === 'online') {
                    bgColor = '#d4edda'
                    borderColor = '#28a745'
                    color = '#155724'
                  } else if (status === 'offline') {
                    bgColor = '#f8d7da'
                    borderColor = '#dc3545'
                    color = '#721c24'
                  }
                  
                  return (
                    <div
                      key={ip}
                      title={host ? `${host.name} (${ip}) - ${host.status === 'online' ? 'متصل' : 'غير متصل'}` : `${ip} - فاضي`}
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: bgColor,
                        border: `2px solid ${borderColor}`,
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: color,
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        if (host) {
                          alert(`الجهاز: ${host.name}\nIP: ${ip}\nالحالة: ${host.status === 'online' ? 'متصل' : 'غير متصل'}`)
                        } else {
                          alert(`IP فاضي: ${ip}`)
                        }
                      }}
                    >
                      {lastOctet}
                    </div>
                  )
                })}
              </div>
              
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <p><strong>الإحصائيات:</strong></p>
                <p>الأجهزة المتصلة: {hosts.filter(h => h.status === 'online').length}</p>
                <p>الأجهزة غير المتصلة: {hosts.filter(h => h.status === 'offline').length}</p>
                <p>إجمالي الأجهزة: {hosts.length}</p>
                <p>IPs الفاضية: {displayIPs.length - hosts.length}</p>
              </div>
            </>
          )}
        </>
      )}

      {editingHostId && (
        <div 
          className="modal-overlay" 
          onClick={handleCancelEdit}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>تعديل وسوم الجهاز</h2>
              <button onClick={handleCancelEdit}>إغلاق</button>
            </div>
            
            {hosts.find(h => h.id === editingHostId) && (
              <div style={{ marginBottom: '20px' }}>
                <p><strong>الاسم:</strong> {hosts.find(h => h.id === editingHostId).name}</p>
                <p><strong>IP:</strong> {hosts.find(h => h.id === editingHostId).ip}</p>
              </div>
            )}
            
            <form onSubmit={handleUpdateHost}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>الوسوم:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {availableTags.map(tag => (
                    <label key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={editFormData.tagIds.includes(tag.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditFormData({ ...editFormData, tagIds: [...editFormData.tagIds, tag.id] })
                          } else {
                            setEditFormData({ ...editFormData, tagIds: editFormData.tagIds.filter(id => id !== tag.id) })
                          }
                        }}
                      />
                      <span>{tag.name}</span>
                    </label>
                  ))}
                  {availableTags.length === 0 && (
                    <p style={{ color: '#666' }}>لا توجد وسوم متاحة. اذهب إلى إدارة الوسوم لإضافة وسوم جديدة.</p>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={handleCancelEdit}>
                  إلغاء
                </button>
                <button type="submit">
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default NetworkView

