import ScanProgressBar from '../../components/ScanProgressBar'
import { ScanIcon, RefreshIcon, DeleteIcon } from '../../components/Icons'
import { AUTO_SCAN_INTERVAL_MS_OPTIONS } from './constants'

export default function ScanToolbar({
  scanning,
  scanProgress,
  scanUsePing,
  scanUseTcp,
  onScan,
  autoScanEnabled,
  autoScanInterval,
  loadingAutoScan,
  onToggleAutoScan,
  onAutoScanIntervalChange,
  onClearNetworkHosts,
  t
}) {
  return (
    <div className="controls">
      <button onClick={onScan} disabled={scanning || (!scanUsePing && !scanUseTcp)} className="btn-primary">
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
      {(scanning || scanProgress?.status === 'running') && (
        <ScanProgressBar progress={scanProgress} />
      )}

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 'var(--spacing-md)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${autoScanEnabled ? 'var(--success)' : 'var(--border-color)'}`
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
            onChange={onToggleAutoScan}
            disabled={loadingAutoScan}
          />
          <span>{t('pages.networkView.autoScan')}</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
          <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('pages.networkView.autoScanIntervalLabel')}</span>
          <select
            value={autoScanInterval}
            onChange={(e) => onAutoScanIntervalChange(Number(e.target.value))}
            disabled={loadingAutoScan}
            style={{
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          >
            {AUTO_SCAN_INTERVAL_MS_OPTIONS.map((ms) => (
              <option key={ms} value={ms}>
                {t('pages.networkView.autoScanIntervalOption', { minutes: ms / 60000 })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button onClick={onClearNetworkHosts} className="btn-danger">
        <DeleteIcon size={18} />
        <span>{t('pages.networkView.clearAllHosts')}</span>
      </button>
    </div>
  )
}
