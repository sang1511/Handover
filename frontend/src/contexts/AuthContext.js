import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axiosInstance.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  const fetchUserData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const response = await axiosInstance.get('/auth/me');
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));
        } catch (error) {
          console.error('Error fetching user data:', error);
          logout();
      }
    }
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserData().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchUserData]);

  const login = async (email, password) => {
    try {
      const response = await axiosInstance.post('/auth/login', {
        email,
        password,
      });
      if (response.data.mfa) {
        return { mfa: true, userId: response.data.userId };
      }
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      return { mfa: false };
    } catch (error) {
      throw error;
    }
  };

  const verifyOtp = async (userId, otp) => {
    const response = await axiosInstance.post('/auth/verify-otp', { userId, otp });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
  };

  const resendOtp = async (email) => {
    const response = await axiosInstance.post('/auth/resend-otp', { email });
    return response.data;
  };

  const register = async (userData) => {
    try {
      const response = await axiosInstance.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Register API error:', error.response?.data || error.message);
      throw error;
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    await fetchUserData();
    setLoading(false);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    verifyOtp,
    resendOtp,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 