import { createConnection } from 'net';
import { lookup, reverse } from 'dns';
import { promisify } from 'util';
import { dbFunctions } from './database.js';

const dnsLookup = promisify(lookup);
const dnsReverse = promisify(reverse);

/**
 * مسح نطاق IP للعثور على المضيفين النشطين
 * @param {string} networkRange - نطاق الشبكة (مثال: "192.168.30.0/24" أو "192.168.30.1-254")
 * @param {number} timeout - الوقت الأقصى للانتظار بالثواني (افتراضي: 2)
 * @returns {Promise<Array>} قائمة بعناوين IP النشطة
 */
export async function scanNetwork(networkRange, timeout = 2) {
  const activeHosts = [];
  
  try {
    // تحليل نطاق الشبكة
    let ipRange = [];
    
    if (networkRange.includes('/')) {
      // CIDR notation (مثال: 192.168.30.0/24)
      ipRange = parseCIDR(networkRange);
    } else if (networkRange.includes('-')) {
      // Range notation (مثال: 192.168.30.1-254)
      ipRange = parseRange(networkRange);
    } else {
      // IP واحد فقط
      ipRange = [networkRange];
    }

    console.log(`بدء مسح ${ipRange.length} عنوان IP...`);

    // مسح جميع العناوين بالتوازي (محسّن - batch size أكبر وأسرع)
    // زيادة batch size لتحسين الأداء (200 بدلاً من 100)
    const batchSize = 200;
    const quickPorts = [22, 80, 443]; // SSH, HTTP, HTTPS - الأكثر شيوعاً
    const portTimeout = Math.min(timeout * 1000, 1500); // تقليل timeout للسرعة
    
    for (let i = 0; i < ipRange.length; i += batchSize) {
      const batch = ipRange.slice(i, i + batchSize);
      console.log(`مسح الدفعة ${Math.floor(i / batchSize) + 1} من ${Math.ceil(ipRange.length / batchSize)} (${batch.length} عنوان)`);
      
      // تحسين: فحص جميع المنافذ بالتوازي بدلاً من التسلسل
      const promises = batch.map(async (ip) => {
        // فحص جميع المنافذ بالتوازي - أول من ينجح يكفي
        const portChecks = quickPorts.map(port => 
          checkHostPort(ip, port, portTimeout).then(isAlive => ({ port, isAlive }))
        );
        
        // انتظار أول نتيجة نجاح
        const results = await Promise.all(portChecks);
        const successfulPort = results.find(r => r.isAlive);
        
        if (successfulPort) {
          return {
            ip: ip,
            hostname: null, // سيتم ملؤه لاحقاً
            time: null,
            port: successfulPort.port
          };
        }
        return null;
      });

      const results = await Promise.all(promises);
      const active = results.filter(host => host !== null);
      activeHosts.push(...active);
      
      if (active.length > 0) {
        console.log(`  ✓ تم العثور على ${active.length} مضيف نشط في هذه الدفعة`);
      }
    }

    console.log(`تم العثور على ${activeHosts.length} مضيف نشط`);
    
    // الآن نحصل على أسماء المضيفين بشكل متوازي
    if (activeHosts.length > 0) {
      console.log(`جاري الحصول على أسماء المضيفين من DNS لـ ${activeHosts.length} مضيف...`);
      
      // الحصول على جميع المضيفين من قاعدة البيانات مرة واحدة
      let existingHosts = [];
      try {
        existingHosts = dbFunctions.getAllHosts();
      } catch (error) {
        console.error('خطأ في قراءة قاعدة البيانات:', error);
      }
      
      const hostnamePromises = activeHosts.map(async (host) => {
        let hostname = null;
        let isExisting = false;
        let existingName = null;
        
        // أولاً: البحث في قاعدة البيانات المحلية
        try {
          const existingHost = existingHosts.find(h => h.ip === host.ip);
          if (existingHost) {
            isExisting = true;
            existingName = existingHost.name;
            if (existingHost.name) {
              hostname = existingHost.name;
              console.log(`  ✓ وجد اسم في قاعدة البيانات لـ ${host.ip}: ${hostname}`);
            }
            return { ...host, hostname, isExisting, existingName };
          }
        } catch (error) {
          // تجاهل الأخطاء
        }
        
        // إذا لم نجد في قاعدة البيانات، جرب DNS reverse lookup فقط
        // (forward lookup يحتاج hostname وليس IP)
        if (!hostname) {
          try {
            const hostnames = await Promise.race([
              dnsReverse(host.ip),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
            ]);
            if (hostnames && hostnames.length > 0) {
              hostname = hostnames[0];
              // إزالة النقطة الأخيرة إذا كانت موجودة
              if (hostname.endsWith('.')) {
                hostname = hostname.slice(0, -1);
              }
              // إزالة domain suffix إذا كان موجوداً (مثل .local أو .lan)
              if (hostname.includes('.')) {
                hostname = hostname.split('.')[0];
              }
              console.log(`  ✓ DNS reverse lookup نجح لـ ${host.ip}: ${hostname}`);
            } else {
              // لا نطبع رسالة فشل لكل IP لتقليل الضوضاء
            }
          } catch (error) {
            // لا نطبع رسالة فشل لكل IP لتقليل الضوضاء
            // معظم الأجهزة لا تحتوي على PTR records وهذا طبيعي
          }
        }
        
        return { ...host, hostname, isExisting: isExisting || false, existingName: existingName || null };
      });
      
      const hostsWithNames = await Promise.all(hostnamePromises);
      const foundNames = hostsWithNames.filter(h => h.hostname).length;
      const existingCount = hostsWithNames.filter(h => h.isExisting).length;
      console.log(`تم الحصول على ${foundNames} اسم من ${activeHosts.length} مضيف`);
      console.log(`تم العثور على ${existingCount} جهاز مضاف مسبقاً`);
      return hostsWithNames;
    }
    
    return activeHosts;
  } catch (error) {
    console.error('خطأ في مسح الشبكة:', error);
    throw error;
  }
}

