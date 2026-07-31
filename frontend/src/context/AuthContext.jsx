import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const loggingOut = useRef(false);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/me')
        .then((res) => setUser(res.data.user))
        .catch(() => {
          if (!loggingOut.current) {
            doLogout();
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const doLogout = () => {
    loggingOut.current = true;
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const login = async (loginInput, password) => {
    const res = await api.post('/login', { login: loginInput, password });
    const { user: userData, token: authToken } = res.data;
    localStorage.setItem('token', authToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    setToken(authToken);
    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const res = await api.post('/register', data);
    return res.data;
  };

  const logout = async () => {
    if (token) {
      try {
        await api.post('/logout');
      } catch {
        // ignore — token may already be invalid
      }
    }
    doLogout();
  };

  const updateUser = (data) => {
    setUser((prev) => ({ ...prev, ...data }));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
