import { isIPInInclusiveRange } from '../../utils/networkUtils'
import React from 'react'
import { parseSystemDiscoveryTcpPort } from '../../utils/descriptionUtils'

export function groupIPsByThirdOctet(networkId, subnet) {
  const networkParts = networkId.split('.').map(Number)
  const networkNum = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3]
  const hostBits = 32 - subnet
  const mask = 0xFFFFFFFF << hostBits
  const networkBase = networkNum & mask
  const broadcastIP = networkBase + Math.pow(2, hostBits) - 1

  const networkIP = `${(networkBase >>> 24) & 0xFF}.${(networkBase >>> 16) & 0xFF}.${(networkBase >>> 8) & 0xFF}.${networkBase & 0xFF}`
  const broadcastIPStr = `${(broadcastIP >>> 24) & 0xFF}.${(broadcastIP >>> 16) & 0xFF}.${(broadcastIP >>> 8) & 0xFF}.${broadcastIP & 0xFF}`

  const networkParts2 = networkIP.split('.').map(Number)
  const broadcastParts = broadcastIPStr.split('.').map(Number)

  const startThirdOctet = networkParts2[2]
  const endThirdOctet = broadcastParts[2]

  const groups = {}

  for (let thirdOctet = startThirdOctet; thirdOctet <= endThirdOctet; thirdOctet++) {
    const groupIPs = []

    let startFourth = 0
    let endFourth = 255

    if (thirdOctet === startThirdOctet) {
      startFourth = 1
    }

    if (thirdOctet === endThirdOctet) {
      endFourth = broadcastParts[3] - 1
    }

    for (let fourthOctet = startFourth; fourthOctet <= endFourth; fourthOctet++) {
      const ip = `${networkParts2[0]}.${networkParts2[1]}.${thirdOctet}.${fourthOctet}`
      groupIPs.push(ip)
    }

    if (groupIPs.length > 0) {
      groups[thirdOctet] = groupIPs
    }
  }

  return groups
}

export function ipCellColors(ip, status, { hasDhcpRange, dhcpRangeStart, dhcpRangeEnd }) {
  const inDhcpPool =
    hasDhcpRange && isIPInInclusiveRange(ip, dhcpRangeStart, dhcpRangeEnd)
  if (status === 'online') {
    return {
      bgColor: 'var(--success-light)',
      borderColor: 'var(--success)',
      color: 'var(--success)'
    }
  }
  if (status === 'offline' && inDhcpPool) {
    return {
      bgColor: 'var(--dhcp-pool-light)',
      borderColor: 'var(--dhcp-pool)',
      color: 'var(--dhcp-pool)'
    }
  }
  if (status === 'offline') {
    return {
      bgColor: 'var(--danger-light)',
      borderColor: 'var(--danger)',
      color: 'var(--danger)'
    }
  }
  if (inDhcpPool) {
    return {
      bgColor: 'var(--dhcp-pool-light)',
      borderColor: 'var(--dhcp-pool)',
      color: 'var(--dhcp-pool)'
    }
  }
  return {
    bgColor: 'var(--bg-primary)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-primary)'
  }
}

export function filterAndSortHosts(hosts, { searchQuery, statusFilter, tagFilter, sortBy, sortOrder }) {
  let filtered = hosts.filter(host => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesName = host.name?.toLowerCase().includes(query)
      const matchesIP = host.ip?.toLowerCase().includes(query)
      if (!matchesName && !matchesIP) {
        return false
      }
    }

    if (statusFilter !== 'all' && host.status !== statusFilter) {
      return false
    }

    if (tagFilter) {
      const hostTagIds = host.tags?.map(t => typeof t === 'object' ? t.id : t) || []
      if (!hostTagIds.includes(parseInt(tagFilter))) {
        return false
      }
    }

    return true
  })

  const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' })
  return filtered.sort((a, b) => {
    let aValue, bValue
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        const nameComparison = collator.compare(aValue, bValue)
        return sortOrder === 'asc' ? nameComparison : -nameComparison
      case 'ip':
        const aParts = a.ip.split('.').map(Number)
        const bParts = b.ip.split('.').map(Number)
        for (let i = 0; i < 4; i++) {
          if (aParts[i] !== bParts[i]) {
            return sortOrder === 'asc' ? aParts[i] - bParts[i] : bParts[i] - aParts[i]
          }
        }
        return 0
      case 'status':
        aValue = a.status === 'online' ? 1 : 0
        bValue = b.status === 'online' ? 1 : 0
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      case 'lastChecked':
        aValue = (a.lastChecked || a.last_checked) ? new Date(a.lastChecked || a.last_checked).getTime() : 0
        bValue = (b.lastChecked || b.last_checked) ? new Date(b.lastChecked || b.last_checked).getTime() : 0
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      default:
        return 0
    }
  })
}

export function formatDiscoveryCell(host, t) {
  const method = host.discovery_method
  const tcpPort = parseSystemDiscoveryTcpPort(host.description)
  if (!method) {
    return React.createElement('span', { style: { color: 'var(--text-tertiary)' } }, '—')
  }
  if (method === 'ping') return t('pages.networkView.discoveryPing')
  if (method === 'port') {
    return tcpPort != null
      ? t('pages.networkView.discoveryTcpOnPort', { port: tcpPort })
      : t('pages.networkView.discoveryPort')
  }
  if (method === 'both') {
    return tcpPort != null
      ? t('pages.networkView.discoveryBothOnPort', { port: tcpPort })
      : t('pages.networkView.discoveryBoth')
  }
  return method
}

export function formatDeviceIntel(host, t) {
  const parts = []
  if (host.vendor) parts.push(host.vendor)
  if (host.device_category) {
    parts.push(t(`deviceCategories.${host.device_category}`))
  }
  if (host.mac_address) parts.push(host.mac_address)
  if (!parts.length) return null
  return React.createElement(
    'span',
    { className: 'device-intel-meta' },
    parts.join(' · ')
  )
}
