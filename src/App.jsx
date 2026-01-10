import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'

// Lazy loading للصفحات لتحسين الأداء
const Favorites = lazy(() => import('./pages/Favorites'))
const HostsList = lazy(() => import('./pages/HostsList'))
const TagsManagement = lazy(() => import('./pages/TagsManagement'))
const NetworksList = lazy(() => import('./pages/NetworksList'))
const NetworkView = lazy(() => import('./pages/NetworkView'))
const Login = lazy(() => import('./pages/Login'))

// Loading component
const LoadingSpinner = () => (
  <div className="loading">
    جاري التحميل...
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={
                  <Layout>
                    <Favorites />
                  </Layout>
                } />
                <Route path="/hosts" element={
                  <Layout>
                    <HostsList />
                  </Layout>
                } />
                <Route path="/tags" element={
                  <Layout>
                    <TagsManagement />
                  </Layout>
                } />
                <Route path="/networks" element={
                  <Layout>
                    <NetworksList />
                  </Layout>
                } />
                <Route path="/networks/:id" element={
                  <Layout>
                    <NetworkView />
                  </Layout>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App

