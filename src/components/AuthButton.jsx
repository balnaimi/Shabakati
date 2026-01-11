import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../constants';

function AuthButton() {
  const { isAuthenticated, username, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
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
      // Navigate to setup page if no admin exists
      navigate('/setup');
    } else if (isAuthenticated) {
      // Show menu if authenticated
      setShowMenu(!showMenu);
    } else {
      // Navigate to login with current path as return URL
      const currentPath = window.location.pathname;
      navigate(`/login?from=${encodeURIComponent(currentPath)}`);
    }
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

  // Determine button text and style
  const getButtonText = () => {
    if (setupRequired) {
      return 'إنشاء كلمة مرور للمسؤول';
    }
    return 'صلاحية المسؤول';
  };

  const getButtonClassName = () => {
    if (setupRequired) {
      return 'btn-primary';
    }
    return isAuthenticated ? 'btn-danger' : 'btn-success';
  };

  if (checkingSetup) {
    return null; // Don't show button while checking
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button 
        onClick={handleClick}
        className={getButtonClassName()}
        aria-label={getButtonText()}
      >
        {getButtonText()}
      </button>
      
      {isAuthenticated && showMenu && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          minWidth: '200px',
          zIndex: 1000
        }}>
          <button
            onClick={handleChangePassword}
            style={{
              width: '100%',
              padding: '12px 16px',
              textAlign: 'right',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            تغيير كلمة المرور
          </button>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px 16px',
              textAlign: 'right',
              border: 'none',
              background: 'transparent',
              color: 'var(--danger)',
              cursor: 'pointer',
              borderRadius: '0 0 var(--radius-sm) var(--radius-sm)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            إلغاء صلاحية المسؤول
          </button>
        </div>
      )}
    </div>
  );
}

export default AuthButton;

