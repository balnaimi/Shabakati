import IpAddress from '../../components/IpAddress'
import { getDescription } from '../../utils/descriptionUtils'
import { getHostDisplayName } from '../../utils/hostDisplay'
import {
  OnlineIcon,
  OfflineIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EditIcon,
  CheckIcon
} from '../../components/Icons'
import { formatDeviceIntel } from './utils'

export default function DiscoveryPanels({
  visibleNewHosts,
  manualNewHostsExpanded,
  onToggleManualNewHosts,
  onHideAllNewHosts,
  onHideNewHost,
  onEditHost,
  autoScanResults,
  autoNewDevicesExpanded,
  onToggleAutoNewDevices,
  onClearAutoNewDevices,
  disconnectedExpanded,
  onToggleDisconnected,
  onClearDisconnected,
  isAdmin,
  language,
  t
}) {
  return (
    <>
      {visibleNewHosts.length > 0 && (
        <div style={{
          marginBlockEnd: 'var(--spacing-xl)',
          padding: 'var(--spacing-lg)',
          backgroundColor: 'var(--success-light)',
          border: '1px solid var(--success)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--spacing-sm)', justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={onToggleManualNewHosts}
              aria-expanded={manualNewHostsExpanded}
              aria-label={manualNewHostsExpanded ? t('pages.networkView.collapseDeviceList') : t('pages.networkView.expandDeviceList')}
              style={{
                flex: '1 1 220px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                justifyContent: 'start',
                fontWeight: 'var(--font-weight-semibold)',
                fontSize: 'var(--font-size-lg)',
                color: 'var(--success)',
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <OnlineIcon size={20} />
              <span style={{ flex: 1, textAlign: 'start' }}>
                {t('pages.networkView.newDevicesManual')} ({visibleNewHosts.length})
              </span>
              {manualNewHostsExpanded ? <ChevronUpIcon size={22} /> : <ChevronDownIcon size={22} />}
            </button>
            <button type="button" onClick={onHideAllNewHosts} className="btn-success btn-small">
              <CheckIcon size={14} />
              <span>{t('pages.networkView.hideAll')}</span>
            </button>
          </div>

          {manualNewHostsExpanded && (
            <div
              style={{
                marginBlockStart: 'var(--spacing-md)',
                maxHeight: 'min(55vh, 440px)',
                overflowY: 'auto',
                paddingInlineEnd: 'var(--spacing-xs)'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                {visibleNewHosts.map(host => (
                  <div key={host.id} className="card" style={{ padding: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBlockEnd: 'var(--spacing-sm)' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, marginBlockEnd: 'var(--spacing-xs)', fontSize: 'var(--font-size-base)' }}>{getHostDisplayName(host)}</h3>
                        {formatDeviceIntel(host, t)}
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}><IpAddress>{host.ip}</IpAddress></p>
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
                          <button type="button" onClick={() => onEditHost(host)} className="btn-primary btn-small" style={{ flex: 1 }}>
                            <EditIcon size={14} />
                            <span>{t('common.edit')}</span>
                          </button>
                          <button type="button" onClick={() => onHideNewHost(host.id)} className="btn-secondary btn-small btn-icon" title={t('pages.networkView.viewed')}>
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
        </div>
      )}

      {autoScanResults.newDevices.length > 0 && (
        <div style={{
          marginBlockEnd: 'var(--spacing-xl)',
          padding: 'var(--spacing-lg)',
          backgroundColor: 'var(--success-light)',
          border: '1px solid var(--success)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--spacing-sm)', justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={onToggleAutoNewDevices}
              aria-expanded={autoNewDevicesExpanded}
              aria-label={autoNewDevicesExpanded ? t('pages.networkView.collapseDeviceList') : t('pages.networkView.expandDeviceList')}
              style={{
                flex: '1 1 220px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                justifyContent: 'start',
                fontWeight: 'var(--font-weight-semibold)',
                fontSize: 'var(--font-size-lg)',
                color: 'var(--success)',
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <OnlineIcon size={20} />
              <span style={{ flex: 1, textAlign: 'start' }}>
                {t('pages.networkView.newDevicesAutoScan')} ({autoScanResults.newDevices.length})
              </span>
              {autoNewDevicesExpanded ? <ChevronUpIcon size={22} /> : <ChevronDownIcon size={22} />}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={onClearAutoNewDevices}
                className="btn-success btn-small"
              >
                {t('pages.networkView.clearList')}
              </button>
            )}
          </div>

          {autoNewDevicesExpanded && (
            <div
              style={{
                marginBlockStart: 'var(--spacing-md)',
                maxHeight: 'min(55vh, 440px)',
                overflowY: 'auto',
                paddingInlineEnd: 'var(--spacing-xs)'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                {autoScanResults.newDevices.map(result => (
                  <div key={result.id} className="card" style={{ padding: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBlockEnd: 'var(--spacing-sm)' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, marginBlockEnd: 'var(--spacing-xs)' }}>{result.host ? getHostDisplayName(result.host) : t('common.unknown')}</h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}><IpAddress>{result.host?.ip || t('common.unknown')}</IpAddress></p>
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
        </div>
      )}

      {autoScanResults.disconnected.length > 0 && (
        <div style={{
          marginBlockEnd: 'var(--spacing-xl)',
          padding: 'var(--spacing-lg)',
          backgroundColor: 'var(--danger-light)',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--spacing-sm)', justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={onToggleDisconnected}
              aria-expanded={disconnectedExpanded}
              aria-label={disconnectedExpanded ? t('pages.networkView.collapseDeviceList') : t('pages.networkView.expandDeviceList')}
              style={{
                flex: '1 1 220px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                justifyContent: 'start',
                fontWeight: 'var(--font-weight-semibold)',
                fontSize: 'var(--font-size-lg)',
                color: 'var(--danger)',
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <OfflineIcon size={20} />
              <span style={{ flex: 1, textAlign: 'start' }}>
                {t('pages.networkView.disconnected')} ({autoScanResults.disconnected.length})
              </span>
              {disconnectedExpanded ? <ChevronUpIcon size={22} /> : <ChevronDownIcon size={22} />}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={onClearDisconnected}
                className="btn-danger btn-small"
              >
                {t('pages.networkView.clearList')}
              </button>
            )}
          </div>

          {disconnectedExpanded && (
            <div
              style={{
                marginBlockStart: 'var(--spacing-md)',
                maxHeight: 'min(55vh, 440px)',
                overflowY: 'auto',
                paddingInlineEnd: 'var(--spacing-xs)'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                {autoScanResults.disconnected.map(result => (
                  <div key={result.id} className="card" style={{ padding: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBlockEnd: 'var(--spacing-sm)' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, marginBlockEnd: 'var(--spacing-xs)' }}>{result.host ? getHostDisplayName(result.host) : t('common.unknown')}</h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}><IpAddress>{result.host?.ip || t('common.unknown')}</IpAddress></p>
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
        </div>
      )}
    </>
  )
}
