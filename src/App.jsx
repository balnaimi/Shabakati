import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'

// Lazy loading للصفحات لتحسين الأداء
const HostsList = lazy(() => import('./pages/HostsList'))
const TagsManagement = lazy(() => import('./pages/TagsManagement'))
const NetworksList = lazy(() => import('./pages/NetworksList'))
const NetworkView = lazy(() => import('./pages/NetworkView'))

// Loading component
const LoadingSpinner = () => (
  <div>
    جاري التحميل...
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="app">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<HostsList />} />
              <Route path="/tags" element={<TagsManagement />} />
              <Route path="/networks" element={<NetworksList />} />
              <Route path="/networks/:id" element={<NetworkView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App

