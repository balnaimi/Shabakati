import EmptyState from '../../components/EmptyState'
import IpAddress from '../../components/IpAddress'
import { getLastOctet, isIPInInclusiveRange, filterStaticAvailableIps } from '../../utils/networkUtils'
import { getHostDisplayName } from '../../utils/hostDisplay'
import { OnlineIcon, OfflineIcon, DeviceIcon, InfoIcon } from '../../components/Icons'
import { groupIPsByThirdOctet, ipCellColors } from './utils'

export default function IpAddressGrid({
  network,
  range,
  displayRange,
  hosts,
  hasDhcpRange,
  dhcpRangeStart,
  dhcpRangeEnd,
  getIPStatus,
  toast,
  t
}) {
  if (network.subnet < 22) {
    return (
      <EmptyState
        icon="network"
        title={t('pages.networkView.rangeTooLarge', { count: range.count })}
        description={`${t('pages.networkView.discoveredDevices')}: ${hosts.length}`}
      />
    )
  }

  const ipGroups = groupIPsByThirdOctet(network.network_id, network.subnet)
  const sortedOctets = Object.keys(ipGroups).map(Number).sort((a, b) => a - b)
  const dhcpContext = { hasDhcpRange, dhcpRangeStart, dhcpRangeEnd }

  return (
    <>
      {hasDhcpRange && (
        <p
          style={{
            margin: 0,
            marginBlockEnd: 'var(--spacing-md)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--dhcp-pool-light)',
              border: '2px solid var(--dhcp-pool)',
              flexShrink: 0
            }}
            aria-hidden
          />
          {t('pages.networkView.dhcpPoolLegend')}
        </p>
      )}
      <div style={{ marginBlockStart: 'var(--spacing-lg)' }}>
        {sortedOctets.map((thirdOctet) => {
          const groupIPs = ipGroups[thirdOctet]
          const networkParts = network.network_id.split('.').map(Number)

          return (
            <div key={thirdOctet} style={{ marginBlockEnd: 'var(--spacing-xl)' }}>
              <h3 style={{ marginBlockEnd: 'var(--spacing-md)', fontWeight: 'var(--font-weight-semibold)' }}>
                <IpAddress as="span">{networkParts[0]}.{networkParts[1]}.{thirdOctet}.x</IpAddress>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 'var(--spacing-xs)' }}>
                {groupIPs.map((ip) => {
                  const status = getIPStatus(ip)
                  const lastOctet = getLastOctet(ip)
                  const host = hosts.find(h => h.ip === ip)
                  const inDhcpPool =
                    hasDhcpRange &&
                    isIPInInclusiveRange(ip, dhcpRangeStart, dhcpRangeEnd)
                  const { bgColor, borderColor, color } = ipCellColors(ip, status, dhcpContext)
                  const emptyTitle = inDhcpPool
                    ? t('pages.networkView.dhcpPoolIp', { ip })
                    : t('pages.networkView.ipAvailable', { ip })
                  const displayName = host ? getHostDisplayName(host) : null

                  return (
                    <div
                      key={ip}
                      title={
                        host
                          ? t('pages.networkView.deviceInfo', {
                              name: displayName,
                              ip,
                              status:
                                host.status === 'online'
                                  ? t('common.online')
                                  : t('common.offline')
                            })
                          : emptyTitle
                      }
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
                          toast.info(
                            t('pages.networkView.deviceInfo', {
                              name: displayName,
                              ip,
                              status:
                                host.status === 'online'
                                  ? t('common.online')
                                  : t('common.offline')
                            }),
                            6000
                          )
                        } else {
                          toast.info(t('pages.networkView.ipAvailable', { ip }), 5000)
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

      <div className="card" style={{ marginBlockStart: 'var(--spacing-xl)' }}>
        <h3 style={{ margin: 0, marginBlockEnd: 'var(--spacing-md)' }}>
          <InfoIcon size={18} style={{ marginInlineEnd: 'var(--spacing-sm)' }} />
          {t('pages.networkView.statistics')}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)' }}>
          <p style={{ margin: 0 }}><OnlineIcon size={16} style={{ color: 'var(--success)' }} /> {t('pages.networkView.onlineDevices')}: <strong>{hosts.filter(h => h.status === 'online').length}</strong></p>
          <p style={{ margin: 0 }}><OfflineIcon size={16} style={{ color: 'var(--danger)' }} /> {t('pages.networkView.offlineDevices')}: <strong>{hosts.filter(h => h.status === 'offline').length}</strong></p>
          <p style={{ margin: 0 }}><DeviceIcon size={16} /> {t('pages.networkView.totalDevices')}: <strong>{hosts.length}</strong></p>
          <p style={{ margin: 0 }}>{t('pages.networkView.availableIPs')}: <strong>{filterStaticAvailableIps(displayRange, hosts.map(h => h.ip), hasDhcpRange ? { start: dhcpRangeStart, end: dhcpRangeEnd } : null).length}</strong></p>
        </div>
      </div>
    </>
  )
}
