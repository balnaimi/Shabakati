import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../constants';
import { apiPost } from '../utils/api';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import { useTranslation } from '../hooks/useTranslation';
import { LogoIcon, KeyIcon, AdminIcon, UserIcon, AlertIcon, CheckIcon } from '../components/Icons';

function Setup() {
  const [visitorPassword, setVisitorPassword] = useState('');
  const [visitorConfirmPassword, setVisitorConfirmPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // Check if setup is still needed
    fetch(`${API_URL}/auth/check-setup`)
      .then(res => res.json())
      .then(data => {
        if (!data.setupRequired) {
          navigate('/login');
        }
      })
      .catch(() => {});
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!visitorPassword || visitorPassword.length < 3) {
      setError(t('pages.setup.visitorPasswordMinLength'));
      return;
    }

    if (visitorPassword !== visitorConfirmPassword) {
      setError(t('pages.setup.visitorPasswordMismatch'));
      return;
    }

    if (!adminPassword || adminPassword.length < 3) {
      setError(t('pages.setup.adminPasswordMinLength'));
      return;
    }

    if (adminPassword !== adminConfirmPassword) {
      setError(t('pages.setup.adminPasswordMismatch'));
      return;
    }

    setLoading(true);

    try {
      const response = await apiPost('/auth/setup', { 
        visitorPassword,
        adminPassword 
      });
      
      if (response.token) {
        // Login automatically after setup as visitor
        localStorage.setItem('visitorToken', response.token);
        navigate('/');
        window.location.reload(); // Reload to update auth state
      } else {
        setError(t('pages.setup.setupFailed'));
      }
    } catch (err) {
      setError(err.message || t('pages.setup.setupError'));
    } finally {
      setLoading(false);
    }
  };

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
      
      <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
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
            marginBlockEnd: 'var(--spacing-sm)'
          }}>
            {t('pages.setup.title')}
          </h1>
          <p style={{ 
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-sm)',
            maxWidth: '400px',
            margin: '0 auto',
            lineHeight: 'var(--line-height-relaxed)'
          }}>
            {t('pages.setup.subtitle')}
          </p>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="error-message" style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
            <AlertIcon size={18} />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Visitor Password Section */}
          <div style={{ 
            marginBlockEnd: 'var(--spacing-lg)', 
            padding: 'var(--spacing-lg)', 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--spacing-sm)',
              marginBlockEnd: 'var(--spacing-md)'
            }}>
              <div style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--success-light)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--success)'
              }}>
                <UserIcon size={20} />
              </div>
              <h3 style={{ 
                margin: 0, 
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)' 
              }}>
                {t('pages.setup.visitorPassword')}
              </h3>
            </div>
            
            <div className="form-group" style={{ marginBlockEnd: 'var(--spacing-md)' }}>
              <label htmlFor="visitorPassword">
                <KeyIcon size={14} />
                <span>{t('pages.setup.visitorPasswordLabel')}</span>
              </label>
              <input
                id="visitorPassword"
                type="password"
                value={visitorPassword}
                onChange={(e) => setVisitorPassword(e.target.value)}
                required
                disabled={loading}
                autoFocus
                minLength={3}
                placeholder={t('pages.setup.visitorPasswordPlaceholder')}
              />
            </div>

            <div className="form-group" style={{ marginBlockEnd: 0 }}>
              <label htmlFor="visitorConfirmPassword">
                <CheckIcon size={14} />
                <span>{t('pages.setup.visitorPasswordConfirm')}</span>
              </label>
              <input
                id="visitorConfirmPassword"
                type="password"
                value={visitorConfirmPassword}
                onChange={(e) => setVisitorConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={3}
              />
            </div>
          </div>

          {/* Admin Password Section */}
          <div style={{ 
            marginBlockEnd: 'var(--spacing-xl)', 
            padding: 'var(--spacing-lg)', 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--spacing-sm)',
              marginBlockEnd: 'var(--spacing-md)'
            }}>
              <div style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--danger-light)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger)'
              }}>
                <AdminIcon size={20} />
              </div>
              <h3 style={{ 
                margin: 0, 
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)' 
              }}>
                {t('pages.setup.adminPassword')}
              </h3>
            </div>
            
            <div className="form-group" style={{ marginBlockEnd: 'var(--spacing-md)' }}>
              <label htmlFor="adminPassword">
                <KeyIcon size={14} />
                <span>{t('pages.setup.adminPasswordLabel')}</span>
              </label>
              <input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                disabled={loading}
                minLength={3}
                placeholder={t('pages.setup.adminPasswordPlaceholder')}
              />
            </div>

            <div className="form-group" style={{ marginBlockEnd: 0 }}>
              <label htmlFor="adminConfirmPassword">
                <CheckIcon size={14} />
                <span>{t('pages.setup.adminPasswordConfirm')}</span>
              </label>
              <input
                id="adminConfirmPassword"
                type="password"
                value={adminConfirmPassword}
                onChange={(e) => setAdminConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={3}
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary btn-large"
            style={{ width: '100%' }}
          >
            {loading ? (
              <>
                <span className="loading-spinner-icon" style={{ width: 20, height: 20, borderWidth: 2 }} />
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
      </div>
    </div>
  );
}

export default Setup;
