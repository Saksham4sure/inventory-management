import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { notificationService } from '../services/notificationService';

export const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const auth = useContext(AuthContext);
  const isAuthenticated = auth?.isAuthenticated;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      if (!silent) setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isAuthenticated]);

  // Initial load and periodic polling (every 20s)
  useEffect(() => {
    fetchNotifications();

    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [fetchNotifications, isAuthenticated]);

  const markAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const respondToInvitation = async (invitationId, action) => {
    try {
      const res = await notificationService.respondToInvitation(invitationId, action);
      
      // Update local notification state immediately
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.data?.invitationId === invitationId) {
            return {
              ...n,
              isRead: true,
              invitationStatus: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
            };
          }
          return n;
        })
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // If accepted, notify the app to reload business info
      if (action === 'ACCEPT' && window.location) {
        // Refresh page after a brief moment so user enters the new business dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      } else {
        fetchNotifications(true);
      }

      return res;
    } catch (err) {
      throw err;
    }
  };

  const deleteNotification = async (id) => {
    setNotifications((prev) => {
      const target = prev.find((n) => n._id === id);
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return prev.filter((n) => n._id !== id);
    });

    try {
      await notificationService.deleteNotification(id);
    } catch (err) {
      console.error('Failed to delete notification', err);
      fetchNotifications(true);
    }
  };

  const clearReadNotifications = async () => {
    setNotifications((prev) => prev.filter((n) => !n.isRead));

    try {
      await notificationService.clearReadNotifications();
    } catch (err) {
      console.error('Failed to clear read notifications', err);
      fetchNotifications(true);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearReadNotifications,
        respondToInvitation,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
