import { createConnection } from 'net';
import ping from 'ping';
import logger from './logger.js';

/**
 * Check host connection status using ping
 * @param {string} ip - IP address to check
 * @param {number} timeout - Maximum wait time in seconds (default: 3)
 * @returns {Promise<{alive: boolean, latency?: number, packetLoss?: number}>} Connection information
 */
export async function checkHostStatus(ip, timeout = 3) {
  try {
    const cleanIP = ip.trim();
    
    // Validate IP address
    if (!isValidIP(cleanIP)) {
      return { alive: false };
    }

    // Use ping library
    const result = await ping.promise.probe(cleanIP, {
      timeout: timeout,
      min_reply: 1,
    });

    return {
      alive: result.alive,
      latency: result.alive ? parseFloat(result.time) : null,
      packetLoss: result.packetLoss ? parseFloat(result.packetLoss) : 0
    };
  } catch (error) {
    logger.error('Error in ping:', error.message);
    return { alive: false };
  }
}

/**
 * Check host connection status by attempting connection to port
 * @param {string} ip - IP address to check
 * @param {number} port - Port to check
 * @param {number} timeout - Maximum wait time in milliseconds (default: 2000)
 * @returns {Promise<boolean>} true if host is connected, false if disconnected
 */
async function checkHostPort(ip, port, timeout = 2000) {
  return new Promise((resolve) => {
    const cleanIP = ip.trim();
    
    // Validate IP address
    if (!isValidIP(cleanIP)) {
      resolve(false);
      return;
    }

    const socket = createConnection({ host: cleanIP, port: port, timeout: timeout }, () => {
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

/**
 * Attempt to check host on multiple common ports
 * @param {string} ip - IP address to check
 * @returns {Promise<boolean>} true if host is connected on any port
 */
async function checkHostStatusMultiplePorts(ip) {
  // Common ports to check (optimized - most common ports first)
  const commonPorts = [80, 443, 22, 3389, 8080, 8006];
  
  // Attempt connection to each port in parallel (optimized - shorter timeout)
  const checks = commonPorts.map(port => checkHostPort(ip, port, 1500));
  const results = await Promise.all(checks);
  
  // If connection succeeds on any port, host is connected
  return results.some(result => result === true);
}

/**
 * Validate IP address
 * @param {string} ip - IP address to validate
 * @returns {boolean}
 */
function isValidIP(ip) {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    return false;
  }
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Check URL connection status
 * @param {string} url - URL to check
 * @param {number} timeout - Maximum wait time in seconds (default: 5)
 * @returns {Promise<boolean>} true if URL is available, false if unavailable
 */
export async function checkURLStatus(url, timeout = 5) {
  try {
    const cleanURL = url.trim();
    if (!cleanURL) return false;
    
    // Use URL as is (don't automatically add http:// for HTTPS)
    let fullURL = cleanURL;
    if (!cleanURL.startsWith('http://') && !cleanURL.startsWith('https://')) {
      fullURL = `http://${cleanURL}`;
    }

    // Use fetch (available in Node.js 18+)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    try {
      const response = await fetch(fullURL, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        // Ignore SSL errors for HTTPS
        // agent: new https.Agent({ rejectUnauthorized: false })
      });

      clearTimeout(timeoutId);
      
      // If status code is between 200-499 (even if error, means server is available)
      return response.status >= 200 && response.status < 500;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      // If error is related to SSL, try again with GET
      if (fetchError.message.includes('certificate') || fetchError.message.includes('SSL')) {
        try {
          const controller2 = new AbortController();
          const timeoutId2 = setTimeout(() => controller2.abort(), timeout * 1000);
          const response2 = await fetch(fullURL, {
            method: 'GET',
            signal: controller2.signal,
            redirect: 'follow',
          });
          clearTimeout(timeoutId2);
          return response2.status >= 200 && response2.status < 500;
        } catch (e) {
          return false;
        }
      }
      return false;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Check host status (IP or URL)
 * @param {string} ip - IP address
 * @param {string} url - URL (optional)
 * @returns {Promise<{status: string, latency?: number, packetLoss?: number}>} Connection information
 */
export async function checkHost(ip, url = null) {
  let pingInfo = { alive: false };
  
  // If URL exists, check it first (most reliable)
  if (url && url.trim()) {
    try {
      logger.debug(`Checking URL: ${url}`);
      const urlStatus = await checkURLStatus(url, 5);
      if (urlStatus) {
        logger.debug(`URL available: ${url}`);
        // Try ping to get latency
        pingInfo = await checkHostStatus(ip, 3);
        return {
          status: 'online',
          latency: pingInfo.latency,
          packetLoss: pingInfo.packetLoss || 0
        };
      }
      logger.debug(`URL unavailable: ${url}`);
    } catch (error) {
      logger.error('Error checking URL:', error.message);
    }
  }

  // Check IP using ping first
  try {
    logger.debug(`Checking IP using ping: ${ip}`);
    pingInfo = await checkHostStatus(ip, 3);
    if (pingInfo.alive) {
      logger.debug(`Ping succeeded: ${ip}`);
      return {
        status: 'online',
        latency: pingInfo.latency,
        packetLoss: pingInfo.packetLoss || 0
      };
    }
    logger.debug(`Ping failed: ${ip}`);
  } catch (error) {
    logger.error('Error in ping:', error.message);
  }

  // If ping failed, try connection on common ports
  try {
    logger.debug(`Checking IP on common ports: ${ip}`);
    const portStatus = await checkHostStatusMultiplePorts(ip);
    if (portStatus) {
      logger.debug(`Port connection succeeded: ${ip}`);
      return {
        status: 'online',
        latency: null,
        packetLoss: 100 // Cannot measure packet loss from port check
      };
    }
    logger.debug(`Port connection failed: ${ip}`);
  } catch (error) {
    logger.error('Error checking ports:', error.message);
  }

  return {
    status: 'offline',
    latency: null,
    packetLoss: 100
  };
}

