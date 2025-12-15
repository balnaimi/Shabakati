import { createConnection } from 'net';
import ping from 'ping';

/**
 * التحقق من حالة اتصال المضيف باستخدام ping
 * @param {string} ip - عنوان IP للتحقق منه
 * @param {number} timeout - الوقت الأقصى للانتظار بالثواني (افتراضي: 3)
 * @returns {Promise<{alive: boolean, latency?: number, packetLoss?: number}>} معلومات الاتصال
 */
export async function checkHostStatus(ip, timeout = 3) {
  try {
    const cleanIP = ip.trim();
    
    // التحقق من صحة عنوان IP
    if (!isValidIP(cleanIP)) {
      return { alive: false };
    }

    // استخدام مكتبة ping
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
    console.error('خطأ في ping:', error.message);
    return { alive: false };
  }
}

/**
 * التحقق من حالة اتصال المضيف بمحاولة الاتصال بمنفذ
 * @param {string} ip - عنوان IP للتحقق منه
 * @param {number} port - المنفذ للتحقق
 * @param {number} timeout - الوقت الأقصى للانتظار بالمللي ثانية (افتراضي: 2000)
 * @returns {Promise<boolean>} true إذا كان المضيف متصل، false إذا كان غير متصل
 */
async function checkHostPort(ip, port, timeout = 2000) {
  return new Promise((resolve) => {
    const cleanIP = ip.trim();
    
    // التحقق من صحة عنوان IP
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
 * محاولة التحقق من المضيف على عدة منافذ شائعة
 * @param {string} ip - عنوان IP للتحقق منه
 * @returns {Promise<boolean>} true إذا كان المضيف متصل على أي منفذ
 */
async function checkHostStatusMultiplePorts(ip) {
  // منافذ شائعة للتحقق
  const commonPorts = [80, 443, 22, 3389, 8080, 8006];
  
  // محاولة الاتصال بكل منفذ بالتوازي
  const checks = commonPorts.map(port => checkHostPort(ip, port, 2000));
  const results = await Promise.all(checks);
  
  // إذا نجح الاتصال على أي منفذ، المضيف متصل
  return results.some(result => result === true);
}

/**
 * التحقق من صحة عنوان IP
 * @param {string} ip - عنوان IP للتحقق
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
 * التحقق من حالة اتصال URL
 * @param {string} url - رابط URL للتحقق
 * @param {number} timeout - الوقت الأقصى للانتظار بالثواني (افتراضي: 5)
 * @returns {Promise<boolean>} true إذا كان الرابط متاح، false إذا كان غير متاح
 */
export async function checkURLStatus(url, timeout = 5) {
  try {
    const cleanURL = url.trim();
    if (!cleanURL) return false;
    
    // استخدام URL كما هو (لا نضيف http:// تلقائياً للـ HTTPS)
    let fullURL = cleanURL;
    if (!cleanURL.startsWith('http://') && !cleanURL.startsWith('https://')) {
      fullURL = `http://${cleanURL}`;
    }

    // استخدام fetch (متاح في Node.js 18+)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    try {
      const response = await fetch(fullURL, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        // تجاهل SSL errors للـ HTTPS
        // agent: new https.Agent({ rejectUnauthorized: false })
      });

      clearTimeout(timeoutId);
      
      // إذا كان status code بين 200-499 (حتى لو كان خطأ، يعني الخادم متاح)
      return response.status >= 200 && response.status < 500;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      // إذا كان الخطأ متعلق بـ SSL، جرب مرة أخرى مع GET
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
 * التحقق من حالة المضيف (IP أو URL)
 * @param {string} ip - عنوان IP
 * @param {string} url - رابط URL (اختياري)
 * @returns {Promise<{status: string, latency?: number, packetLoss?: number}>} معلومات الاتصال
 */
export async function checkHost(ip, url = null) {
  let pingInfo = { alive: false };
  
  // إذا كان هناك URL، نتحقق منه أولاً (هذا الأكثر موثوقية)
  if (url && url.trim()) {
    try {
      console.log(`التحقق من URL: ${url}`);
      const urlStatus = await checkURLStatus(url, 5);
      if (urlStatus) {
        console.log(`URL متاح: ${url}`);
        // جرب ping للحصول على latency
        pingInfo = await checkHostStatus(ip, 3);
        return {
          status: 'online',
          latency: pingInfo.latency,
          packetLoss: pingInfo.packetLoss || 0
        };
      }
      console.log(`URL غير متاح: ${url}`);
    } catch (error) {
      console.error('خطأ في التحقق من URL:', error.message);
    }
  }

  // التحقق من IP باستخدام ping أولاً
  try {
    console.log(`التحقق من IP باستخدام ping: ${ip}`);
    pingInfo = await checkHostStatus(ip, 3);
    if (pingInfo.alive) {
      console.log(`Ping نجح: ${ip}`);
      return {
        status: 'online',
        latency: pingInfo.latency,
        packetLoss: pingInfo.packetLoss || 0
      };
    }
    console.log(`Ping فشل: ${ip}`);
  } catch (error) {
    console.error('خطأ في ping:', error.message);
  }

  // إذا فشل ping، جرب الاتصال على منافذ شائعة
  try {
    console.log(`التحقق من IP على منافذ شائعة: ${ip}`);
    const portStatus = await checkHostStatusMultiplePorts(ip);
    if (portStatus) {
      console.log(`الاتصال على منفذ نجح: ${ip}`);
      return {
        status: 'online',
        latency: null,
        packetLoss: 100 // لا يمكن قياس packet loss من port check
      };
    }
    console.log(`الاتصال على منافذ فشل: ${ip}`);
  } catch (error) {
    console.error('خطأ في التحقق من المنافذ:', error.message);
  }

  return {
    status: 'offline',
    latency: null,
    packetLoss: 100
  };
}

