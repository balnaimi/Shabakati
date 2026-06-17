import {
  OnlineIcon,
  OfflineIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EditIcon,
  CheckIcon
} from '../../components/Icons'
import DiscoveryDeviceList from '../../components/DiscoveryDeviceList'
import { formatDateTime } from '../../utils/dateFormat'

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
  const panelHeaderBtnStyle = {
    flex: '1 1 220px',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    justifyContent: 'start',
    fontWeight: 'var(--font-weight-semibold)',
    fontSize: 'var(--font-size-base)',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderRadius: 'var(--radius-md)'
  }

  const listScrollStyle = {
    marginBlockStart: 'var(--spacing-sm)',
    maxHeight: 'min(55vh, 440px)',
    overflowY: 'auto',
    paddingInlineEnd: 'var(--spacing-xs)'
  }

  return (
    <>
      {visibleNewHosts.length > 0 && (
        <div className="discovery-panel discovery-panel-success">
          <div className="discovery-panel-header">
            <button
              type="button"
              className="btn-ghost"
              onClick={onToggleManualNewHosts}
              aria-expanded={manualNewHostsExpanded}
              aria-label={manualNewHostsExpanded ? t('pages.networkView.collapseDeviceList') : t('pages.networkView.expandDeviceList')}
              style={{ ...panelHeaderBtnStyle, color: 'var(--success)' }}
            >
              <OnlineIcon size={18} />
              <span style={{ flex: 1, textAlign: 'start' }}>
                {t('pages.networkView.newDevicesManual')} ({visibleNewHosts.length})
              </span>
              {manualNewHostsExpanded ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}
            </button>
            <button type="button" onClick={onHideAllNewHosts} className="btn-success btn-small">
              <CheckIcon size={14} />
              <span>{t('pages.networkView.hideAll')}</span>
            </button>
          </div>

          {manualNewHostsExpanded && (
            <div style={listScrollStyle}>
              <DiscoveryDeviceList
                items={visibleNewHosts}
                t={t}
                renderActions={(_, host) => isAdmin ? (
                  <>
                    <button type="button" onClick={() => onEditHost(host)} className="btn-primary btn-icon-small" title={t('common.edit')}>
                      <EditIcon size={14} />
                    </button>
                    <button type="button" onClick={() => onHideNewHost(host.id)} className="btn-secondary btn-icon-small" title={t('pages.networkView.viewed')}>
                      <CheckIcon size={14} />
                    </button>
                  </>
                ) : null}
              />
            </div>
          )}
        </div>
      )}

      {autoScanResults.newDevices.length > 0 && (
        <div className="discovery-panel discovery-panel-success">
          <div className="discovery-panel-header">
            <button
              type="button"
              className="btn-ghost"
              onClick={onToggleAutoNewDevices}
              aria-expanded={autoNewDevicesExpanded}
              aria-label={autoNewDevicesExpanded ? t('pages.networkView.collapseDeviceList') : t('pages.networkView.expandDeviceList')}
              style={{ ...panelHeaderBtnStyle, color: 'var(--success)' }}
            >
              <OnlineIcon size={18} />
              <span style={{ flex: 1, textAlign: 'start' }}>
                {t('pages.networkView.newDevicesAutoScan')} ({autoScanResults.newDevices.length})
              </span>
              {autoNewDevicesExpanded ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}
            </button>
            {isAdmin && (
              <button type="button" onClick={onClearAutoNewDevices} className="btn-success btn-small">
                {t('pages.networkView.clearList')}
              </button>
            )}
          </div>

          {autoNewDevicesExpanded && (
            <div style={listScrollStyle}>
              <DiscoveryDeviceList
                items={autoScanResults.newDevices}
                t={t}
                renderExtra={(item) => item.discovered_at ? (
                  <span className="device-list-date">{formatDateTime(item.discovered_at, language)}</span>
                ) : null}
              />
            </div>
          )}
        </div>
      )}

      {autoScanResults.disconnected.length > 0 && (
        <div className="discovery-panel discovery-panel-danger">
          <div className="discovery-panel-header">
            <button
              type="button"
              className="btn-ghost"
              onClick={onToggleDisconnected}
              aria-expanded={disconnectedExpanded}
              aria-label={disconnectedExpanded ? t('pages.networkView.collapseDeviceList') : t('pages.networkView.expandDeviceList')}
              style={{ ...panelHeaderBtnStyle, color: 'var(--danger)' }}
            >
              <OfflineIcon size={18} />
              <span style={{ flex: 1, textAlign: 'start' }}>
                {t('pages.networkView.disconnected')} ({autoScanResults.disconnected.length})
              </span>
              {disconnectedExpanded ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}
            </button>
            {isAdmin && (
              <button type="button" onClick={onClearDisconnected} className="btn-danger btn-small">
                {t('pages.networkView.clearList')}
              </button>
            )}
          </div>

          {disconnectedExpanded && (
            <div style={listScrollStyle}>
              <DiscoveryDeviceList
                items={autoScanResults.disconnected}
                t={t}
                renderExtra={(item) => item.discovered_at ? (
                  <span className="device-list-date">{formatDateTime(item.discovered_at, language)}</span>
                ) : null}
              />
            </div>
          )}
        </div>
      )}
    </>
  )
}
