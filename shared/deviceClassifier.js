/**
 * Infer device category from open TCP ports and optional vendor name.
 * @returns {string} category key for i18n (deviceCategories.*)
 */
export function classifyDevice({ openPorts = [], vendor = null } = {}) {
  const ports = new Set(openPorts.filter((p) => Number.isFinite(p)))

  if (ports.has(3389) || (ports.has(445) && ports.has(135))) return 'windows'
  if (ports.has(3306) || ports.has(5432) || ports.has(6379) || ports.has(27017)) return 'database'
  if (ports.has(22) && (ports.has(80) || ports.has(443))) return 'server'
  if (ports.has(22)) return 'linux'
  if (ports.has(5900)) return 'desktop'
  if (ports.has(9100) || ports.has(631)) return 'printer'
  if (ports.has(80) || ports.has(443)) return 'server'
  if (ports.has(445)) return 'windows'

  if (vendor) {
    const v = vendor.toLowerCase()
    if (v.includes('apple')) return 'apple'
    if (v.includes('samsung') || v.includes('xiaomi') || v.includes('huawei') || v.includes('oppo')) return 'mobile'
    if (
      v.includes('tp-link') ||
      v.includes('ubiquiti') ||
      v.includes('cisco') ||
      v.includes('mikrotik') ||
      v.includes('netgear') ||
      v.includes('aruba') ||
      v.includes('ruijie')
    ) {
      return 'network'
    }
    if (v.includes('synology') || v.includes('qnap') || v.includes('western digital')) return 'storage'
    if (v.includes('hp') || v.includes('canon') || v.includes('epson') || v.includes('brother')) return 'printer'
    if (v.includes('raspberry')) return 'iot'
  }

  if (ports.has(53)) return 'network'
  return 'unknown'
}
