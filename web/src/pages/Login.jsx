import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import LoadingSpinner from '../components/LoadingSpinner';
import { API_URL } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
import { LogoIcon, LoginIcon, SettingsIcon, KeyIcon, AlertIcon } from '../components/Icons';

function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // Check if setup is required
    fetch(`${API_URL}/auth/check-setup`)
      .then(res => res.json())
      .then(data => {
        if (data.setupRequired) {
          setSetupRequired(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        setCheckingSetup(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(password);
      
      if (result.success) {
        // Redirect to home page or the page user was trying to access
        const from = new URLSearchParams(window.location.search).get('from') || '/';
        navigate(from);
      } else {
        setError(result.error || t('pages.login.loginFailed'));
      }
    } catch (err) {
      setError(err.message || t('pages.login.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = () => {
    navigate('/setup');
  };

  if (checkingSetup) {
    return (
      <div className="app" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh'
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="app" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      flexDirection: 'column',
      gap: 'var(--spacing-lg)',
      padding: 'var(--spacing-md)'
    }}>
      {/* Theme and Language Controls */}
      <div style={{ 
        position: 'absolute', 
        top: 'var(--spacing-lg)', 
        insetInlineStart: 'var(--spacing-lg)',
        display: 'flex',
        gap: 'var(--spacing-sm)',
        alignItems: 'center'
      }}>
        <LanguageToggle />
        <ThemeToggle />
      </div>
      
      <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo and Title */}
        <div style={{ 
          textAlign: 'center', 
          marginBlockEnd: 'var(--spacing-xl)' 
        }}>
          <div style={{
            width: 64,
            height: 64,
            margin: '0 auto var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--primary)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-inverse)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <LogoIcon size={32} />
          </div>
          <h1 style={{ 
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--text-primary)',
            marginBlockEnd: 'var(--spacing-xs)'
          }}>
            {t('app.name')}
          </h1>
          <p style={{ 
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-sm)'
          }}>
            {t('pages.login.title')}
          </p>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="error-message" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
            <AlertIcon size={18} />
            <span>{error}</span>
          </div>
        )}

        {setupRequired ? (
          <>
            <p style={{ 
              textAlign: 'center', 
              color: 'var(--text-secondary)', 
              marginBlockEnd: 'var(--spacing-xl)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 'var(--line-height-relaxed)'
            }}>
              {t('pages.login.setupRequired')}
            </p>
            <button
              onClick={handleSetup}
              className="btn-primary btn-large"
              style={{ width: '100%' }}
            >
              <SettingsIcon size={20} />
              <span>{t('pages.login.setupButton')}</span>
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ 
              textAlign: 'center', 
              color: 'var(--text-secondary)', 
              marginBlockEnd: 'var(--spacing-lg)',
              fontSize: 'var(--font-size-sm)'
            }}>
              {t('pages.login.visitorPasswordHint')}
            </p>
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
                required
                disabled={loading}
                autoFocus
                placeholder={t('pages.login.visitorPasswordPlaceholder')}
                style={{ marginBlockStart: 'var(--spacing-sm)' }}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-large"
              style={{ width: '100%', marginBlockStart: 'var(--spacing-md)' }}
            >
              {loading ? (
                <>
                  <span className="loading-spinner-icon" style={{ width: 20, height: 20, borderWidth: 2 }} />
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
      </div>
    </div>
  );
}

export default Login;
