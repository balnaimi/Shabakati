import { useState, useEffect } from 'react'
import { apiGet, apiPut } from '../utils/api'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from './Toast'
import { toastApiError } from '../utils/formatClientError'

function TelegramSettings() {
  const { t } = useTranslation()
  const toast = useToast()
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [locked, setLocked] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tokenEdited, setTokenEdited] = useState(false)

  useEffect(() => {
    apiGet('/settings/telegram')
      .then((data) => {
        setBotToken('')
        setChatId(data.chatId || '')
        setLocked(data.source === 'env')
        setConfigured(!!data.configured)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    try {
      setSaving(true)
      const payload = { chatId }
      if (tokenEdited) payload.botToken = botToken
      await apiPut('/settings/telegram', payload)
      toast.success(t('telegram.saved'))
      setConfigured(true)
      setTokenEdited(false)
      setBotToken('')
    } catch (err) {
      toastApiError(toast, t, err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="card telegram-settings">
      <h3 style={{ margin: '0 0 var(--spacing-sm)' }}>{t('telegram.title')}</h3>
      <p style={{ margin: '0 0 var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
        {t('telegram.help')}
      </p>
      <div className="form-group">
        <label htmlFor="telegram-token">{t('telegram.botTokenLabel')}</label>
        <input
          id="telegram-token"
          type="password"
          value={botToken}
          onChange={(e) => {
            setBotToken(e.target.value)
            setTokenEdited(true)
          }}
          placeholder={configured ? t('telegram.tokenPlaceholderSet') : '123456789:ABC...'}
          disabled={locked}
          className="ip-address"
          dir="ltr"
          autoComplete="off"
        />
      </div>
      <div className="form-group">
        <label htmlFor="telegram-chat">{t('telegram.chatIdLabel')}</label>
        <input
          id="telegram-chat"
          type="text"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder="-1001234567890"
          disabled={locked}
          className="ip-address"
          dir="ltr"
        />
      </div>
      {locked && (
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBlockEnd: 'var(--spacing-sm)' }}>
          {t('telegram.envLocked')}
        </p>
      )}
      {!locked && (
        <button type="button" className="btn-primary btn-small" onClick={save} disabled={saving}>
          {saving ? t('common.loading') : t('common.save')}
        </button>
      )}
    </div>
  )
}

export default TelegramSettings
