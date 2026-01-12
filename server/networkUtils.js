/**
 * Helper functions for working with networks and IP addresses
 */

/**
 * Validate IP address
 * @param {string} ip - IP address to validate
 * @returns {boolean}
 */
export function isValidIP(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
}

/**
 * Convert IP to number
 * @param {string} ip - IP address
 * @returns {number}
 */
function ipToNumber(ip) {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Convert number to IP
 * @param {number} num - Number
 * @returns {string}
 */
function numberToIP(num) {
  return [
    (num >>> 24) & 0xFF,
    (num >>> 16) & 0xFF,
    (num >>> 8) & 0xFF,
    num & 0xFF
  ].join('.');
}

/**
 * Calculate CIDR notation from Network ID and Subnet
 * @param {string} networkId - Network ID (example: 192.168.1.0)
 * @param {number} subnet - Subnet mask (example: 24, 16, 8)
 * @returns {string} CIDR notation (example: 192.168.1.0/24)
 */
export function getNetworkCIDR(networkId, subnet) {
  return `${networkId}/${subnet}`;
}

/**
 * Check if IP is within network
 * @param {string} ip - IP address to check
 * @param {string} networkId - Network ID (example: 192.168.1.0)
 * @param {number} subnet - Subnet mask (example: 24)
 * @returns {boolean}
 */
export function isIPInNetwork(ip, networkId, subnet) {
  if (!isValidIP(ip) || !isValidIP(networkId)) {
    return false;
  }

  const ipNum = ipToNumber(ip);
  const networkNum = ipToNumber(networkId);
  const mask = 0xFFFFFFFF << (32 - subnet);
  const networkBase = networkNum & mask;

  return (ipNum & mask) === networkBase;
}

/**
 * Calculate IP range based on Network ID and Subnet
 * @param {string} networkId - Network ID (example: 192.168.1.0)
 * @param {number} subnet - Subnet mask (example: 24)
 * @returns {Object} { start: string, end: string, count: number, range: Array<string> }
 */
export function calculateIPRange(networkId, subnet) {
  if (!isValidIP(networkId) || subnet < 0 || subnet > 32) {
    throw new Error('Invalid network ID or subnet');
  }

  const networkNum = ipToNumber(networkId);
  const hostBits = 32 - subnet;
  const hostCount = Math.pow(2, hostBits) - 2; // Exclude network and broadcast

  // Network address
  const mask = 0xFFFFFFFF << hostBits;
  const networkBase = networkNum & mask;

  // First usable IP
  const startIP = numberToIP(networkBase + 1);

  // Last usable IP
  const endIP = numberToIP(networkBase + hostCount);

  // Generate range (for subnets /22 or larger)
  const range = [];
  if (subnet >= 22 && hostCount <= 1022) {
    for (let i = 1; i <= hostCount; i++) {
      range.push(numberToIP(networkBase + i));
    }
  }

  return {
    start: startIP,
    end: endIP,
    count: hostCount,
    range: range
  };
}

/**
 * Extract last octet from IP
 * @param {string} ip - IP address
 * @returns {number|null}
 */
export function getLastOctet(ip) {
  if (!isValidIP(ip)) return null;
  const parts = ip.split('.');
  return parseInt(parts[3], 10);
}

/**
 * Build IP from Network ID and last octet
 * @param {string} networkId - Network ID (example: 192.168.1.0)
 * @param {number} lastOctet - Last octet (example: 10)
 * @returns {string}
 */
export function buildIPFromNetwork(networkId, lastOctet) {
  if (!isValidIP(networkId)) return null;
  const parts = networkId.split('.');
  parts[3] = lastOctet.toString();
  return parts.join('.');
}

