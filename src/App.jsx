import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'

// Lazy loading للصفحات لتحسين الأداء
const HostsList = lazy(() => import('./pages/HostsList'))
const AddHost = lazy(() => import('./pages/AddHost'))
const NetworkScan = lazy(() => import('./pages/NetworkScan'))
const TagsManagement = lazy(() => import('./pages/TagsManagement'))

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
              <Route path="/add" element={<AddHost />} />
              <Route path="/scan" element={<NetworkScan />} />
              <Route path="/tags" element={<TagsManagement />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App

