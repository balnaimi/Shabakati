import { suggestHostName, isGenericHostName } from '@shared/suggestHostName.js'

/** Primary label for a host row/card (shows vendor when name is generic). */
export function getHostDisplayName(host) {
  if (!host) return ''
  if (host.vendor && isGenericHostName(host.name)) {
    return suggestHostName({
      ip: host.ip,
      vendor: host.vendor,
      deviceCategory: host.device_category
    })
  }
  return host.name || host.ip || ''
}
