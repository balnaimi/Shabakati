import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

function Favorites() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [groups, setGroups] = useState([])
  const [allHosts, setAllHosts] = useState([])
  const [stats, setStats] = useState({
    totalNetworks: 0,
    totalHosts: 0,
    onlineHosts: 0,
    offlineHosts: 0
  })
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
  const [editFormData, setEditFormData] = useState({ url: '', groupId: '', customName: '', description: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [favoritesData, groupsData, hostsData, statsData] = await Promise.all([
        apiGet('/favorites'),
        apiGet('/groups'),
        apiGet('/hosts'),
        apiGet('/stats')
      ])
      setFavorites(favoritesData)
      setGroups(groupsData)
      setAllHosts(hostsData)
      setStats({
        totalNetworks: statsData.totalNetworks,
        totalHosts: statsData.totalHosts,
        onlineHosts: statsData.onlineHosts,
        offlineHosts: statsData.offlineHosts
      })
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
      groupId: favorite.groupId || '',
      customName: favorite.customName || '',
      description: favorite.description || ''
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
        groupId: editFormData.groupId ? parseInt(editFormData.groupId) : null,
        customName: editFormData.customName || null,
        description: editFormData.description || null
      })
      setShowEditModal(false)
      setEditingFavorite(null)
      setEditFormData({ url: '', groupId: '', customName: '', description: '' })
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

  // Group favorites by group
  const favoritesByGroup = favorites.reduce((acc, fav) => {
    const groupId = fav.groupId || 'ungrouped'
    if (!acc[groupId]) {
      acc[groupId] = []
    }
    acc[groupId].push(fav)
    return acc
  }, {})

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  const handleMoveGroupUp = async (groupId) => {
    if (!groupId) return
    
    try {
      setError(null)
      
      // Find current group
      const currentGroup = groups.find(g => g.id === groupId)
      if (!currentGroup) return

      // Use the same logic as sortedGroupsList to get the correct order
      const sortedGroups = [...groups].sort((a, b) => {
        const orderA = a.display_order !== undefined ? a.display_order : (a.displayOrder !== undefined ? a.displayOrder : 0)
        const orderB = b.display_order !== undefined ? b.display_order : (b.displayOrder !== undefined ? b.displayOrder : 0)
        if (orderA !== orderB) {
          return orderA - orderB
        }
        const dateA = new Date(a.created_at || 0)
        const dateB = new Date(b.created_at || 0)
        return dateA - dateB
      })

      // Filter to only groups that have favorites (same as sortedGroupsList)
      const groupsWithFavorites = sortedGroups.filter(group => favoritesByGroup[group.id.toString()])
      
      // Find current index in the filtered list
      const currentIndex = groupsWithFavorites.findIndex(g => g.id === groupId)
      if (currentIndex <= 0) {
        console.log('Cannot move up: already at top or not found', { currentIndex })
        return // Already at top
      }

      const previousGroup = groupsWithFavorites[currentIndex - 1]
      
      if (!previousGroup) {
        console.log('Previous group not found')
        return
      }
      
      // Instead of swapping, assign new display_order values based on position
      // This ensures different values even if both groups had the same order
      const newCurrentOrder = currentIndex - 1  // Move up = lower index = lower order
      const newPreviousOrder = currentIndex     // Previous becomes current position

      console.log('Moving group up:', { 
        currentGroup: currentGroup.name, 
        currentIndex,
        newCurrentOrder,
        previousGroup: previousGroup.name, 
        newPreviousOrder
      })

      // Update both groups with new positions
      await Promise.all([
        apiPut(`/groups/${groupId}`, { displayOrder: newCurrentOrder }),
        apiPut(`/groups/${previousGroup.id}`, { displayOrder: newPreviousOrder })
      ])

      // Refresh data
      await fetchData()
    } catch (err) {
      console.error('Error moving group up:', err)
      setError(err.message)
    }
  }

  const handleMoveGroupDown = async (groupId) => {
    if (!groupId) return
    
    try {
      setError(null)
      
      // Find current group
      const currentGroup = groups.find(g => g.id === groupId)
      if (!currentGroup) return

      // Use the same logic as sortedGroupsList to get the correct order
      const sortedGroups = [...groups].sort((a, b) => {
        const orderA = a.display_order !== undefined ? a.display_order : (a.displayOrder !== undefined ? a.displayOrder : 0)
        const orderB = b.display_order !== undefined ? b.display_order : (b.displayOrder !== undefined ? b.displayOrder : 0)
        if (orderA !== orderB) {
          return orderA - orderB
        }
        const dateA = new Date(a.created_at || 0)
        const dateB = new Date(b.created_at || 0)
        return dateA - dateB
      })

      // Filter to only groups that have favorites (same as sortedGroupsList)
      const groupsWithFavorites = sortedGroups.filter(group => favoritesByGroup[group.id.toString()])
      
      // Find current index in the filtered list
      const currentIndex = groupsWithFavorites.findIndex(g => g.id === groupId)
      if (currentIndex < 0 || currentIndex >= groupsWithFavorites.length - 1) {
        console.log('Cannot move down: already at bottom or not found', { currentIndex, total: groupsWithFavorites.length })
        return // Already at bottom
      }

      const nextGroup = groupsWithFavorites[currentIndex + 1]
      
      if (!nextGroup) {
        console.log('Next group not found')
        return
      }
      
      // Instead of swapping, assign new display_order values based on position
      // This ensures different values even if both groups had the same order
      const newCurrentOrder = currentIndex + 1  // Move down = higher index = higher order
      const newNextOrder = currentIndex         // Next becomes current position

      console.log('Moving group down:', { 
        currentGroup: currentGroup.name, 
        currentIndex,
        newCurrentOrder,
        nextGroup: nextGroup.name, 
        newNextOrder
      })

      // Update both groups with new positions
      await Promise.all([
        apiPut(`/groups/${groupId}`, { displayOrder: newCurrentOrder }),
        apiPut(`/groups/${nextGroup.id}`, { displayOrder: newNextOrder })
      ])

      // Refresh data
      await fetchData()
    } catch (err) {
      console.error('Error moving group down:', err)
      setError(err.message)
    }
  }

  // Get sorted groups list (by display_order) including ungrouped
  const sortedGroupsList = (() => {
    // Sort groups by display_order (groups are already sorted from API, but ensure it)
    const sortedGroups = [...groups].sort((a, b) => {
      const orderA = a.display_order !== undefined ? a.display_order : (a.displayOrder !== undefined ? a.displayOrder : 0)
      const orderB = b.display_order !== undefined ? b.display_order : (b.displayOrder !== undefined ? b.displayOrder : 0)
      if (orderA !== orderB) {
        return orderA - orderB
      }
      // If display_order is same, sort by created_at
      const dateA = new Date(a.created_at || 0)
      const dateB = new Date(b.created_at || 0)
      return dateA - dateB
    })

    // Create list with group IDs and ungrouped at the end
    const list = sortedGroups
      .filter(group => favoritesByGroup[group.id.toString()]) // Only include groups that have favorites
      .map(group => group.id.toString())
    
    // Add ungrouped at the end if it has favorites
    if (favoritesByGroup['ungrouped']) {
      list.push('ungrouped')
    }

    return list
  })()

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

  // Get group display_order
  const getGroupDisplayOrder = (groupId) => {
    if (!groupId) return 999999 // Ungrouped at the end
    const group = groups.find(g => g.id === groupId)
    if (!group) return 0
    return group.display_order !== undefined ? group.display_order : (group.displayOrder !== undefined ? group.displayOrder : 0)
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
        <div className="controls">
          {isAdmin && (
            <>
              <button onClick={() => setShowAddModal(true)} className="btn-success">
                إضافة جهاز
              </button>
              <button onClick={() => setShowGroupModal(true)} className="btn-primary">
                إدارة المجموعات
              </button>
            </>
          )}
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

      {favorites.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '40px' }}>
          <p>لا توجد أجهزة في المفضلة بعد.</p>
          {isAdmin ? (
            <p>اضغط على "إضافة جهاز" لإضافة أجهزة من أي شبكة للمفضلة.</p>
          ) : (
            <p>يرجى الدخول بصلاحية المسؤول لإضافة أجهزة من أي شبكة للمفضلة.</p>
          )}
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          {/* Display favorites by group */}
          {sortedGroupsList.map((groupId, index) => {
            const groupFavorites = favoritesByGroup[groupId] || []
            const groupIdNum = groupId === 'ungrouped' ? null : parseInt(groupId)
            const groupName = getGroupName(groupIdNum)
            const groupColor = getGroupColor(groupIdNum)
            const isCollapsed = collapsedGroups[groupId] || false
            const isUngrouped = groupId === 'ungrouped'
            const nextGroupId = index < sortedGroupsList.length - 1 ? sortedGroupsList[index + 1] : null
            const canMoveUp = !isUngrouped && index > 0
            const canMoveDown = !isUngrouped && index < sortedGroupsList.length - 1 && nextGroupId !== 'ungrouped'

            return (
              <div key={groupId} style={{ marginBottom: '30px' }}>
                <div
                  className="group-header"
                  style={{
                    backgroundColor: groupColor,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  {isAdmin && !isUngrouped && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoveGroupUp(groupIdNum)
                        }}
                        disabled={!canMoveUp}
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          border: 'none',
                          color: 'white',
                          cursor: canMoveUp ? 'pointer' : 'not-allowed',
                          padding: '2px 6px',
                          fontSize: '12px',
                          borderRadius: '3px',
                          opacity: canMoveUp ? 1 : 0.5
                        }}
                        title="نقل لأعلى"
                      >
                        ↑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoveGroupDown(groupIdNum)
                        }}
                        disabled={!canMoveDown}
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          border: 'none',
                          color: 'white',
                          cursor: canMoveDown ? 'pointer' : 'not-allowed',
                          padding: '2px 6px',
                          fontSize: '12px',
                          borderRadius: '3px',
                          opacity: canMoveDown ? 1 : 0.5
                        }}
                        title="نقل لأسفل"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                  <span
                    onClick={() => toggleGroup(groupId)}
                    style={{ fontSize: '18px', fontWeight: 'bold', flex: 1, cursor: 'pointer' }}
                  >
                    {groupName}
                  </span>
                  <span
                    onClick={() => toggleGroup(groupId)}
                    style={{ cursor: 'pointer' }}
                  >
                    {isCollapsed ? '▼' : '▲'} ({groupFavorites.length})
                  </span>
                </div>

                {!isCollapsed && (
                  <div className="group-content">
                    {groupFavorites.map(favorite => (
                      <div
                        key={favorite.id}
                        className="favorite-card"
                        onClick={() => handleOpenUrl(favorite)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                          <div>
                            <h3 style={{ margin: 0, marginBottom: '5px', color: 'var(--text-primary)' }}>{favorite.customName || favorite.host.name}</h3>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{favorite.host.ip}</p>
                          </div>
                          <span className={`status-badge ${favorite.host.status === 'online' ? 'status-online' : 'status-offline'}`}>
                            {favorite.host.status === 'online' ? 'متصل' : 'غير متصل'}
                          </span>
                        </div>

                        {favorite.description && (
                          <p style={{ margin: '5px 0', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            {favorite.description}
                          </p>
                        )}

                        {favorite.url && (
                          <p style={{ margin: '5px 0', fontSize: '12px', color: 'var(--primary)' }}>
                            🔗 {favorite.url}
                          </p>
                        )}

                        {favorite.host.tags && favorite.host.tags.length > 0 && (
                          <div className="tags-inline" style={{ marginTop: '10px' }}>
                            {favorite.host.tags.map(tag => (
                              <span
                                key={typeof tag === 'object' ? tag.id : tag}
                                className="tag-badge"
                                style={{
                                  backgroundColor: typeof tag === 'object' ? (tag.color || 'var(--primary)') : 'var(--primary)'
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
                            className="btn-primary btn-small"
                            style={{ flex: 1 }}
                          >
                            فتح
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditFavorite(favorite)
                                }}
                                className="btn-warning btn-small"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteFavorite(favorite.id)
                                }}
                                className="btn-danger btn-small"
                              >
                                حذف
                              </button>
                            </>
                          )}
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
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>إضافة جهاز للمفضلة</h2>
              <button onClick={() => setShowAddModal(false)}>إغلاق</button>
            </div>

            <form onSubmit={handleAddFavorite}>
              <div className="form-group">
                <label>الجهاز:</label>
                <select
                  value={addFormData.hostId}
                  onChange={(e) => setAddFormData({ ...addFormData, hostId: e.target.value })}
                  required
                >
                  <option value="">اختر جهاز...</option>
                  {availableHosts.map(host => (
                    <option key={host.id} value={host.id}>
                      {host.name} ({host.ip}) - {host.status === 'online' ? 'متصل' : 'غير متصل'}
                    </option>
                  ))}
                </select>
                {availableHosts.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '5px' }}>
                    جميع الأجهزة موجودة في المفضلة بالفعل
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>URL (اختياري):</label>
                <input
                  type="text"
                  value={addFormData.url}
                  onChange={(e) => setAddFormData({ ...addFormData, url: e.target.value })}
                  placeholder="http://example.com أو https://example.com"
                />
              </div>

              <div className="form-group">
                <label>المجموعة (اختياري):</label>
                <select
                  value={addFormData.groupId}
                  onChange={(e) => setAddFormData({ ...addFormData, groupId: e.target.value })}
                >
                  <option value="">بدون مجموعة</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)}>
                  إلغاء
                </button>
                <button type="submit" disabled={availableHosts.length === 0} className="btn-primary">
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
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
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
              <div className="form-group">
                <label>اسم الجهاز المخصص:</label>
                <input
                  type="text"
                  value={editFormData.customName}
                  onChange={(e) => setEditFormData({ ...editFormData, customName: e.target.value })}
                  placeholder={editingFavorite.host.name}
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>اتركه فارغاً لاستخدام الاسم الافتراضي</small>
              </div>

              <div className="form-group">
                <label>الوصف:</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="أضف وصفاً للجهاز..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>URL:</label>
                <input
                  type="text"
                  value={editFormData.url}
                  onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                  placeholder="http://example.com أو https://example.com"
                />
              </div>

              <div className="form-group">
                <label>المجموعة:</label>
                <select
                  value={editFormData.groupId}
                  onChange={(e) => setEditFormData({ ...editFormData, groupId: e.target.value })}
                >
                  <option value="">بدون مجموعة</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => {
                  setShowEditModal(false)
                  setEditingFavorite(null)
                }}>
                  إلغاء
                </button>
                <button type="submit" className="btn-primary">
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
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>إدارة المجموعات</h2>
              <button onClick={() => setShowGroupModal(false)}>إغلاق</button>
            </div>

            <form onSubmit={handleCreateGroup} className="card" style={{ marginBottom: '30px' }}>
              <h3 style={{ marginTop: 0 }}>إنشاء مجموعة جديدة</h3>
              <div className="form-group">
                <label>اسم المجموعة:</label>
                <input
                  type="text"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>اللون:</label>
                <input
                  type="color"
                  value={groupFormData.color}
                  onChange={(e) => setGroupFormData({ ...groupFormData, color: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-success">
                إنشاء مجموعة
              </button>
            </form>

            <div>
              <h3>المجموعات الموجودة</h3>
              {groups.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>لا توجد مجموعات</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {groups.map(group => {
                    const groupFavorites = favorites.filter(fav => fav.groupId === group.id)
                    return (
                      <div
                        key={group.id}
                        className="tag-item"
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
                          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{group.name}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            ({groupFavorites.length} جهاز)
                          </span>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            className="btn-danger btn-small"
                          >
                            حذف
                          </button>
                        )}
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

