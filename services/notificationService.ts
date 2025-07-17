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

export const notificationService = {
  send: async (payload: NotificationPayload) => {
    // In production, integrate with SendGrid, Twilio, FCM, etc.
    // For now, just log to mockNotifications
    const { to, channel, audience, type, subject, message, data } = payload;
    // eslint-disable-next-line no-console
    console.log(`[NOTIFY] [${channel}] [${audience}] [${type}] To: ${to} | Subject: ${subject || ''} | Message: ${message}`);
    // Optionally push to mock notification log
    if (typeof window !== 'undefined' && window.mockNotifications) {
      window.mockNotifications.push({ ...payload, timestamp: new Date().toISOString() });
    }
  },
  // Convenience methods
  sendEmail: async (to: string, subject: string, message: string, audience: NotificationAudience, type: NotificationType, data?: any) =>
    notificationService.send({ to, channel: 'email', audience, type, subject, message, data }),
  sendSMS: async (to: string, message: string, audience: NotificationAudience, type: NotificationType, data?: any) =>
    notificationService.send({ to, channel: 'sms', audience, type, message, data }),
  sendInApp: async (to: string, message: string, audience: NotificationAudience, type: NotificationType, data?: any) =>
    notificationService.send({ to, channel: 'in-app', audience, type, message, data }),
};
