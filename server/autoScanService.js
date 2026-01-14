import { dbFunctions } from './database.js';
import { scanNetwork } from './networkScanner.js';
import { getNetworkCIDR, isIPInNetwork } from './networkUtils.js';
import logger from './logger.js';

let scanIntervals = new Map(); // Store intervals for each network

/**
 * Start auto scan for a network
 */
export function startAutoScan(networkId) {
  // Stop existing scan if any
  stopAutoScan(networkId);
  
  const network = dbFunctions.getNetworkById(networkId);
  if (!network || !network.auto_scan_enabled) {
    return;
  }
  
  const interval = network.auto_scan_interval || 300000; // Default 5 minutes
  
  logger.info(`[AutoScan] Starting auto scan for network ${networkId} (${network.name}), interval: ${interval}ms`);
  
  // Run first scan immediately
  performAutoScan(networkId);
  
  // Schedule periodic scans
  const intervalId = setInterval(() => {
    performAutoScan(networkId);
  }, interval);
  
  scanIntervals.set(networkId, intervalId);
}

/**
 * Stop auto scan for a network
 */
export function stopAutoScan(networkId) {
  const intervalId = scanIntervals.get(networkId);
  if (intervalId) {
    clearInterval(intervalId);
    scanIntervals.delete(networkId);
    logger.info(`[AutoScan] Stopped auto scan for network ${networkId}`);
  }
}

/**
 * Perform auto scan for a network
 */
async function performAutoScan(networkId) {
  try {
    const network = dbFunctions.getNetworkById(networkId);
    if (!network || !network.auto_scan_enabled) {
      return;
    }
    
    logger.info(`[AutoScan] Performing scan for network ${networkId} (${network.name})`);
    
    // Calculate CIDR notation
    const cidr = getNetworkCIDR(network.network_id, network.subnet);
    
    // Scan network
    const activeHosts = await scanNetwork(cidr, 2);
    
    // Get all existing hosts for this network
    const allHosts = dbFunctions.getAllHosts();
    const networkHosts = allHosts.filter(host => 
      isIPInNetwork(host.ip, network.network_id, network.subnet)
    );
    
    const discoveredIPs = new Set(activeHosts.map(h => h.ip));
    const existingIPs = new Set(networkHosts.map(h => h.ip));
    
    // Track new devices
    let newDevicesCount = 0;
    for (const host of activeHosts) {
      if (!existingIPs.has(host.ip) && !host.isExisting) {
        try {
          const newHost = dbFunctions.addHost({
            name: host.hostname || host.existingName || `Host ${host.ip.split('.').pop()}`,
            ip: host.ip,
            description: `تم اكتشافه تلقائياً من فحص الشبكة ${network.name}`,
            url: '',
            status: 'online',
            tagIds: [],
            createdAt: new Date().toISOString(),
            lastChecked: new Date().toISOString(),
            pingLatency: host.pingLatency || null,
            packetLoss: null
          });
          
          // Track as new device
          dbFunctions.addAutoScanResult(networkId, 'new_device', newHost.id);
          newDevicesCount++;
        } catch (error) {
          logger.error(`[AutoScan] Error adding new host ${host.ip}:`, { error: error.message });
        }
      }
    }
    
    // Track disconnected devices and update status
    let disconnectedCount = 0;
    for (const host of networkHosts) {
      const isOnline = discoveredIPs.has(host.ip);
      const activeHost = activeHosts.find(h => h.ip === host.ip);
      
      // Check if device was online but now offline
      if (!isOnline && host.status === 'online') {
        // Device was online but now offline
        disconnectedCount++;
        
        // Track as disconnected
        dbFunctions.addAutoScanResult(networkId, 'disconnected', host.id);
      }
      
      // Update host status
      const newStatus = isOnline ? 'online' : 'offline';
      if (host.status !== newStatus) {
        try {
          const hostTags = dbFunctions.getHostTags(host.id);
          const tagIds = hostTags.map(tag => tag.id);
          
          dbFunctions.updateHost(host.id, {
            name: host.name,
            ip: host.ip,
            description: host.description || '',
            url: host.url || '',
            status: newStatus,
            tagIds: tagIds,
            lastChecked: new Date().toISOString(),
            pingLatency: activeHost?.pingLatency || null,
            packetLoss: null
          });
        } catch (error) {
          logger.error(`[AutoScan] Error updating host ${host.ip}:`, { error: error.message });
        }
      }
    }
    
    // Update network last_scanned
    dbFunctions.updateNetwork(networkId, {
      name: network.name,
      networkId: network.network_id,
      subnet: network.subnet,
      lastScanned: new Date().toISOString()
    });
    
    logger.info(`[AutoScan] Scan completed for network ${networkId}: ${newDevicesCount} new devices, ${disconnectedCount} disconnected`);
  } catch (error) {
    logger.error(`[AutoScan] Error scanning network ${networkId}:`, { error: error.message });
  }
}

/**
 * Initialize auto scan for all enabled networks
 */
export function initializeAutoScans() {
  const networks = dbFunctions.getNetworksWithAutoScan();
  
  // Only log and initialize if there are networks with auto scan enabled
  if (networks.length > 0) {
    logger.info(`[AutoScan] Initializing auto scan for ${networks.length} networks`);
    
    for (const network of networks) {
      startAutoScan(network.id);
    }
  }
}

/**
 * Stop all auto scans
 */
export function stopAllAutoScans() {
  for (const networkId of scanIntervals.keys()) {
    stopAutoScan(networkId);
  }
}
