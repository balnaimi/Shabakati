import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../utils/api'
import { useTranslation } from '../hooks/useTranslation'
import { calculateIPRange, getLastOctet } from '../utils/networkUtils'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { NetworkIcon, AlertIcon } from '../components/Icons'

function AvailableIPs() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [networks, setNetworks] = useState([])
  const [selectedNetworkId, setSelectedNetworkId] = useState(null)
  const [availableIPs, setAvailableIPs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingIPs, setLoadingIPs] = useState(false)
  const [error, setError] = useState(null)
  const [rangeInfo, setRangeInfo] = useState(null)
  const [rangeIsLarge, setRangeIsLarge] = useState(false)

  useEffect(() => {
    fetchNetworks()
  }, [])

  useEffect(() => {
    if (networks.length === 1 && !selectedNetworkId) {
      setSelectedNetworkId(networks[0].id)
    }
  }, [networks, selectedNetworkId])

  useEffect(() => {
    if (selectedNetworkId) {
      fetchAvailableIPs(selectedNetworkId)
    } else {
      setAvailableIPs([])
      setRangeInfo(null)
      setRangeIsLarge(false)
    }
  }, [selectedNetworkId])

  const fetchNetworks = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiGet('/networks')
      setNetworks(data)
      if (data.length === 1) {
        setSelectedNetworkId(data[0].id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const groupByThirdOctet = (ips) => {
    const groups = {}
    for (const ip of ips) {
      const parts = ip.split('.').map(Number)
      if (parts.length !== 4) continue
      const third = parts[2]
      if (!groups[third]) groups[third] = []
      groups[third].push(ip)
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => getLastOctet(a) - getLastOctet(b))
    }
    return groups
  }

  const fetchAvailableIPs = async (networkId) => {
    const network = networks.find(n => n.id === networkId)
    if (!network) return
    try {
      setLoadingIPs(true)
      setError(null)
      const hosts = await apiGet(`/networks/${networkId}/hosts`)
      const usedIPs = new Set(hosts.map(h => h.ip))
      let rangeResult
      try {
        rangeResult = calculateIPRange(network.network_id, network.subnet)
      } catch (e) {
        setError(e.message)
        setAvailableIPs([])
        setRangeInfo(null)
        return
      }
      const { range, start, end, count } = rangeResult
      setRangeInfo({ start, end, count })
      const largeRange = !range || range.length === 0
      setRangeIsLarge(largeRange && count > 0)
      if (range && range.length > 0) {
        const available = range.filter(ip => !usedIPs.has(ip))
        setAvailableIPs(available)
      } else {
        setAvailableIPs([])
      }
    } catch (err) {
      setError(err.message)
      setAvailableIPs([])
      setRangeInfo(null)
      setRangeIsLarge(false)
    } finally {
      setLoadingIPs(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullPage />
  }

  return (
    <div className="container">
      <div className="header">
        <h1>{t('pages.availableIPs.title')}</h1>
      </div>

      {error && (
        <div className="error-message">
          <AlertIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {networks.length === 0 ? (
        <EmptyState
          icon="network"
          title={t('pages.availableIPs.noNetworks')}
          description={t('pages.availableIPs.noNetworksDescription')}
          action={() => navigate('/networks')}
          actionLabel={t('pages.networksList.view')}
        />
      ) : (
        <>
          {networks.length > 1 && (
            <div className="form-group" style={{ marginBlockEnd: 'var(--spacing-lg)', maxWidth: '320px' }}>
              <label>{t('pages.availableIPs.selectNetwork')}</label>
              <select
                value={selectedNetworkId ?? ''}
                onChange={(e) => setSelectedNetworkId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">{t('pages.availableIPs.chooseNetwork')}</option>
                {networks.map(network => (
                  <option key={network.id} value={network.id}>
                    {network.name} ({network.network_id}/{network.subnet})
                  </option>
                ))}
              </select>
            </div>
          )}

          {loadingIPs && selectedNetworkId ? (
            <LoadingSpinner />
          ) : selectedNetworkId && (
            <>
              {rangeIsLarge && rangeInfo && (
                <p style={{ color: 'var(--text-secondary)', marginBlockEnd: 'var(--spacing-md)' }}>
                  {t('pages.availableIPs.rangeOnly', {
                    count: rangeInfo.count,
                    start: rangeInfo.start,
                    end: rangeInfo.end
                  })}
                </p>
              )}
              {rangeInfo && rangeInfo.count === 0 && (
                <p style={{ color: 'var(--text-secondary)' }}>{t('pages.availableIPs.noAvailableInRange')}</p>
              )}
              {!rangeIsLarge && availableIPs.length === 0 && rangeInfo && rangeInfo.count > 0 && (
                <EmptyState
                  icon="network"
                  title={t('pages.availableIPs.noAvailableIPs')}
                  description={t('pages.availableIPs.noAvailableIPsDescription')}
                  action={() => navigate('/networks')}
                  actionLabel={t('pages.networksList.view')}
                />
              )}
              {availableIPs.length > 0 ? (
                (() => {
                  const network = networks.find(n => n.id === selectedNetworkId)
                  if (!network) return null
                  const networkParts = network.network_id.split('.').map(Number)
                  const ipGroups = groupByThirdOctet(availableIPs)
                  const sortedOctets = Object.keys(ipGroups).map(Number).sort((a, b) => a - b)
                  return (
                    <div style={{ marginBlockStart: 'var(--spacing-lg)' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBlockEnd: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                        {t('pages.availableIPs.availableCount', { count: availableIPs.length })}
                      </p>
                      {sortedOctets.map((thirdOctet) => {
                        const groupIPs = ipGroups[thirdOctet]
                        return (
                          <div key={thirdOctet} style={{ marginBlockEnd: 'var(--spacing-xl)' }}>
                            <h3 style={{ marginBlockEnd: 'var(--spacing-md)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'monospace' }}>
                              {networkParts[0]}.{networkParts[1]}.{thirdOctet}.x
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 'var(--spacing-xs)' }}>
                              {groupIPs.map((ip) => (
                                <div
                                  key={ip}
                                  title={ip}
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '2px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 'var(--font-weight-semibold)',
                                    color: 'var(--text-primary)',
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
                                >
                                  {getLastOctet(ip)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default AvailableIPs
