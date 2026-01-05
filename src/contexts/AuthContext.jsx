import { createContext, useContext, useState, useEffect } from 'react';
import { apiPost, apiGet } from '../utils/api';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsAuthenticated(false);
        setUsername(null);
        setLoading(false);
        return;
      }

      // Check token validity with backend
      const response = await apiGet('/auth/status');
      if (response.authenticated) {
        setIsAuthenticated(true);
        setUsername(response.username);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setUsername(null);
      }
    } catch (error) {
      // If check fails, assume not authenticated
      localStorage.removeItem('authToken');
      setIsAuthenticated(false);
      setUsername(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await apiPost('/auth/login', { username, password });
      
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        setIsAuthenticated(true);
        setUsername(response.username);
        return { success: true };
      } else {
        return { success: false, error: 'فشل تسجيل الدخول' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'حدث خطأ أثناء تسجيل الدخول' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setUsername(null);
  };

  const value = {
    isAuthenticated,
    username,
    loading,
    login,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

