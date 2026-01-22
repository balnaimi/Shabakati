import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiGet, apiDelete, apiPost, apiPut } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../hooks/useTranslation'

function NetworksList() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { t } = useTranslation()
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingNetworkId, setEditingNetworkId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', networkId: '', subnet: '' })

  useEffect(() => {
    fetchNetworks()
  }, [])

  const fetchNetworks = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiGet('/networks')
      setNetworks(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNetwork = async (id) => {
    if (!window.confirm(t('messages.confirm.deleteNetwork'))) return
    try {
      setError(null)
      await apiDelete(`/networks/${id}`)
      fetchNetworks()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleStartEdit = (network) => {
    setEditingNetworkId(network.id)
    setFormData({
      name: network.name,
      networkId: network.network_id,
      subnet: network.subnet.toString()
    })
    setShowAddForm(true)
  }

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>
  }

  return (
    <div className="container">
      <div className="header">
        <h1>{t('pages.networksList.title')}</h1>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="controls">
        {isAdmin && (
          <button onClick={() => {
            setShowAddForm(true)
            setEditingNetworkId(null)
            setFormData({ name: '', networkId: '', subnet: '' })
          }}>
            {t('pages.networksList.addNetwork')}
          </button>
        )}
      </div>

      {showAddForm && (
        <AddNetworkForm
          networkId={editingNetworkId}
          formData={formData}
          setFormData={setFormData}
          onClose={() => {
            setShowAddForm(false)
            setEditingNetworkId(null)
            setFormData({ name: '', networkId: '', subnet: '' })
          }}
          onSuccess={() => {
            setShowAddForm(false)
            setEditingNetworkId(null)
            setFormData({ name: '', networkId: '', subnet: '' })
            fetchNetworks()
          }}
          apiPost={apiPost}
          apiPut={apiPut}
        />
      )}

      {networks.length === 0 ? (
        <div className="empty-state">
          <p>{t('pages.networksList.noNetworks')}</p>
        </div>
      ) : (
        <div className="tags-list">
          {networks.map(network => (
            <div key={network.id} className="tag-item">
              <div>
                <h3>{network.name}</h3>
                <p>{network.network_id}/{network.subnet}</p>
                {network.last_scanned && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {t('pages.networksList.lastScanned')}: {new Date(network.last_scanned).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="tag-actions">
                <button onClick={() => navigate(`/networks/${network.id}`)} className="btn-primary">{t('pages.networksList.view')}</button>
                {isAdmin && (
                  <>
                    <button onClick={() => handleStartEdit(network)} className="btn-warning">{t('common.edit')}</button>
                    <button onClick={() => handleDeleteNetwork(network.id)} className="btn-danger">{t('common.delete')}</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AddNetworkForm({ networkId, formData, setFormData, onClose, onSuccess, apiPost, apiPut }) {
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { t } = useTranslation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError(t('forms.networkNameRequired'))
      return
    }
    if (!formData.networkId.trim()) {
      setError(t('forms.networkIdRequired'))
      return
    }
    if (!formData.subnet || parseInt(formData.subnet) < 0 || parseInt(formData.subnet) > 32) {
      setError(t('forms.subnetRequired'))
      return
    }

    try {
      setError(null)
      setSubmitting(true)
      
      if (networkId) {
        await apiPut(`/networks/${networkId}`, {
          name: formData.name.trim(),
          networkId: formData.networkId.trim(),
          subnet: parseInt(formData.subnet)
        })
      } else {
        await apiPost('/networks', {
          name: formData.name.trim(),
          networkId: formData.networkId.trim(),
          subnet: parseInt(formData.subnet)
        })
      }
      
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>{t('forms.networkName')} *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder={t('forms.networkName')}
        />
      </div>

      <div className="form-group">
        <label>{t('forms.networkId')} *</label>
        <input
          type="text"
          value={formData.networkId}
          onChange={(e) => setFormData({ ...formData, networkId: e.target.value })}
          required
          placeholder={t('forms.networkId')}
        />
      </div>

      <div className="form-group">
        <label>{t('forms.subnet')} *</label>
        <input
          type="number"
          min="0"
          max="32"
          value={formData.subnet}
          onChange={(e) => setFormData({ ...formData, subnet: e.target.value })}
          required
          placeholder={t('forms.subnet')}
        />
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="form-actions">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? t('common.loading') : (networkId ? t('pages.tagsManagement.saveChanges') : t('common.add'))}
        </button>
        <button type="button" onClick={onClose}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

export default NetworksList

