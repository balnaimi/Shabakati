import { useState, useCallback } from 'react'
import { ConfirmDialog } from '../components/Modal'

/**
 * Promise-based confirm dialog (replaces window.confirm).
 * Render `confirmDialogSlot` once in your component tree.
 */
export function useConfirmDialog() {
  const [state, setState] = useState(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setState({
        title: options.title ?? '',
        message: options.message ?? '',
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        confirmClassName: options.confirmClassName ?? 'btn-danger',
        isLoading: Boolean(options.isLoading),
        onConfirm: () => {
          resolve(true)
          setState(null)
        },
        onClose: () => {
          resolve(false)
          setState(null)
        }
      })
    })
  }, [])

  const confirmDialogSlot =
    state != null ? (
      <ConfirmDialog
        isOpen
        onClose={state.onClose}
        onConfirm={state.onConfirm}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        confirmClassName={state.confirmClassName}
        isLoading={state.isLoading}
      />
    ) : null

  return { confirm, confirmDialogSlot }
}
