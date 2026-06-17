import IpAddress from './IpAddress'
import HostTags from './HostTags'
import { getHostDisplayName } from '../utils/hostDisplay'
import { formatDeviceIntel } from '../pages/networkView/utils'
import { OnlineIcon, OfflineIcon } from './Icons'

function StatusBadge({ status, t, compact = true }) {
  const online = status === 'online'
  return (
    <span className={`status-badge ${compact ? 'status-badge-compact' : ''} ${online ? 'status-online' : 'status-offline'}`}>
      {online ? <OnlineIcon size={11} /> : <OfflineIcon size={11} />}
      <span>{online ? t('common.online') : t('common.offline')}</span>
    </span>
  )
}

/** Dense list rows for discovery / monitoring panels. */
export default function DiscoveryDeviceList({ items, t, renderActions, renderExtra }) {
  if (!items.length) return null

  return (
    <div className="device-list-compact">
      {items.map((item) => {
        const host = item.host ?? item
        if (!host?.ip) return null
        const key = item.id ?? host.id
        return (
          <div key={key} className="device-list-row">
            <StatusBadge status={host.status} t={t} />
            <div className="device-list-body">
              <div className="device-list-line1">
                <strong>{getHostDisplayName(host)}</strong>
                <IpAddress className="device-list-ip">{host.ip}</IpAddress>
              </div>
              <div className="device-list-line2">
                <HostTags tags={host.tags} compact />
                {formatDeviceIntel(host, t)}
                {renderExtra?.(item, host)}
              </div>
            </div>
            {renderActions?.(item, host) && (
              <div className="device-list-actions">{renderActions(item, host)}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
