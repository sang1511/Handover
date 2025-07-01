import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSessionTimeout } from '../../hooks/useSessionTimeout';

const SessionTimeoutProvider = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  // Initialize session timeout
  useSessionTimeout(logout, navigate);
  
  return <>{children}</>;
};

export default SessionTimeoutProvider; 