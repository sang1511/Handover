import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';

const SESSION_TIMEOUT_MINUTES = 30;
const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;
const DEBOUNCE_DELAY = 1000; // 1 giây debounce

export const useSessionTimeout = (logout, navigate) => {
  const timeoutRef = useRef(null);
  const debounceRef = useRef(null);

  // Reset session timer
  const resetSessionTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      // Auto logout khi hết thời gian
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      if (logout) logout();
      if (navigate) navigate('/login');
      toast.error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
    }, SESSION_TIMEOUT_MS);
  }, [logout, navigate]);

  // Debounced activity handler
  const handleUserActivity = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      resetSessionTimer();
    }, DEBOUNCE_DELAY);
  }, [resetSessionTimer]);

  // Setup event listeners
  useEffect(() => {
    const events = ['click', 'keypress', 'scroll', 'mousemove', 'touchstart'];
    
    const addEventListeners = () => {
      events.forEach(event => {
        document.addEventListener(event, handleUserActivity, { passive: true });
      });
    };

    const removeEventListeners = () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };

    // Chỉ setup event listeners nếu user đã đăng nhập
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      addEventListeners();
      resetSessionTimer();
    }

    return () => {
      removeEventListeners();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [handleUserActivity, resetSessionTimer]);

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    resetSessionTimer,
    handleUserActivity
  };
}; 