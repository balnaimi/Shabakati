import IpAddress from '../../components/IpAddress'
import { NetworkIcon, ChevronDownIcon, ChevronUpIcon } from '../../components/Icons'

export default function NetworkInfoCard({
  network,
  networkInfoExpanded,
  onToggleExpanded,
  range,
  hasDhcpRange,
  dhcpRangeStart,
  dhcpRangeEnd,
  isRTL,
  t
}) {
  return (
    <div className="card" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
      <button
        type="button"
        className="btn-ghost"
        onClick={onToggleExpanded}
        aria-expanded={networkInfoExpanded}
        aria-label={
          networkInfoExpanded
            ? t('pages.networkView.collapseNetworkDetails')
            : t('pages.networkView.expandNetworkDetails')
        }
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          justifyContent: 'start',
          fontWeight: 'var(--font-weight-semibold)',
          fontSize: 'var(--font-size-base)',
          color: 'var(--text-primary)',
          padding: 'var(--spacing-xs) var(--spacing-sm)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'start'
        }}
      >
        <NetworkIcon size={20} />
        <span
          style={{
            flex: '1 1 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            flexWrap: 'wrap',
            justifyContent: 'start',
            minWidth: 0,
            textAlign: 'start'
          }}
        >
          <span>{t('pages.networkView.networkDetailsTitle')}</span>
          {!networkInfoExpanded && (
            <IpAddress className="ip-badge">
              {network.network_id}/{network.subnet}
            </IpAddress>
          )}
        </span>
        {networkInfoExpanded ? <ChevronUpIcon size={22} /> : <ChevronDownIcon size={22} />}
      </button>
      {networkInfoExpanded && (
        <div
          style={{
            display: 'grid',
            gap: 'var(--spacing-sm)',
            marginBlockStart: 'var(--spacing-md)',
            paddingBlockStart: 'var(--spacing-md)',
            borderTop: '1px solid var(--border-color-light)'
          }}
        >
          <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap', textAlign: 'start' }}>
            <strong>{t('forms.networkId')}:</strong>
            <IpAddress className="ip-badge">{network.network_id}</IpAddress>
          </p>
          <p style={{ margin: 0 }}>
            <strong>{t('forms.subnet')}:</strong> /{network.subnet}
          </p>
          <p style={{ margin: 0 }}>
            <strong>{t('pages.networkView.range')}:</strong>{' '}
            <IpAddress as="span">{range.start} - {range.end}</IpAddress> ({range.count}{' '}
            {t('pages.networkView.addresses')})
          </p>
          {hasDhcpRange && (
            <p
              style={{
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                flexWrap: 'wrap'
              }}
            >
              <strong>{t('pages.networkView.dhcpPool')}</strong>
              {isRTL ? '\u200e : ' : ': '}
              <IpAddress className="ip-badge ip-badge-dhcp">
                {dhcpRangeStart} – {dhcpRangeEnd}
              </IpAddress>
            </p>
          )}
          {network.last_scanned && (
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              <strong>{t('pages.networksList.lastScanned')}:</strong>{' '}
              {new Date(network.last_scanned).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
