/**
 * Fallback Notification Service
 * Provides mock implementations for development environments where Expo native modules might not be available
 */

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  data?: any;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  importance: 'low' | 'normal' | 'high' | 'urgent';
  sound: boolean;
  vibration: boolean;
}

class FallbackNotificationService {
  private notifications: NotificationData[] = [];
  private channels: NotificationChannel[] = [];

  constructor() {
    console.log('📱 Using Fallback Notification Service (Development Mode)');
    this.initializeDefaultChannels();
  }

  private initializeDefaultChannels() {
    this.channels = [
      {
        id: 'default',
        name: 'Default',
        description: 'Default notification channel',
        importance: 'normal',
        sound: true,
        vibration: true,
      },
      {
        id: 'high_priority',
        name: 'High Priority',
        description: 'High priority notifications',
        importance: 'high',
        sound: true,
        vibration: true,
      },
      {
        id: 'low_priority',
        name: 'Low Priority',
        description: 'Low priority notifications',
        importance: 'low',
        sound: false,
        vibration: false,
      },
    ];
  }

  /**
   * Send a notification
   */
  async send(notification: {
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    data?: any;
    channelId?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const id = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const notificationData: NotificationData = {
        id,
        title: notification.title,
        message: notification.message,
        type: notification.type || 'info',
        timestamp: new Date(),
        read: false,
        data: notification.data,
      };

      this.notifications.unshift(notificationData);
      
      // Keep only last 100 notifications
      if (this.notifications.length > 100) {
        this.notifications = this.notifications.slice(0, 100);
      }

      console.log('📱 Fallback Notification Sent:', notificationData);
      
      return { success: true, id };
    } catch (error) {
      console.error('Error sending fallback notification:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string): Promise<NotificationData[]> {
    try {
      // In fallback mode, return all notifications
      return [...this.notifications];
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      this.notifications.forEach(notification => {
        notification.read = true;
      });
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Get notification channels
   */
  async getChannels(): Promise<NotificationChannel[]> {
    return [...this.channels];
  }

  /**
   * Create notification channel
   */
  async createChannel(channel: Omit<NotificationChannel, 'id'>): Promise<boolean> {
    try {
      const id = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newChannel: NotificationChannel = { ...channel, id };
      this.channels.push(newChannel);
      return true;
    } catch (error) {
      console.error('Error creating notification channel:', error);
      return false;
    }
  }

  /**
   * Delete notification channel
   */
  async deleteChannel(channelId: string): Promise<boolean> {
    try {
      const index = this.channels.findIndex(c => c.id === channelId);
      if (index !== -1) {
        this.channels.splice(index, 1);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting notification channel:', error);
      return false;
    }
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Return a mock token for development
      const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('📱 Mock Push Token Generated:', mockToken);
      return mockToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Unregister from push notifications
   */
  async unregisterFromPushNotifications(): Promise<boolean> {
    try {
      console.log('📱 Unregistered from push notifications (fallback mode)');
      return true;
    } catch (error) {
      console.error('Error unregistering from push notifications:', error);
      return false;
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    return true; // Always enabled in fallback mode
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    console.log('📱 Notification permissions granted (fallback mode)');
    return true;
  }

  /**
   * Get notification count
   */
  async getNotificationCount(userId: string): Promise<number> {
    try {
      return this.notifications.filter(n => !n.read).length;
    } catch (error) {
      console.error('Error getting notification count:', error);
      return 0;
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(userId: string): Promise<boolean> {
    try {
      this.notifications = [];
      return true;
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      return false;
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(notification: {
    title: string;
    message: string;
    data?: any;
    delay?: number; // in milliseconds
  }): Promise<boolean> {
    try {
      if (notification.delay) {
        setTimeout(() => {
          this.send(notification);
        }, notification.delay);
      } else {
        this.send(notification);
      }
      return true;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return false;
    }
  }

  /**
   * Cancel scheduled notification
   */
  async cancelScheduledNotification(notificationId: string): Promise<boolean> {
    try {
      // In fallback mode, we can't actually cancel scheduled notifications
      console.log('📱 Cannot cancel scheduled notification in fallback mode:', notificationId);
      return true;
    } catch (error) {
      console.error('Error canceling scheduled notification:', error);
      return false;
    }
  }
}

export default new FallbackNotificationService();
