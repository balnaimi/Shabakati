import { createConnection } from 'net';
import { lookup, reverse } from 'dns';
import { promisify } from 'util';
import ping from 'ping';
import { dbFunctions } from './database.js';
import logger from './logger.js';
import { COMMON_TCP_SCAN_PORTS } from './scanTcpPorts.js';
import { Err } from './apiMessages.js';
import { apiThrow } from './errorHandler.js';

const dnsLookup = promisify(lookup);
const dnsReverse = promisify(reverse);

/**
 * @typedef {{ usePing?: boolean, useTcpPorts?: boolean }} ScanNetworkOptions
 * Default: both true (same behavior as before).
 */

/**
 * Count detection methods from scan results (for API summary).
 */
export function summarizeDetectionMethods(hosts) {
  let ping = 0;
  let port = 0;
  let both = 0;
  for (const h of hosts) {
    if (h.detectionMethod === 'ping') ping++;
    else if (h.detectionMethod === 'port') port++;
    else if (h.detectionMethod === 'both') both++;
  }
  return { ping, port, both };
}

/**
 * Scan IP range to find active hosts
 * @param {string} networkRange - Network range (example: "192.168.30.0/24" or "192.168.30.1-254")
 * @param {number} timeout - Maximum wait time in seconds (default: 2)
 * @param {ScanNetworkOptions} [options]
 * @returns {Promise<Array>} List of active IP addresses
 */
export async function scanNetwork(networkRange, timeout = 2, options = {}) {
  const usePing = options.usePing !== false;
  const useTcpPorts = options.useTcpPorts !== false;

  if (!usePing && !useTcpPorts) {
    apiThrow(400, Err.enablePingOrTcp);
  }

  const activeHosts = [];
  
  try {
    // Parse network range
    let ipRange = [];
    
    if (networkRange.includes('/')) {
      // CIDR notation (example: 192.168.30.0/24)
      ipRange = parseCIDR(networkRange);
    } else if (networkRange.includes('-')) {
      // Range notation (example: 192.168.30.1-254)
      ipRange = parseRange(networkRange);
    } else {
      // Single IP only
      ipRange = [networkRange];
    }

    logger.info(`Starting scan of ${ipRange.length} IP addresses...`);

    // Scan all addresses in parallel (optimized - larger batch size and faster)
    // Increased batch size for better performance (200 instead of 100)
    const batchSize = 200;
    
    const commonPorts = [...COMMON_TCP_SCAN_PORTS];
    
    const portTimeout = Math.min(timeout * 1000, 1500); // Reduce timeout for speed
    const pingTimeout = timeout; // timeout for ping in seconds
    
    for (let i = 0; i < ipRange.length; i += batchSize) {
      const batch = ipRange.slice(i, i + batchSize);
      logger.debug(`Scanning batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(ipRange.length / batchSize)} (${batch.length} addresses)`);
      
      const promises = batch.map(async (ip) => {
        let pingResult = { alive: false, latency: null };
        let portResults = [];

        if (usePing && useTcpPorts) {
          const pingCheck = checkHostPing(ip, pingTimeout);
          const portChecks = commonPorts.map(port =>
            checkHostPort(ip, port, portTimeout).then(isAlive => ({ port, isAlive }))
          );
          const allChecks = [pingCheck, ...portChecks];
          const results = await Promise.allSettled(allChecks);
          pingResult = results[0].status === 'fulfilled' ? results[0].value : { alive: false };
          portResults = results.slice(1).map((result, index) => {
            if (result.status === 'fulfilled') {
              return result.value;
            }
            return { port: commonPorts[index], isAlive: false };
          });
        } else if (usePing) {
          const results = await Promise.allSettled([checkHostPing(ip, pingTimeout)]);
          pingResult = results[0].status === 'fulfilled' ? results[0].value : { alive: false };
        } else {
          const portChecks = commonPorts.map(port =>
            checkHostPort(ip, port, portTimeout).then(isAlive => ({ port, isAlive }))
          );
          const results = await Promise.allSettled(portChecks);
          portResults = results.map((result, index) => {
            if (result.status === 'fulfilled') {
              return result.value;
            }
            return { port: commonPorts[index], isAlive: false };
          });
        }

        const successfulPort = portResults.find(r => r.isAlive);
        const detectionMethod = pingResult.alive && successfulPort ? 'both'
          : pingResult.alive ? 'ping'
          : successfulPort ? 'port'
          : null;

        if (pingResult.alive || successfulPort) {
          return {
            ip: ip,
            hostname: null,
            time: null,
            port: successfulPort ? successfulPort.port : null,
            pingLatency: pingResult.alive ? pingResult.latency : null,
            detectionMethod: detectionMethod
          };
        }
        return null;
      });

      const results = await Promise.all(promises);
      const active = results.filter(host => host !== null);
      activeHosts.push(...active);
      
      if (active.length > 0) {
        logger.debug(`Found ${active.length} active hosts in this batch`);
      }
    }

    logger.info(`Found ${activeHosts.length} active hosts`);
    
    // Now get hostnames in parallel
    if (activeHosts.length > 0) {
      logger.debug(`Getting hostnames from DNS for ${activeHosts.length} hosts...`);
      
      // Get all hosts from database once
      let existingHosts = [];
      try {
        existingHosts = dbFunctions.getAllHosts();
      } catch (error) {
        logger.error('Error reading database:', error);
      }
      
      const hostnamePromises = activeHosts.map(async (host) => {
        let hostname = null;
        let isExisting = false;
        let existingName = null;
        
        // First: search in local database
        try {
          const existingHost = existingHosts.find(h => h.ip === host.ip);
          if (existingHost) {
            isExisting = true;
            existingName = existingHost.name;
            if (existingHost.name) {
              hostname = existingHost.name;
              logger.debug(`Found name in database for ${host.ip}: ${hostname}`);
            }
            return { ...host, hostname, isExisting, existingName };
          }
        } catch (error) {
          // Ignore errors
        }
        
        // If not found in database, try DNS reverse lookup only
        // (forward lookup needs hostname not IP)
        if (!hostname) {
          try {
            const hostnames = await Promise.race([
              dnsReverse(host.ip),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
            ]);
            if (hostnames && hostnames.length > 0) {
              hostname = hostnames[0];
              // Remove trailing dot if present
              if (hostname.endsWith('.')) {
                hostname = hostname.slice(0, -1);
              }
              // Remove domain suffix if present (like .local or .lan)
              if (hostname.includes('.')) {
                hostname = hostname.split('.')[0];
              }
              logger.debug(`DNS reverse lookup succeeded for ${host.ip}: ${hostname}`);
            } else {
              // Don't print failure message for each IP to reduce noise
            }
          } catch (error) {
            // Don't print failure message for each IP to reduce noise
            // Most devices don't have PTR records and this is normal
          }
        }
        
        return { ...host, hostname, isExisting: isExisting || false, existingName: existingName || null };
      });
      
      const hostsWithNames = await Promise.all(hostnamePromises);
      const foundNames = hostsWithNames.filter(h => h.hostname).length;
      const existingCount = hostsWithNames.filter(h => h.isExisting).length;
      logger.info(`Got ${foundNames} names from ${activeHosts.length} hosts`);
      logger.info(`Found ${existingCount} previously added devices`);
      return hostsWithNames;
    }
    
    return activeHosts;
  } catch (error) {
    logger.error('Error scanning network:', error);
    throw error;
  }
}

