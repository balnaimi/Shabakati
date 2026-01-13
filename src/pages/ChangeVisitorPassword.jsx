import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

function ChangeVisitorPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated || !isAdmin) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError('جميع الحقول مطلوبة');
      return;
    }

    if (newPassword.length < 3) {
      setError('كلمة المرور الجديدة يجب أن تكون 3 أحرف على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمات المرور الجديدة غير متطابقة');
      return;
    }

    setLoading(true);

    try {
      await apiPost('/auth/change-visitor-password', {
        newPassword
      });
      
      setSuccess('تم تغيير كلمة مرور الزوار بنجاح');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
        navigate('/');
      }, 3000);
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تغيير كلمة مرور الزوار');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container">
        <div className="header">
          <h1>تغيير كلمة مرور الزوار</h1>
        </div>

        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          {error && (
            <div className="error-message" style={{ marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="success-message" style={{ marginBottom: '1.5rem' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="newPassword">كلمة المرور الجديدة للزوار:</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                autoFocus
                minLength={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة:</label>
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

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-secondary"
                disabled={loading}
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export default ChangeVisitorPassword;
