import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
import AdminLoginModal from './AdminLoginModal';
import { AdminIcon, UserIcon, KeyIcon, LogoutIcon, SettingsIcon } from './Icons';

function AuthButton() {
  const { isAuthenticated, username, userType, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const menuRef = useRef(null);

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

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleClick = () => {
    if (setupRequired) {
      navigate('/setup');
    } else if (isAuthenticated) {
      setShowMenu(!showMenu);
    } else {
      const currentPath = window.location.pathname;
      navigate(`/login?from=${encodeURIComponent(currentPath)}`);
    }
  };

  const handleAdminLoginClick = () => {
    if (isAdmin) {
      setShowMenu(!showMenu);
    } else {
      setShowAdminModal(true);
      setShowMenu(false);
    }
  };

  const handleAdminLoginSuccess = () => {
    // Auth state will be updated automatically via Context
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowMenu(false);
  };

  const handleChangePassword = () => {
    navigate('/change-password');
    setShowMenu(false);
  };

  const handleChangeVisitorPassword = () => {
    navigate('/change-visitor-password');
    setShowMenu(false);
  };

  // Determine button text and style
  const getButtonText = () => {
    if (setupRequired) {
      return t('auth.setup');
    }
    if (isAuthenticated) {
      return isAdmin ? t('auth.adminOptions') : t('auth.options');
    }
    return t('auth.login');
  };

  const getButtonClassName = () => {
    if (setupRequired) {
      return 'btn-primary';
    }
    if (isAuthenticated) {
      return isAdmin ? 'btn-danger' : 'btn-success';
    }
    return 'btn-primary';
  };

  const getButtonIcon = () => {
    if (isAdmin) {
      return <AdminIcon size={18} />;
    }
    return <UserIcon size={18} />;
  };

  if (checkingSetup) {
    return null;
  }

  return (
    <>
      <div ref={menuRef} className="dropdown">
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          {isAuthenticated && !isAdmin && (
            <button
              onClick={handleAdminLoginClick}
              className="btn-success"
              aria-label={t('auth.adminAccess')}
            >
              <AdminIcon size={18} />
              <span>{t('auth.adminAccess')}</span>
            </button>
          )}
          <button 
            onClick={handleClick}
            className={getButtonClassName()}
            aria-label={getButtonText()}
          >
            {getButtonIcon()}
            <span>{getButtonText()}</span>
          </button>
        </div>
        
        {isAuthenticated && showMenu && (
          <div className="dropdown-menu">
            {isAdmin && (
              <>
                <button
                  onClick={handleChangePassword}
                  className="dropdown-item"
                >
                  <KeyIcon size={18} />
                  <span>{t('auth.changeAdminPassword')}</span>
                </button>
                <button
                  onClick={handleChangeVisitorPassword}
                  className="dropdown-item"
                >
                  <SettingsIcon size={18} />
                  <span>{t('auth.changeVisitorPassword')}</span>
                </button>
                <div className="dropdown-divider" />
              </>
            )}
            <button
              onClick={handleLogout}
              className="dropdown-item danger"
            >
              <LogoutIcon size={18} />
              <span>{isAdmin ? t('auth.revokeAdmin') : t('auth.logout')}</span>
            </button>
          </div>
        )}
      </div>
      
      <AdminLoginModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onSuccess={handleAdminLoginSuccess}
      />
    </>
  );
}

export default AuthButton;
