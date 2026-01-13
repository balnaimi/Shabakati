import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'

// Lazy loading للصفحات لتحسين الأداء
const Favorites = lazy(() => import('./pages/Favorites'))
const HostsList = lazy(() => import('./pages/HostsList'))
const TagsManagement = lazy(() => import('./pages/TagsManagement'))
const NetworksList = lazy(() => import('./pages/NetworksList'))
const NetworkView = lazy(() => import('./pages/NetworkView'))
const Login = lazy(() => import('./pages/Login'))
const Setup = lazy(() => import('./pages/Setup'))
const ChangePassword = lazy(() => import('./pages/ChangePassword'))

// Loading component
const LoadingSpinner = () => (
  <div className="loading">
    جاري التحميل...
  </div>
)

// Protected Route component - requires visitor authentication
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Redirect to login with return URL
    return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/change-password" element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Favorites />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/hosts" element={
          <ProtectedRoute>
            <Layout>
              <HostsList />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/tags" element={
          <ProtectedRoute>
            <Layout>
              <TagsManagement />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/networks" element={
          <ProtectedRoute>
            <Layout>
              <NetworksList />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/networks/:id" element={
          <ProtectedRoute>
            <Layout>
              <NetworkView />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App

