/**
 * Server network helpers — shared core + API validation wrappers.
 */

import { Err } from './apiMessages.js';
import { apiThrow } from './errorHandler.js';
import {
  isValidIP,
  getNetworkCIDR,
  isIPInNetwork,
  isIPInInclusiveRange,
  calculateIPRange as coreCalculateIPRange,
  getLastOctet,
  filterStaticAvailableIps,
  filterHostsInNetwork
} from '../shared/networkCore.js';

export {
  isValidIP,
  getNetworkCIDR,
  isIPInNetwork,
  isIPInInclusiveRange,
  getLastOctet,
  filterStaticAvailableIps,
  filterHostsInNetwork
};

export function calculateIPRange(networkId, subnet) {
  try {
    return coreCalculateIPRange(networkId, subnet);
  } catch {
    apiThrow(400, Err.invalidNetworkIdOrSubnet);
  }
}

/**
 * Parse optional DHCP pool range; both empty clears. Validates order and usable addresses in subnet.
 * @returns {{ start: string|null, end: string|null }}
 */
export function normalizeOptionalDhcpRange(startRaw, endRaw, networkId, subnet) {
  const s = startRaw === undefined || startRaw === null ? '' : String(startRaw).trim();
  const e = endRaw === undefined || endRaw === null ? '' : String(endRaw).trim();
  if (!s && !e) {
    return { start: null, end: null };
  }
  if (!s || !e) {
    apiThrow(400, Err.dhcpRangeBothRequired);
  }
  if (!isValidIP(s) || !isValidIP(e)) {
    apiThrow(400, Err.invalidIPAddress);
  }
  if (coreIpToNumber(s) > coreIpToNumber(e)) {
    apiThrow(400, Err.dhcpRangeOrder);
  }
  const { start: firstUsable, end: lastUsable } = coreCalculateIPRange(networkId, subnet);
  if (coreIpToNumber(s) < coreIpToNumber(firstUsable) || coreIpToNumber(e) > coreIpToNumber(lastUsable)) {
    apiThrow(400, Err.dhcpRangeNotInNetwork);
  }
  return { start: s, end: e };
}

function coreIpToNumber(ip) {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}
