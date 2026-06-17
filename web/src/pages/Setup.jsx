import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiPost } from '../utils/api'
import { AuthPage, AuthPageHeader } from '../components/AuthPage'
import { useTranslation } from '../hooks/useTranslation'
import { formatClientError } from '../utils/formatClientError'
import { KeyIcon, AdminIcon, UserIcon, AlertIcon, CheckIcon } from '../components/Icons'

function Setup() {
  const [visitorPassword, setVisitorPassword] = useState('')
  const [visitorConfirmPassword, setVisitorConfirmPassword] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    fetch(`${API_URL}/auth/check-setup`)
      .then(res => res.json())
      .then(data => {
        if (!data.setupRequired) {
          navigate('/login')
        }
      })
      .catch(() => {})
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!visitorPassword || visitorPassword.length < 6) {
      setError(t('pages.setup.visitorPasswordMinLength'))
      return
    }

    if (visitorPassword !== visitorConfirmPassword) {
      setError(t('pages.setup.visitorPasswordMismatch'))
      return
    }

    if (!adminPassword || adminPassword.length < 6) {
      setError(t('pages.setup.adminPasswordMinLength'))
      return
    }

    if (adminPassword !== adminConfirmPassword) {
      setError(t('pages.setup.adminPasswordMismatch'))
      return
    }

    setLoading(true)

    try {
      const response = await apiPost('/auth/setup', {
        visitorPassword,
        adminPassword
      })

      if (response.token) {
        localStorage.setItem('visitorToken', response.token)
        navigate('/')
        window.location.reload()
      } else {
        setError(t('pages.setup.setupFailed'))
      }
    } catch (err) {
      setError(formatClientError(err, t) || t('pages.setup.setupError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPage wide>
      <AuthPageHeader title={t('pages.setup.title')} subtitle={t('pages.setup.subtitle')} />

      {error && (
        <div className="error-message" role="alert">
          <AlertIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      <form noValidate onSubmit={handleSubmit} className="auth-form-stack">
        <section className="auth-form-section" aria-labelledby="setup-visitor-heading">
          <div className="auth-form-section-header">
            <div className="auth-form-section-icon auth-form-section-icon--success">
              <UserIcon size={20} />
            </div>
            <h2 id="setup-visitor-heading" className="auth-form-section-title">
              {t('pages.setup.visitorPassword')}
            </h2>
          </div>

          <div className="form-group">
            <label htmlFor="visitorPassword">
              <KeyIcon size={14} />
              <span>{t('pages.setup.visitorPasswordLabel')}</span>
            </label>
            <input
              id="visitorPassword"
              type="password"
              value={visitorPassword}
              onChange={(e) => setVisitorPassword(e.target.value)}
              disabled={loading}
              autoFocus
              minLength={3}
              placeholder={t('pages.setup.visitorPasswordPlaceholder')}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="visitorConfirmPassword">
              <CheckIcon size={14} />
              <span>{t('pages.setup.visitorPasswordConfirm')}</span>
            </label>
            <input
              id="visitorConfirmPassword"
              type="password"
              value={visitorConfirmPassword}
              onChange={(e) => setVisitorConfirmPassword(e.target.value)}
              disabled={loading}
              minLength={3}
              autoComplete="new-password"
            />
          </div>
        </section>

        <section className="auth-form-section" aria-labelledby="setup-admin-heading">
          <div className="auth-form-section-header">
            <div className="auth-form-section-icon auth-form-section-icon--admin">
              <AdminIcon size={20} />
            </div>
            <h2 id="setup-admin-heading" className="auth-form-section-title">
              {t('pages.setup.adminPassword')}
            </h2>
          </div>

          <div className="form-group">
            <label htmlFor="adminPassword">
              <KeyIcon size={14} />
              <span>{t('pages.setup.adminPasswordLabel')}</span>
            </label>
            <input
              id="adminPassword"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              disabled={loading}
              minLength={3}
              placeholder={t('pages.setup.adminPasswordPlaceholder')}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="adminConfirmPassword">
              <CheckIcon size={14} />
              <span>{t('pages.setup.adminPasswordConfirm')}</span>
            </label>
            <input
              id="adminConfirmPassword"
              type="password"
              value={adminConfirmPassword}
              onChange={(e) => setAdminConfirmPassword(e.target.value)}
              disabled={loading}
              minLength={3}
              autoComplete="new-password"
            />
          </div>
        </section>

        <button type="submit" disabled={loading} className="btn-primary btn-large btn-block">
          {loading ? (
            <>
              <span className="loading-spinner-icon loading-spinner-icon--inline" aria-hidden="true" />
              <span>{t('pages.setup.creating')}</span>
            </>
          ) : (
            <>
              <CheckIcon size={20} />
              <span>{t('pages.setup.createPasswords')}</span>
            </>
          )}
        </button>
      </form>
    </AuthPage>
  )
}

export default Setup
