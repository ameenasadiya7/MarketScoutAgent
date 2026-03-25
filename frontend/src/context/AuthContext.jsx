import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Check URL for token (from Google OAuth redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      
      let activeToken = token;
      if (urlToken) {
        localStorage.setItem('token', urlToken);
        setToken(urlToken);
        activeToken = urlToken;
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (activeToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${activeToken}`;
        try {
          const res = await axios.get('http://localhost:8000/api/auth/me');
          setUser(res.data);
        } catch (err) {
          console.error('Auth check failed', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post('http://localhost:8000/api/auth/login', { email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await axios.post('http://localhost:8000/api/auth/register', { name, email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
