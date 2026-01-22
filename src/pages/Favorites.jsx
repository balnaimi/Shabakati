import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../hooks/useTranslation'

function Favorites() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { t } = useTranslation()
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
  const [editingGroup, setEditingGroup] = useState(null)
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
    if (!window.confirm(t('messages.confirm.deleteFavorite'))) {
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
      setEditingGroup(null)
      setGroupFormData({ name: '', color: '#4a9eff' })
      await fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateGroup = async (e) => {
    e.preventDefault()
    if (!editingGroup) return
    try {
      setError(null)
      await apiPut(`/groups/${editingGroup.id}`, {
        name: groupFormData.name,
        color: groupFormData.color
      })
      setEditingGroup(null)
      setGroupFormData({ name: '', color: '#4a9eff' })
      await fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const startEditGroup = (group) => {
    setEditingGroup(group)
    setGroupFormData({ name: group.name, color: group.color })
  }

  const handleDeleteGroup = async (id) => {
    if (!window.confirm(t('messages.confirm.deleteGroup'))) {
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
        return // Already at top
      }

      const previousGroup = groupsWithFavorites[currentIndex - 1]
      
      if (!previousGroup) {
        return
      }
      
      // Instead of swapping, assign new display_order values based on position
      // This ensures different values even if both groups had the same order
      const newCurrentOrder = currentIndex - 1  // Move up = lower index = lower order
      const newPreviousOrder = currentIndex     // Previous becomes current position

      // Update both groups with new positions
      await Promise.all([
        apiPut(`/groups/${groupId}`, { displayOrder: newCurrentOrder }),
        apiPut(`/groups/${previousGroup.id}`, { displayOrder: newPreviousOrder })
      ])

      // Refresh data
      await fetchData()
    } catch (err) {
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
        return // Already at bottom
      }

      const nextGroup = groupsWithFavorites[currentIndex + 1]
      
      if (!nextGroup) {
        return
      }
      
      // Instead of swapping, assign new display_order values based on position
      // This ensures different values even if both groups had the same order
      const newCurrentOrder = currentIndex + 1  // Move down = higher index = higher order
      const newNextOrder = currentIndex         // Next becomes current position

      // Update both groups with new positions
      await Promise.all([
        apiPut(`/groups/${groupId}`, { displayOrder: newCurrentOrder }),
        apiPut(`/groups/${nextGroup.id}`, { displayOrder: newNextOrder })
      ])

      // Refresh data
      await fetchData()
    } catch (err) {
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
    if (!groupId) return t('common.withoutGroup')
    const group = groups.find(g => g.id === groupId)
    return group ? group.name : t('common.unknown')
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
    return <div className="loading">{t('common.loading')}</div>
  }

  return (
    <div className="container">
      <div className="header">
        <h1>{t('pages.favorites.title')}</h1>
        <div className="controls">
          {isAdmin && (
            <>
              <button onClick={() => setShowAddModal(true)} className="btn-success">
                {t('pages.favorites.addDevice')}
              </button>
              <button onClick={() => setShowGroupModal(true)} className="btn-primary">
                {t('pages.favorites.manageGroups')}
              </button>
            </>
          )}
        </div>
        
        <div className="stats">
          <div className="stat-item">
            <p>{t('pages.favorites.totalNetworks')}</p>
            <p>{stats.totalNetworks}</p>
          </div>
          <div className="stat-item">
            <p>{t('pages.favorites.totalHosts')}</p>
            <p>{stats.totalHosts}</p>
          </div>
          <div className="stat-item">
            <p>{t('pages.favorites.onlineHosts')}</p>
            <p>{stats.onlineHosts}</p>
          </div>
          <div className="stat-item">
            <p>{t('pages.favorites.offlineHosts')}</p>
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
          <p>{t('pages.favorites.noFavorites')}</p>
          {isAdmin ? (
            <p>{t('pages.favorites.noFavoritesAdmin')}</p>
          ) : (
            <p>{t('pages.favorites.noFavoritesVisitor')}</p>
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
                        title={t('pages.favorites.moveUp')}
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
                        title={t('pages.favorites.moveDown')}
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
                            {favorite.host.status === 'online' ? t('common.online') : t('common.offline')}
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
                            {t('common.open')}
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
                                {t('common.edit')}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteFavorite(favorite.id)
                                }}
                                className="btn-danger btn-small"
                              >
                                {t('common.delete')}
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
              <h2>{t('pages.favorites.addFavoriteModal.title')}</h2>
              <button onClick={() => setShowAddModal(false)}>{t('common.close')}</button>
            </div>

            <form onSubmit={handleAddFavorite}>
              <div className="form-group">
                <label>{t('common.device')}:</label>
                <select
                  value={addFormData.hostId}
                  onChange={(e) => setAddFormData({ ...addFormData, hostId: e.target.value })}
                  required
                >
                  <option value="">{t('pages.favorites.addFavoriteModal.selectDevice')}</option>
                  {availableHosts.map(host => (
                    <option key={host.id} value={host.id}>
                      {host.name} ({host.ip}) - {host.status === 'online' ? t('common.online') : t('common.offline')}
                    </option>
                  ))}
                </select>
                {availableHosts.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '5px' }}>
                    {t('pages.favorites.addFavoriteModal.allDevicesInFavorites')}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>{t('common.url')} ({t('common.optional')}):</label>
                <input
                  type="text"
                  value={addFormData.url}
                  onChange={(e) => setAddFormData({ ...addFormData, url: e.target.value })}
                  placeholder={t('pages.favorites.addFavoriteModal.urlPlaceholder')}
                />
              </div>

              <div className="form-group">
                <label>{t('common.group')} ({t('common.optional')}):</label>
                <select
                  value={addFormData.groupId}
                  onChange={(e) => setAddFormData({ ...addFormData, groupId: e.target.value })}
                >
                  <option value="">{t('pages.favorites.addFavoriteModal.groupPlaceholder')}</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={availableHosts.length === 0} className="btn-primary">
                  {t('common.add')}
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
              <h2>{t('pages.favorites.editFavoriteModal.title')}</h2>
              <button onClick={() => {
                setShowEditModal(false)
                setEditingFavorite(null)
              }}>{t('common.close')}</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p><strong>{t('pages.favorites.editFavoriteModal.device')}:</strong> {editingFavorite.host.name} ({editingFavorite.host.ip})</p>
            </div>

            <form onSubmit={handleUpdateFavorite}>
              <div className="form-group">
                <label>{t('pages.favorites.editFavoriteModal.customName')}:</label>
                <input
                  type="text"
                  value={editFormData.customName}
                  onChange={(e) => setEditFormData({ ...editFormData, customName: e.target.value })}
                  placeholder={editingFavorite.host.name}
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{t('pages.favorites.editFavoriteModal.customNameHint')}</small>
              </div>

              <div className="form-group">
                <label>{t('common.description')}:</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder={t('pages.favorites.editFavoriteModal.descriptionPlaceholder')}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>{t('common.url')}:</label>
                <input
                  type="text"
                  value={editFormData.url}
                  onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                  placeholder={t('pages.favorites.addFavoriteModal.urlPlaceholder')}
                />
              </div>

              <div className="form-group">
                <label>{t('common.group')}:</label>
                <select
                  value={editFormData.groupId}
                  onChange={(e) => setEditFormData({ ...editFormData, groupId: e.target.value })}
                >
                  <option value="">{t('common.withoutGroup')}</option>
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
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {t('common.save')}
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
          onClick={() => {
            setShowGroupModal(false)
            setEditingGroup(null)
            setGroupFormData({ name: '', color: '#4a9eff' })
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{t('pages.favorites.groupsModal.title')}</h2>
              <button onClick={() => {
                setShowGroupModal(false)
                setEditingGroup(null)
                setGroupFormData({ name: '', color: '#4a9eff' })
              }}>{t('common.close')}</button>
            </div>

            <form onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup} className="card" style={{ marginBottom: '30px' }}>
              <h3 style={{ marginTop: 0 }}>{editingGroup ? t('pages.favorites.groupsModal.editGroup') : t('pages.favorites.groupsModal.createGroup')}</h3>
              <div className="form-group">
                <label>{t('pages.favorites.groupsModal.groupName')}:</label>
                <input
                  type="text"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('common.color')}:</label>
                <input
                  type="color"
                  value={groupFormData.color}
                  onChange={(e) => setGroupFormData({ ...groupFormData, color: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className={editingGroup ? 'btn-primary' : 'btn-success'}>
                  {editingGroup ? t('pages.favorites.groupsModal.saveChanges') : t('pages.favorites.groupsModal.createButton')}
                </button>
                {editingGroup && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingGroup(null)
                      setGroupFormData({ name: '', color: '#4a9eff' })
                    }}
                    className="btn-secondary"
                  >
                    {t('common.cancel')}
                  </button>
                )}
              </div>
            </form>

            <div>
              <h3>{t('common.groups')}</h3>
              {groups.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>{t('pages.favorites.groupsModal.noGroups')}</p>
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
                            ({groupFavorites.length === 1 ? t('pages.favorites.groupsModal.deviceCountOne') : t('pages.favorites.groupsModal.deviceCount', { count: groupFavorites.length })})
                          </span>
                        </div>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                              onClick={() => startEditGroup(group)}
                              className="btn-warning btn-small"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              className="btn-danger btn-small"
                            >
                              {t('common.delete')}
                            </button>
                          </div>
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

