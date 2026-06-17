import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import { AuthPage, AuthPageHeader, AuthPageCenter } from '../components/AuthPage'
import { API_URL } from '../constants'
import { useTranslation } from '../hooks/useTranslation'
import { formatClientError } from '../utils/formatClientError'
import { LoginIcon, SettingsIcon, KeyIcon, AlertIcon } from '../components/Icons'

function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [setupRequired, setSetupRequired] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    fetch(`${API_URL}/auth/check-setup`)
      .then(res => res.json())
      .then(data => {
        if (data.setupRequired) {
          setSetupRequired(true)
        }
      })
      .catch(() => {})
      .finally(() => {
        setCheckingSetup(false)
      })
  }, [])

  useEffect(() => {
    if (checkingSetup || authLoading || setupRequired) return
    if (!isAuthenticated) return
    const from = new URLSearchParams(window.location.search).get('from') || '/'
    navigate(from, { replace: true })
  }, [checkingSetup, authLoading, setupRequired, isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!password.trim()) {
      setError(t('validation.passwordRequired'))
      return
    }
    setLoading(true)

    try {
      const result = await login(password)

      if (result.success) {
        const from = new URLSearchParams(window.location.search).get('from') || '/'
        navigate(from)
      } else {
        const apiMsg = result.error
          ? formatClientError({
              message: result.error,
              code: result.code,
              details: result.details
            }, t)
          : null
        setError(apiMsg || t('pages.login.loginFailed'))
      }
    } catch (err) {
      setError(formatClientError(err, t) || t('pages.login.loginError'))
    } finally {
      setLoading(false)
    }
  }

  const handleSetup = () => {
    navigate('/setup')
  }

  if (checkingSetup) {
    return (
      <AuthPageCenter>
        <LoadingSpinner />
      </AuthPageCenter>
    )
  }

  return (
    <AuthPage>
      <AuthPageHeader title={t('app.name')} subtitle={t('pages.login.title')} />

      {error && (
        <div className="error-message" role="alert">
          <AlertIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {setupRequired ? (
        <>
          <p className="auth-lead">{t('pages.login.setupRequired')}</p>
          <button
            type="button"
            onClick={handleSetup}
            className="btn-primary btn-large btn-block"
          >
            <SettingsIcon size={20} />
            <span>{t('pages.login.setupButton')}</span>
          </button>
        </>
      ) : (
        <form noValidate onSubmit={handleSubmit} className="auth-form-stack">
          <p className="auth-lead">{t('pages.login.visitorPasswordHint')}</p>
          <div className="form-group">
            <label htmlFor="password">
              <KeyIcon size={16} />
              <span>{t('pages.login.visitorPassword')}</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
              placeholder={t('pages.login.visitorPasswordPlaceholder')}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary btn-large btn-block"
          >
            {loading ? (
              <>
                <span className="loading-spinner-icon loading-spinner-icon--inline" aria-hidden="true" />
                <span>{t('pages.login.verifying')}</span>
              </>
            ) : (
              <>
                <LoginIcon size={20} />
                <span>{t('pages.login.loginButton')}</span>
              </>
            )}
          </button>
        </form>
      )}
    </AuthPage>
  )
}

export default Login
