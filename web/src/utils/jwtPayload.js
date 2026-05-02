/**
 * Decode JWT payload without signature verification (offline / UX only).
 * @param {string} token
 * @returns {{ username?: string, type?: string, exp?: number } | null}
 */
export function decodeJwtPayloadUnsafe(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const segment = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = segment.length % 4
    const base64 = pad ? segment + '='.repeat(4 - pad) : segment
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

export function isLikelyNetworkError(error) {
  if (!error) return false
  const msg = String(error.message || '')
  return (
    error.name === 'TypeError' ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Network request failed') ||
    msg.includes('Load failed')
  )
}
