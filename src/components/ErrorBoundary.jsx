import { Component } from 'react'
import { useTranslation } from '../hooks/useTranslation'

/**
 * Error Boundary للتعامل مع الأخطاء في React components
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorDisplay onReload={() => {
        this.setState({ hasError: false, error: null })
        window.location.reload()
      }} />
    }

    return this.props.children
  }
}

function ErrorDisplay({ onReload }) {
  const { t } = useTranslation()
  return (
    <div className="container">
      <div className="empty-state">
        <h2>
          {t('messages.error.unexpected')}
        </h2>
        <p>
          {t('messages.error.refreshPage')}
        </p>
        <button
          onClick={onReload}
        >
          {t('messages.error.refreshButton')}
        </button>
      </div>
    </div>
  )
}

export default ErrorBoundary

