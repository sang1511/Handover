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

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      // Set default authorization header
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Fetch user data
      const fetchUserData = async () => {
        try {
          const response = await axiosInstance.get('/auth/me');
          setUser(response.data);
          // Lưu thông tin người dùng vào localStorage
          localStorage.setItem('user', JSON.stringify(response.data));
        } catch (error) {
          console.error('Error fetching user data:', error);
          logout();
        } finally {
          setLoading(false);
        }
      };
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [logout]);

  const login = async (email, password) => {
    try {
      const response = await axiosInstance.post('/auth/login', {
        email,
        password,
      });
      const { token, user } = response.data;
      
      // Lưu token và thông tin người dùng
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    await axiosInstance.post('/auth/register', userData);
  };

  // đăng nhập luôn sau khi đăng ký
  // const register = async (userData) => {
  //   const response = await axiosInstance.post('/auth/register', userData);
  
  //   const { token, user } = response.data;
  
  //   localStorage.setItem('token', token);
  //   axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  
  //   setUser(user);
  // };
  

  const value = {
    user,
    loading,
    login,
    register,
    logout,
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