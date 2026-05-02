/**
 * System JSON stored in hosts.description — explains how the device was discovered.
 * Includes optional discoveryTcpPort for UI (detection column).
 */
export function buildNetworkScanHostDescription(networkName, detectionMethod, tcpPort, options = {}) {
  const auto = Boolean(options.auto)
  const port =
    tcpPort != null && tcpPort !== '' && !Number.isNaN(Number(tcpPort))
      ? Number(tcpPort)
      : null

  const introAr = auto
    ? `تم اكتشافه تلقائياً من فحص الشبكة «${networkName}»`
    : `تم اكتشافه من فحص الشبكة «${networkName}»`
  const introEn = auto
    ? `Auto-discovered from network scan "${networkName}"`
    : `Discovered from network scan "${networkName}"`

  let arBody
  let enBody

  if (detectionMethod === 'ping') {
    arBody = `${introAr} عبر ICMP (ping).`
    enBody = `${introEn} via ICMP ping.`
  } else if (detectionMethod === 'port') {
    if (port != null) {
      arBody = `${introAr} عبر اتصال TCP على المنفذ ${port}.`
      enBody = `${introEn} via TCP on port ${port}.`
    } else {
      arBody = `${introAr} عبر اتصال TCP على أحد المنافذ الشائعة المفحوصة.`
      enBody = `${introEn} via TCP on one of the scanned common ports.`
    }
  } else if (detectionMethod === 'both') {
    if (port != null) {
      arBody = `${introAr} عبر ICMP (ping) وعبر اتصال TCP على المنفذ ${port}.`
      enBody = `${introEn} via ICMP ping and TCP on port ${port}.`
    } else {
      arBody = `${introAr} عبر ICMP (ping) وعبر اتصال TCP.`
      enBody = `${introEn} via ICMP ping and TCP.`
    }
  } else {
    arBody = `${introAr}.`
    enBody = `${introEn}.`
  }

  const payload = {
    type: 'system',
    ar: arBody,
    en: enBody
  }
  if (port != null && (detectionMethod === 'port' || detectionMethod === 'both')) {
    payload.discoveryTcpPort = port
  }
  return payload
}
