import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag, Plus, Edit, Edit2, Trash2, Trash, XCircle, Save } from 'lucide-react'
import { API_URL } from '../constants'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import './TagsManagement.css'

function TagsManagement({ theme }) {
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
    return <div style={{ padding: '20px', textAlign: 'center' }}>جاري التحميل...</div>
  }

  return (
    <div className="tags-management-page">
      <header className="page-header">
        <h1>
          <Tag size={28} className="header-icon" />
          <span>إدارة الوسوم</span>
        </h1>
        <button className="back-btn" onClick={() => navigate('/')}>
          العودة للعرض
        </button>
      </header>

      {error && (
        <div className="error-message">
          <XCircle size={20} />
          {error}
        </div>
      )}

      <div className="tags-section">
        <div className="section-header">
          <button className="add-tag-btn" onClick={() => { setShowAddForm(true); setEditingTag(null); setFormData({ name: '', color: '#4a9eff' }) }}>
            <Plus size={18} />
            إضافة وسم جديد
          </button>
          <h2>الوسوم ({tags.length})</h2>
        </div>

        {(showAddForm || editingTag) && (
          <form onSubmit={editingTag ? handleUpdateTag : handleAddTag} className="tag-form">
            <input
              type="text"
              placeholder="اسم الوسم"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
            <div className="form-actions">
              <button type="submit" className="submit-btn">
                <Save size={16} />
                {editingTag ? 'حفظ التعديلات' : 'إضافة'}
              </button>
              <button type="button" className="cancel-btn" onClick={() => { setShowAddForm(false); setEditingTag(null); setFormData({ name: '', color: '#4a9eff' }) }}>
                إلغاء
              </button>
            </div>
          </form>
        )}

        <div className="tags-grid">
          {tags.map(tag => (
            <div key={tag.id} className="tag-card">
              <div className="tag-color" style={{ backgroundColor: tag.color }}></div>
              <div className="tag-info">
                <h3>{tag.name}</h3>
              </div>
              <div className="tag-actions">
                <button onClick={() => startEdit(tag)} title="تعديل" className="edit-tag-btn">
                  {theme === 'light' ? <Edit2 size={16} /> : <Edit size={16} />}
                </button>
                <button onClick={() => handleDeleteTag(tag.id)} title="حذف" className="delete-tag-btn">
                  {theme === 'light' ? <Trash size={16} /> : <Trash2 size={16} />}
                </button>
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

