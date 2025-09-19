// /services/notificationService.ts
// Centralized notification service for TRUKAPP

export type NotificationChannel = 'email' | 'sms' | 'in-app';
export type NotificationAudience = 'driver' | 'transporter' | 'customer' | 'broker' | 'admin';
export type NotificationType =
  | 'driver_recruited'
  | 'vehicle_assigned'
  | 'request_allocated'
  | 'request_status'
  | 'tracking_near_pickup'
  | 'tracking_wrong_route'
  | 'admin_alert';

export interface NotificationPayload {
  to: string; // email, phone, or userId
  channel: NotificationChannel;
  audience: NotificationAudience;
  type: NotificationType;
  subject?: string;
  message: string;
  data?: any;
}

import { pushInAppNotification } from '../src/components/Notification/NotificationContextSingleton';

export const notificationService = {
  send: async (payload: NotificationPayload) => {
    const { to, channel, audience, type, subject, message, data } = payload;
    if (channel === 'in-app') {
      pushInAppNotification({
        title: subject || (type ? type.replace(/_/g, ' ').toUpperCase() : 'Notification'),
        message,
        type,
      });
    }
    // In production, integrate with SendGrid, Twilio, FCM, etc. for email and sms
  },
  // Convenience methods
  sendEmail: async (to: string, subject: string, message: string, audience: NotificationAudience, type: NotificationType, data?: any) =>
    notificationService.send({ to, channel: 'email', audience, type, subject, message, data }),
  sendSMS: async (to: string, message: string, audience: NotificationAudience, type: NotificationType, data?: any) =>
    notificationService.send({ to, channel: 'sms', audience, type, message, data }),
  sendInApp: async (to: string, message: string, audience: NotificationAudience, type: NotificationType, data?: any) =>
    notificationService.send({ to, channel: 'in-app', audience, type, message, data }),
};
