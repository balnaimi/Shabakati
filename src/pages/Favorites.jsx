import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

function Favorites() {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [groups, setGroups] = useState([])
  const [allHosts, setAllHosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingFavorite, setEditingFavorite] = useState(null)
  const [collapsedGroups, setCollapsedGroups] = useState({})
  
  // Form states
  const [addFormData, setAddFormData] = useState({ hostId: '', url: '', groupId: '' })
  const [groupFormData, setGroupFormData] = useState({ name: '', color: '#4a9eff' })
  const [editFormData, setEditFormData] = useState({ url: '', groupId: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [favoritesData, groupsData, hostsData] = await Promise.all([
        apiGet('/favorites'),
        apiGet('/groups'),
        apiGet('/hosts')
      ])
      setFavorites(favoritesData)
      setGroups(groupsData)
      setAllHosts(hostsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFavorite = async (e) => {
    e.preventDefault()
    try {
      setError(null)
      await apiPost('/favorites', {
        hostId: parseInt(addFormData.hostId),
        url: addFormData.url || null,
        groupId: addFormData.groupId ? parseInt(addFormData.groupId) : null
      })
      setShowAddModal(false)
      setAddFormData({ hostId: '', url: '', groupId: '' })
      await fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteFavorite = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الجهاز من المفضلة؟')) {
      return
    }
    try {
      setError(null)
      await apiDelete(`/favorites/${id}`)
      await fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleOpenUrl = (favorite) => {
    const url = favorite.url || favorite.host.url || `http://${favorite.host.ip}`
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank')
    } else {
      window.open(`http://${url}`, '_blank')
    }
  }

  const handleEditFavorite = (favorite) => {
    setEditingFavorite(favorite)
    setEditFormData({
      url: favorite.url || '',
      groupId: favorite.groupId || ''
    })
    setShowEditModal(true)
  }

  const handleUpdateFavorite = async (e) => {
    e.preventDefault()
    if (!editingFavorite) return
    try {
      setError(null)
      await apiPut(`/favorites/${editingFavorite.id}`, {
        url: editFormData.url || null,
        groupId: editFormData.groupId ? parseInt(editFormData.groupId) : null
      })
      setShowEditModal(false)
      setEditingFavorite(null)
      setEditFormData({ url: '', groupId: '' })
      await fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    try {
      setError(null)
      await apiPost('/groups', {
        name: groupFormData.name,
        color: groupFormData.color
      })
      setShowGroupModal(false)
      setGroupFormData({ name: '', color: '#4a9eff' })
      await fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteGroup = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة؟ سيتم إزالة جميع الأجهزة من المجموعة.')) {
      return
    }
    try {
      setError(null)
      await apiDelete(`/groups/${id}`)
      await fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  // Group favorites by group
  const favoritesByGroup = favorites.reduce((acc, fav) => {
    const groupId = fav.groupId || 'ungrouped'
    if (!acc[groupId]) {
      acc[groupId] = []
    }
    acc[groupId].push(fav)
    return acc
  }, {})

  // Get group name
  const getGroupName = (groupId) => {
    if (!groupId) return 'بدون مجموعة'
    const group = groups.find(g => g.id === groupId)
    return group ? group.name : 'غير معروف'
  }

  // Get group color
  const getGroupColor = (groupId) => {
    if (!groupId) return '#6c757d'
    const group = groups.find(g => g.id === groupId)
    return group ? group.color : '#6c757d'
  }

  // Get available hosts (not in favorites)
  const availableHosts = allHosts.filter(host => 
    !favorites.some(fav => fav.hostId === host.id)
  )

  if (loading) {
    return <div className="loading">جاري التحميل...</div>
  }

  return (
    <div className="container">
      <div className="header">
        <h1>شبكتي</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/hosts')}>لوحة التحكم</button>
          <button onClick={() => setShowAddModal(true)} style={{ backgroundColor: '#28a745', color: 'white' }}>
            إضافة جهاز
          </button>
          <button onClick={() => setShowGroupModal(true)} style={{ backgroundColor: '#4a9eff', color: 'white' }}>
            إدارة المجموعات
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {favorites.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '40px' }}>
          <p>لا توجد أجهزة في المفضلة بعد.</p>
          <p>اضغط على "إضافة جهاز" لإضافة أجهزة من أي شبكة للمفضلة.</p>
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          {/* Display favorites by group */}
          {Object.entries(favoritesByGroup).map(([groupId, groupFavorites]) => {
            const groupIdNum = groupId === 'ungrouped' ? null : parseInt(groupId)
            const groupName = getGroupName(groupIdNum)
            const groupColor = getGroupColor(groupIdNum)
            const isCollapsed = collapsedGroups[groupId] || false

            return (
              <div key={groupId} style={{ marginBottom: '30px' }}>
                <div
                  onClick={() => toggleGroup(groupId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '15px',
                    backgroundColor: groupColor,
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginBottom: '10px'
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{groupName}</span>
                  <span style={{ marginLeft: 'auto' }}>
                    {isCollapsed ? '▼' : '▲'} ({groupFavorites.length})
                  </span>
                </div>

                {!isCollapsed && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '15px'
                  }}>
                    {groupFavorites.map(favorite => (
                      <div
                        key={favorite.id}
                        style={{
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          padding: '15px',
                          backgroundColor: 'white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'transform 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        onClick={() => handleOpenUrl(favorite)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                          <div>
                            <h3 style={{ margin: 0, marginBottom: '5px' }}>{favorite.host.name}</h3>
                            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{favorite.host.ip}</p>
                          </div>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: favorite.host.status === 'online' ? '#d4edda' : '#f8d7da',
                            color: favorite.host.status === 'online' ? '#155724' : '#721c24'
                          }}>
                            {favorite.host.status === 'online' ? 'متصل' : 'غير متصل'}
                          </span>
                        </div>

                        {favorite.url && (
                          <p style={{ margin: '5px 0', fontSize: '12px', color: '#4a9eff' }}>
                            🔗 {favorite.url}
                          </p>
                        )}

                        {favorite.host.tags && favorite.host.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '10px' }}>
                            {favorite.host.tags.map(tag => (
                              <span
                                key={typeof tag === 'object' ? tag.id : tag}
                                style={{
                                  padding: '2px 6px',
                                  backgroundColor: typeof tag === 'object' ? (tag.color || '#4a9eff') : '#4a9eff',
                                  color: 'white',
                                  borderRadius: '4px',
                                  fontSize: '11px'
                                }}
                              >
                                {typeof tag === 'object' ? tag.name : tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenUrl(favorite)
                            }}
                            style={{
                              flex: 1,
                              padding: '6px',
                              backgroundColor: '#4a9eff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            فتح
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditFavorite(favorite)
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#ffc107',
                              color: 'black',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            تعديل
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteFavorite(favorite.id)
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Favorite Modal */}
      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddModal(false)}
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
              <h2>إضافة جهاز للمفضلة</h2>
              <button onClick={() => setShowAddModal(false)}>إغلاق</button>
            </div>

            <form onSubmit={handleAddFavorite}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>الجهاز:</label>
                <select
                  value={addFormData.hostId}
                  onChange={(e) => setAddFormData({ ...addFormData, hostId: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="">اختر جهاز...</option>
                  {availableHosts.map(host => (
                    <option key={host.id} value={host.id}>
                      {host.name} ({host.ip}) - {host.status === 'online' ? 'متصل' : 'غير متصل'}
                    </option>
                  ))}
                </select>
                {availableHosts.length === 0 && (
                  <p style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
                    جميع الأجهزة موجودة في المفضلة بالفعل
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>URL (اختياري):</label>
                <input
                  type="text"
                  value={addFormData.url}
                  onChange={(e) => setAddFormData({ ...addFormData, url: e.target.value })}
                  placeholder="http://example.com أو https://example.com"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>المجموعة (اختياري):</label>
                <select
                  value={addFormData.groupId}
                  onChange={(e) => setAddFormData({ ...addFormData, groupId: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="">بدون مجموعة</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)}>
                  إلغاء
                </button>
                <button type="submit" disabled={availableHosts.length === 0}>
                  إضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Favorite Modal */}
      {showEditModal && editingFavorite && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowEditModal(false)
            setEditingFavorite(null)
          }}
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
              <h2>تعديل المفضلة</h2>
              <button onClick={() => {
                setShowEditModal(false)
                setEditingFavorite(null)
              }}>إغلاق</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p><strong>الجهاز:</strong> {editingFavorite.host.name} ({editingFavorite.host.ip})</p>
            </div>

            <form onSubmit={handleUpdateFavorite}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>URL:</label>
                <input
                  type="text"
                  value={editFormData.url}
                  onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                  placeholder="http://example.com أو https://example.com"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>المجموعة:</label>
                <select
                  value={editFormData.groupId}
                  onChange={(e) => setEditFormData({ ...editFormData, groupId: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="">بدون مجموعة</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => {
                  setShowEditModal(false)
                  setEditingFavorite(null)
                }}>
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

      {/* Groups Management Modal */}
      {showGroupModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowGroupModal(false)}
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
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>إدارة المجموعات</h2>
              <button onClick={() => setShowGroupModal(false)}>إغلاق</button>
            </div>

            <form onSubmit={handleCreateGroup} style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <h3 style={{ marginTop: 0 }}>إنشاء مجموعة جديدة</h3>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>اسم المجموعة:</label>
                <input
                  type="text"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>اللون:</label>
                <input
                  type="color"
                  value={groupFormData.color}
                  onChange={(e) => setGroupFormData({ ...groupFormData, color: e.target.value })}
                  style={{ width: '100px', height: '40px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>

              <button type="submit" style={{ backgroundColor: '#28a745', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                إنشاء مجموعة
              </button>
            </form>

            <div>
              <h3>المجموعات الموجودة</h3>
              {groups.length === 0 ? (
                <p style={{ color: '#666' }}>لا توجد مجموعات</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {groups.map(group => {
                    const groupFavorites = favorites.filter(fav => fav.groupId === group.id)
                    return (
                      <div
                        key={group.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          backgroundColor: 'white'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              backgroundColor: group.color,
                              borderRadius: '4px'
                            }}
                          />
                          <span style={{ fontWeight: 'bold' }}>{group.name}</span>
                          <span style={{ color: '#666', fontSize: '14px' }}>
                            ({groupFavorites.length} جهاز)
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            padding: '5px 10px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          حذف
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Favorites

