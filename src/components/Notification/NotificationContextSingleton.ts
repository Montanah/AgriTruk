import { Notification } from './NotificationContext';

let addNotification: ((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void) | null = null;

export const setAddNotification = (fn: typeof addNotification) => {
  addNotification = fn;
};

export const pushInAppNotification = (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
  if (addNotification) addNotification(n);
};
