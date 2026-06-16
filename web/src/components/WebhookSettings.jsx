import { useState, useEffect } from 'react'
import { apiGet, apiPut } from '../utils/api'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from './Toast'
import { toastApiError } from '../utils/formatClientError'

function WebhookSettings() {
  const { t } = useTranslation()
  const toast = useToast()
  const [url, setUrl] = useState('')
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet('/settings/webhook')
      .then((data) => {
        setUrl(data.url || '')
        setLocked(data.source === 'env')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    try {
      setSaving(true)
      await apiPut('/settings/webhook', { url })
      toast.success(t('webhook.saved'))
    } catch (err) {
      toastApiError(toast, t, err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="card webhook-settings">
      <h3 style={{ margin: '0 0 var(--spacing-sm)' }}>{t('webhook.title')}</h3>
      <p style={{ margin: '0 0 var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
        {t('webhook.help')}
      </p>
      <div className="form-group">
        <label htmlFor="webhook-url">{t('webhook.urlLabel')}</label>
        <input
          id="webhook-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/hook"
          disabled={locked}
          className="ip-address"
          dir="ltr"
        />
        {locked && (
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBlockStart: 'var(--spacing-xs)' }}>
            {t('webhook.envLocked')}
          </p>
        )}
      </div>
      {!locked && (
        <button type="button" className="btn-primary btn-small" onClick={save} disabled={saving}>
          {saving ? t('common.loading') : t('common.save')}
        </button>
      )}
    </div>
  )
}

export default WebhookSettings
