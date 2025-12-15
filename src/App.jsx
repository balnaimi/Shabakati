import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

// Lazy loading للصفحات لتحسين الأداء
const HostsList = lazy(() => import('./pages/HostsList'))
const AddHost = lazy(() => import('./pages/AddHost'))
const NetworkScan = lazy(() => import('./pages/NetworkScan'))
const TagsManagement = lazy(() => import('./pages/TagsManagement'))

// Loading component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '1.2rem',
    color: 'var(--text-primary)'
  }}>
    جاري التحميل...
  </div>
)

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <ErrorBoundary>
      <Router>
        <div className="app">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<HostsList theme={theme} toggleTheme={toggleTheme} />} />
              <Route path="/add" element={<AddHost theme={theme} toggleTheme={toggleTheme} />} />
              <Route path="/scan" element={<NetworkScan theme={theme} toggleTheme={toggleTheme} />} />
              <Route path="/tags" element={<TagsManagement theme={theme} toggleTheme={toggleTheme} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App

