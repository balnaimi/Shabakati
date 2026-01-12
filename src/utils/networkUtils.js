/**
 * دوال مساعدة للتعامل مع الشبكات وعناوين IP (Frontend)
 */

/**
 * التحقق من صحة عنوان IP
 * @param {string} ip - عنوان IP للتحقق
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
 * تحويل IP إلى رقم
 * @param {string} ip - عنوان IP
 * @returns {number}
 */
function ipToNumber(ip) {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * تحويل رقم إلى IP
 * @param {number} num - الرقم
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
 * حساب نطاق IP بناءً على Network ID و Subnet
 * @param {string} networkId - Network ID (مثل: 192.168.1.0)
 * @param {number} subnet - Subnet mask (مثل: 24)
 * @returns {Object} { start: string, end: string, count: number, range: Array<string> }
 */
export function calculateIPRange(networkId, subnet) {
  if (!isValidIP(networkId) || subnet < 0 || subnet > 32) {
    throw new Error('Invalid network ID or subnet');
  }

  const networkNum = ipToNumber(networkId);
  const hostBits = 32 - subnet;
  const hostCount = Math.pow(2, hostBits) - 2; // نستثني network و broadcast

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
 * استخراج آخر رقم من IP
 * @param {string} ip - عنوان IP
 * @returns {number|null}
 */
export function getLastOctet(ip) {
  if (!isValidIP(ip)) return null;
  const parts = ip.split('.');
  return parseInt(parts[3], 10);
}

/**
 * بناء IP من Network ID و آخر رقم
 * @param {string} networkId - Network ID (مثل: 192.168.1.0)
 * @param {number} lastOctet - آخر رقم (مثل: 10)
 * @returns {string}
 */
export function buildIPFromNetwork(networkId, lastOctet) {
  if (!isValidIP(networkId)) return null;
  const parts = networkId.split('.');
  parts[3] = lastOctet.toString();
  return parts.join('.');
}

