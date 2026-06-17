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
    <div className="controls-bar">
      <button onClick={onScan} disabled={scanning || (!scanUsePing && !scanUseTcp)} className="btn-primary btn-small">
        {scanning ? (
          <>
            <RefreshIcon size={16} className="spinner" />
            <span>{t('pages.networkView.scanning')}</span>
          </>
        ) : (
          <>
            <ScanIcon size={16} />
            <span>{t('pages.networkView.scan')}</span>
          </>
        )}
      </button>
      {(scanning || scanProgress?.status === 'running') && (
        <ScanProgressBar progress={scanProgress} />
      )}

      <div className={`controls-inline-group ${autoScanEnabled ? 'is-active' : ''}`}>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={autoScanEnabled}
            onChange={onToggleAutoScan}
            disabled={loadingAutoScan}
          />
          <span>{t('pages.networkView.autoScan')}</span>
        </label>
        <label className="filter-inline-label">
          <span>{t('pages.networkView.autoScanIntervalLabel')}</span>
          <select
            className="filter-select"
            value={autoScanInterval}
            onChange={(e) => onAutoScanIntervalChange(Number(e.target.value))}
            disabled={loadingAutoScan}
            aria-label={t('pages.networkView.autoScanIntervalLabel')}
          >
            {AUTO_SCAN_INTERVAL_MS_OPTIONS.map((ms) => (
              <option key={ms} value={ms}>
                {t('pages.networkView.autoScanIntervalOption', { minutes: ms / 60000 })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button onClick={onClearNetworkHosts} className="btn-danger btn-small">
        <DeleteIcon size={16} />
        <span>{t('pages.networkView.clearAllHosts')}</span>
      </button>
    </div>
  )
}
