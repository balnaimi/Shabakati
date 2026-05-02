import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { CheckIcon, AlertIcon, InfoIcon, CloseIcon } from './Icons'

// Toast Context
const ToastContext = createContext(null)

// Toast types with their configurations
const TOAST_TYPES = {
  success: {
    icon: CheckIcon,
    className: 'toast-success'
  },
  error: {
    icon: AlertIcon,
    className: 'toast-error'
  },
  info: {
    icon: InfoIcon,
    className: 'toast-info'
  },
  warning: {
    icon: AlertIcon,
    className: 'toast-warning'
  }
}

/**
 * Toast Provider - Wrap your app with this to enable toasts
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    
    setToasts(prev => [...prev, { id, message, type, duration }])
    
    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const toast = useMemo(() => ({
    show: addToast,
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    info: (message, duration) => addToast(message, 'info', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
    dismiss: removeToast,
    dismissAll: () => setToasts([])
  }), [addToast, removeToast])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

/**
 * Hook to use toast notifications
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

/**
 * Toast Container - Displays all active toasts
 */
function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onDismiss={() => onDismiss(toast.id)} 
        />
      ))}
    </div>
  )
}

/**
 * Individual Toast Item
 */
function ToastItem({ toast, onDismiss }) {
  const { icon: Icon, className } = TOAST_TYPES[toast.type] || TOAST_TYPES.info

  return (
    <div className={`toast ${className}`} role="alert">
      <div className="toast-icon">
        <Icon size={18} />
      </div>
      <div className="toast-message">
        {toast.message}
      </div>
      <button 
        className="toast-close" 
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  )
}

export default ToastProvider
