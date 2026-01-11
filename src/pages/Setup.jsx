import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../constants';
import { apiPost } from '../utils/api';
import ThemeToggle from '../components/ThemeToggle';
import '../index.css';

function Setup() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

    if (!password || password.length < 3) {
      setError('كلمة المرور يجب أن تكون 3 أحرف على الأقل');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    setLoading(true);

    try {
      const response = await apiPost('/auth/setup', { password });
      
      if (response.token) {
        // Login automatically after setup
        localStorage.setItem('authToken', response.token);
        navigate('/');
        window.location.reload(); // Reload to update auth state
      } else {
        setError('فشل إنشاء حساب المسؤول');
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء إنشاء حساب المسؤول');
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
      <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
        <ThemeToggle />
      </div>
      
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          إنشاء كلمة مرور المسؤول
        </h1>
        
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          هذا هو أول تشغيل للبرنامج. يرجى إنشاء كلمة مرور للمسؤول.
        </p>
        
        {error && (
          <div className="error-message" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">كلمة المرور:</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoFocus
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">تأكيد كلمة المرور:</label>
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
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Setup;
