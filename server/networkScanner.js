import { createConnection } from 'net';
import { lookup, reverse } from 'dns';
import { promisify } from 'util';
import ping from 'ping';
import { dbFunctions } from './database.js';

const dnsLookup = promisify(lookup);
const dnsReverse = promisify(reverse);

/**
 * Scan IP range to find active hosts
 * @param {string} networkRange - Network range (example: "192.168.30.0/24" or "192.168.30.1-254")
 * @param {number} timeout - Maximum wait time in seconds (default: 2)
 * @returns {Promise<Array>} List of active IP addresses
 */
export async function scanNetwork(networkRange, timeout = 2) {
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

    console.log(`Starting scan of ${ipRange.length} IP addresses...`);

    // Scan all addresses in parallel (optimized - larger batch size and faster)
    // Increased batch size for better performance (200 instead of 100)
    const batchSize = 200;
    
    // Comprehensive list of common ports (Linux, Windows, popular services)
    const commonPorts = [
      // Linux
      22,   // SSH
      80,   // HTTP
      443,  // HTTPS
      21,   // FTP
      25,   // SMTP
      53,   // DNS
      110,  // POP3
      143,  // IMAP
      993,  // IMAPS
      995,  // POP3S
      3306, // MySQL
      5432, // PostgreSQL
      8080, // HTTP Alternate
      8443, // HTTPS Alternate
      // Windows
      135,  // RPC Endpoint Mapper
      139,  // NetBIOS Session Service
      445,  // SMB/CIFS
      3389, // RDP
      5985, // WinRM HTTP
      5986, // WinRM HTTPS
      // Popular services
      23,    // Telnet
      5900,  // VNC
      27017, // MongoDB
      6379,  // Redis
      9200   // Elasticsearch
    ];
    
    const portTimeout = Math.min(timeout * 1000, 1500); // Reduce timeout for speed
    const pingTimeout = timeout; // timeout for ping in seconds
    
    for (let i = 0; i < ipRange.length; i += batchSize) {
      const batch = ipRange.slice(i, i + batchSize);
      console.log(`Scanning batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(ipRange.length / batchSize)} (${batch.length} addresses)`);
      
      // Optimization: check ping and all ports in parallel
      const promises = batch.map(async (ip) => {
        // Start ping and check all ports in parallel
        const pingCheck = checkHostPing(ip, pingTimeout);
        const portChecks = commonPorts.map(port => 
          checkHostPort(ip, port, portTimeout).then(isAlive => ({ port, isAlive }))
        );
        
        // Use Promise.allSettled to check all results (more reliable)
        // This ensures we get all results even if some fail
        const allChecks = [pingCheck, ...portChecks];
        const results = await Promise.allSettled(allChecks);
        
        // Extract ping results
        const pingResult = results[0].status === 'fulfilled' ? results[0].value : { alive: false };
        
        // Extract port results
        const portResults = results.slice(1).map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          }
          return { port: commonPorts[index], isAlive: false };
        });
        
        const successfulPort = portResults.find(r => r.isAlive);
        const detectionMethod = pingResult.alive && successfulPort ? 'both' 
                              : pingResult.alive ? 'ping' 
                              : successfulPort ? 'port' 
                              : null;
        
        // If ping or any port succeeds, host is active
        if (pingResult.alive || successfulPort) {
          return {
            ip: ip,
            hostname: null, // Will be filled later
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
        console.log(`  ✓ Found ${active.length} active hosts in this batch`);
      }
    }

    console.log(`Found ${activeHosts.length} active hosts`);
    
    // Now get hostnames in parallel
    if (activeHosts.length > 0) {
      console.log(`Getting hostnames from DNS for ${activeHosts.length} hosts...`);
      
      // Get all hosts from database once
      let existingHosts = [];
      try {
        existingHosts = dbFunctions.getAllHosts();
      } catch (error) {
        console.error('Error reading database:', error);
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
              console.log(`  ✓ Found name in database for ${host.ip}: ${hostname}`);
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
              console.log(`  ✓ DNS reverse lookup succeeded for ${host.ip}: ${hostname}`);
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
      console.log(`Got ${foundNames} names from ${activeHosts.length} hosts`);
      console.log(`Found ${existingCount} previously added devices`);
      return hostsWithNames;
    }
    
    return activeHosts;
  } catch (error) {
    console.error('Error scanning network:', error);
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
    throw new Error('CIDR range must be between /22 and /30');
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
    throw new Error('Invalid range format. Use: 192.168.30.1-254');
  }

  const baseIP = parts[0].trim();
  const endNum = parseInt(parts[1].trim());
  
  const ipParts = baseIP.split('.').map(Number);
  if (ipParts.length !== 4) {
    throw new Error('Invalid IP address');
  }

  const startNum = ipParts[3];
  if (startNum >= endNum || endNum > 254) {
    throw new Error('Invalid IP range');
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

