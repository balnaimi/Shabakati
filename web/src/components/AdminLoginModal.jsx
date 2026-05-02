import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../hooks/useTranslation'
import Modal from './Modal'
import { KeyIcon, AlertIcon } from './Icons'

function AdminLoginModal({ isOpen, onClose, onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { adminLogin } = useAuth()
  const { t } = useTranslation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await adminLogin(password)
      
      if (result.success) {
        setPassword('')
        if (onSuccess) {
          onSuccess()
        }
        onClose()
      } else {
        setError(result.error || t('auth.adminLoginFailed'))
      }
    } catch (err) {
      setError(err.message || t('auth.adminLoginError'))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('auth.adminAccessTitle')}
      size="small"
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="btn-secondary"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="admin-login-form"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? t('pages.login.verifying') : t('auth.adminLoginButton')}
          </button>
        </>
      }
    >
      <p style={{ 
        color: 'var(--text-secondary)', 
        marginBlockEnd: 'var(--spacing-lg)', 
        fontSize: 'var(--font-size-sm)' 
      }}>
        {t('auth.adminAccessDescription')}
      </p>

      {error && (
        <div className="error-message" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
          <AlertIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      <form id="admin-login-form" onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBlockEnd: 0 }}>
          <label htmlFor="adminPassword">
            <KeyIcon size={14} />
            <span>{t('auth.adminPassword')}</span>
          </label>
          <input
            id="adminPassword"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoFocus
            placeholder={t('auth.adminPasswordPlaceholder')}
          />
        </div>
      </form>
    </Modal>
  )
}

export default AdminLoginModal
