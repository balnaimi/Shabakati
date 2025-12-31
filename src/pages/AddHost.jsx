import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiPost } from '../utils/api'

function AddHost() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [availableTags, setAvailableTags] = useState([])
  const [loadingTags, setLoadingTags] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    ip: '',
    description: '',
    url: '',
    tagIds: []
  })
  const [checking, setChecking] = useState(false)

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.ip.trim()) {
      setError('اسم المضيف وعنوان IP مطلوبان')
      return
    }

    try {
      setError(null)
      setChecking(true)
      await apiPost('/hosts', formData)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  const handleTagToggle = (tagId) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }))
  }

  return (
    <div className="container">
      <div className="header">
        <h1>إضافة جهاز جديد</h1>
        <button onClick={() => navigate('/')}>العودة للعرض</button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">اسم المضيف *</label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="مثال: Server-01"
          />
        </div>

        <div className="form-group">
          <label htmlFor="ip">عنوان IP *</label>
          <input
            type="text"
            id="ip"
            value={formData.ip}
            onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
            required
            placeholder="مثال: 192.168.1.100"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">الوصف</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="وصف اختياري للمضيف"
            rows="3"
          />
        </div>

        <div className="form-group">
          <label htmlFor="url">URL (اختياري)</label>
          <input
            type="url"
            id="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://example.com"
          />
        </div>

        {!loadingTags && availableTags.length > 0 && (
          <div className="form-group">
            <label>الوسوم</label>
            <div>
              {availableTags.map(tag => (
                <label key={tag.id}>
                  <input
                    type="checkbox"
                    checked={formData.tagIds.includes(tag.id)}
                    onChange={() => handleTagToggle(tag.id)}
                  />
                  {tag.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" disabled={checking}>
            {checking ? 'جاري الإضافة...' : 'إضافة المضيف'}
          </button>
          <button type="button" onClick={() => navigate('/')}>
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddHost
