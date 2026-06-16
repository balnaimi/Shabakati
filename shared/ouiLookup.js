import vendors from './ouiVendors.json' with { type: 'json' }

/** Normalize MAC to uppercase hex pairs. */
export function normalizeMac(mac) {
  if (!mac || typeof mac !== 'string') return null
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase()
  if (cleaned.length !== 12) return null
  return cleaned.match(/.{2}/g).join(':')
}

/** Look up vendor from MAC OUI (first 3 octets). */
export function lookupVendor(mac) {
  const normalized = normalizeMac(mac)
  if (!normalized) return null
  const oui = normalized.replace(/:/g, '').slice(0, 6)
  return vendors[oui] || null
}
