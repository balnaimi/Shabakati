import { getDescription } from '../utils/descriptionUtils'
import { getHostDisplayName } from '../utils/hostDisplay'
import { formatDeviceIntel, formatDiscoveryCell } from '../pages/networkView/utils'
import HostTags from './HostTags'

/** Compact device identity: name, tags, meta, optional truncated description. */
export default function DeviceSummaryCell({
  host,
  language,
  t,
  showDescription = true,
  showDiscovery = true
}) {
  const desc = showDescription ? getDescription(host.description, language) : ''

  return (
    <div className="device-summary">
      <div className="device-summary-primary">
        <strong className="device-summary-name">{getHostDisplayName(host)}</strong>
        <HostTags tags={host.tags} compact />
      </div>
      {(formatDeviceIntel(host, t) || desc || (showDiscovery && host.discovery_method)) && (
        <div className="device-summary-meta">
          {formatDeviceIntel(host, t)}
          {showDiscovery && host.discovery_method && (
            <span className="device-summary-discovery">{formatDiscoveryCell(host, t)}</span>
          )}
          {desc && (
            <span className="device-summary-desc" title={desc}>
              {desc}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
