import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../constants';
import { apiPost } from '../utils/api';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import { useTranslation } from '../hooks/useTranslation';
import '../index.css';

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
      gap: '20px'
    }}>
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '20px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        <LanguageToggle />
        <ThemeToggle />
      </div>
      
      <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {t('pages.setup.title')}
        </h1>
        
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {t('pages.setup.subtitle')}
        </p>
        
        {error && (
          <div className="error-message" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{t('pages.setup.visitorPassword')}</h3>
            <div className="form-group">
              <label htmlFor="visitorPassword">{t('pages.setup.visitorPasswordLabel')}</label>
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

            <div className="form-group">
              <label htmlFor="visitorConfirmPassword">{t('pages.setup.visitorPasswordConfirm')}</label>
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

          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{t('pages.setup.adminPassword')}</h3>
            <div className="form-group">
              <label htmlFor="adminPassword">{t('pages.setup.adminPasswordLabel')}</label>
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

            <div className="form-group">
              <label htmlFor="adminConfirmPassword">{t('pages.setup.adminPasswordConfirm')}</label>
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
            className="btn-primary"
            style={{ width: '100%' }}
          >
            {loading ? t('pages.setup.creating') : t('pages.setup.createPasswords')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Setup;
