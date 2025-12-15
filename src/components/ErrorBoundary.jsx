import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

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
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>
            حدث خطأ غير متوقع
          </h2>
          <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
            نعتذر عن الإزعاج. يرجى تحديث الصفحة والمحاولة مرة أخرى.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4a9eff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            تحديث الصفحة
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

