/**
 * Builds bilingual system JSON for hosts.description (scan discovery).
 * Arabic/English template strings live in i18n/hostDiscovery.json (translations).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpl = JSON.parse(readFileSync(join(__dirname, 'i18n', 'hostDiscovery.json'), 'utf8'));

function subst(str, vars) {
  if (!str) return '';
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : ''
  );
}

export function buildNetworkScanHostDescription(networkName, detectionMethod, tcpPort, options = {}) {
  const auto = Boolean(options.auto);
  const port =
    tcpPort != null && tcpPort !== '' && !Number.isNaN(Number(tcpPort))
      ? Number(tcpPort)
      : null;

  const introKey = auto ? 'introAuto' : 'introManual';
  const introAr = subst(tmpl[introKey].ar, { name: networkName });
  const introEn = subst(tmpl[introKey].en, { name: networkName });

  let arBody;
  let enBody;

  if (detectionMethod === 'ping') {
    arBody = introAr + tmpl.suffixPing.ar;
    enBody = introEn + tmpl.suffixPing.en;
  } else if (detectionMethod === 'port') {
    if (port != null) {
      arBody = introAr + subst(tmpl.suffixTcpPort.ar, { port });
      enBody = introEn + subst(tmpl.suffixTcpPort.en, { port });
    } else {
      arBody = introAr + tmpl.suffixTcpCommon.ar;
      enBody = introEn + tmpl.suffixTcpCommon.en;
    }
  } else if (detectionMethod === 'both') {
    if (port != null) {
      arBody = introAr + subst(tmpl.suffixBothTcpPort.ar, { port });
      enBody = introEn + subst(tmpl.suffixBothTcpPort.en, { port });
    } else {
      arBody = introAr + tmpl.suffixBothTcpGeneric.ar;
      enBody = introEn + tmpl.suffixBothTcpGeneric.en;
    }
  } else {
    arBody = introAr + tmpl.fallbackEnd.ar;
    enBody = introEn + tmpl.fallbackEnd.en;
  }

  const payload = {
    type: 'system',
    ar: arBody,
    en: enBody
  };
  if (port != null && (detectionMethod === 'port' || detectionMethod === 'both')) {
    payload.discoveryTcpPort = port;
  }
  return payload;
}
