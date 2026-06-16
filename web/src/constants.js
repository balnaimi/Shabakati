// Shared constants file
import pkg from '../../package.json'

export const API_URL = import.meta.env.VITE_API_URL || '/api'
/** Single source of truth: root `package.json` `version`. Follow semver: major / minor (features) / patch (fixes). */
export const APP_VERSION = pkg.version
export const AUTO_SCAN_NOTIF_KEY = 'shabakati_autoScanBrowserNotifications'
export const ALERTS_SINCE_KEY = 'shabakati_alertsSince'
