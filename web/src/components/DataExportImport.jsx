import { useRef } from 'react'
import { apiGet, apiPost } from '../utils/api'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from './Toast'
import { DownloadIcon, UploadIcon } from './Icons'
import { formatClientError, toastApiError } from '../utils/formatClientError'

function DataExportImport({ onImported }) {
  const { t } = useTranslation()
  const toast = useToast()
  const fileRef = useRef(null)

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
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />
    </div>
  )
}

export default DataExportImport
