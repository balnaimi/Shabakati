import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../constants';
import { useTranslation } from '../hooks/useTranslation';

function SetupGuard({ children }) {
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    // Check if setup is required
    fetch(`${API_URL}/auth/check-setup`)
      .then(res => res.json())
      .then(data => {
        if (data.setupRequired && location.pathname !== '/setup') {
          // Redirect to setup if not already there
          navigate('/setup', { replace: true });
        }
      })
      .catch(() => {
        // On error, allow navigation (don't block the app)
      })
      .finally(() => {
        setChecking(false);
      });
  }, [navigate, location.pathname]);

  // Show loading while checking
  if (checking) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  // Allow children to render (setup check passed or setup not required)
  return children;
}

export default SetupGuard;
