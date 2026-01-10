import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function AuthButton() {
  const { isAuthenticated, username, logout } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    if (isAuthenticated) {
      logout();
      navigate('/');
    } else {
      // Navigate to login with current path as return URL
      const currentPath = window.location.pathname;
      navigate(`/login?from=${encodeURIComponent(currentPath)}`);
    }
  };

  return (
    <button 
      onClick={handleClick}
      className={isAuthenticated ? 'btn-danger' : 'btn-success'}
      aria-label={isAuthenticated ? 'إلغاء صلاحية المسؤول' : 'صلاحية المسؤول'}
    >
      {isAuthenticated ? 'إلغاء صلاحية المسؤول' : 'صلاحية المسؤول'}
    </button>
  );
}

export default AuthButton;

