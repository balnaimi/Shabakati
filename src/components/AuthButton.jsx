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
      style={{
        padding: '0.5rem 1rem',
        backgroundColor: isAuthenticated ? '#dc3545' : '#28a745',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9rem'
      }}
    >
      {isAuthenticated ? 'إلغاء صلاحية المسؤول' : 'صلاحية المسؤول'}
    </button>
  );
}

export default AuthButton;

