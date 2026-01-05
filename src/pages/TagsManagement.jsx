import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

function TagsManagement() {
  const navigate = useNavigate()
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingTag, setEditingTag] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', color: '#4a9eff' })

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiGet('/tags')
      setTags(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('اسم الوسم مطلوب')
      return
    }

    try {
      setError(null)
      await apiPost('/tags', formData)
      setFormData({ name: '', color: '#4a9eff' })
      setShowAddForm(false)
      fetchTags()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateTag = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('اسم الوسم مطلوب')
      return
    }

    try {
      setError(null)
      await apiPut(`/tags/${editingTag.id}`, formData)
      setEditingTag(null)
      setFormData({ name: '', color: '#4a9eff' })
      fetchTags()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteTag = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الوسم؟')) return
    try {
      setError(null)
      await apiDelete(`/tags/${id}`)
      fetchTags()
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
    return <div className="loading">جاري التحميل...</div>
  }

  return (
    <div className="container">
      <div className="header">
        <h1>إدارة الوسوم</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/hosts')}>الرجوع</button>
          <button onClick={() => navigate('/')}>الصفحة الرئيسية</button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div>
        <div className="controls">
          <button onClick={() => { setShowAddForm(true); setEditingTag(null); setFormData({ name: '', color: '#4a9eff' }) }}>
            إضافة وسم جديد
          </button>
        </div>
        <h2>الوسوم ({tags.length})</h2>

        {(showAddForm || editingTag) && (
          <form className="form" onSubmit={editingTag ? handleUpdateTag : handleAddTag}>
            <div className="form-group">
              <input
                type="text"
                placeholder="اسم الوسم"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>اللون:</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="submit">
                {editingTag ? 'حفظ التعديلات' : 'إضافة'}
              </button>
              <button type="button" onClick={() => { setShowAddForm(false); setEditingTag(null); setFormData({ name: '', color: '#4a9eff' }) }}>
                إلغاء
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
                <button onClick={() => startEdit(tag)}>تعديل</button>
                <button onClick={() => handleDeleteTag(tag.id)}>حذف</button>
              </div>
            </div>
          ))}
        </div>

        {tags.length === 0 && !showAddForm && (
          <div className="empty-state">
            <p>لا توجد وسوم. أضف وسم جديد للبدء.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TagsManagement