/**
 * Parse CIDR notation
 * @param {string} cidr - Example: "192.168.30.0/24"
 * @returns {Array<string>} List of IP addresses
 */
function parseCIDR(cidr) {
  const [ip, prefix] = cidr.split('/');
  const prefixLength = parseInt(prefix);
  
  if (prefixLength < 22 || prefixLength > 30) {
    apiThrow(400, Err.cidrRange22to30);
  }

  const ipParts = ip.split('.').map(Number);
  const hostBits = 32 - prefixLength;
  const hostCount = Math.pow(2, hostBits) - 2; // Exclude network and broadcast

  const ipRange = [];
  const baseIP = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
  const networkBase = baseIP & (0xFFFFFFFF << hostBits);

  for (let i = 1; i <= hostCount; i++) {
    const hostIP = networkBase + i;
    const a = (hostIP >>> 24) & 0xFF;
    const b = (hostIP >>> 16) & 0xFF;
    const c = (hostIP >>> 8) & 0xFF;
    const d = hostIP & 0xFF;
    ipRange.push(`${a}.${b}.${c}.${d}`);
  }

  return ipRange;
}

/**
 * Parse Range notation
 * @param {string} range - Example: "192.168.30.1-254"
 * @returns {Array<string>} List of IP addresses
 */
function parseRange(range) {
  const parts = range.split('-');
  if (parts.length !== 2) {
    apiThrow(400, Err.invalidRangeFormat);
  }

  const baseIP = parts[0].trim();
  const endNum = parseInt(parts[1].trim());
  
  const ipParts = baseIP.split('.').map(Number);
  if (ipParts.length !== 4) {
    apiThrow(400, Err.invalidIPAddress);
  }

  const startNum = ipParts[3];
  if (startNum >= endNum || endNum > 254) {
    apiThrow(400, Err.invalidIpRange);
  }

  const ipRange = [];
  for (let i = startNum; i <= endNum; i++) {
    ipRange.push(`${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${i}`);
  }

  return ipRange;
}

/**
 * Check host using ping (ICMP)
 * @param {string} ip - IP address
 * @param {number} timeout - Maximum time in seconds
 * @returns {Promise<{alive: boolean, latency?: number}>}
 */
async function checkHostPing(ip, timeout = 2) {
  try {
    const result = await ping.promise.probe(ip, {
      timeout: timeout,
      min_reply: 1,
    });

    return {
      alive: result.alive,
      latency: result.alive ? parseFloat(result.time) : null
    };
  } catch (error) {
    return { alive: false };
  }
}

/**
 * Check host by attempting connection to port
 * @param {string} ip - IP address
 * @param {number} port - Port number
 * @param {number} timeout - Maximum time in milliseconds
 * @returns {Promise<boolean>}
 */
function checkHostPort(ip, port, timeout = 2000) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: ip, port: port, timeout: timeout }, () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

