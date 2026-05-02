import { useTranslation } from '../hooks/useTranslation'

function LoadingSpinner({ text, size = 'medium', fullPage = false }) {
  const { t } = useTranslation()
  
  const displayText = text || t('common.loading')
  
  const sizeClasses = {
    small: { spinner: 32, container: 'p-md' },
    medium: { spinner: 48, container: 'p-lg' },
    large: { spinner: 64, container: 'p-xl' }
  }
  
  const { spinner: spinnerSize, container: containerClass } = sizeClasses[size] || sizeClasses.medium
  
  const content = (
    <div className={`loading-spinner ${containerClass}`}>
      <div 
        className="loading-spinner-icon" 
        style={{ 
          width: spinnerSize, 
          height: spinnerSize,
          borderWidth: size === 'small' ? 2 : 3
        }} 
      />
      {displayText && (
        <span className="loading-spinner-text">{displayText}</span>
      )}
    </div>
  )
  
  if (fullPage) {
    return (
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-secondary)',
          zIndex: 'var(--z-modal)'
        }}
      >
        {content}
      </div>
    )
  }
  
  return content
}

export default LoadingSpinner
