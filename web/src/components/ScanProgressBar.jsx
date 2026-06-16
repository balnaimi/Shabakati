import { useTranslation } from '../hooks/useTranslation'

function ScanProgressBar({ progress }) {
  const { t } = useTranslation()
  if (!progress || progress.status === 'idle') return null

  const pct = progress.total > 0
    ? Math.min(100, Math.round((progress.scanned / progress.total) * 100))
    : 0

  return (
    <div className="scan-progress" role="status" aria-live="polite">
      <div className="scan-progress-label">
        {progress.status === 'running'
          ? t('scanProgress.scanning', { pct, found: progress.found ?? 0 })
          : progress.status === 'done'
            ? t('scanProgress.done', { found: progress.found ?? 0 })
            : t('scanProgress.error')}
      </div>
      <div className="scan-progress-track">
        <div className="scan-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default ScanProgressBar
