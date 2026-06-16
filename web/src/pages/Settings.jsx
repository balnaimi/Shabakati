import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../hooks/useTranslation'
import { useLanguage } from '../contexts/LanguageContext'
import { apiGet } from '../utils/api'
import { APP_VERSION, AUTO_SCAN_NOTIF_KEY } from '../constants'
import LoadingSpinner from '../components/LoadingSpinner'
import DataExportImport from '../components/DataExportImport'
import WebhookSettings from '../components/WebhookSettings'
import TelegramSettings from '../components/TelegramSettings'
import { InfoIcon, AlertIcon } from '../components/Icons'
import changelog from '../changelog.json'
import { Link } from 'react-router-dom'

function Settings() {
  const { isAdmin } = useAuth()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [browserNotif, setBrowserNotif] = useState(
    () => localStorage.getItem(AUTO_SCAN_NOTIF_KEY) === 'true'
  )
  const [notifPermission, setNotifPermission] = useState(
    () => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  )

  useEffect(() => {
    apiGet('/health')
      .then(setHealth)
      .catch(() => setError(t('settings.healthError')))
      .finally(() => setLoading(false))
  }, [t])

  const serverVersion = health?.version
  const versionMismatch = serverVersion && serverVersion !== APP_VERSION

  const handleBrowserNotifToggle = async (enabled) => {
    if (!enabled) {
      localStorage.setItem(AUTO_SCAN_NOTIF_KEY, 'false')
      setBrowserNotif(false)
      return
    }

    if (typeof Notification === 'undefined') {
      setNotifPermission('unsupported')
      return
    }

    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    setNotifPermission(permission)

    if (permission === 'granted') {
      localStorage.setItem(AUTO_SCAN_NOTIF_KEY, 'true')
      setBrowserNotif(true)
    } else {
      localStorage.setItem(AUTO_SCAN_NOTIF_KEY, 'false')
      setBrowserNotif(false)
    }
  }

  if (loading) return <LoadingSpinner fullPage />

  const changeKey = language === 'ar' ? 'ar' : 'en'

  return (
    <div className="container">
      <div className="header">
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.subtitle')}</p>
      </div>

      {error && (
        <div className="error-message">
          <AlertIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      <section className="card" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
        <h2 className="card-title">{t('settings.about')}</h2>
        <dl className="settings-meta">
          <div>
            <dt>{t('settings.serverVersion')}</dt>
            <dd>{serverVersion || '—'}</dd>
          </div>
          <div>
            <dt>{t('settings.uiVersion')}</dt>
            <dd>{APP_VERSION}</dd>
          </div>
          {health?.timestamp && (
            <div>
              <dt>{t('settings.serverTime')}</dt>
              <dd>{new Date(health.timestamp).toLocaleString()}</dd>
            </div>
          )}
        </dl>
        {versionMismatch && (
          <p className="settings-hint warning">
            <AlertIcon size={16} />
            {t('settings.versionMismatch', { server: serverVersion, ui: APP_VERSION })}
          </p>
        )}
        {!versionMismatch && serverVersion && (
          <p className="settings-hint">
            <InfoIcon size={16} />
            {t('settings.versionOk', { version: serverVersion })}
          </p>
        )}
      </section>

      <section className="card" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
        <h2 className="card-title">{t('settings.changelog')}</h2>
        <div className="changelog">
          {changelog.map((entry) => (
            <article key={entry.version} className="changelog-entry">
              <header className="changelog-header">
                <strong>v{entry.version}</strong>
                <time dateTime={entry.date}>{entry.date}</time>
              </header>
              <ul>
                {(entry[changeKey] || entry.en).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
        <h2 className="card-title">{t('settings.notifications')}</h2>
        <p className="settings-hint">{t('settings.notificationsHelp')}</p>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={browserNotif}
            disabled={notifPermission === 'unsupported'}
            onChange={(e) => handleBrowserNotifToggle(e.target.checked)}
          />
          <span>{t('settings.browserNotifications')}</span>
        </label>
        {notifPermission === 'denied' && (
          <p className="settings-hint warning">{t('settings.notificationsDenied')}</p>
        )}
        {notifPermission === 'unsupported' && (
          <p className="settings-hint">{t('settings.notificationsUnsupported')}</p>
        )}
      </section>

      {isAdmin && (
        <section className="card">
          <h2 className="card-title">{t('settings.adminTools')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <DataExportImport />
            <WebhookSettings />
            <TelegramSettings />
            <p className="settings-hint">
              <Link to="/system-health">{t('systemHealth.openPage')}</Link>
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

export default Settings
