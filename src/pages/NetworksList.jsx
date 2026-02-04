import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiDelete, apiPost, apiPut } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../hooks/useTranslation'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { 
  PlusIcon, 
  EditIcon, 
  DeleteIcon, 
  EyeIcon,
  NetworkIcon,
  CloseIcon,
  AlertIcon
} from '../components/Icons'

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
    return <LoadingSpinner fullPage />
  }

  return (
    <div className="container">
      <div className="header">
        <h1>{t('pages.networksList.title')}</h1>
      </div>

      {error && (
        <div className="error-message">
          <AlertIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {isAdmin && (
        <div className="controls">
          <button onClick={() => {
            setShowAddForm(true)
            setEditingNetworkId(null)
            setFormData({ name: '', networkId: '', subnet: '' })
          }} className="btn-success">
            <PlusIcon size={18} />
            <span>{t('pages.networksList.addNetwork')}</span>
          </button>
        </div>
      )}

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
        <EmptyState
          icon="network"
          title={t('pages.networksList.noNetworks')}
          action={isAdmin ? () => setShowAddForm(true) : null}
          actionLabel={t('pages.networksList.addNetwork')}
        />
      ) : (
        <div className="tags-list">
          {networks.map(network => (
            <div key={network.id} className="tag-item">
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  margin: 0,
                  marginBlockEnd: 'var(--spacing-xs)',
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 'var(--font-weight-semibold)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)'
                }}>
                  <NetworkIcon size={20} />
                  {network.name}
                </h3>
                <p style={{ 
                  margin: 0,
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'monospace'
                }}>
                  {network.network_id}/{network.subnet}
                </p>
                {network.last_scanned && (
                  <p style={{ 
                    margin: 0,
                    marginBlockStart: 'var(--spacing-sm)',
                    fontSize: 'var(--font-size-xs)', 
                    color: 'var(--text-tertiary)' 
                  }}>
                    {t('pages.networksList.lastScanned')}: {new Date(network.last_scanned).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="tag-actions">
                <button onClick={() => navigate(`/networks/${network.id}`)} className="btn-primary">
                  <EyeIcon size={16} />
                  <span>{t('pages.networksList.view')}</span>
                </button>
                {isAdmin && (
                  <>
                    <button onClick={() => handleStartEdit(network)} className="btn-warning btn-icon" title={t('common.edit')}>
                      <EditIcon size={16} />
                    </button>
                    <button onClick={() => handleDeleteNetwork(network.id)} className="btn-danger btn-icon" title={t('common.delete')}>
                      <DeleteIcon size={16} />
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
          {networkId ? t('common.edit') : t('pages.networksList.addNetwork')}
        </h3>
        <button onClick={onClose} className="btn-ghost btn-icon">
          <CloseIcon size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
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
            placeholder="192.168.1.0"
            style={{ fontFamily: 'monospace' }}
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
            placeholder="24"
          />
        </div>

        {error && (
          <div className="error-message" style={{ marginBlockEnd: 'var(--spacing-md)' }}>
            <AlertIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-secondary">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? t('common.loading') : (networkId ? t('pages.tagsManagement.saveChanges') : t('common.add'))}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NetworksList
