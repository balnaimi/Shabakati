import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiPost, apiPut, apiDelete } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useTags } from '../hooks/useTags'
import { useTranslation } from '../hooks/useTranslation'

function TagsManagement() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { tags, loading, error: tagsError, refetch: fetchTags } = useTags()
  const { t } = useTranslation()
  const [error, setError] = useState(null)
  const [editingTag, setEditingTag] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', color: '#4a9eff' })

  const handleAddTag = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError(t('pages.tagsManagement.tagNameRequired'))
      return
    }

    try {
      setError(null)
      await apiPost('/tags', formData)
      setFormData({ name: '', color: '#4a9eff' })
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
      setFormData({ name: '', color: '#4a9eff' })
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
    return <div className="loading">{t('common.loading')}</div>
  }

  return (
    <div className="container">
      <div className="header">
        <h1>{t('pages.tagsManagement.title')}</h1>
      </div>

      {(error || tagsError) && (
        <div className="error-message">
          {error || tagsError}
        </div>
      )}

      <div>
        <div className="controls">
          {isAdmin && (
            <button onClick={() => { setShowAddForm(true); setEditingTag(null); setFormData({ name: '', color: '#4a9eff' }) }}>
              {t('pages.tagsManagement.addTag')}
            </button>
          )}
        </div>
        <h2>{t('pages.tagsManagement.tags')} ({tags.length})</h2>

        {(showAddForm || editingTag) && (
          <form className="form" onSubmit={editingTag ? handleUpdateTag : handleAddTag}>
            <div className="form-group">
              <input
                type="text"
                placeholder={t('pages.tagsManagement.tagName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>{t('common.color')}:</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingTag ? t('pages.tagsManagement.saveChanges') : t('common.add')}
              </button>
              <button type="button" onClick={() => { setShowAddForm(false); setEditingTag(null); setFormData({ name: '', color: '#4a9eff' }) }}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}

        <div className="tags-list">
          {tags.map(tag => (
            <div key={tag.id} className="tag-item">
              <div>
                <h3>{tag.name}</h3>
              </div>
              <div className="tag-actions">
                {isAdmin && (
                  <>
                    <button onClick={() => startEdit(tag)} className="btn-warning">{t('common.edit')}</button>
                    <button onClick={() => handleDeleteTag(tag.id)} className="btn-danger">{t('common.delete')}</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {tags.length === 0 && !showAddForm && (
          <div className="empty-state">
            <p>{t('pages.tagsManagement.noTags')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TagsManagement
