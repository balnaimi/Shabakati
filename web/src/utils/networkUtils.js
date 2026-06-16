/**
 * Frontend network helpers — shared core + UI-specific wrappers.
 */

import {
  isValidIP,
  calculateIPRange,
  getLastOctet,
  isIPInInclusiveRange,
  filterStaticAvailableIps as coreFilterStaticAvailableIps
} from '@shared/networkCore.js';

export { isValidIP, calculateIPRange, getLastOctet, isIPInInclusiveRange };

/** Valid DHCP pool on a network object, or null if not configured. */
export function getNetworkDhcpRange(network) {
  const start = String(network?.dhcp_range_start ?? '').trim();
  const end = String(network?.dhcp_range_end ?? '').trim();
  if (!start || !end || !isValidIP(start) || !isValidIP(end)) return null;
  if (!isIPInInclusiveRange(start, start, end) || !isIPInInclusiveRange(end, start, end)) {
    return null;
  }
  return { start, end };
}

export function isIpInDhcpPool(ip, dhcpRange) {
  return Boolean(dhcpRange && isIPInInclusiveRange(ip, dhcpRange.start, dhcpRange.end));
}

/** IPs free for static assignment (not used and outside DHCP pool). */
export function filterStaticAvailableIps(ips, usedIps, dhcpRange) {
  return coreFilterStaticAvailableIps(ips, usedIps, dhcpRange);
}
