/** In-memory auto-scan alerts for browser polling (last 50). */

const MAX_ALERTS = 50
const alerts = []

/**
 * @param {{ networkId: number, networkName: string, newDevicesCount: number, disconnectedCount: number }} payload
 */
export function pushAutoScanAlert(payload) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'auto_scan',
    networkId: payload.networkId,
    networkName: payload.networkName,
    newDevicesCount: payload.newDevicesCount,
    disconnectedCount: payload.disconnectedCount,
    at: new Date().toISOString()
  }
  alerts.unshift(entry)
  while (alerts.length > MAX_ALERTS) alerts.pop()
  return entry
}

/** @param {number} sinceMs */
export function getAlertsSince(sinceMs) {
  if (!sinceMs || Number.isNaN(sinceMs)) return [...alerts]
  return alerts.filter((a) => new Date(a.at).getTime() > sinceMs)
}
