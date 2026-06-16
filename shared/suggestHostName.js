/** Default display name for a discovered host (vendor preferred over "Host 192"). */
export function suggestHostName({
  ip,
  vendor = null,
  hostname = null,
  existingName = null,
  deviceCategory = null
} = {}) {
  if (existingName?.trim()) return existingName.trim()
  if (hostname?.trim()) return hostname.trim()
  if (vendor?.trim()) return vendor.trim()
  const last = ip?.split('.').pop()
  return last ? `Host ${last}` : 'Host'
}

/** True when the stored name is the generic auto-generated pattern. */
export function isGenericHostName(name) {
  return /^Host \d{1,3}$/i.test(String(name || '').trim())
}
