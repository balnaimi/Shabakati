import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPost, apiDelete, apiPut } from '../utils/api'
import { calculateIPRange, getLastOctet } from '../utils/networkUtils'
import { getDescription } from '../utils/descriptionUtils'
import { useAuth } from '../contexts/AuthContext'
import { useTags } from '../hooks/useTags'
import { useTranslation } from '../hooks/useTranslation'
import { useLanguage } from '../contexts/LanguageContext'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import {
  ScanIcon,
  RefreshIcon,
  DeleteIcon,
  EditIcon,
  StarIcon,
  CheckIcon,
  CloseIcon,
  DeviceIcon,
  OnlineIcon,
  OfflineIcon,
  AlertIcon,
  InfoIcon,
  ChevronLeftIcon
} from '../components/Icons'

function NetworkView() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { isAdmin, userType } = useAuth()
  const [network, setNetwork] = useState(null)
  const [hosts, setHosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [ipRange, setIpRange] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState(null)
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const { tags: availableTags } = useTags()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const [editingHostId, setEditingHostId] = useState(null)
  const [editFormData, setEditFormData] = useState({ tagIds: [] })
  const [activeTab, setActiveTab] = useState('devices')
  const [favorites, setFavorites] = useState([])
  const [newHosts, setNewHosts] = useState([])
  const [hiddenNewHosts, setHiddenNewHosts] = useState(new Set())
  const [autoScanEnabled, setAutoScanEnabled] = useState(false)
  const [autoScanInterval, setAutoScanInterval] = useState(300000)
  const [autoScanResults, setAutoScanResults] = useState({ newDevices: [], disconnected: [] })
  const [loadingAutoScan, setLoadingAutoScan] = useState(false)

  useEffect(() => {
    fetchNetwork()
    fetchHosts()
    fetchFavorites()
  }, [id])

  useEffect(() => {
    if (network) {
      setAutoScanEnabled(network.auto_scan_enabled === 1)
      setAutoScanInterval(network.auto_scan_interval || 300000)
      fetchAutoScanResults()
    }
  }, [network])

  const fetchFavorites = async () => {
    try {
      const data = await apiGet('/favorites')
      setFavorites(data)
    } catch (err) {
      console.error('Error fetching favorites:', err)
    }
  }

  const isHostFavorite = (hostId) => {
    return favorites.some(fav => fav.hostId === hostId)
  }

  const handleAddToFavorites = async (hostId) => {
    try {
      await apiPost('/favorites', { hostId: parseInt(hostId) })
      await fetchFavorites()
      alert(t('messages.success.addedToFavorites'))
    } catch (err) {
      alert(`${t('common.error')}: ${err.message}`)
    }
  }

  const handleRemoveFromFavorites = async (hostId) => {
    try {
      const favorite = favorites.find(fav => fav.hostId === hostId)
      if (favorite) {
        await apiDelete(`/favorites/${favorite.id}`)
        await fetchFavorites()
        alert(t('messages.success.removedFromFavorites'))
      }
    } catch (err) {
      alert(`${t('common.error')}: ${err.message}`)
    }
  }

  const handleHideNewHost = (hostId) => {
    setHiddenNewHosts(prev => new Set([...prev, hostId]))
  }

  const handleHideAllNewHosts = () => {
    const allNewHostIds = newHosts.map(h => h.id)
    setHiddenNewHosts(new Set(allNewHostIds))
  }

  const visibleNewHosts = newHosts.filter(host => !hiddenNewHosts.has(host.id))

  const fetchNetwork = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiGet(`/networks/${id}`)
      setNetwork(data)
      
      if (data) {
        const range = calculateIPRange(data.network_id, data.subnet)
        setIpRange(range)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchHosts = async () => {
    try {
      const data = await apiGet(`/networks/${id}/hosts`)
      setHosts(data)
    } catch (err) {
      console.error('Error fetching hosts:', err)
    }
  }

  const fetchAutoScanResults = async () => {
    try {
      const newDevices = await apiGet(`/networks/${id}/auto-scan-results?type=new_device`)
      const disconnected = await apiGet(`/networks/${id}/auto-scan-results?type=disconnected`)
      setAutoScanResults({ 
        newDevices: newDevices.filter(r => r.host), 
        disconnected: disconnected.filter(r => r.host) 
      })
    } catch (err) {
      console.error('Error fetching auto scan results:', err)
    }
  }

  const handleToggleAutoScan = async () => {
    try {
      setLoadingAutoScan(true)
      const newState = !autoScanEnabled
      const result = await apiPost(`/networks/${id}/auto-scan`, {
        enabled: newState,
        interval: autoScanInterval
      })
      setAutoScanEnabled(newState)
      setNetwork(result)
      alert(newState ? t('pages.networkView.autoScanEnabled') : t('pages.networkView.autoScanDisabled'))
    } catch (err) {
      alert(`${t('common.error')}: ${err.message}`)
    } finally {
      setLoadingAutoScan(false)
    }
  }

  const handleScan = async () => {
    try {
      setError(null)
      setScanning(true)
      
      const hostsBeforeScan = [...hosts]
      const existingIPs = new Set(hostsBeforeScan.map(h => h.ip))
      
      const result = await apiPost(`/networks/${id}/scan`, {
        timeout: 2,
        addHosts: true,
        language: language
      })
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      await fetchNetwork()
      const updatedHosts = await apiGet(`/networks/${id}/hosts`)
      setHosts(updatedHosts)
      
      await fetchAutoScanResults()
      
      if (result.addedCount > 0) {
        const newHostsList = updatedHosts.filter(host => !existingIPs.has(host.ip))
        
        if (newHostsList.length > 0) {
          setNewHosts(newHostsList)
          setHiddenNewHosts(new Set())
        }
      }
      
      if (result.hosts && result.hosts.length > 0) {
        const addedCount = result.addedCount || result.hosts.length
        alert(t('pages.networkView.scanResult', { total: result.hosts.length, added: addedCount }))
      } else {
        alert(t('pages.networkView.scanResultNoDevices'))
      }
    } catch (err) {
      console.error('Scan error:', err)
      setError(err.message)
      alert(`${t('common.error')}: ${err.message}`)
    } finally {
      setScanning(false)
    }
  }

  const handleClearNetworkHosts = async () => {
    if (!window.confirm(t('messages.confirm.clearAllHosts'))) {
      return
    }

    try {
      setError(null)
      const result = await apiDelete(`/networks/${id}/hosts`)
      
      await fetchHosts()
      await fetchNetwork()
      
      alert(result.message || t('messages.success.hostsDeleted'))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteHost = async (hostId) => {
    if (!window.confirm(t('messages.confirm.deleteHost'))) {
      return
    }

    try {
      setError(null)
      await apiDelete(`/hosts/${hostId}`)
      
      await fetchHosts()
      await fetchNetwork()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEditHost = (host) => {
    setEditingHostId(host.id)
    const tagIds = host.tags && Array.isArray(host.tags) 
      ? host.tags.map(tag => typeof tag === 'object' ? tag.id : tag)
      : []
    setEditFormData({ tagIds: tagIds })
  }

  const handleCancelEdit = () => {
    setEditingHostId(null)
    setEditFormData({ tagIds: [] })
  }

  const handleUpdateHost = async (e) => {
    e.preventDefault()
    if (!editingHostId) return

    try {
      setError(null)
      const host = hosts.find(h => h.id === editingHostId)
      if (!host) return

      await apiPut(`/hosts/${editingHostId}`, {
        name: host.name,
        ip: host.ip,
        description: host.description || '',
        url: host.url || '',
        status: host.status,
        tagIds: editFormData.tagIds
      })
      
      await fetchHosts()
      handleCancelEdit()
    } catch (err) {
      setError(err.message)
    }
  }

  const filteredHosts = useMemo(() => {
    let filtered = hosts.filter(host => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesName = host.name?.toLowerCase().includes(query)
        const matchesIP = host.ip?.toLowerCase().includes(query)
        if (!matchesName && !matchesIP) {
          return false
        }
      }
      
      if (statusFilter !== 'all' && host.status !== statusFilter) {
        return false
      }
      
      if (tagFilter) {
        const hostTagIds = host.tags?.map(t => typeof t === 'object' ? t.id : t) || []
        if (!hostTagIds.includes(parseInt(tagFilter))) {
          return false
        }
      }
      
      return true
    })
    
    const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' })
    return filtered.sort((a, b) => {
      let aValue, bValue
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          const nameComparison = collator.compare(aValue, bValue)
          return sortOrder === 'asc' ? nameComparison : -nameComparison
        case 'ip':
          const aParts = a.ip.split('.').map(Number)
          const bParts = b.ip.split('.').map(Number)
          for (let i = 0; i < 4; i++) {
            if (aParts[i] !== bParts[i]) {
              return sortOrder === 'asc' ? aParts[i] - bParts[i] : bParts[i] - aParts[i]
            }
          }
          return 0
        case 'status':
          aValue = a.status === 'online' ? 1 : 0
          bValue = b.status === 'online' ? 1 : 0
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
        case 'lastChecked':
          aValue = (a.lastChecked || a.last_checked) ? new Date(a.lastChecked || a.last_checked).getTime() : 0
          bValue = (b.lastChecked || b.last_checked) ? new Date(b.lastChecked || b.last_checked).getTime() : 0
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
        default:
          return 0
      }
    })
  }, [hosts, searchQuery, statusFilter, tagFilter, sortBy, sortOrder])

  const getIPStatus = (ip) => {
    const host = hosts.find(h => h.ip === ip)
    if (!host) return 'empty'
    return host.status === 'online' ? 'online' : 'offline'
  }

  const groupIPsByThirdOctet = (networkId, subnet, allIPs) => {
    const networkParts = networkId.split('.').map(Number)
    const networkNum = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3]
    const hostBits = 32 - subnet
    const mask = 0xFFFFFFFF << hostBits
    const networkBase = networkNum & mask
    const broadcastIP = networkBase + Math.pow(2, hostBits) - 1
    
    const networkIP = `${(networkBase >>> 24) & 0xFF}.${(networkBase >>> 16) & 0xFF}.${(networkBase >>> 8) & 0xFF}.${networkBase & 0xFF}`
    const broadcastIPStr = `${(broadcastIP >>> 24) & 0xFF}.${(broadcastIP >>> 16) & 0xFF}.${(broadcastIP >>> 8) & 0xFF}.${broadcastIP & 0xFF}`
    
    const networkParts2 = networkIP.split('.').map(Number)
    const broadcastParts = broadcastIPStr.split('.').map(Number)
    
    const startThirdOctet = networkParts2[2]
    const endThirdOctet = broadcastParts[2]
    
    const groups = {}
    
    for (let thirdOctet = startThirdOctet; thirdOctet <= endThirdOctet; thirdOctet++) {
      const groupIPs = []
      
      let startFourth = 0
      let endFourth = 255
      
      if (thirdOctet === startThirdOctet) {
        startFourth = 1
      }
      
      if (thirdOctet === endThirdOctet) {
        endFourth = broadcastParts[3] - 1
      }
      
      for (let fourthOctet = startFourth; fourthOctet <= endFourth; fourthOctet++) {
        const ip = `${networkParts2[0]}.${networkParts2[1]}.${thirdOctet}.${fourthOctet}`
        groupIPs.push(ip)
      }
      
      if (groupIPs.length > 0) {
        groups[thirdOctet] = groupIPs
      }
    }
    
    return groups
  }

  if (loading) {
    return <LoadingSpinner fullPage />
  }

  if (!network) {
    return (
      <div className="container">
        <EmptyState
          icon="network"
          title={t('pages.networkView.title')}
          action={() => navigate('/networks')}
          actionLabel={t('common.back')}
        />
      </div>
    )
  }

  const range = ipRange || calculateIPRange(network.network_id, network.subnet)
  const displayRange = range.range.length > 0 ? range.range : []

  return (
    <div className="container">
      <div className="header">
        <h1>{network.name}</h1>
      </div>

      {/* Network Info Card */}
      <div className="card" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
          <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <strong>{t('forms.networkId')}:</strong> 
            <code style={{ 
              fontFamily: 'monospace', 
              backgroundColor: 'var(--bg-tertiary)', 
              padding: '2px 8px', 
              borderRadius: 'var(--radius-sm)' 
            }}>
              {network.network_id}
            </code>
          </p>
          <p style={{ margin: 0 }}>
            <strong>{t('forms.subnet')}:</strong> /{network.subnet}
          </p>
          <p style={{ margin: 0 }}>
            <strong>{t('pages.networkView.range')}:</strong> {range.start} - {range.end} ({range.count} {t('pages.networkView.addresses')})
          </p>
          {network.last_scanned && (
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              <strong>{t('pages.networksList.lastScanned')}:</strong> {new Date(network.last_scanned).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Controls */}
      {isAdmin && (
        <div className="controls">
          <button onClick={handleScan} disabled={scanning} className="btn-primary">
            {scanning ? (
              <>
                <RefreshIcon size={18} className="spinner" />
                <span>{t('pages.networkView.scanning')}</span>
              </>
            ) : (
              <>
                <ScanIcon size={18} />
                <span>{t('pages.networkView.scan')}</span>
              </>
            )}
          </button>
          
          {/* Auto scan toggle */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: `2px solid ${autoScanEnabled ? 'var(--success)' : 'var(--border-color)'}`
          }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--spacing-sm)',
              cursor: 'pointer',
              fontWeight: 'var(--font-weight-medium)',
              fontSize: 'var(--font-size-sm)'
            }}>
              <input
                type="checkbox"
                checked={autoScanEnabled}
                onChange={handleToggleAutoScan}
                disabled={loadingAutoScan}
              />
              <span>{t('pages.networkView.autoScan')}</span>
            </label>
            {autoScanEnabled && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                ({Math.round(autoScanInterval / 60000)} min)
              </span>
            )}
          </div>
          
          <button onClick={handleClearNetworkHosts} className="btn-danger">
            <DeleteIcon size={18} />
            <span>{t('pages.networkView.clearAllHosts')}</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBlockStart: 'var(--spacing-lg)' }}>
        <button
          onClick={() => setActiveTab('devices')}
          className={`tab ${activeTab === 'devices' ? 'active' : ''}`}
        >
          <DeviceIcon size={16} />
          <span>{t('pages.networkView.devices')}</span>
        </button>
        <button
          onClick={() => setActiveTab('ips')}
          className={`tab ${activeTab === 'ips' ? 'active' : ''}`}
        >
          <span>{t('pages.networkView.ipAddresses')}</span>
        </button>
      </div>

      {/* Devices Tab */}
      {activeTab === 'devices' && (
        <>
          {/* New Hosts Section */}
          {visibleNewHosts.length > 0 && (
            <div style={{ 
              marginBlockEnd: 'var(--spacing-xl)',
              padding: 'var(--spacing-lg)',
              backgroundColor: 'var(--success-light)',
              border: '2px solid var(--success)',
              borderRadius: 'var(--radius-lg)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBlockEnd: 'var(--spacing-md)' }}>
                <h2 style={{ margin: 0, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-lg)' }}>
                  <OnlineIcon size={20} />
                  {t('pages.networkView.newDevices')} ({visibleNewHosts.length})
                </h2>
                <button onClick={handleHideAllNewHosts} className="btn-success btn-small">
                  <CheckIcon size={14} />
                  <span>{t('pages.networkView.hideAll')}</span>
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                {visibleNewHosts.map(host => (
                  <div key={host.id} className="card" style={{ padding: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBlockEnd: 'var(--spacing-sm)' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, marginBlockEnd: 'var(--spacing-xs)', fontSize: 'var(--font-size-base)' }}>{host.name}</h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}>{host.ip}</p>
                      </div>
                      <span className={`status-badge ${host.status === 'online' ? 'status-online' : 'status-offline'}`}>
                        {host.status === 'online' ? t('common.online') : t('common.offline')}
                      </span>
                    </div>
                    
                    {getDescription(host.description, language) && (
                      <p style={{ margin: 'var(--spacing-xs) 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        {getDescription(host.description, language)}
                      </p>
                    )}
                    
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBlockStart: 'var(--spacing-sm)' }}>
                      {isAdmin && (
                        <>
                          <button onClick={() => handleEditHost(host)} className="btn-primary btn-small" style={{ flex: 1 }}>
                            <EditIcon size={14} />
                            <span>{t('common.edit')}</span>
                          </button>
                          <button onClick={() => handleHideNewHost(host.id)} className="btn-secondary btn-small btn-icon" title={t('pages.networkView.viewed')}>
                            <CheckIcon size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto-discovered devices section */}
          {autoScanResults.newDevices.length > 0 && (
            <div style={{ 
              marginBlockEnd: 'var(--spacing-xl)',
              padding: 'var(--spacing-lg)',
              backgroundColor: 'var(--success-light)',
              border: '2px solid var(--success)',
              borderRadius: 'var(--radius-lg)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBlockEnd: 'var(--spacing-md)' }}>
                <h2 style={{ margin: 0, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-lg)' }}>
                  <OnlineIcon size={20} />
                  {t('pages.networkView.newDevices')} ({autoScanResults.newDevices.length})
                </h2>
                {isAdmin && (
                  <button
                    onClick={async () => {
                      try {
                        await apiDelete(`/networks/${id}/auto-scan-results?type=new_device`)
                        await fetchAutoScanResults()
                      } catch (err) {
                        alert(`${t('common.error')}: ${err.message}`)
                      }
                    }}
                    className="btn-success btn-small"
                  >
                    {t('pages.networkView.clearList')}
                  </button>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                {autoScanResults.newDevices.map(result => (
                  <div key={result.id} className="card" style={{ padding: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBlockEnd: 'var(--spacing-sm)' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, marginBlockEnd: 'var(--spacing-xs)' }}>{result.host?.name || t('common.unknown')}</h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}>{result.host?.ip || t('common.unknown')}</p>
                        <p style={{ margin: 'var(--spacing-xs) 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                          {new Date(result.discovered_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={`status-badge ${result.host?.status === 'online' ? 'status-online' : 'status-offline'}`}>
                        {result.host?.status === 'online' ? t('common.online') : t('common.offline')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disconnected devices section */}
          {autoScanResults.disconnected.length > 0 && (
            <div style={{ 
              marginBlockEnd: 'var(--spacing-xl)',
              padding: 'var(--spacing-lg)',
              backgroundColor: 'var(--danger-light)',
              border: '2px solid var(--danger)',
              borderRadius: 'var(--radius-lg)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBlockEnd: 'var(--spacing-md)' }}>
                <h2 style={{ margin: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-lg)' }}>
                  <OfflineIcon size={20} />
                  {t('pages.networkView.disconnected')} ({autoScanResults.disconnected.length})
                </h2>
                {isAdmin && (
                  <button
                    onClick={async () => {
                      try {
                        await apiDelete(`/networks/${id}/auto-scan-results?type=disconnected`)
                        await fetchAutoScanResults()
                      } catch (err) {
                        alert(`${t('common.error')}: ${err.message}`)
                      }
                    }}
                    className="btn-danger btn-small"
                  >
                    {t('pages.networkView.clearList')}
                  </button>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                {autoScanResults.disconnected.map(result => (
                  <div key={result.id} className="card" style={{ padding: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBlockEnd: 'var(--spacing-sm)' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, marginBlockEnd: 'var(--spacing-xs)' }}>{result.host?.name || t('common.unknown')}</h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}>{result.host?.ip || t('common.unknown')}</p>
                        <p style={{ margin: 'var(--spacing-xs) 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                          {new Date(result.discovered_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="status-badge status-offline">{t('common.offline')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hosts Table */}
          {hosts.length > 0 && (
            <div style={{ marginBlockStart: 'var(--spacing-xl)' }}>
              <h2 style={{ marginBlockEnd: 'var(--spacing-md)', fontSize: 'var(--font-size-lg)' }}>
                {t('pages.networkView.devices')} ({filteredHosts.length} / {hosts.length})
              </h2>
              
              {/* Filters */}
              <div className="filters">
                <input
                  type="text"
                  placeholder={t('pages.networkView.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: '1 1 auto', minWidth: '200px', maxWidth: '400px' }}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: '180px', flexShrink: 0 }}
                >
                  <option value="all">{t('common.all')}</option>
                  <option value="online">{t('common.online')}</option>
                  <option value="offline">{t('common.offline')}</option>
                </select>
                <select
                  value={tagFilter || 'all'}
                  onChange={(e) => setTagFilter(e.target.value === 'all' ? null : e.target.value)}
                  style={{ width: '180px', flexShrink: 0 }}
                >
                  <option value="all">{t('common.all')}</option>
                  {availableTags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => { if (sortBy === 'name') { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') } else { setSortBy('name'); setSortOrder('asc') } }}>
                        {t('common.name')} {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => { if (sortBy === 'ip') { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') } else { setSortBy('ip'); setSortOrder('asc') } }}>
                        {t('common.ip')} {sortBy === 'ip' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => { if (sortBy === 'status') { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') } else { setSortBy('status'); setSortOrder('asc') } }}>
                        {t('common.status')} {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>{t('common.description')}</th>
                      <th>{t('common.tags')}</th>
                      <th onClick={() => { if (sortBy === 'lastChecked') { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') } else { setSortBy('lastChecked'); setSortOrder('asc') } }}>
                        {t('pages.networksList.lastScanned')} {sortBy === 'lastChecked' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      {userType !== 'visitor' && <th>{t('common.actions')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHosts.map(host => (
                      <tr key={host.id}>
                        <td><strong>{host.name}</strong></td>
                        <td style={{ fontFamily: 'monospace' }}>{host.ip}</td>
                        <td>
                          <span className={`status-badge ${host.status === 'online' ? 'status-online' : 'status-offline'}`}>
                            {host.status === 'online' ? (
                              <><OnlineIcon size={12} /> {t('common.online')}</>
                            ) : (
                              <><OfflineIcon size={12} /> {t('common.offline')}</>
                            )}
                          </span>
                        </td>
                        <td>
                          {(() => {
                            const desc = getDescription(host.description, language);
                            return desc ? (
                              <span title={desc}>{desc.length > 50 ? `${desc.substring(0, 50)}...` : desc}</span>
                            ) : (<span style={{ color: 'var(--text-tertiary)' }}>-</span>);
                          })()}
                        </td>
                        <td>
                          {host.tags && Array.isArray(host.tags) && host.tags.length > 0 ? (
                            <div className="tags-inline">
                              {host.tags.map(tag => (
                                <span 
                                  key={typeof tag === 'object' ? tag.id : tag}
                                  className="tag-badge"
                                  style={{ backgroundColor: typeof tag === 'object' ? (tag.color || 'var(--primary)') : 'var(--primary)' }}
                                >
                                  {typeof tag === 'object' ? tag.name : tag}
                                </span>
                              ))}
                            </div>
                          ) : (<span style={{ color: 'var(--text-tertiary)' }}>-</span>)}
                        </td>
                        <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                          {host.lastChecked || host.last_checked ? new Date(host.lastChecked || host.last_checked).toLocaleString() : (<span style={{ color: 'var(--text-tertiary)' }}>-</span>)}
                        </td>
                        {userType !== 'visitor' && (
                          <td>
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                              {isHostFavorite(host.id) ? (
                                <button onClick={() => handleRemoveFromFavorites(host.id)} className="btn-warning btn-small btn-icon" title={t('pages.networkView.removeFromFavorites')}>
                                  <StarIcon size={14} filled />
                                </button>
                              ) : (
                                <button onClick={() => handleAddToFavorites(host.id)} className="btn-secondary btn-small btn-icon" title={t('pages.networkView.addToFavorites')}>
                                  <StarIcon size={14} />
                                </button>
                              )}
                              {isAdmin && (
                                <>
                                  <button onClick={() => handleEditHost(host)} className="btn-secondary btn-small btn-icon" title={t('common.edit')}>
                                    <EditIcon size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteHost(host.id)} className="btn-danger btn-small btn-icon" title={t('common.delete')}>
                                    <DeleteIcon size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {hosts.length === 0 && (
            <EmptyState
              icon="device"
              title={t('pages.networkView.noHosts')}
              description={t('pages.networkView.scanToAdd')}
              action={isAdmin ? handleScan : null}
              actionLabel={t('pages.networkView.scan')}
            />
          )}
        </>
      )}

      {/* IPs Tab */}
      {activeTab === 'ips' && (
        <>
          {network.subnet < 22 ? (
            <EmptyState
              icon="network"
              title={t('pages.networkView.rangeTooLarge', { count: range.count })}
              description={`${t('pages.networkView.discoveredDevices')}: ${hosts.length}`}
            />
          ) : (
            <>
              {(() => {
                const ipGroups = groupIPsByThirdOctet(network.network_id, network.subnet, displayRange)
                const sortedOctets = Object.keys(ipGroups).map(Number).sort((a, b) => a - b)
                
                return (
                  <div style={{ marginBlockStart: 'var(--spacing-lg)' }}>
                    {sortedOctets.map((thirdOctet) => {
                      const groupIPs = ipGroups[thirdOctet]
                      const networkParts = network.network_id.split('.').map(Number)
                      
                      return (
                        <div key={thirdOctet} style={{ marginBlockEnd: 'var(--spacing-xl)' }}>
                          <h3 style={{ marginBlockEnd: 'var(--spacing-md)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'monospace' }}>
                            {networkParts[0]}.{networkParts[1]}.{thirdOctet}.x
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 'var(--spacing-xs)' }}>
                            {groupIPs.map((ip) => {
                              const status = getIPStatus(ip)
                              const lastOctet = getLastOctet(ip)
                              const host = hosts.find(h => h.ip === ip)
                              
                              let bgColor = 'var(--bg-primary)'
                              let borderColor = 'var(--border-color)'
                              let color = 'var(--text-primary)'
                              
                              if (status === 'online') {
                                bgColor = 'var(--success-light)'
                                borderColor = 'var(--success)'
                                color = 'var(--success)'
                              } else if (status === 'offline') {
                                bgColor = 'var(--danger-light)'
                                borderColor = 'var(--danger)'
                                color = 'var(--danger)'
                              }
                              
                              return (
                                <div
                                  key={ip}
                                  title={host ? t('pages.networkView.deviceInfo', { name: host.name, ip: ip, status: host.status === 'online' ? t('common.online') : t('common.offline') }) : t('pages.networkView.ipAvailable', { ip: ip })}
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    backgroundColor: bgColor,
                                    border: `2px solid ${borderColor}`,
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 'var(--font-weight-semibold)',
                                    color: color,
                                    cursor: 'pointer',
                                    transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.1)'
                                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)'
                                    e.currentTarget.style.boxShadow = 'none'
                                  }}
                                  onClick={() => {
                                    if (host) {
                                      alert(t('pages.networkView.deviceInfo', { name: host.name, ip: ip, status: host.status === 'online' ? t('common.online') : t('common.offline') }))
                                    } else {
                                      alert(t('pages.networkView.ipAvailable', { ip: ip }))
                                    }
                                  }}
                                >
                                  {lastOctet}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              
              {/* Statistics */}
              <div className="card" style={{ marginBlockStart: 'var(--spacing-xl)' }}>
                <h3 style={{ margin: 0, marginBlockEnd: 'var(--spacing-md)' }}>
                  <InfoIcon size={18} style={{ marginInlineEnd: 'var(--spacing-sm)' }} />
                  {t('pages.networkView.statistics')}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)' }}>
                  <p style={{ margin: 0 }}><OnlineIcon size={16} style={{ color: 'var(--success)' }} /> {t('pages.networkView.onlineDevices')}: <strong>{hosts.filter(h => h.status === 'online').length}</strong></p>
                  <p style={{ margin: 0 }}><OfflineIcon size={16} style={{ color: 'var(--danger)' }} /> {t('pages.networkView.offlineDevices')}: <strong>{hosts.filter(h => h.status === 'offline').length}</strong></p>
                  <p style={{ margin: 0 }}><DeviceIcon size={16} /> {t('pages.networkView.totalDevices')}: <strong>{hosts.length}</strong></p>
                  <p style={{ margin: 0 }}>{t('pages.networkView.availableIPs')}: <strong>{displayRange.length - hosts.length}</strong></p>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Edit Host Modal */}
      {editingHostId && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('pages.networkView.editHostTags')}</h2>
              <button onClick={handleCancelEdit} className="btn-ghost btn-icon">
                <CloseIcon size={20} />
              </button>
            </div>
            
            {hosts.find(h => h.id === editingHostId) && (
              <div style={{ 
                marginBlockEnd: 'var(--spacing-lg)', 
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)'
              }}>
                <p style={{ margin: 0 }}><strong>{t('common.name')}:</strong> {hosts.find(h => h.id === editingHostId).name}</p>
                <p style={{ margin: 0 }}><strong>{t('common.ip')}:</strong> {hosts.find(h => h.id === editingHostId).ip}</p>
              </div>
            )}
            
            <form onSubmit={handleUpdateHost}>
              <div style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
                <label style={{ display: 'block', marginBlockEnd: 'var(--spacing-sm)', fontWeight: 'var(--font-weight-semibold)' }}>{t('common.tags')}:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {availableTags.map(tag => (
                    <label key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editFormData.tagIds.includes(tag.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditFormData({ ...editFormData, tagIds: [...editFormData.tagIds, tag.id] })
                          } else {
                            setEditFormData({ ...editFormData, tagIds: editFormData.tagIds.filter(id => id !== tag.id) })
                          }
                        }}
                      />
                      <span className="tag-badge" style={{ backgroundColor: tag.color || 'var(--primary)' }}>{tag.name}</span>
                    </label>
                  ))}
                  {availableTags.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)' }}>{t('pages.networkView.noTagsAvailable')}</p>
                  )}
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" onClick={handleCancelEdit} className="btn-secondary">
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
    </div>
  )
}

export default NetworkView
