import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationService } from '../api/services/notification.service'; // We will create this
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import socketManager from '../utils/socket'; // We will create this

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user, accessToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const fetchedNotifications = await notificationService.getNotifications();
      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, [user]);

  // Định nghĩa callback cố định
  const handleNotification = useCallback((newNotification) => {
    // Defensively check if the notification is valid and not a general update event
    if (!newNotification || !newNotification.message || newNotification.type === 'project_updated') {
      return; // Do not process
    }
    // Hiển thị toast notification
    toast.info(newNotification.message);
    // Cập nhật state
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    // Nếu là project_created hoặc project_updated, phát event để Projects.js lắng nghe
    if (
      newNotification.type === 'project_created' ||
      newNotification.type === 'project_updated'
    ) {
      window.dispatchEvent(new Event('refreshProjects'));
    }
  }, []);

  useEffect(() => {
    if (!user || !accessToken) {
      socketManager.disconnect();
      return;
    }

    let reconnectToastId = null;
    let reconnectTimeoutId = null;

    const handleError = (error) => {
      console.error('Socket connection error:', error);
      if (!reconnectToastId) {
        reconnectToastId = toast.error(
          'Mất kết nối thời gian thực. Đang thử kết nối lại...', 
          { autoClose: false, closeOnClick: false, draggable: false }
        );
      }
      
      // Thử kết nối lại sau 10 giây
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = setTimeout(connectSocket, 10000);
    };

    const handleSuccess = () => {
      fetchNotifications();
      if (reconnectToastId) {
        toast.dismiss(reconnectToastId);
        toast.success('Kết nối thời gian thực đã được khôi phục!');
        reconnectToastId = null;
      }
    };

    const connectSocket = () => {
      socketManager.connect(accessToken, handleError);
    };

    connectSocket();

    socketManager.on('connect', handleSuccess);
    socketManager.on('notification', handleNotification);

    return () => {
      socketManager.off('notification', handleNotification);
      socketManager.off('connect', handleSuccess);
      socketManager.disconnect();
      clearTimeout(reconnectTimeoutId);
      if (reconnectToastId) {
        toast.dismiss(reconnectToastId);
      }
    };
  }, [user, accessToken, fetchNotifications, handleNotification]);

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark notifications as read', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 