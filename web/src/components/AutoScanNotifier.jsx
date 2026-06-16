import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from './Toast'
import { apiGet } from '../utils/api'
import { ALERTS_SINCE_KEY, AUTO_SCAN_NOTIF_KEY } from '../constants'
const POLL_MS = 30_000

function formatAlertMessage(alert, t) {
  return t('settings.alertSummary', {
    network: alert.networkName,
    new: alert.newDevicesCount,
    disconnected: alert.disconnectedCount
  })
}

function AutoScanNotifier() {
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation()
  const toast = useToast()
  const sinceRef = useRef(
    parseInt(localStorage.getItem(ALERTS_SINCE_KEY) || '0', 10) || 0
  )

  useEffect(() => {
    if (!isAuthenticated) return undefined

    const poll = async () => {
      try {
        const alerts = await apiGet(`/alerts?since=${sinceRef.current}`)
        if (!Array.isArray(alerts) || alerts.length === 0) return

        const browserEnabled =
          localStorage.getItem(AUTO_SCAN_NOTIF_KEY) === 'true' &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'

        for (const alert of [...alerts].reverse()) {
          const message = formatAlertMessage(alert, t)
          toast.info(message, 8000)

          if (browserEnabled) {
            try {
              new Notification(t('app.name'), { body: message, tag: alert.id })
            } catch {
              /* ignore notification errors */
            }
          }
        }

        const latest = Math.max(...alerts.map((a) => new Date(a.at).getTime()))
        sinceRef.current = latest
        localStorage.setItem(ALERTS_SINCE_KEY, String(latest))
      } catch {
        /* silent — will retry on next poll */
      }
    }

    poll()
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [isAuthenticated, t, toast])

  return null
}

export default AutoScanNotifier
