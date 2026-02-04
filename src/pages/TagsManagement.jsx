import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost, apiPut, apiDelete } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useTags } from '../hooks/useTags'
import { useTranslation } from '../hooks/useTranslation'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  TagIcon,
  CloseIcon,
  AlertIcon
} from '../components/Icons'

function TagsManagement() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { tags, loading, error: tagsError, refetch: fetchTags } = useTags()
  const { t } = useTranslation()
  const [error, setError] = useState(null)
  const [editingTag, setEditingTag] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', color: '#3b82f6' })

  const handleAddTag = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError(t('pages.tagsManagement.tagNameRequired'))
      return
    }

    try {
      setError(null)
      await apiPost('/tags', formData)
      setFormData({ name: '', color: '#3b82f6' })
      setShowAddForm(false)
      await fetchTags()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateTag = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError(t('pages.tagsManagement.tagNameRequired'))
      return
    }

    try {
      setError(null)
      await apiPut(`/tags/${editingTag.id}`, formData)
      setEditingTag(null)
      setFormData({ name: '', color: '#3b82f6' })
      await fetchTags()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteTag = async (id) => {
    if (!window.confirm(t('messages.confirm.deleteTag'))) return
    try {
      setError(null)
      await apiDelete(`/tags/${id}`)
      await fetchTags()
    } catch (err) {
      setError(err.message)
    }
  }

  const startEdit = (tag) => {
    setEditingTag(tag)
    setFormData({ name: tag.name, color: tag.color })
    setShowAddForm(false)
  }

  if (loading) {
    return <LoadingSpinner fullPage />
  }

  return (
    <div className="container">
      <div className="header">
        <h1>{t('pages.tagsManagement.title')}</h1>
      </div>

      {(error || tagsError) && (
        <div className="error-message">
          <AlertIcon size={18} />
          <span>{error || tagsError}</span>
        </div>
      )}

      {isAdmin && (
        <div className="controls">
          <button onClick={() => { 
            setShowAddForm(true); 
            setEditingTag(null); 
            setFormData({ name: '', color: '#3b82f6' }) 
          }} className="btn-success">
            <PlusIcon size={18} />
            <span>{t('pages.tagsManagement.addTag')}</span>
          </button>
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingTag) && (
        <div style={{
          marginBlockEnd: 'var(--spacing-xl)',
          padding: 'var(--spacing-lg)',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBlockEnd: 'var(--spacing-lg)'
          }}>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
              {editingTag ? t('common.edit') : t('pages.tagsManagement.addTag')}
            </h3>
            <button 
              onClick={() => { 
                setShowAddForm(false); 
                setEditingTag(null); 
                setFormData({ name: '', color: '#3b82f6' }) 
              }} 
              className="btn-ghost btn-icon"
            >
              <CloseIcon size={20} />
            </button>
          </div>

          <form onSubmit={editingTag ? handleUpdateTag : handleAddTag}>
            <div className="form-group">
              <label>
                <TagIcon size={14} />
                <span>{t('pages.tagsManagement.tagName')}</span>
              </label>
              <input
                type="text"
                placeholder={t('pages.tagsManagement.tagName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
              <label>{t('common.color')}:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
                <span 
                  className="tag-badge" 
                  style={{ backgroundColor: formData.color }}
                >
                  {formData.name || t('pages.tagsManagement.tagName')}
                </span>
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => { 
                  setShowAddForm(false); 
                  setEditingTag(null); 
                  setFormData({ name: '', color: '#3b82f6' }) 
                }}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary">
                {editingTag ? t('pages.tagsManagement.saveChanges') : t('common.add')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tags List */}
      <div>
        <h2 style={{ 
          marginBlockEnd: 'var(--spacing-lg)', 
          fontSize: 'var(--font-size-xl)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)'
        }}>
          <TagIcon size={24} />
          {t('pages.tagsManagement.tags')} ({tags.length})
        </h2>

        {tags.length === 0 && !showAddForm ? (
          <EmptyState
            icon="tag"
            title={t('pages.tagsManagement.noTags')}
            action={isAdmin ? () => setShowAddForm(true) : null}
            actionLabel={t('pages.tagsManagement.addTag')}
          />
        ) : (
          <div className="tags-list">
            {tags.map(tag => (
              <div key={tag.id} className="tag-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: tag.color,
                      borderRadius: 'var(--radius-sm)',
                      flexShrink: 0
                    }}
                  />
                  <h3 style={{ 
                    margin: 0,
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 'var(--font-weight-medium)'
                  }}>
                    {tag.name}
                  </h3>
                </div>
                {isAdmin && (
                  <div className="tag-actions">
                    <button 
                      onClick={() => startEdit(tag)} 
                      className="btn-warning btn-icon"
                      title={t('common.edit')}
                    >
                      <EditIcon size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteTag(tag.id)} 
                      className="btn-danger btn-icon"
                      title={t('common.delete')}
                    >
                      <DeleteIcon size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TagsManagement
