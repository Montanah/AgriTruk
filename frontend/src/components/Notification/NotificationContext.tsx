import React, { createContext, useContext, useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type?: string;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAllRead: () => void;
  markAsRead: (id: string) => void;
  refreshNotifications: () => Promise<void>;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

import { setAddNotification } from './NotificationContextSingleton';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const addNotification = (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => [
      {
        ...n,
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        timestamp: Date.now(),
        read: false,
      },
      ...prev,
    ]);
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (notificationService?.markAsRead) {
      await notificationService.markAsRead(id);
    }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (notificationService?.markAllAsRead) {
      await notificationService.markAllAsRead();
    }
  };

  const refreshNotifications = async () => {
    setLoading(true);
    try {
      if (notificationService?.getUserNotifications) {
        const serverNotifications = await notificationService.getUserNotifications();
        setNotifications(serverNotifications);
      } else {
        console.warn('Notification service not available, using empty notifications');
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAddNotification(addNotification);
    refreshNotifications();
    
    // Cleanup on unmount
    return () => setAddNotification(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      addNotification, 
      markAllRead, 
      markAsRead, 
      refreshNotifications, 
      loading 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};
