// Enhanced notification service with push notifications and real-time support
import { Platform } from 'react-native';
import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';
import fallbackNotificationService from './fallbackNotificationService';

// Conditional imports for Expo modules
let Notifications: any = null;
let Device: any = null;
let Constants: any = null;

try {
  // Check if expo-notifications is available (it's removed for APK builds)
  try {
    require.resolve('expo-notifications');
    Notifications = require('expo-notifications');
    Device = require('expo-device');
    Constants = require('expo-constants');
  } catch (moduleError) {
    // expo-notifications not available in this build environment. Using fallback notification service.
    Notifications = null;
    Device = null;
    Constants = null;
  }
} catch (error) {
  console.warn('Expo modules not available in this environment:', error);
  Notifications = null;
  Device = null;
  Constants = null;
}

export type NotificationChannel = 'email' | 'sms' | 'in-app' | 'push';
export type NotificationAudience = 'driver' | 'transporter' | 'customer' | 'broker' | 'admin';
export type NotificationType =
  | 'driver_recruited'
  | 'vehicle_assigned'
  | 'request_allocated'
  | 'request_status'
  | 'tracking_near_pickup'
  | 'tracking_wrong_route'
  | 'admin_alert'
  | 'chat_message'
  | 'trip_update'
  | 'payment_received'
  | 'subscription_expired';

export interface NotificationPayload {
  to: string; // email, phone, or userId
  channel: NotificationChannel;
  audience: NotificationAudience;
  type: NotificationType;
  subject?: string;
  message: string;
  data?: any;
  title?: string;
}

// Configure notification behavior if available
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

class NotificationService {
  private expoPushToken: string | null = null;
  private useFallback: boolean = false;

  constructor() {
    this.useFallback = !Device || !Notifications || !Constants;
    if (!this.useFallback) {
      this.initializeNotifications();
    } else {
      // Using fallback notification service
    }
  }

  /**
   * Initialize push notifications
   */
  private async initializeNotifications() {
    if (!Device || !Notifications || !Constants) {
      // Expo modules not available, skipping push notification initialization
      return;
    }

    if (Device.isDevice) {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          // Failed to get push token for push notification
          return;
        }
        
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        this.expoPushToken = token.data;
        // Expo push token obtained
        
        // Register token with backend
        await this.registerPushToken(this.expoPushToken);
      } catch (error) {
        console.error('Error getting push token:', error);
      }
    } else {
      // Must use physical device for Push Notifications
    }
  }

  /**
   * Register push token with backend
   */
  private async registerPushToken(token: string) {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/register-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        console.error('Failed to register push token:', response.status);
      }
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }

  /**
   * Send notification via multiple channels
   */
  async send(payload: NotificationPayload) {
    if (this.useFallback) {
      return fallbackNotificationService.send(payload);
    }

    const { to, channel, audience, type, subject, message, data, title } = payload;
    
    try {
      switch (channel) {
        case 'push':
          await this.sendPushNotification(to, title || subject || 'TRUKAPP', message, data);
          break;
        case 'in-app':
          await this.sendInAppNotification(to, title || subject || 'TRUKAPP', message, type, data);
          break;
        case 'email':
          await this.sendEmailNotification(to, subject || title || 'TRUKAPP', message, audience, type, data);
          break;
        case 'sms':
          await this.sendSMSNotification(to, message, audience, type, data);
          break;
        default:
          console.warn('Unknown notification channel:', channel);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(to: string, title: string, message: string, data?: any) {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/send-push`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          title,
          message,
          data,
        }),
      });

      if (!response.ok) {
        console.error('Failed to send push notification:', response.status);
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(to: string, title: string, message: string, type: NotificationType, data?: any) {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          title,
          message,
          type,
          data,
        }),
      });

      if (!response.ok) {
        console.error('Failed to send in-app notification:', response.status);
      }
    } catch (error) {
      console.error('Error sending in-app notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(to: string, subject: string, message: string, audience: NotificationAudience, type: NotificationType, data?: any) {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          message,
          audience,
          type,
          data,
        }),
      });

      if (!response.ok) {
        console.error('Failed to send email notification:', response.status);
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(to: string, message: string, audience: NotificationAudience, type: NotificationType, data?: any) {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/send-sms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          message,
          audience,
          type,
          data,
        }),
      });

      if (!response.ok) {
        console.error('Failed to send SMS notification:', response.status);
      }
    } catch (error) {
      console.error('Error sending SMS notification:', error);
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(): Promise<any[]> {
    if (this.useFallback) {
      return fallbackNotificationService.getUserNotifications('fallback-user');
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return [];

      const idToken = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.notifications || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    if (this.useFallback) {
      return fallbackNotificationService.markAsRead(notificationId);
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to mark notification as read:', response.status);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    if (this.useFallback) {
      return fallbackNotificationService.markAllAsRead('fallback-user');
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to mark all notifications as read:', response.status);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Convenience methods
  sendEmail = async (to: string, subject: string, message: string, audience: NotificationAudience, type: NotificationType, data?: any) =>
    this.send({ to, channel: 'email', audience, type, subject, message, data });

  sendSMS = async (to: string, message: string, audience: NotificationAudience, type: NotificationType, data?: any) =>
    this.send({ to, channel: 'sms', audience, type, message, data });

  sendInApp = async (to: string, message: string, audience: NotificationAudience, type: NotificationType, data?: any) =>
    this.send({ to, channel: 'in-app', audience, type, message, data });

  sendPush = async (to: string, title: string, message: string, data?: any) =>
    this.send({ to, channel: 'push', audience: 'customer', type: 'admin_alert', title, message, data });
}

export const notificationService = new NotificationService();

// Debug logging
// Notification Service initialized