/**
 * تحليل CIDR notation
 * @param {string} cidr - مثال: "192.168.30.0/24"
 * @returns {Array<string>} قائمة بعناوين IP
 */
function parseCIDR(cidr) {
  const [ip, prefix] = cidr.split('/');
  const prefixLength = parseInt(prefix);
  
  if (prefixLength < 24 || prefixLength > 30) {
    throw new Error('نطاق CIDR يجب أن يكون بين /24 و /30');
  }

  const ipParts = ip.split('.').map(Number);
  const hostBits = 32 - prefixLength;
  const hostCount = Math.pow(2, hostBits) - 2; // نستثني network و broadcast

  const ipRange = [];
  const baseIP = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
  const networkBase = baseIP & (0xFFFFFFFF << hostBits);

  for (let i = 1; i <= hostCount && i <= 254; i++) {
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
 * تحليل Range notation
 * @param {string} range - مثال: "192.168.30.1-254"
 * @returns {Array<string>} قائمة بعناوين IP
 */
function parseRange(range) {
  const parts = range.split('-');
  if (parts.length !== 2) {
    throw new Error('تنسيق النطاق غير صحيح. استخدم: 192.168.30.1-254');
  }

  const baseIP = parts[0].trim();
  const endNum = parseInt(parts[1].trim());
  
  const ipParts = baseIP.split('.').map(Number);
  if (ipParts.length !== 4) {
    throw new Error('عنوان IP غير صحيح');
  }

  const startNum = ipParts[3];
  if (startNum >= endNum || endNum > 254) {
    throw new Error('نطاق IP غير صحيح');
  }

  const ipRange = [];
  for (let i = startNum; i <= endNum; i++) {
    ipRange.push(`${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${i}`);
  }

  return ipRange;
}

/**
 * التحقق من المضيف بمحاولة الاتصال بمنفذ
 * @param {string} ip - عنوان IP
 * @param {number} port - المنفذ
 * @param {number} timeout - الوقت الأقصى بالمللي ثانية
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

