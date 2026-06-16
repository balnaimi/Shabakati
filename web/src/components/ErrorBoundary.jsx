import { Component } from 'react'

/**
 * Error boundary for catching errors in React subtrees.
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
  return (
    <div className="container">
      <div className="empty-state">
        <h2>Something went wrong</h2>
        <p>Please refresh the page and try again.</p>
        <button type="button" onClick={onReload}>
          Refresh
        </button>
      </div>
    </div>
  )
}

export default ErrorBoundary

