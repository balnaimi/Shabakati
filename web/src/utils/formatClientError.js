/**
 * Maps fetch/API failures to localized copy. Prefer server `code` via `apiErrors.*`; fallback for legacy strings.
 */

function applyDetails(str, details) {
  if (!details || typeof details !== 'object') return str
  let out = str
  for (const [key, value] of Object.entries(details)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''))
  }
  return out
}

export function formatClientError(error, t) {
  const code = error?.code
  if (code && typeof code === 'string') {
    const key = `apiErrors.${code}`
    const translated = t(key)
    if (translated !== key) {
      return applyDetails(translated, error.details)
    }
  }

  const msg = String(error?.message ?? '')
  if (!msg) return t('messages.api.unexpected')

  if (msg === 'Request was cancelled') {
    return t('messages.api.requestCancelled')
  }

  if (
    msg === 'Failed to fetch' ||
    msg === 'NetworkError when attempting to fetch resource.' ||
    msg.includes('NetworkError') ||
    msg.includes('Load failed') ||
    msg.startsWith('NETWORK_ERROR')
  ) {
    return t('messages.api.networkError')
  }

  if (msg.startsWith('UNAUTHORIZED')) {
    return t('messages.api.sessionExpired')
  }

  if (msg.startsWith('INVALID_RESPONSE')) {
    return t('messages.api.invalidResponse')
  }

  if (msg.startsWith('SERVER_ERROR:')) {
    const m = msg.match(/^SERVER_ERROR:\s*(\d+)/)
    const statusNum = m ? parseInt(m[1], 10) : null
    if (statusNum === 401) return t('messages.api.sessionExpired')
    if (statusNum === 403) return t('messages.api.forbidden')
    if (statusNum === 404) return t('messages.api.notFound')
    if (statusNum != null && statusNum >= 500) return t('messages.api.serverError')
    return t('messages.api.requestFailed')
  }

  return msg
}

export function toastApiError(toast, t, error) {
  toast.error(`${t('common.error')}: ${formatClientError(error, t)}`)
}
