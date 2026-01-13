import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { API_URL } from '../constants';
import '../index.css';

function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

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
        setError(result.error || 'فشل تسجيل الدخول');
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
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
        <div className="loading">جاري التحميل...</div>
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
      gap: '20px'
    }}>
      <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
        <ThemeToggle />
      </div>
      
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          تسجيل الدخول
        </h1>
        
        {error && (
          <div className="error-message" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {setupRequired ? (
          <>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              هذا هو أول تشغيل للبرنامج. يرجى إعداد كلمة مرور للزوار وكلمة مرور للمسؤول.
            </p>
            <button
              onClick={handleSetup}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              إعداد البرنامج
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              أدخل كلمة مرور الزوار للعرض
            </p>
            <div className="form-group">
              <label htmlFor="password">كلمة مرور الزوار:</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoFocus
                placeholder="كلمة مرور الزوار"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              {loading ? 'جاري التحقق...' : 'تسجيل الدخول كزائر'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
