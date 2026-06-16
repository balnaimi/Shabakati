import { useRef, useState, useEffect } from 'react'
import { apiGet, apiPost } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from './Toast'
import { DownloadIcon, UploadIcon } from './Icons'
import { toastApiError } from '../utils/formatClientError'

function DataExportImport({ onImported }) {
  const { isAdmin } = useAuth()
  const { t } = useTranslation()
  const toast = useToast()
  const fileRef = useRef(null)
  const [backups, setBackups] = useState([])
  const [backupLoading, setBackupLoading] = useState(false)

  const loadBackups = async () => {
    if (!isAdmin) return
    try {
      const data = await apiGet('/backups')
      setBackups(data.backups || [])
    } catch {
      /* optional */
    }
  }

  useEffect(() => {
    loadBackups()
  }, [isAdmin])

  const handleExport = async () => {
    try {
      const data = await apiGet('/export')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shabakati-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('dataTransfer.exportSuccess'))
    } catch (err) {
      toastApiError(toast, t, err)
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const result = await apiPost('/import', payload)
      toast.success(result.message || t('dataTransfer.importSuccess'))
      onImported?.()
    } catch (err) {
      toastApiError(toast, t, err)
    } finally {
      e.target.value = ''
    }
  }

  const handleRunBackup = async () => {
    try {
      setBackupLoading(true)
      await apiPost('/backups/run', {})
      toast.success(t('backup.runSuccess'))
      await loadBackups()
    } catch (err) {
      toastApiError(toast, t, err)
    } finally {
      setBackupLoading(false)
    }
  }

  const lastBackup = backups[0]

  return (
    <div className="data-transfer">
      <button type="button" className="btn-secondary" onClick={handleExport}>
        <DownloadIcon size={16} />
        <span>{t('dataTransfer.export')}</span>
      </button>
      <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
        <UploadIcon size={16} />
        <span>{t('dataTransfer.import')}</span>
      </button>
      {isAdmin && (
        <button type="button" className="btn-secondary" onClick={handleRunBackup} disabled={backupLoading}>
          <DownloadIcon size={16} />
          <span>{backupLoading ? t('common.loading') : t('backup.runNow')}</span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />
      {isAdmin && lastBackup && (
        <p className="backup-status-hint" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', margin: 0 }}>
          {t('backup.lastRun', { date: new Date(lastBackup.createdAt).toLocaleString() })}
        </p>
      )}
    </div>
  )
}

export default DataExportImport
