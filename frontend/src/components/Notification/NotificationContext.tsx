import React, { createContext, useContext, useState } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

import { setAddNotification } from './NotificationContextSingleton';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

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

  React.useEffect(() => {
    setAddNotification(addNotification);
    // Cleanup on unmount
    return () => setAddNotification(null);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};
