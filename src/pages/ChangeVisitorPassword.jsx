import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import Layout from '../components/Layout';

function ChangeVisitorPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!isAuthenticated || !isAdmin) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError(t('pages.changeVisitorPassword.allFieldsRequired'));
      return;
    }

    if (newPassword.length < 3) {
      setError(t('pages.changeVisitorPassword.passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('pages.changeVisitorPassword.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      await apiPost('/auth/change-visitor-password', {
        newPassword
      });
      
      setSuccess(t('pages.changeVisitorPassword.success'));
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
        navigate('/');
      }, 3000);
    } catch (err) {
      setError(err.message || t('pages.changeVisitorPassword.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container">
        <div className="header">
          <h1>{t('pages.changeVisitorPassword.title')}</h1>
        </div>

        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          {error && (
            <div className="error-message" style={{ marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="success-message" style={{ marginBottom: '1.5rem' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="newPassword">{t('pages.changeVisitorPassword.newPassword')}</label>
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
              <label htmlFor="confirmPassword">{t('pages.changeVisitorPassword.confirmPassword')}</label>
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

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? t('pages.changeVisitorPassword.changing') : t('pages.changeVisitorPassword.changeButton')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-secondary"
                disabled={loading}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export default ChangeVisitorPassword;
