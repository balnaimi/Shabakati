import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { apiPost, apiGet } from '../utils/api';
import { decodeJwtPayloadUnsafe, isLikelyNetworkError } from '../utils/jwtPayload';

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
  const [userType, setUserType] = useState(null); // 'visitor' or 'admin'
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    let token = localStorage.getItem('visitorToken');
    let isVisitor = true;

    if (!token) {
      token = localStorage.getItem('authToken');
      isVisitor = false;
    }

    if (!token) {
      setIsAuthenticated(false);
      setUsername(null);
      setUserType(null);
      setLoading(false);
      return;
    }

    try {
      const response = await apiGet('/auth/status');
      if (response.authenticated) {
        setIsAuthenticated(true);
        setUsername(response.username);
        setUserType(response.userType || 'visitor');
      } else {
        if (isVisitor) {
          localStorage.removeItem('visitorToken');
        } else {
          localStorage.removeItem('authToken');
        }
        setIsAuthenticated(false);
        setUsername(null);
        setUserType(null);
      }
    } catch (error) {
      if (isLikelyNetworkError(error)) {
        const payload = decodeJwtPayloadUnsafe(token);
        const expired = payload?.exp != null && payload.exp * 1000 < Date.now();
        if (expired) {
          if (isVisitor) localStorage.removeItem('visitorToken');
          else localStorage.removeItem('authToken');
          setIsAuthenticated(false);
          setUsername(null);
          setUserType(null);
        } else if (payload?.username && (payload.type === 'visitor' || payload.type === 'admin')) {
          setIsAuthenticated(true);
          setUsername(payload.username);
          setUserType(payload.type);
        } else {
          if (isVisitor) localStorage.removeItem('visitorToken');
          else localStorage.removeItem('authToken');
          setIsAuthenticated(false);
          setUsername(null);
          setUserType(null);
        }
      } else {
        localStorage.removeItem('visitorToken');
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setUsername(null);
        setUserType(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = useCallback(async (password) => {
    try {
      const response = await apiPost('/auth/login', { password }, {
        clearTokensOn401: false
      });
      
      if (response.token) {
        // Store visitor token in localStorage
        localStorage.setItem('visitorToken', response.token);
        setIsAuthenticated(true);
        setUsername(response.username || 'visitor');
        setUserType(response.userType || 'visitor');
        return { success: true, userType: response.userType || 'visitor' };
      } else {
        return { success: false, error: 'فشل تسجيل الدخول' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'حدث خطأ أثناء تسجيل الدخول' 
      };
    }
  }, []);

  const adminLogin = useCallback(async (password) => {
    try {
      // Get visitor token for authorization
      const visitorToken = localStorage.getItem('visitorToken');
      if (!visitorToken) {
        return { success: false, error: 'يجب تسجيل الدخول كزائر أولاً' };
      }

      const response = await apiPost('/auth/admin-login', { password }, {
        token: visitorToken,
        clearTokensOn401: false
      });
      
      if (response.token) {
        // Store admin token in localStorage and remove visitor token
        localStorage.setItem('authToken', response.token);
        localStorage.removeItem('visitorToken');
        setIsAuthenticated(true);
        setUsername(response.username || 'admin');
        setUserType(response.userType || 'admin');
        
        // Refresh auth status to ensure all components get updated state
        await checkAuthStatus();
        
        return { success: true, userType: response.userType || 'admin' };
      } else {
        return { success: false, error: 'فشل تسجيل الدخول كمسؤول' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'حدث خطأ أثناء تسجيل الدخول كمسؤول' 
      };
    }
  }, [checkAuthStatus]);

  const logout = useCallback(() => {
    localStorage.removeItem('visitorToken');
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setUsername(null);
    setUserType(null);
  }, []);

  // Calculate isAdmin based on current userType
  const isAdmin = useMemo(() => {
    return userType === 'admin';
  }, [userType]);

  const value = useMemo(() => ({
    isAuthenticated,
    username,
    userType,
    isAdmin,
    loading,
    login,
    adminLogin,
    logout,
    checkAuthStatus
  }), [isAuthenticated, username, userType, isAdmin, loading, login, adminLogin, logout, checkAuthStatus]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

