import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../hooks/useTranslation'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import { KeyIcon, AlertIcon, CheckIcon } from '../components/Icons'

function ChangeVisitorPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  // Check auth in useEffect instead of render
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isAdmin) {
        navigate('/')
      }
    }
  }, [isAuthenticated, isAdmin, authLoading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newPassword || !confirmPassword) {
      setError(t('pages.changeVisitorPassword.allFieldsRequired'))
      return
    }

    if (newPassword.length < 3) {
      setError(t('pages.changeVisitorPassword.passwordMinLength'))
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('pages.changeVisitorPassword.passwordMismatch'))
      return
    }

    setLoading(true)

    try {
      await apiPost('/auth/change-visitor-password', {
        newPassword
      })
      
      setSuccess(t('pages.changeVisitorPassword.success'))
      setNewPassword('')
      setConfirmPassword('')
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('')
        navigate('/')
      }, 3000)
    } catch (err) {
      setError(err.message || t('pages.changeVisitorPassword.error'))
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking auth
  if (authLoading) {
    return <LoadingSpinner fullPage />
  }

  // Don't render if not authenticated or not admin (will redirect via useEffect)
  if (!isAuthenticated || !isAdmin) {
    return <LoadingSpinner fullPage />
  }

  return (
    <Layout>
      <div className="container">
        <div className="header">
          <h1>{t('pages.changeVisitorPassword.title')}</h1>
        </div>

        <div className="card" style={{ maxWidth: '500px', marginInline: 'auto' }}>
          {error && (
            <div className="error-message" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
              <AlertIcon size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="success-message" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
              <CheckIcon size={16} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="newPassword">
                <KeyIcon size={14} />
                <span>{t('pages.changeVisitorPassword.newPassword')}</span>
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                autoFocus
                minLength={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                <CheckIcon size={14} />
                <span>{t('pages.changeVisitorPassword.confirmPassword')}</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={3}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-secondary"
                disabled={loading}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? t('pages.changeVisitorPassword.changing') : t('pages.changeVisitorPassword.changeButton')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}

export default ChangeVisitorPassword
