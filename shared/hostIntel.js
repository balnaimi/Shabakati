import { lookupVendor } from './ouiLookup.js'
import { classifyDevice } from './deviceClassifier.js'

/** Apply vendor + category from MAC and open ports. */
export function enrichHostIntel({ mac = null, openPorts = [] } = {}) {
  const vendor = mac ? lookupVendor(mac) : null
  const deviceCategory = classifyDevice({ openPorts, vendor })
  return {
    mac: mac || null,
    vendor,
    deviceCategory
  }
}
