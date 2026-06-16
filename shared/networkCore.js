/**
 * Shared network/IP utilities (frontend + backend).
 */

export function isValidIP(ip) {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  return parts.every((part) => {
    const num = parseInt(part, 10)
    return !isNaN(num) && num >= 0 && num <= 255
  })
}

function ipToNumber(ip) {
  const parts = ip.split('.').map(Number)
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

function numberToIP(num) {
  return [
    (num >>> 24) & 0xff,
    (num >>> 16) & 0xff,
    (num >>> 8) & 0xff,
    num & 0xff
  ].join('.')
}

export function getNetworkCIDR(networkId, subnet) {
  return `${networkId}/${subnet}`
}

export function isIPInNetwork(ip, networkId, subnet) {
  if (!isValidIP(ip) || !isValidIP(networkId)) return false
  const hostBits = 32 - subnet
  const mask = hostBits === 32 ? 0xffffffff : (0xffffffff << hostBits) >>> 0
  return (ipToNumber(ip) & mask) === (ipToNumber(networkId) & mask)
}

export function isIPInInclusiveRange(ip, rangeStart, rangeEnd) {
  if (!isValidIP(ip) || !isValidIP(rangeStart) || !isValidIP(rangeEnd)) {
    return false
  }
  const n = ipToNumber(ip)
  return n >= ipToNumber(rangeStart) && n <= ipToNumber(rangeEnd)
}

export function calculateIPRange(networkId, subnet) {
  if (!isValidIP(networkId) || subnet < 0 || subnet > 32) {
    throw new Error('Invalid network ID or subnet')
  }

  const networkNum = ipToNumber(networkId)
  const hostBits = 32 - subnet
  const hostCount = Math.pow(2, hostBits) - 2
  const mask = hostBits === 32 ? 0xffffffff : (0xffffffff << hostBits) >>> 0
  const networkBase = networkNum & mask
  const start = numberToIP(networkBase + 1)
  const end = numberToIP(networkBase + hostCount)

  const range = []
  if (subnet >= 22 && hostCount > 0 && hostCount <= 1022) {
    for (let i = 1; i <= hostCount; i++) {
      range.push(numberToIP(networkBase + i))
    }
  }

  return { start, end, count: hostCount, range }
}

export function getLastOctet(ip) {
  if (!isValidIP(ip)) return null
  return parseInt(ip.split('.')[3], 10)
}

export function filterStaticAvailableIps(range, usedIPs, dhcpRange = null) {
  const used = usedIPs instanceof Set ? usedIPs : new Set(usedIPs)
  let available = range.filter((ip) => !used.has(ip))
  if (dhcpRange?.start && dhcpRange?.end && isValidIP(dhcpRange.start) && isValidIP(dhcpRange.end)) {
    const startNum = ipToNumber(dhcpRange.start)
    const endNum = ipToNumber(dhcpRange.end)
    const lo = Math.min(startNum, endNum)
    const hi = Math.max(startNum, endNum)
    available = available.filter((ip) => {
      const n = ipToNumber(ip)
      return n < lo || n > hi
    })
  }
  return available
}

/** Filter hosts belonging to a network record from the DB. */
export function filterHostsInNetwork(hosts, network) {
  return hosts.filter((host) =>
    isIPInNetwork(host.ip, network.network_id, network.subnet)
  )
}
