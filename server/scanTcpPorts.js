/**
 * TCP ports probed during network discovery scans.
 * Single source used by networkScanner.js.
 */
export const COMMON_TCP_SCAN_PORTS = Object.freeze([
  22, 80, 443, 21, 25, 53, 110, 143, 993, 995,
  3306, 5432, 8080, 8443,
  135, 139, 445, 3389, 5985, 5986,
  23, 5900, 27017, 6379, 9200
])
