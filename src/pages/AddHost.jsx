import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, ArrowRight, XCircle } from 'lucide-react'
import { API_URL } from '../constants'
import { apiPost } from '../utils/api'
import './AddHost.css'

function AddHost({ theme }) {
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

  return (
    <div className="add-host-page">
      <header className="page-header">
        <h1>
          <PlusCircle size={28} className="header-icon" />
          <span>إضافة مضيف جديد</span>
        </h1>
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowRight size={18} style={{ marginLeft: '8px' }} />
          العودة للعرض
        </button>
      </header>

      {error && (
        <div className="error-message">
          <XCircle size={20} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="add-host-form">
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

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={checking}>
            {checking ? 'جاري الإضافة...' : 'إضافة المضيف'}
          </button>
          <button type="button" className="cancel-btn" onClick={() => navigate('/')}>
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddHost

