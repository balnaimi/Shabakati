import { COMMON_TCP_SCAN_PORTS } from '@shared/scanTcpPorts.js'
import { ScanIcon, ChevronDownIcon, ChevronUpIcon } from '../../components/Icons'
import { OFFLINE_RELEASE_OPTIONS } from './constants'

export default function ScanMethodCard({
  scanMethodExpanded,
  onToggleExpanded,
  scanUsePing,
  onScanUsePingChange,
  scanUseTcp,
  onScanUseTcpChange,
  offlineReleaseAfterMs,
  onOfflineReleaseAfterMsChange,
  savingScanPrefs,
  onSaveScanPreferences,
  t
}) {
  return (
    <div className="card" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
      <button
        type="button"
        className="btn-ghost"
        onClick={onToggleExpanded}
        aria-expanded={scanMethodExpanded}
        aria-label={
          scanMethodExpanded
            ? t('pages.networkView.collapseScanMethod')
            : t('pages.networkView.expandScanMethod')
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
        <ScanIcon size={20} />
        <span style={{ flex: '1 1 auto', textAlign: 'start' }}>{t('pages.networkView.scanMethodTitle')}</span>
        {scanMethodExpanded ? <ChevronUpIcon size={22} /> : <ChevronDownIcon size={22} />}
      </button>
      {scanMethodExpanded && (
        <div
          style={{
            marginBlockStart: 'var(--spacing-md)',
            paddingBlockStart: 'var(--spacing-md)',
            borderTop: '1px solid var(--border-color-light)'
          }}
        >
          <p
            style={{
              margin: '0 0 var(--spacing-md) 0',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)'
            }}
          >
            {t('pages.networkView.scanMethodIntro')}
          </p>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={scanUsePing}
                onChange={(e) => onScanUsePingChange(e.target.checked)}
                style={{ marginTop: '4px' }}
              />
              <span>
                <strong>{t('pages.networkView.scanMethodPingLabel')}</strong>
                <span
                  style={{
                    display: 'block',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-tertiary)',
                    fontWeight: 'normal',
                    marginTop: '4px'
                  }}
                >
                  {t('pages.networkView.scanMethodPingHelp')}
                </span>
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={scanUseTcp}
                onChange={(e) => onScanUseTcpChange(e.target.checked)}
                style={{ marginTop: '4px' }}
              />
              <span>
                <strong>{t('pages.networkView.scanMethodTcpLabel')}</strong>
                <span
                  style={{
                    display: 'block',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-tertiary)',
                    fontWeight: 'normal',
                    marginTop: '4px'
                  }}
                >
                  {t('pages.networkView.scanMethodTcpHelp')}
                </span>
                <span
                  className="ip-address"
                  style={{
                    display: 'block',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-tertiary)',
                    fontWeight: 'normal',
                    marginTop: '6px',
                    lineHeight: 1.45,
                    wordBreak: 'break-word'
                  }}
                >
                  {t('pages.networkView.scanMethodTcpPortsLine', { ports: COMMON_TCP_SCAN_PORTS.join(', ') })}
                </span>
              </span>
            </label>
          </div>
          {!scanUsePing && !scanUseTcp && (
            <p style={{ margin: 'var(--spacing-sm) 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--warning)' }}>
              {t('pages.networkView.scanNeedOneMethod')}
            </p>
          )}
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <label
              style={{
                display: 'block',
                marginBlockEnd: 'var(--spacing-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                fontSize: 'var(--font-size-sm)'
              }}
            >
              {t('pages.networkView.offlineReleaseLabel')}
            </label>
            <p
              style={{
                margin: '0 0 var(--spacing-sm)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-tertiary)',
                maxWidth: '520px',
                lineHeight: 1.45
              }}
            >
              {t('pages.networkView.offlineReleaseHelp')}
            </p>
            <select
              className="filter-select filter-select-wide"
              value={offlineReleaseAfterMs === null ? '' : String(offlineReleaseAfterMs)}
              onChange={(e) =>
                onOfflineReleaseAfterMsChange(e.target.value === '' ? null : Number(e.target.value))
              }
            >
              {OFFLINE_RELEASE_OPTIONS.map((opt) => (
                <option key={opt.ms === null ? 'never' : String(opt.ms)} value={opt.ms === null ? '' : String(opt.ms)}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <button
              type="button"
              onClick={onSaveScanPreferences}
              disabled={savingScanPrefs || (!scanUsePing && !scanUseTcp)}
              className="btn-secondary btn-small"
            >
              {savingScanPrefs ? t('common.loading') : t('pages.networkView.scanSavePreferences')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
