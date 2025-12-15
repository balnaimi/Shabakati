import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Globe, Globe2, 
  Plus, PlusCircle,
  Search,
  Edit, Edit2,
  Trash2, Trash,
  RefreshCw, RefreshCcw,
  ClipboardList, Clipboard,
  CheckCircle2, XCircle,
  ArrowUp, ArrowDown,
  Tag, Download, Upload, BarChart3, Filter,
  Eye, EyeOff, Info, X, Save
} from 'lucide-react'
import { toast } from 'react-toastify'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format } from 'date-fns'
import { API_URL } from '../constants'
import { apiGet, apiDelete, apiPatch, apiPut, apiPost } from '../utils/api'
import ThemeToggle from '../components/ThemeToggle'
import './HostsList.css'

function HostsList({ theme, toggleTheme }) {
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
  const [showStats, setShowStats] = useState(false)
  const [selectedHostForStats, setSelectedHostForStats] = useState(null)
  const [statusHistory, setStatusHistory] = useState([])
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(false)
  const [autoCheckInterval, setAutoCheckInterval] = useState(300000)
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
      setHosts(data)
    } catch (err) {
      setError(err.message)
      console.error('خطأ في تحميل المضيفين:', err)
      toast.error('فشل في تحميل المضيفين: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHosts()
  }, [fetchHosts])

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
        console.error('خطأ في تحميل الوسوم:', err)
      } finally {
        setLoadingTags(false)
      }
    }
    fetchTags()
  }, [])

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المضيف؟')) return
    try {
      setError(null)
      await apiDelete(`/hosts/${id}`)
      setHosts(prev => prev.filter(host => host.id !== id))
      toast.success('تم حذف المضيف بنجاح')
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    }
  }, [])

  const handleToggleStatus = useCallback(async (id) => {
    try {
      setError(null)
      const updatedHost = await apiPatch(`/hosts/${id}/toggle-status`)
      setHosts(prev => prev.map(host => 
        host.id === id ? updatedHost : host
      ))
      toast.success('تم تغيير الحالة بنجاح')
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    }
  }, [])

  const handleCheckStatus = useCallback(async (id) => {
    try {
      setError(null)
      toast.info('جاري التحقق من الحالة...', { autoClose: 2000 })
      const updatedHost = await apiPost(`/hosts/${id}/check-status`, {})
      setHosts(prev => prev.map(host => 
        host.id === id ? updatedHost : host
      ))
      toast.success(`تم التحقق من حالة ${updatedHost.name} بنجاح`)
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    }
  }, [])

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
      toast.error('اسم المضيف وعنوان IP مطلوبان')
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
      toast.success('تم تحديث المضيف بنجاح')
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
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
    return [...paginationData.paginatedHosts].sort((a, b) => {
      let aValue, bValue
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'ip':
          aValue = a.ip.split('.').map(num => parseInt(num).toString().padStart(3, '0')).join('')
          bValue = b.ip.split('.').map(num => parseInt(num).toString().padStart(3, '0')).join('')
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          return 0
      }
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [paginationData.paginatedHosts, sortBy, sortOrder])

  const stats = useMemo(() => {
    const online = hosts.filter(h => h.status === 'online').length
    const offline = hosts.filter(h => h.status === 'offline').length
    return { total: hosts.length, online, offline }
  }, [hosts])

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>جاري التحميل...</div>
  }

  return (
    <div className="hosts-list-page">
      <header className="page-header">
        <div className="page-header-content">
          <h1>
            {theme === 'light' ? <Globe2 size={24} className="header-icon" /> : <Globe size={24} className="header-icon" />}
            <span>لوحة تحكم الشبكة</span>
          </h1>
          <p>إدارة ومتابعة المضيفين في شبكتك</p>
        </div>
        <div className="header-actions">
          <button className="check-all-btn" onClick={() => {}}>
            <Search size={18} />
            <span>التحقق من جميع الحالات</span>
          </button>
          <button className="scan-network-btn" onClick={() => navigate('/scan')}>
            {theme === 'light' ? <Globe2 size={18} /> : <Globe size={18} />}
            مسح الشبكة
          </button>
          <button className="add-host-btn" onClick={() => navigate('/add')}>
            {theme === 'light' ? <PlusCircle size={18} /> : <Plus size={18} />}
            إضافة مضيف جديد
          </button>
          <button className="tags-management-btn" onClick={() => navigate('/tags')}>
            <Tag size={18} />
            إدارة الوسوم
          </button>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </header>

      {error && (
        <div className="error-message" style={{ padding: '15px', background: '#ef4444', color: 'white', borderRadius: '8px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="stats-container">
        <div className="stat-card total">
          <div className="stat-icon">
            <ClipboardList size={36} />
          </div>
          <div className="stat-content">
            <h3 className="stat-label">إجمالي الأجهزة</h3>
            <p className="stat-value">{stats.total}</p>
          </div>
        </div>
        <div className="stat-card online">
          <div className="stat-icon">
            <CheckCircle2 size={36} />
          </div>
          <div className="stat-content">
            <h3 className="stat-label">متصلة</h3>
            <p className="stat-value">{stats.online}</p>
          </div>
        </div>
        <div className="stat-card offline">
          <div className="stat-icon">
            <XCircle size={36} />
          </div>
          <div className="stat-content">
            <h3 className="stat-label">غير متصلة</h3>
            <p className="stat-value">{stats.offline}</p>
          </div>
        </div>
      </div>

      <section className="hosts-section">
        <div className="section-header">
          <h2>
            {theme === 'light' ? <Clipboard size={20} className="section-icon" /> : <ClipboardList size={20} className="section-icon" />}
            <span>المضيفين ({filteredHosts.length})</span>
          </h2>
          <div className="header-controls">
            <div className="search-bar">
              <Search size={18} />
              <input
                type="text"
                placeholder="بحث (اسم، IP، وصف)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="search-input"
              />
            </div>
            <div className="status-filter">
              <Filter size={18} />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="filter-select"
              >
                <option value="all">جميع الحالات</option>
                <option value="online">متصل</option>
                <option value="offline">غير متصل</option>
              </select>
            </div>
          </div>
        </div>

        {sortedHosts.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={64} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>لا توجد مضيفين</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>ابدأ بإضافة مضيف جديد أو قم بمسح الشبكة</p>
          </div>
        ) : (
          <div className="hosts-table-container">
            <table className="hosts-table">
              <thead>
                <tr>
                  <th onClick={() => setSortBy('name')}>
                    الاسم {sortBy === 'name' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                  </th>
                  <th onClick={() => setSortBy('ip')}>
                    IP {sortBy === 'ip' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                  </th>
                  <th>الوصف</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sortedHosts.map(host => (
                  <tr key={host.id}>
                    <td className="host-name-cell">
                      <strong>{host.name}</strong>
                      {host.url && (
                        <a href={host.url} target="_blank" rel="noopener noreferrer" className="host-url-link">
                          <Globe size={14} />
                        </a>
                      )}
                    </td>
                    <td className="host-ip-cell">{host.ip}</td>
                    <td className="host-description-cell">
                      {host.description ? (
                        <span className="description-text" title={host.description}>
                          {host.description.length > 50 ? `${host.description.substring(0, 50)}...` : host.description}
                        </span>
                      ) : (
                        <span className="no-description">-</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${host.status}`}>
                        {host.status === 'online' ? 'متصل' : 'غير متصل'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => handleViewHost(host)} 
                          title="عرض معلومات الجهاز"
                          className="action-btn view-btn"
                        >
                          {theme === 'light' ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <button 
                          onClick={() => handleEditHost(host)} 
                          title="تعديل معلومات الجهاز"
                          className="action-btn edit-btn"
                        >
                          {theme === 'light' ? <Edit2 size={18} /> : <Edit size={18} />}
                        </button>
                        <button 
                          onClick={() => handleCheckStatus(host.id)} 
                          title="تدقيق على الحالة"
                          className="action-btn check-btn"
                        >
                          {theme === 'light' ? <RefreshCcw size={18} /> : <RefreshCw size={18} />}
                        </button>
                        <button 
                          onClick={() => handleDelete(host.id)} 
                          title="حذف الجهاز"
                          className="action-btn delete-btn"
                        >
                          {theme === 'light' ? <Trash size={18} /> : <Trash2 size={18} />}
                        </button>
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
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              السابق
            </button>
            <span className="pagination-info">
              صفحة {currentPage} من {paginationData.totalPages} ({filteredHosts.length} مضيف)
            </span>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(paginationData.totalPages, prev + 1))}
              disabled={currentPage === paginationData.totalPages}
            >
              التالي
            </button>
          </div>
        )}
      </section>

      {/* Modal عرض معلومات الجهاز */}
      {viewingHost && (
        <div className="modal-overlay" onClick={() => setViewingHost(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Info size={24} />
                <span>معلومات الجهاز</span>
              </h2>
              <button className="modal-close-btn" onClick={() => setViewingHost(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="info-row">
                <label>الاسم:</label>
                <span>{viewingHost.name}</span>
              </div>
              <div className="info-row">
                <label>عنوان IP:</label>
                <span className="ip-value">{viewingHost.ip}</span>
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
                  <a href={viewingHost.url} target="_blank" rel="noopener noreferrer" className="url-link">
                    {viewingHost.url}
                    <Globe size={16} />
                  </a>
                </div>
              )}
              <div className="info-row">
                <label>الحالة:</label>
                <span className={`status-badge ${viewingHost.status}`}>
                  {viewingHost.status === 'online' ? 'متصل' : 'غير متصل'}
                </span>
              </div>
              {viewingHost.tags && viewingHost.tags.length > 0 && (
                <div className="info-row">
                  <label>الوسوم:</label>
                  <div className="tags-list">
                    {viewingHost.tags.map((tag, idx) => (
                      <span key={idx} className="tag-badge" style={{ backgroundColor: typeof tag === 'object' ? tag.color : '#4a9eff' }}>
                        {typeof tag === 'object' ? tag.name : tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {viewingHost.lastChecked && (
                <div className="info-row">
                  <label>آخر فحص:</label>
                  <span>{new Date(viewingHost.lastChecked).toLocaleString('ar-SA')}</span>
                </div>
              )}
              {viewingHost.createdAt && (
                <div className="info-row">
                  <label>تاريخ الإضافة:</label>
                  <span>{new Date(viewingHost.createdAt).toLocaleString('ar-SA')}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="modal-btn primary" onClick={() => { setViewingHost(null); handleEditHost(viewingHost); }}>
                <Edit size={18} />
                تعديل
              </button>
              <button className="modal-btn" onClick={() => setViewingHost(null)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal تعديل الجهاز */}
      {editingHostId && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Edit size={24} />
                <span>تعديل معلومات الجهاز</span>
              </h2>
              <button className="modal-close-btn" onClick={handleCancelEdit}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateHost} className="modal-body">
              <div className="form-group">
                <label>الاسم *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                  placeholder="اسم المضيف"
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
                  placeholder="وصف اختياري للمضيف"
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
                <div className="tags-selector">
                  {availableTags.map(tag => (
                    <label key={tag.id} className="tag-checkbox">
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
                      <span className="tag-label" style={{ backgroundColor: tag.color }}>
                        {tag.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="modal-btn primary">
                  <Save size={18} />
                  حفظ التعديلات
                </button>
                <button type="button" className="modal-btn" onClick={handleCancelEdit}>
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

