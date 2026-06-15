import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('vis_token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('vis_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const details = new URLSearchParams();
      details.append('username', username);
      details.append('password', password);

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: details,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to login');
      }

      const userProfile = {
        username: data.username,
        name: data.name,
        role: data.role,
        class_id: data.class_id,
      };

      setToken(data.access_token);
      setUser(userProfile);

      localStorage.setItem('vis_token', data.access_token);
      localStorage.setItem('vis_user', JSON.stringify(userProfile));
      return userProfile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('vis_token');
    localStorage.removeItem('vis_user');
  };

  const authenticatedFetch = async (url, options = {}) => {
    const headers = {
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      logout();
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, error, login, logout, authenticatedFetch, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
