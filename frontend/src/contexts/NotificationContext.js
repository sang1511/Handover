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
    fetchNotifications();
    if (user && accessToken) {
      // Kết nối socket với accessToken
      socketManager.connect(accessToken);
      // Đăng ký listener cho notification từ socket
      socketManager.on('notification', handleNotification);
      return () => {
        socketManager.off('notification', handleNotification);
        socketManager.disconnect();
      };
    }
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