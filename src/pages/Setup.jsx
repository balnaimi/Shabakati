import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../constants';
import { apiPost } from '../utils/api';
import ThemeToggle from '../components/ThemeToggle';
import '../index.css';

function Setup() {
  const [visitorPassword, setVisitorPassword] = useState('');
  const [visitorConfirmPassword, setVisitorConfirmPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
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

    if (!visitorPassword || visitorPassword.length < 3) {
      setError('كلمة مرور الزوار يجب أن تكون 3 أحرف على الأقل');
      return;
    }

    if (visitorPassword !== visitorConfirmPassword) {
      setError('كلمات مرور الزوار غير متطابقة');
      return;
    }

    if (!adminPassword || adminPassword.length < 3) {
      setError('كلمة مرور المسؤول يجب أن تكون 3 أحرف على الأقل');
      return;
    }

    if (adminPassword !== adminConfirmPassword) {
      setError('كلمات مرور المسؤول غير متطابقة');
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
        setError('فشل إنشاء كلمتي المرور');
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء إنشاء كلمتي المرور');
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
      
      <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          إعداد البرنامج
        </h1>
        
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          هذا هو أول تشغيل للبرنامج. يرجى إنشاء كلمة مرور للزوار وكلمة مرور للمسؤول.
        </p>
        
        {error && (
          <div className="error-message" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>كلمة مرور الزوار</h3>
            <div className="form-group">
              <label htmlFor="visitorPassword">كلمة مرور الزوار:</label>
              <input
                id="visitorPassword"
                type="password"
                value={visitorPassword}
                onChange={(e) => setVisitorPassword(e.target.value)}
                required
                disabled={loading}
                autoFocus
                minLength={3}
                placeholder="للعرض فقط"
              />
            </div>

            <div className="form-group">
              <label htmlFor="visitorConfirmPassword">تأكيد كلمة مرور الزوار:</label>
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
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>كلمة مرور المسؤول</h3>
            <div className="form-group">
              <label htmlFor="adminPassword">كلمة مرور المسؤول:</label>
              <input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                disabled={loading}
                minLength={3}
                placeholder="للتعديل والإدارة"
              />
            </div>

            <div className="form-group">
              <label htmlFor="adminConfirmPassword">تأكيد كلمة مرور المسؤول:</label>
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
            {loading ? 'جاري الإنشاء...' : 'إنشاء كلمتي المرور'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Setup;
