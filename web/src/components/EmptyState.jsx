import { EmptyIcon, NetworkIcon, DeviceIcon, TagIcon, FolderIcon, StarIcon } from './Icons'

const iconMap = {
  default: EmptyIcon,
  network: NetworkIcon,
  device: DeviceIcon,
  tag: TagIcon,
  folder: FolderIcon,
  favorite: StarIcon
}

function EmptyState({ 
  title, 
  description, 
  icon = 'default', 
  action,
  actionLabel,
  secondaryAction,
  secondaryActionLabel
}) {
  const IconComponent = iconMap[icon] || EmptyIcon
  
  return (
    <div className="empty-state-container">
      <div className="empty-state-icon">
        <IconComponent size={80} />
      </div>
      
      {title && (
        <h3 className="empty-state-title">{title}</h3>
      )}
      
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      
      {(action || secondaryAction) && (
        <div className="empty-state-actions">
          {action && (
            <button type="button" onClick={action} className="btn-primary">
              {actionLabel}
            </button>
          )}
          {secondaryAction && (
            <button type="button" onClick={secondaryAction} className="btn-secondary">
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState
