import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../hooks/useTranslation'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { 
  PlusIcon, 
  FolderIcon, 
  EditIcon, 
  DeleteIcon, 
  ExternalLinkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CloseIcon,
  NetworkIcon,
  DeviceIcon,
  OnlineIcon,
  OfflineIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  AlertIcon
} from '../components/Icons'

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
  const [groupFormData, setGroupFormData] = useState({ name: '', color: '#3b82f6' })
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
      setGroupFormData({ name: '', color: '#3b82f6' })
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
      setGroupFormData({ name: '', color: '#3b82f6' })
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
      const currentGroup = groups.find(g => g.id === groupId)
      if (!currentGroup) return

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

      const groupsWithFavorites = sortedGroups.filter(group => favoritesByGroup[group.id.toString()])
      const currentIndex = groupsWithFavorites.findIndex(g => g.id === groupId)
      if (currentIndex <= 0) return

      const previousGroup = groupsWithFavorites[currentIndex - 1]
      if (!previousGroup) return
      
      const newCurrentOrder = currentIndex - 1
      const newPreviousOrder = currentIndex

      await Promise.all([
        apiPut(`/groups/${groupId}`, { displayOrder: newCurrentOrder }),
        apiPut(`/groups/${previousGroup.id}`, { displayOrder: newPreviousOrder })
      ])

      await fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleMoveGroupDown = async (groupId) => {
    if (!groupId) return
    
    try {
      setError(null)
      const currentGroup = groups.find(g => g.id === groupId)
      if (!currentGroup) return

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

      const groupsWithFavorites = sortedGroups.filter(group => favoritesByGroup[group.id.toString()])
      const currentIndex = groupsWithFavorites.findIndex(g => g.id === groupId)
      if (currentIndex < 0 || currentIndex >= groupsWithFavorites.length - 1) return

      const nextGroup = groupsWithFavorites[currentIndex + 1]
      if (!nextGroup) return
      
      const newCurrentOrder = currentIndex + 1
      const newNextOrder = currentIndex

      await Promise.all([
        apiPut(`/groups/${groupId}`, { displayOrder: newCurrentOrder }),
        apiPut(`/groups/${nextGroup.id}`, { displayOrder: newNextOrder })
      ])

      await fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  // Get sorted groups list
  const sortedGroupsList = (() => {
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

    const list = sortedGroups
      .filter(group => favoritesByGroup[group.id.toString()])
      .map(group => group.id.toString())
    
    if (favoritesByGroup['ungrouped']) {
      list.push('ungrouped')
    }

    return list
  })()

  const getGroupName = (groupId) => {
    if (!groupId) return t('common.withoutGroup')
    const group = groups.find(g => g.id === groupId)
    return group ? group.name : t('common.unknown')
  }

  const getGroupColor = (groupId) => {
    if (!groupId) return '#64748b'
    const group = groups.find(g => g.id === groupId)
    return group ? group.color : '#64748b'
  }

  const availableHosts = allHosts.filter(host => 
    !favorites.some(fav => fav.hostId === host.id)
  )

  if (loading) {
    return <LoadingSpinner fullPage />
  }

  return (
    <div className="container">
      <div className="header">
        <h1>{t('pages.favorites.title')}</h1>
        {isAdmin && (
          <div className="controls">
            <button onClick={() => setShowAddModal(true)} className="btn-success">
              <PlusIcon size={18} />
              <span>{t('pages.favorites.addDevice')}</span>
            </button>
            <button onClick={() => setShowGroupModal(true)} className="btn-primary">
              <FolderIcon size={18} />
              <span>{t('pages.favorites.manageGroups')}</span>
            </button>
          </div>
        )}
        
        <div className="stats">
          <button
            type="button"
            className="stat-item stat-item-clickable"
            onClick={() => navigate('/networks')}
          >
            <p>{t('pages.favorites.totalNetworks')}</p>
            <p>{stats.totalNetworks}</p>
          </button>
          <div className="stat-item">
            <p>{t('pages.favorites.totalHosts')}</p>
            <p>{stats.totalHosts}</p>
          </div>
          <div className="stat-item">
            <p>{t('pages.favorites.onlineHosts')}</p>
            <p style={{ color: 'var(--success)' }}>{stats.onlineHosts}</p>
          </div>
          <div className="stat-item">
            <p>{t('pages.favorites.offlineHosts')}</p>
            <p style={{ color: 'var(--danger)' }}>{stats.offlineHosts}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {favorites.length === 0 ? (
        <EmptyState
          icon="favorite"
          title={t('pages.favorites.noFavorites')}
          description={isAdmin ? t('pages.favorites.noFavoritesAdmin') : t('pages.favorites.noFavoritesVisitor')}
          action={isAdmin ? () => setShowAddModal(true) : null}
          actionLabel={t('pages.favorites.addDevice')}
        />
      ) : (
        <div style={{ marginBlockStart: 'var(--spacing-lg)' }}>
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
              <div key={groupId} style={{ marginBlockEnd: 'var(--spacing-xl)' }}>
                <div
                  className="group-header"
                  style={{ backgroundColor: groupColor }}
                >
                  {isAdmin && !isUngrouped && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoveGroupUp(groupIdNum)
                        }}
                        disabled={!canMoveUp}
                        className="btn-ghost btn-icon-small"
                        style={{
                          color: 'inherit',
                          opacity: canMoveUp ? 1 : 0.4,
                          padding: '2px'
                        }}
                        title={t('pages.favorites.moveUp')}
                      >
                        <ArrowUpIcon size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoveGroupDown(groupIdNum)
                        }}
                        disabled={!canMoveDown}
                        className="btn-ghost btn-icon-small"
                        style={{
                          color: 'inherit',
                          opacity: canMoveDown ? 1 : 0.4,
                          padding: '2px'
                        }}
                        title={t('pages.favorites.moveDown')}
                      >
                        <ArrowDownIcon size={14} />
                      </button>
                    </div>
                  )}
                  <span
                    onClick={() => toggleGroup(groupId)}
                    style={{ 
                      fontSize: 'var(--font-size-lg)', 
                      fontWeight: 'var(--font-weight-semibold)', 
                      flex: 1, 
                      cursor: 'pointer' 
                    }}
                  >
                    {groupName}
                  </span>
                  <span
                    onClick={() => toggleGroup(groupId)}
                    style={{ 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)'
                    }}
                  >
                    <span>({groupFavorites.length})</span>
                    {isCollapsed ? <ChevronDownIcon size={18} /> : <ChevronUpIcon size={18} />}
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
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start', 
                          marginBlockEnd: 'var(--spacing-sm)' 
                        }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ 
                              margin: 0, 
                              marginBlockEnd: 'var(--spacing-xs)', 
                              color: 'var(--text-primary)',
                              fontSize: 'var(--font-size-lg)',
                              fontWeight: 'var(--font-weight-semibold)'
                            }}>
                              {favorite.customName || favorite.host.name}
                            </h3>
                            <p style={{ 
                              margin: 0, 
                              color: 'var(--text-secondary)', 
                              fontSize: 'var(--font-size-sm)' 
                            }}>
                              {favorite.host.ip}
                            </p>
                          </div>
                          <span className={`status-badge ${favorite.host.status === 'online' ? 'status-online' : 'status-offline'}`}>
                            {favorite.host.status === 'online' ? (
                              <><OnlineIcon size={12} /> {t('common.online')}</>
                            ) : (
                              <><OfflineIcon size={12} /> {t('common.offline')}</>
                            )}
                          </span>
                        </div>

                        {favorite.description && (
                          <p style={{ 
                            margin: 'var(--spacing-xs) 0', 
                            fontSize: 'var(--font-size-sm)', 
                            color: 'var(--text-secondary)', 
                            fontStyle: 'italic' 
                          }}>
                            {favorite.description}
                          </p>
                        )}

                        {favorite.url && (
                          <p style={{ 
                            margin: 'var(--spacing-xs) 0', 
                            fontSize: 'var(--font-size-xs)', 
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-xs)'
                          }}>
                            <ExternalLinkIcon size={12} />
                            {favorite.url}
                          </p>
                        )}

                        {favorite.host.tags && favorite.host.tags.length > 0 && (
                          <div className="tags-inline" style={{ marginBlockStart: 'var(--spacing-sm)' }}>
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

                        <div style={{ 
                          display: 'flex', 
                          gap: 'var(--spacing-xs)', 
                          marginBlockStart: 'var(--spacing-md)' 
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenUrl(favorite)
                            }}
                            className="btn-primary btn-small"
                            style={{ flex: 1 }}
                          >
                            <ExternalLinkIcon size={14} />
                            <span>{t('common.open')}</span>
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditFavorite(favorite)
                                }}
                                className="btn-warning btn-small btn-icon"
                                title={t('common.edit')}
                              >
                                <EditIcon size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteFavorite(favorite.id)
                                }}
                                className="btn-danger btn-small btn-icon"
                                title={t('common.delete')}
                              >
                                <DeleteIcon size={14} />
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
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('pages.favorites.addFavoriteModal.title')}</h2>
              <button onClick={() => setShowAddModal(false)} className="btn-ghost btn-icon">
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleAddFavorite}>
              <div className="form-group">
                <label>
                  <DeviceIcon size={14} />
                  <span>{t('common.device')}:</span>
                </label>
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
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)', marginBlockStart: 'var(--spacing-xs)' }}>
                    {t('pages.favorites.addFavoriteModal.allDevicesInFavorites')}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>
                  <ExternalLinkIcon size={14} />
                  <span>{t('common.url')} ({t('common.optional')}):</span>
                </label>
                <input
                  type="text"
                  value={addFormData.url}
                  onChange={(e) => setAddFormData({ ...addFormData, url: e.target.value })}
                  placeholder={t('pages.favorites.addFavoriteModal.urlPlaceholder')}
                />
              </div>

              <div className="form-group">
                <label>
                  <FolderIcon size={14} />
                  <span>{t('common.group')} ({t('common.optional')}):</span>
                </label>
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
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={availableHosts.length === 0} className="btn-primary">
                  <PlusIcon size={16} />
                  <span>{t('common.add')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Favorite Modal */}
      {showEditModal && editingFavorite && (
        <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditingFavorite(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('pages.favorites.editFavoriteModal.title')}</h2>
              <button onClick={() => { setShowEditModal(false); setEditingFavorite(null) }} className="btn-ghost btn-icon">
                <CloseIcon size={20} />
              </button>
            </div>

            <div style={{ 
              marginBlockEnd: 'var(--spacing-lg)',
              padding: 'var(--spacing-md)',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)'
            }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                <strong>{t('pages.favorites.editFavoriteModal.device')}:</strong> {editingFavorite.host.name} ({editingFavorite.host.ip})
              </p>
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
                <small style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                  {t('pages.favorites.editFavoriteModal.customNameHint')}
                </small>
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
                <button type="button" onClick={() => { setShowEditModal(false); setEditingFavorite(null) }} className="btn-secondary">
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
        <div className="modal-overlay" onClick={() => { setShowGroupModal(false); setEditingGroup(null); setGroupFormData({ name: '', color: '#3b82f6' }) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('pages.favorites.groupsModal.title')}</h2>
              <button onClick={() => { setShowGroupModal(false); setEditingGroup(null); setGroupFormData({ name: '', color: '#3b82f6' }) }} className="btn-ghost btn-icon">
                <CloseIcon size={20} />
              </button>
            </div>

            <form 
              onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup} 
              style={{ 
                marginBlockEnd: 'var(--spacing-xl)',
                padding: 'var(--spacing-lg)',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-lg)'
              }}
            >
              <h3 style={{ marginBlockStart: 0, marginBlockEnd: 'var(--spacing-md)', fontSize: 'var(--font-size-base)' }}>
                {editingGroup ? t('pages.favorites.groupsModal.editGroup') : t('pages.favorites.groupsModal.createGroup')}
              </h3>
              <div className="form-group">
                <label>{t('pages.favorites.groupsModal.groupName')}:</label>
                <input
                  type="text"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBlockEnd: 'var(--spacing-md)' }}>
                <label>{t('common.color')}:</label>
                <input
                  type="color"
                  value={groupFormData.color}
                  onChange={(e) => setGroupFormData({ ...groupFormData, color: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <button type="submit" className={editingGroup ? 'btn-primary' : 'btn-success'}>
                  {editingGroup ? t('pages.favorites.groupsModal.saveChanges') : t('pages.favorites.groupsModal.createButton')}
                </button>
                {editingGroup && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingGroup(null)
                      setGroupFormData({ name: '', color: '#3b82f6' })
                    }}
                    className="btn-secondary"
                  >
                    {t('common.cancel')}
                  </button>
                )}
              </div>
            </form>

            <div>
              <h3 style={{ marginBlockEnd: 'var(--spacing-md)', fontSize: 'var(--font-size-base)' }}>{t('common.groups')}</h3>
              {groups.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>{t('pages.favorites.groupsModal.noGroups')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {groups.map(group => {
                    const groupFavorites = favorites.filter(fav => fav.groupId === group.id)
                    return (
                      <div key={group.id} className="tag-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              backgroundColor: group.color,
                              borderRadius: 'var(--radius-sm)'
                            }}
                          />
                          <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }}>{group.name}</span>
                          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                            ({groupFavorites.length === 1 ? t('pages.favorites.groupsModal.deviceCountOne') : t('pages.favorites.groupsModal.deviceCount', { count: groupFavorites.length })})
                          </span>
                        </div>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                            <button onClick={() => startEditGroup(group)} className="btn-warning btn-small btn-icon" title={t('common.edit')}>
                              <EditIcon size={14} />
                            </button>
                            <button onClick={() => handleDeleteGroup(group.id)} className="btn-danger btn-small btn-icon" title={t('common.delete')}>
                              <DeleteIcon size={14} />
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
