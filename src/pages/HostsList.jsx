import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiGet, apiDelete, apiPut, apiPost } from '../utils/api'

function HostsList() {
  const navigate = useNavigate()
  const [hosts, setHosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [selectedTag, setSelectedTag] = useState(null)
  const [availableTags, setAvailableTags] = useState([])
  const [loadingTags, setLoadingTags] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(false)
  const [autoCheckInterval, setAutoCheckInterval] = useState(300000)
  const [checkingAll, setCheckingAll] = useState(false)
  const [checkProgress, setCheckProgress] = useState({ current: 0, total: 0 })
  const [viewingHost, setViewingHost] = useState(null)
  const [editingHostId, setEditingHostId] = useState(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    ip: '',
    description: '',
    url: '',
    tagIds: [],
    status: 'online'
  })

  const fetchHosts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiGet('/hosts')
      setHosts(data.hosts || data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHosts()
  }, [fetchHosts])

  useEffect(() => {
    if (!autoCheckEnabled) return

    const checkAllHosts = async () => {
      try {
        const currentHosts = await apiGet('/hosts')
        const hostsList = currentHosts.hosts || currentHosts
        
        const checkPromises = hostsList.map(host => 
          apiPost(`/hosts/${host.id}/check-status`, {}).catch(() => null)
        )
        
        const results = await Promise.all(checkPromises)
        const updatedHosts = results.filter(Boolean)
        
        if (updatedHosts.length > 0) {
          setHosts(prev => prev.map(host => {
            const updated = updatedHosts.find(u => u.id === host.id)
            return updated || host
          }))
        }
      } catch (err) {
        // Silent fail for auto-check
      }
    }

    checkAllHosts()
    const interval = setInterval(checkAllHosts, autoCheckInterval)

    return () => clearInterval(interval)
  }, [autoCheckEnabled, autoCheckInterval])

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoadingTags(true)
        const response = await fetch(`${API_URL}/tags`)
        if (response.ok) {
          const tags = await response.json()
          setAvailableTags(tags)
        }
      } catch (err) {
        // Silent fail for tags
      } finally {
        setLoadingTags(false)
      }
    }
    fetchTags()
  }, [])

  const handleDelete = useCallback(async (id) => {
      if (!window.confirm('هل أنت متأكد من حذف هذا الجهاز؟')) return
    try {
      setError(null)
      await apiDelete(`/hosts/${id}`)
      setHosts(prev => prev.filter(host => host.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const handleCheckStatus = useCallback(async (id) => {
    try {
      setError(null)
      const updatedHost = await apiPost(`/hosts/${id}/check-status`, {})
      setHosts(prev => prev.map(host => 
        host.id === id ? updatedHost : host
      ))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const handleCheckAllHosts = useCallback(async () => {
    if (checkingAll) return
    
    try {
      setCheckingAll(true)
      setError(null)
      setCheckProgress({ current: 0, total: hosts.length })
      
      let successCount = 0
      let failCount = 0
      
      for (let i = 0; i < hosts.length; i++) {
        const host = hosts[i]
        setCheckProgress({ current: i + 1, total: hosts.length })
        
        try {
          const updatedHost = await apiPost(`/hosts/${host.id}/check-status`, {})
          setHosts(prev => prev.map(h => h.id === host.id ? updatedHost : h))
          successCount++
        } catch (err) {
          failCount++
        }
      }
      
      setCheckProgress({ current: hosts.length, total: hosts.length })
    } catch (err) {
      setError(err.message)
    } finally {
      setCheckingAll(false)
      setTimeout(() => setCheckProgress({ current: 0, total: 0 }), 1000)
    }
  }, [hosts])

  const handleViewHost = useCallback((host) => {
    setViewingHost(host)
  }, [])

  const handleEditHost = useCallback((host) => {
    setEditingHostId(host.id)
    const tagIds = host.tags && Array.isArray(host.tags) 
      ? host.tags.map(tag => typeof tag === 'object' ? tag.id : tag)
      : []
    setEditFormData({
      name: host.name,
      ip: host.ip,
      description: host.description || '',
      url: host.url || '',
      tagIds: tagIds,
      status: host.status
    })
  }, [])

  const handleUpdateHost = useCallback(async (e) => {
    e.preventDefault()
    if (!editFormData.name.trim() || !editFormData.ip.trim()) {
      setError('اسم الجهاز وعنوان IP مطلوبان')
      return
    }

    try {
      setError(null)
      const updatedHost = await apiPut(`/hosts/${editingHostId}`, editFormData)
      setHosts(prev => prev.map(host => 
        host.id === editingHostId ? updatedHost : host
      ))
      setEditingHostId(null)
      setEditFormData({
        name: '',
        ip: '',
        description: '',
        url: '',
        tagIds: [],
        status: 'online'
      })
    } catch (err) {
      setError(err.message)
    }
  }, [editFormData, editingHostId])

  const handleCancelEdit = useCallback(() => {
    setEditingHostId(null)
    setEditFormData({
      name: '',
      ip: '',
      description: '',
      url: '',
      tagIds: [],
      status: 'online'
    })
  }, [])

  const allTags = useMemo(() => {
    return [...new Set(hosts.flatMap(host => {
      if (!host.tags || !Array.isArray(host.tags)) return []
      return host.tags.map(tag => typeof tag === 'object' ? tag.name : tag).filter(Boolean)
    }))]
  }, [hosts])

  const filteredHosts = useMemo(() => {
    return hosts.filter(host => {
      if (selectedTag) {
        if (!host.tags || !Array.isArray(host.tags)) return false
        const hasTag = host.tags.some(tag => {
          const tagName = typeof tag === 'object' ? tag.name : tag
          return tagName === selectedTag
        })
        if (!hasTag) return false
      }
      if (statusFilter !== 'all' && host.status !== statusFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesName = host.name?.toLowerCase().includes(query)
        const matchesIP = host.ip?.toLowerCase().includes(query)
        const matchesDescription = host.description?.toLowerCase().includes(query)
        if (!matchesName && !matchesIP && !matchesDescription) {
          return false
        }
      }
      return true
    })
  }, [hosts, selectedTag, statusFilter, searchQuery])

  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredHosts.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedHosts = filteredHosts.slice(startIndex, endIndex)
    return { totalPages, paginatedHosts }
  }, [filteredHosts, currentPage, itemsPerPage])

  const sortedHosts = useMemo(() => {
    const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' })
    
    return [...paginationData.paginatedHosts].sort((a, b) => {
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
        case 'created_at':
          aValue = (a.createdAt || a.created_at) ? new Date(a.createdAt || a.created_at).getTime() : 0
          bValue = (b.createdAt || b.created_at) ? new Date(b.createdAt || b.created_at).getTime() : 0
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
        case 'last_checked':
          aValue = (a.lastChecked || a.last_checked) ? new Date(a.lastChecked || a.last_checked).getTime() : 0
          bValue = (b.lastChecked || b.last_checked) ? new Date(b.lastChecked || b.last_checked).getTime() : 0
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
        default:
          return 0
      }
    })
  }, [paginationData.paginatedHosts, sortBy, sortOrder])

  const stats = useMemo(() => {
    const online = hosts.filter(h => h.status === 'online').length
    const offline = hosts.filter(h => h.status === 'offline').length
    return { total: hosts.length, online, offline }
  }, [hosts])

  const formatDate = useCallback((dateValue) => {
    if (!dateValue) return null
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return null
    return date.toLocaleDateString('ar-SA', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  if (loading) {
    return <div className="loading">جاري التحميل...</div>
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>لوحة تحكم الشبكة</h1>
          <p>إدارة ومتابعة الأجهزة في شبكتك</p>
        </div>
        <div className="controls">
          <button onClick={() => navigate('/add')}>إضافة جهاز جديد</button>
          <button onClick={() => navigate('/scan')}>مسح الشبكة</button>
          <button onClick={() => navigate('/tags')}>إدارة الوسوم</button>
          <button 
            onClick={handleCheckAllHosts}
            disabled={checkingAll || hosts.length === 0}
          >
            {checkingAll ? `جاري التحقق... (${checkProgress.current}/${checkProgress.total})` : 'التحقق من جميع الحالات'}
          </button>
          <button 
            onClick={() => {
              setAutoCheckEnabled(!autoCheckEnabled)
            }}
          >
            التحقق التلقائي {autoCheckEnabled ? '(مفعل)' : '(معطل)'}
          </button>
        </div>
        
        <div className="stats">
          <div className="stat-item">
            <p>إجمالي الأجهزة</p>
            <p>{stats.total}</p>
          </div>
          <div className="stat-item">
            <p>متصلة</p>
            <p>{stats.online}</p>
          </div>
          <div className="stat-item">
            <p>غير متصلة</p>
            <p>{stats.offline}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div>
        <div>
          <h2>الأجهزة ({filteredHosts.length})</h2>
          <div className="filters">
            <input
              type="text"
              placeholder="بحث (اسم، IP، وصف)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="all">جميع الحالات</option>
              <option value="online">متصل</option>
              <option value="offline">غير متصل</option>
            </select>
            <select
              value={selectedTag || 'all'}
              onChange={(e) => {
                setSelectedTag(e.target.value === 'all' ? null : e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="all">جميع الوسوم</option>
              {availableTags.map(tag => (
                <option key={tag.id} value={tag.name}>{tag.name}</option>
              ))}
            </select>
          </div>
        </div>

        {sortedHosts.length === 0 ? (
          <div className="empty-state">
            <h3>لا توجد أجهزة</h3>
            <p>ابدأ بإضافة جهاز جديد أو قم بمسح الشبكة</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => {
                    if (sortBy === 'name') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortBy('name')
                      setSortOrder('asc')
                    }
                  }}>
                    الاسم {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => {
                    if (sortBy === 'ip') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortBy('ip')
                      setSortOrder('asc')
                    }
                  }}>
                    IP {sortBy === 'ip' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>الوصف</th>
                  <th>الوسوم</th>
                  <th>URL</th>
                  <th onClick={() => {
                    if (sortBy === 'status') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortBy('status')
                      setSortOrder('asc')
                    }
                  }}>
                    الحالة {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => {
                    if (sortBy === 'created_at') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortBy('created_at')
                      setSortOrder('asc')
                    }
                  }}>
                    تاريخ الإضافة {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => {
                    if (sortBy === 'last_checked') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortBy('last_checked')
                      setSortOrder('asc')
                    }
                  }}>
                    آخر تحقق {sortBy === 'last_checked' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sortedHosts.map(host => (
                  <tr key={host.id}>
                    <td>
                      <strong>{host.name}</strong>
                    </td>
                    <td>{host.ip}</td>
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
                      {host.tags && host.tags.length > 0 ? (
                        <div className="tags-inline">
                          {host.tags.map((tag, idx) => (
                            <span key={idx}>
                              {typeof tag === 'object' ? tag.name : tag}{idx < host.tags.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td>
                      {host.url ? (
                        <a 
                          href={host.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title={host.url}
                        >
                          {host.url.length > 30 ? `${host.url.substring(0, 30)}...` : host.url}
                        </a>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td>
                      {host.status === 'online' ? 'متصل' : 'غير متصل'}
                    </td>
                    <td>
                      {(() => {
                        const dateValue = host.createdAt || host.created_at
                        const formattedDate = formatDate(dateValue)
                        return formattedDate || 'لم يتم إضافة تاريخ'
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const dateValue = host.lastChecked || host.last_checked
                        const formattedDate = formatDate(dateValue)
                        return formattedDate || 'لم يتم إضافة تاريخ'
                      })()}
                    </td>
                    <td>
                      <div className="tag-actions">
                        <button onClick={() => handleViewHost(host)}>عرض</button>
                        <button onClick={() => handleEditHost(host)}>تعديل</button>
                        <button onClick={() => handleCheckStatus(host.id)}>تحقق</button>
                        <button onClick={() => handleDelete(host.id)}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {paginationData.totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              السابق
            </button>
            <span>
              صفحة {currentPage} من {paginationData.totalPages} ({filteredHosts.length} جهاز)
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(paginationData.totalPages, prev + 1))}
              disabled={currentPage === paginationData.totalPages}
            >
              التالي
            </button>
          </div>
        )}
      </div>

      {viewingHost && (
        <div className="modal-overlay" onClick={() => setViewingHost(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>معلومات الجهاز</h2>
              <button onClick={() => setViewingHost(null)}>إغلاق</button>
            </div>
            <div className="modal-body">
              <div className="info-row">
                <label>الاسم:</label>
                <span>{viewingHost.name}</span>
              </div>
              <div className="info-row">
                <label>عنوان IP:</label>
                <span>{viewingHost.ip}</span>
              </div>
              {viewingHost.description && (
                <div className="info-row">
                  <label>الوصف:</label>
                  <span>{viewingHost.description}</span>
                </div>
              )}
              {viewingHost.url && (
                <div className="info-row">
                  <label>URL:</label>
                  <a href={viewingHost.url} target="_blank" rel="noopener noreferrer">
                    {viewingHost.url}
                  </a>
                </div>
              )}
              <div className="info-row">
                <label>الحالة:</label>
                <span>
                  {viewingHost.status === 'online' ? 'متصل' : 'غير متصل'}
                </span>
              </div>
              {viewingHost.tags && viewingHost.tags.length > 0 && (
                <div className="info-row">
                  <label>الوسوم:</label>
                  <div className="tags-inline">
                    {viewingHost.tags.map((tag, idx) => (
                      <span key={idx}>
                        {typeof tag === 'object' ? tag.name : tag}{idx < viewingHost.tags.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="info-row">
                <label>آخر فحص:</label>
                <span>{formatDate(viewingHost.lastChecked) || 'لم يتم إضافة تاريخ'}</span>
              </div>
              <div className="info-row">
                <label>تاريخ الإضافة:</label>
                <span>{formatDate(viewingHost.createdAt) || 'لم يتم إضافة تاريخ'}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => { setViewingHost(null); handleEditHost(viewingHost); }}>
                تعديل
              </button>
              <button onClick={() => setViewingHost(null)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {editingHostId && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>تعديل معلومات الجهاز</h2>
              <button onClick={handleCancelEdit}>إغلاق</button>
            </div>
            <form className="form" onSubmit={handleUpdateHost}>
              <div className="form-group">
                <label>الاسم *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                  placeholder="اسم الجهاز"
                />
              </div>
              <div className="form-group">
                <label>عنوان IP *</label>
                <input
                  type="text"
                  value={editFormData.ip}
                  onChange={(e) => setEditFormData({ ...editFormData, ip: e.target.value })}
                  required
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="form-group">
                <label>الوصف</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="وصف اختياري للجهاز"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>URL</label>
                <input
                  type="url"
                  value={editFormData.url}
                  onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div className="form-group">
                <label>الوسوم</label>
                <div>
                  {availableTags.map(tag => (
                    <label key={tag.id}>
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
                      {tag.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button type="submit">
                  حفظ التعديلات
                </button>
                <button type="button" onClick={handleCancelEdit}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default HostsList

