import { useEffect, useCallback } from 'react'
import { CloseIcon } from './Icons'

/**
 * Reusable Modal Component
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {React.ReactNode} props.footer - Optional footer content
 * @param {string} props.size - Modal size: 'small' | 'medium' | 'large'
 * @param {boolean} props.closeOnOverlay - Whether clicking overlay closes modal (default: true)
 * @param {boolean} props.showCloseButton - Whether to show close button (default: true)
 */
function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'medium',
  closeOnOverlay = true,
  showCloseButton = true
}) {
  // Handle escape key press
  const handleEscapeKey = useCallback((event) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  // Add/remove escape key listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleEscapeKey])

  // Don't render if not open
  if (!isOpen) return null

  // Size classes
  const sizeStyles = {
    small: { maxWidth: '400px' },
    medium: { maxWidth: '600px' },
    large: { maxWidth: '800px' }
  }

  const handleOverlayClick = (e) => {
    if (closeOnOverlay && e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="modal-overlay" 
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div 
        className="modal-content" 
        style={sizeStyles[size]}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && <h2 id="modal-title">{title}</h2>}
            {showCloseButton && (
              <button 
                onClick={onClose} 
                className="btn-ghost btn-icon"
                aria-label="Close"
              >
                <CloseIcon size={20} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="modal-body">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Modal Footer with standard action buttons layout
 */
export function ModalFooter({ children }) {
  return (
    <div className="modal-footer">
      {children}
    </div>
  )
}

/**
 * Confirm Dialog using Modal
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmClassName = 'btn-danger',
  isLoading = false
}) {
  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      footer={
        <>
          <button 
            onClick={onClose} 
            className="btn-secondary"
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button 
            onClick={handleConfirm} 
            className={confirmClassName}
            disabled={isLoading}
          >
            {isLoading ? '...' : confirmText}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{message}</p>
    </Modal>
  )
}

export default Modal
