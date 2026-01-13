import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiGet, apiPost, apiDelete, apiPut } from '../utils/api'
import { calculateIPRange, getLastOctet } from '../utils/networkUtils'
import { useAuth } from '../contexts/AuthContext'
import { useTags } from '../hooks/useTags'

function NetworkView() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { isAuthenticated } = useAuth()
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
  const { tags: availableTags } = useTags()
  const [editingHostId, setEditingHostId] = useState(null)
  const [editFormData, setEditFormData] = useState({ tagIds: [] })
  const [activeTab, setActiveTab] = useState('devices') // 'devices' or 'ips'
  const [favorites, setFavorites] = useState([])
  const [newHosts, setNewHosts] = useState([]) // الأجهزة الجديدة المكتشفة من آخر فحص
  const [hiddenNewHosts, setHiddenNewHosts] = useState(new Set()) // الأجهزة المخفية

  useEffect(() => {
    fetchNetwork()
    fetchHosts()
    fetchFavorites()
  }, [id])

  const fetchFavorites = async () => {
    try {
      const data = await apiGet('/favorites')
      setFavorites(data)
    } catch (err) {
      console.error('Error fetching favorites:', err)
    }
  }

  const isHostFavorite = (hostId) => {
    return favorites.some(fav => fav.hostId === hostId)
  }

  const handleAddToFavorites = async (hostId) => {
    try {
      await apiPost('/favorites', { hostId: parseInt(hostId) })
      await fetchFavorites()
      alert('تم إضافة الجهاز للمفضلة بنجاح')
    } catch (err) {
      alert(`خطأ: ${err.message}`)
    }
  }

  const handleRemoveFromFavorites = async (hostId) => {
    try {
      const favorite = favorites.find(fav => fav.hostId === hostId)
      if (favorite) {
        await apiDelete(`/favorites/${favorite.id}`)
        await fetchFavorites()
        alert('تم حذف الجهاز من المفضلة')
      }
    } catch (err) {
      alert(`خطأ: ${err.message}`)
    }
  }

  const handleHideNewHost = (hostId) => {
    setHiddenNewHosts(prev => new Set([...prev, hostId]))
  }

  const handleHideAllNewHosts = () => {
    const allNewHostIds = newHosts.map(h => h.id)
    setHiddenNewHosts(new Set(allNewHostIds))
  }

  // تصفية الأجهزة الجديدة لإظهار فقط غير المخفية
  const visibleNewHosts = newHosts.filter(host => !hiddenNewHosts.has(host.id))


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
      
      // حفظ الأجهزة الحالية قبل الفحص لتحديد الجديدة
      const hostsBeforeScan = [...hosts]
      const existingIPs = new Set(hostsBeforeScan.map(h => h.ip))
      
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
      const updatedHosts = await apiGet(`/networks/${id}/hosts`)
      setHosts(updatedHosts)
      
      // تحديد الأجهزة الجديدة
      if (result.addedCount > 0) {
        // تحديد الأجهزة الجديدة (التي لم تكن موجودة قبل الفحص)
        const newHostsList = updatedHosts.filter(host => !existingIPs.has(host.ip))
        
        if (newHostsList.length > 0) {
          setNewHosts(newHostsList)
          // إعادة تعيين الأجهزة المخفية عند فحص جديد
          setHiddenNewHosts(new Set())
        }
      }
      
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

  // دالة لتجميع IPs حسب الـ octet الثالث
  const groupIPsByThirdOctet = (networkId, subnet, allIPs) => {
    const networkParts = networkId.split('.').map(Number)
    const networkNum = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3]
    const hostBits = 32 - subnet
    const mask = 0xFFFFFFFF << hostBits
    const networkBase = networkNum & mask
    const broadcastIP = networkBase + Math.pow(2, hostBits) - 1
    
    // حساب network address و broadcast address
    const networkIP = `${(networkBase >>> 24) & 0xFF}.${(networkBase >>> 16) & 0xFF}.${(networkBase >>> 8) & 0xFF}.${networkBase & 0xFF}`
    const broadcastIPStr = `${(broadcastIP >>> 24) & 0xFF}.${(broadcastIP >>> 16) & 0xFF}.${(broadcastIP >>> 8) & 0xFF}.${broadcastIP & 0xFF}`
    
    const networkParts2 = networkIP.split('.').map(Number)
    const broadcastParts = broadcastIPStr.split('.').map(Number)
    
    const startThirdOctet = networkParts2[2]
    const endThirdOctet = broadcastParts[2]
    
    const groups = {}
    
    // إنشاء جميع العناوين في النطاق
    for (let thirdOctet = startThirdOctet; thirdOctet <= endThirdOctet; thirdOctet++) {
      const groupIPs = []
      
      // تحديد نطاق الـ octet الرابع
      let startFourth = 0
      let endFourth = 255
      
      if (thirdOctet === startThirdOctet) {
        // القائمة الأولى: تبدأ من .1 (لأن .0 هو network address)
        startFourth = 1
      }
      
      if (thirdOctet === endThirdOctet) {
        // القائمة الأخيرة: تنتهي عند .254 (لأن .255 هو broadcast)
        endFourth = broadcastParts[3] - 1
      }
      
      // إنشاء العناوين في هذه المجموعة
      for (let fourthOctet = startFourth; fourthOctet <= endFourth; fourthOctet++) {
        const ip = `${networkParts2[0]}.${networkParts2[1]}.${thirdOctet}.${fourthOctet}`
        groupIPs.push(ip)
      }
      
      if (groupIPs.length > 0) {
        groups[thirdOctet] = groupIPs
      }
    }
    
    return groups
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

  return (
    <div className="container">
      <div className="header">
        <h1>{network.name}</h1>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
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
        {isAuthenticated && (
          <>
            <button onClick={handleScan} disabled={scanning}>
              {scanning ? 'جاري الفحص...' : 'فحص الشبكة'}
            </button>
            <button onClick={handleClearNetworkHosts} className="btn-danger">
              حذف أجهزة الشبكة
            </button>
          </>
        )}
      </div>

      {/* Tabs Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginTop: '20px', 
        marginBottom: '20px',
        borderBottom: `2px solid var(--border-color)`
      }}>
        <button
          onClick={() => setActiveTab('devices')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'devices' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'devices' ? 'white' : 'var(--text-primary)',
            cursor: 'pointer',
            borderTopLeftRadius: 'var(--radius-md)',
            borderTopRightRadius: 'var(--radius-md)',
            fontWeight: activeTab === 'devices' ? 'bold' : 'normal',
            transition: 'var(--transition)'
          }}
        >
          الأجهزة
        </button>
        <button
          onClick={() => setActiveTab('ips')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'ips' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'ips' ? 'white' : 'var(--text-primary)',
            cursor: 'pointer',
            borderTopLeftRadius: 'var(--radius-md)',
            borderTopRightRadius: 'var(--radius-md)',
            fontWeight: activeTab === 'ips' ? 'bold' : 'normal',
            transition: 'var(--transition)'
          }}
        >
          عرض IP
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'devices' && (
        <>
          {/* قسم الأجهزة الجديدة المكتشفة */}
          {visibleNewHosts.length > 0 && (
            <div style={{ 
              marginTop: '20px', 
              marginBottom: '30px',
              padding: '20px',
              backgroundColor: 'var(--success-light)',
              border: '2px solid var(--success)',
              borderRadius: 'var(--radius-md)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <h2 style={{ 
                  margin: 0, 
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  الأجهزة الجديدة المكتشفة ({visibleNewHosts.length})
                </h2>
                <button
                  onClick={handleHideAllNewHosts}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--success)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  تمت المشاهدة (إخفاء الكل)
                </button>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '15px' 
              }}>
                {visibleNewHosts.map(host => (
                  <div
                    key={host.id}
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      padding: '15px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'start',
                      marginBottom: '10px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ 
                          margin: 0, 
                          marginBottom: '5px', 
                          color: 'var(--text-primary)',
                          fontSize: '16px'
                        }}>
                          {host.name}
                        </h3>
                        <p style={{ 
                          margin: 0, 
                          color: 'var(--text-secondary)', 
                          fontSize: '14px' 
                        }}>
                          {host.ip}
                        </p>
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: host.status === 'online' ? 'var(--success)' : 'var(--danger)',
                        color: 'white',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {host.status === 'online' ? 'متصل' : 'غير متصل'}
                      </span>
                    </div>
                    
                    {host.description && (
                      <p style={{ 
                        margin: '5px 0', 
                        fontSize: '13px', 
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic'
                      }}>
                        {host.description}
                      </p>
                    )}
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      marginTop: '10px',
                      flexWrap: 'wrap'
                    }}>
                      {isAuthenticated && (
                        <>
                          <button
                            onClick={() => handleEditHost(host)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: 'var(--primary)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontSize: '12px',
                              flex: 1
                            }}
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => handleHideNewHost(host.id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: 'var(--text-secondary)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="تمت المشاهدة"
                          >
                            ✓
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                        color: host.status === 'online' ? 'var(--success)' : 'var(--danger)',
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
                        {isHostFavorite(host.id) ? (
                          <button 
                            onClick={() => handleRemoveFromFavorites(host.id)} 
                            style={{ backgroundColor: 'var(--warning)', color: 'var(--text-primary)', padding: '5px 10px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px' }}
                            title="حذف من المفضلة"
                          >
                            ⭐
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleAddToFavorites(host.id)} 
                            style={{ backgroundColor: 'var(--text-secondary)', color: 'var(--bg-primary)', padding: '5px 10px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px' }}
                            title="إضافة للمفضلة"
                          >
                            ⭐
                          </button>
                        )}
                        {isAuthenticated && (
                          <>
                            <button 
                              onClick={() => handleEditHost(host)} 
                              style={{ padding: '5px 10px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                            >
                              تعديل
                            </button>
                            <button 
                              onClick={() => handleDeleteHost(host.id)} 
                              style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '5px 10px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                            >
                              حذف
                            </button>
                          </>
                        )}
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
          {network.subnet < 22 ? (
            <div className="empty-state">
              <p>النطاق كبير جداً للعرض ({range.count} عنوان). الرجاء استخدام subnet /22 أو أكبر للعرض البصري.</p>
              <p>الأجهزة المكتشفة: {hosts.length}</p>
            </div>
          ) : (
            <>
              {(() => {
                const ipGroups = groupIPsByThirdOctet(network.network_id, network.subnet, displayRange)
                const sortedOctets = Object.keys(ipGroups).map(Number).sort((a, b) => a - b)
                
                return (
                  <div style={{ marginTop: '20px' }}>
                    {sortedOctets.map((thirdOctet) => {
                      const groupIPs = ipGroups[thirdOctet]
                      const networkParts = network.network_id.split('.').map(Number)
                      
                      return (
                        <div key={thirdOctet} style={{ marginBottom: '30px' }}>
                          <h3 style={{ 
                            marginBottom: '15px', 
                            fontWeight: 'bold',
                            fontSize: '18px',
                            color: 'var(--text-primary)'
                          }}>
                            {networkParts[0]}.{networkParts[1]}.{thirdOctet}.x
                          </h3>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', 
                            gap: '5px',
                            marginBottom: '20px'
                          }}>
                            {groupIPs.map((ip) => {
                              const status = getIPStatus(ip)
                              const lastOctet = getLastOctet(ip)
                              const host = hosts.find(h => h.ip === ip)
                              
                              let bgColor = 'var(--bg-primary)'
                              let borderColor = 'var(--border-color)'
                              let color = 'var(--text-primary)'
                              
                              if (status === 'online') {
                                bgColor = 'var(--success-light)'
                                borderColor = 'var(--success)'
                                color = 'var(--success)'
                              } else if (status === 'offline') {
                                bgColor = 'var(--danger-light)'
                                borderColor = 'var(--danger)'
                                color = 'var(--danger)'
                              }
                              
                              return (
                                <div
                                  key={ip}
                                  title={host ? `${host.name} (${ip}) - ${host.status === 'online' ? 'متصل' : 'غير متصل'}` : `${ip} - متاح`}
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    backgroundColor: bgColor,
                                    border: `2px solid ${borderColor}`,
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: color,
                                    cursor: 'pointer',
                                    transition: 'var(--transition)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.1)'
                                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)'
                                    e.currentTarget.style.boxShadow = 'none'
                                  }}
                                  onClick={() => {
                                    if (host) {
                                      alert(`الجهاز: ${host.name}\nIP: ${ip}\nالحالة: ${host.status === 'online' ? 'متصل' : 'غير متصل'}`)
                                    } else {
                                      alert(`IP متاح: ${ip}`)
                                    }
                                  }}
                                >
                                  {lastOctet}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <p><strong>الإحصائيات:</strong></p>
                <p>الأجهزة المتصلة: {hosts.filter(h => h.status === 'online').length}</p>
                <p>الأجهزة غير المتصلة: {hosts.filter(h => h.status === 'offline').length}</p>
                <p>إجمالي الأجهزة: {hosts.length}</p>
                <p>IPs المتاحة: {displayRange.length - hosts.length}</p>
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
              backgroundColor: 'var(--bg-primary)',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              color: 'var(--text-primary)'
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
                    <p style={{ color: 'var(--text-secondary)' }}>لا توجد وسوم متاحة. اذهب إلى إدارة الوسوم لإضافة وسوم جديدة.</p>
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

