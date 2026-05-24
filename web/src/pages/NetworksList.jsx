import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiDelete, apiPost, apiPut } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../hooks/useTranslation'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import IpAddress from '../components/IpAddress'
import { useToast } from '../components/Toast'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import { 
  PlusIcon, 
  EditIcon, 
  DeleteIcon, 
  EyeIcon,
  NetworkIcon,
  CloseIcon,
  AlertIcon
} from '../components/Icons'
import { formatClientError, toastApiError } from '../utils/formatClientError'
import { isValidIP } from '../utils/networkUtils'

function NetworksList() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { t } = useTranslation()
  const toast = useToast()
  const { confirm, confirmDialogSlot } = useConfirmDialog()
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingNetworkId, setEditingNetworkId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    networkId: '',
    subnet: '',
    dhcpRangeStart: '',
    dhcpRangeEnd: ''
  })

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
      setError(formatClientError(err, t))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNetwork = async (id) => {
    const ok = await confirm({
      title: t('common.confirm'),
      message: t('messages.confirm.deleteNetwork'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      confirmClassName: 'btn-danger'
    })
    if (!ok) return
    try {
      setError(null)
      await apiDelete(`/networks/${id}`)
      const data = await apiGet('/networks')
      setNetworks(data)
      toast.success(t('messages.success.networkDeleted'))
    } catch (err) {
      setError(formatClientError(err, t))
      toastApiError(toast, t, err)
    }
  }

  const handleStartEdit = (network) => {
    setEditingNetworkId(network.id)
    setFormData({
      name: network.name,
      networkId: network.network_id,
      subnet: network.subnet.toString(),
      dhcpRangeStart: network.dhcp_range_start || '',
      dhcpRangeEnd: network.dhcp_range_end || ''
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
            setFormData({ name: '', networkId: '', subnet: '', dhcpRangeStart: '', dhcpRangeEnd: '' })
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
            setFormData({ name: '', networkId: '', subnet: '', dhcpRangeStart: '', dhcpRangeEnd: '' })
          }}
          onSuccess={() => {
            setShowAddForm(false)
            setEditingNetworkId(null)
            setFormData({ name: '', networkId: '', subnet: '', dhcpRangeStart: '', dhcpRangeEnd: '' })
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
                <IpAddress as="p">
                  {network.network_id}/{network.subnet}
                </IpAddress>
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
      {confirmDialogSlot}
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

    const dhcpStart = formData.dhcpRangeStart.trim()
    const dhcpEnd = formData.dhcpRangeEnd.trim()
    if ((dhcpStart && !dhcpEnd) || (!dhcpStart && dhcpEnd)) {
      setError(t('forms.dhcpRangeBothOrNone'))
      return
    }
    if (dhcpStart && dhcpEnd) {
      if (!isValidIP(dhcpStart) || !isValidIP(dhcpEnd)) {
        setError(t('forms.dhcpRangeInvalidIp'))
        return
      }
    }

    try {
      setError(null)
      setSubmitting(true)
      
      const dhcpPayload =
        dhcpStart && dhcpEnd
          ? { dhcp_range_start: dhcpStart, dhcp_range_end: dhcpEnd }
          : { dhcp_range_start: null, dhcp_range_end: null }

      if (networkId) {
        await apiPut(`/networks/${networkId}`, {
          name: formData.name.trim(),
          networkId: formData.networkId.trim(),
          subnet: parseInt(formData.subnet),
          ...dhcpPayload
        })
      } else {
        await apiPost('/networks', {
          name: formData.name.trim(),
          networkId: formData.networkId.trim(),
          subnet: parseInt(formData.subnet),
          ...dhcpPayload
        })
      }
      
      onSuccess()
    } catch (err) {
      setError(formatClientError(err, t))
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

      <form noValidate onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t('forms.networkName')} *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('forms.networkName')}
          />
        </div>

        <div className="form-group">
          <label>{t('forms.networkId')} *</label>
          <input
            type="text"
            value={formData.networkId}
            onChange={(e) => setFormData({ ...formData, networkId: e.target.value })}
            placeholder="192.168.1.0"
            className="ip-address"
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
            placeholder="24"
          />
        </div>

        <div className="form-group">
          <label>{t('forms.dhcpRange')}</label>
          <p style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            {t('forms.dhcpRangeHelp')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)' }}>{t('forms.dhcpRangeStart')}</label>
              <input
                type="text"
                value={formData.dhcpRangeStart}
                onChange={(e) => setFormData({ ...formData, dhcpRangeStart: e.target.value })}
                placeholder="192.168.1.100"
                className="ip-address"
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)' }}>{t('forms.dhcpRangeEnd')}</label>
              <input
                type="text"
                value={formData.dhcpRangeEnd}
                onChange={(e) => setFormData({ ...formData, dhcpRangeEnd: e.target.value })}
                placeholder="192.168.1.200"
                className="ip-address"
              />
            </div>
          </div>
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
