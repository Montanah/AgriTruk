// Enhanced notification service with comprehensive notification types and robust delivery
import { Platform, Alert } from 'react-native';
import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';
import { notificationService } from './notificationService';

// Enhanced notification types
export type EnhancedNotificationType =
  // Booking & Request Notifications
  | 'booking_created'
  | 'booking_accepted'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'booking_updated'
  | 'instant_request_received'
  | 'instant_request_accepted'
  | 'instant_request_rejected'
  | 'instant_request_expired'
  
  // Trip & Tracking Notifications
  | 'trip_started'
  | 'trip_in_progress'
  | 'trip_completed'
  | 'trip_delayed'
  | 'trip_cancelled'
  | 'location_update'
  | 'near_pickup'
  | 'near_delivery'
  | 'route_deviation'
  
  // Communication Notifications
  | 'chat_message_received'
  | 'voice_call_incoming'
  | 'voice_call_missed'
  | 'message_urgent'
  
  // Payment & Financial Notifications
  | 'payment_received'
  | 'payment_failed'
  | 'payment_pending'
  | 'refund_processed'
  | 'subscription_renewal'
  | 'subscription_expired'
  | 'subscription_cancelled'
  | 'pricing_updated'
  
  // System & Admin Notifications
  | 'system_maintenance'
  | 'app_update_available'
  | 'security_alert'
  | 'account_verified'
  | 'account_suspended'
  | 'profile_updated'
  | 'document_expired'
  | 'document_approved'
  | 'document_rejected'
  
  // Transporter Specific
  | 'new_job_available'
  | 'job_assigned'
  | 'job_unassigned'
  | 'rating_received'
  | 'review_received'
  | 'vehicle_approved'
  | 'vehicle_rejected'
  | 'license_expiring'
  | 'insurance_expiring'
  
  // Client Specific
  | 'transporter_assigned'
  | 'transporter_arrived'
  | 'delivery_confirmed'
  | 'delivery_delayed'
  | 'delivery_failed'
  | 'feedback_requested'
  
  // Broker Specific
  | 'client_registered'
  | 'transporter_registered'
  | 'commission_earned'
  | 'dispute_created'
  | 'dispute_resolved'
  
  // Emergency & Safety
  | 'emergency_alert'
  | 'safety_incident'
  | 'weather_warning'
  | 'route_hazard'
  | 'vehicle_breakdown';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';
export type NotificationCategory = 'booking' | 'trip' | 'communication' | 'payment' | 'system' | 'safety' | 'marketing';

export interface EnhancedNotificationPayload {
  id?: string;
  userId: string;
  type: EnhancedNotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: any;
  channels: ('push' | 'in-app' | 'email' | 'sms')[];
  scheduledFor?: Date;
  expiresAt?: Date;
  requiresAction?: boolean;
  actionUrl?: string;
  actionText?: string;
  icon?: string;
  color?: string;
  sound?: boolean;
  vibration?: boolean;
  badge?: boolean;
  silent?: boolean;
}

export interface NotificationTemplate {
  type: EnhancedNotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  titleTemplate: string;
  messageTemplate: string;
  defaultChannels: ('push' | 'in-app' | 'email' | 'sms')[];
  icon: string;
  color: string;
  sound: boolean;
  vibration: boolean;
  requiresAction: boolean;
}

// Notification templates for consistent messaging
export const NOTIFICATION_TEMPLATES: Record<EnhancedNotificationType, NotificationTemplate> = {
  // Booking & Request Notifications
  booking_created: {
    type: 'booking_created',
    category: 'booking',
    priority: 'normal',
    titleTemplate: 'Booking Created',
    messageTemplate: 'Your booking #{bookingId} has been created successfully',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'calendar-plus',
    color: '#4CAF50',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  booking_accepted: {
    type: 'booking_accepted',
    category: 'booking',
    priority: 'high',
    titleTemplate: 'Booking Accepted! 🎉',
    messageTemplate: 'Your booking #{bookingId} has been accepted by {transporterName}',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'check-circle',
    color: '#4CAF50',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  booking_rejected: {
    type: 'booking_rejected',
    category: 'booking',
    priority: 'normal',
    titleTemplate: 'Booking Rejected',
    messageTemplate: 'Your booking #{bookingId} was not accepted. We\'ll find you another transporter',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'close-circle',
    color: '#F44336',
    sound: false,
    vibration: false,
    requiresAction: true,
  },
  instant_request_received: {
    type: 'instant_request_received',
    category: 'booking',
    priority: 'urgent',
    titleTemplate: 'New Instant Request! ⚡',
    messageTemplate: 'New instant request from {clientName} - {pickupLocation} to {deliveryLocation}',
    defaultChannels: ['push', 'in-app', 'sms'],
    icon: 'flash',
    color: '#FF9800',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  instant_request_accepted: {
    type: 'instant_request_accepted',
    category: 'booking',
    priority: 'high',
    titleTemplate: 'Request Accepted! 🚛',
    messageTemplate: 'Your instant request has been accepted by {transporterName}',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'check-circle',
    color: '#4CAF50',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  trip_started: {
    type: 'trip_started',
    category: 'trip',
    priority: 'high',
    titleTemplate: 'Trip Started! 🚛',
    messageTemplate: 'Your trip #{tripId} has started. Track progress in real-time',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'play-circle',
    color: '#2196F3',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  near_pickup: {
    type: 'near_pickup',
    category: 'trip',
    priority: 'high',
    titleTemplate: 'Transporter Arriving! 📍',
    messageTemplate: 'Your transporter is near the pickup location',
    defaultChannels: ['push', 'in-app', 'sms'],
    icon: 'map-marker',
    color: '#FF9800',
    sound: true,
    vibration: true,
    requiresAction: false,
  },
  near_delivery: {
    type: 'near_delivery',
    category: 'trip',
    priority: 'high',
    titleTemplate: 'Delivery Arriving! 📦',
    messageTemplate: 'Your delivery is near the destination',
    defaultChannels: ['push', 'in-app', 'sms'],
    icon: 'package-variant',
    color: '#4CAF50',
    sound: true,
    vibration: true,
    requiresAction: false,
  },
  chat_message_received: {
    type: 'chat_message_received',
    category: 'communication',
    priority: 'normal',
    titleTemplate: 'New Message',
    messageTemplate: '{senderName}: {messagePreview}',
    defaultChannels: ['push', 'in-app'],
    icon: 'message',
    color: '#9C27B0',
    sound: true,
    vibration: false,
    requiresAction: true,
  },
  voice_call_incoming: {
    type: 'voice_call_incoming',
    category: 'communication',
    priority: 'urgent',
    titleTemplate: 'Incoming Call',
    messageTemplate: '{callerName} is calling you',
    defaultChannels: ['push', 'in-app'],
    icon: 'phone',
    color: '#4CAF50',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  payment_received: {
    type: 'payment_received',
    category: 'payment',
    priority: 'high',
    titleTemplate: 'Payment Received! 💰',
    messageTemplate: 'Payment of {amount} received for trip #{tripId}',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'cash',
    color: '#4CAF50',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  payment_failed: {
    type: 'payment_failed',
    category: 'payment',
    priority: 'high',
    titleTemplate: 'Payment Failed',
    messageTemplate: 'Payment failed for trip #{tripId}. Please update your payment method',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'alert-circle',
    color: '#F44336',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  new_job_available: {
    type: 'new_job_available',
    category: 'booking',
    priority: 'normal',
    titleTemplate: 'New Job Available! 💼',
    messageTemplate: 'New job available: {pickupLocation} to {deliveryLocation}',
    defaultChannels: ['push', 'in-app'],
    icon: 'briefcase',
    color: '#2196F3',
    sound: true,
    vibration: false,
    requiresAction: true,
  },
  rating_received: {
    type: 'rating_received',
    category: 'system',
    priority: 'normal',
    titleTemplate: 'New Rating! ⭐',
    messageTemplate: 'You received a {rating}-star rating from {clientName}',
    defaultChannels: ['push', 'in-app'],
    icon: 'star',
    color: '#FF9800',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  emergency_alert: {
    type: 'emergency_alert',
    category: 'safety',
    priority: 'critical',
    titleTemplate: 'Emergency Alert! 🚨',
    messageTemplate: '{message}',
    defaultChannels: ['push', 'in-app', 'sms'],
    icon: 'alert',
    color: '#F44336',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  system_maintenance: {
    type: 'system_maintenance',
    category: 'system',
    priority: 'normal',
    titleTemplate: 'Scheduled Maintenance',
    messageTemplate: 'System maintenance scheduled for {date} from {startTime} to {endTime}',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'wrench',
    color: '#FF9800',
    sound: false,
    vibration: false,
    requiresAction: false,
  },
  // Add more templates as needed...
  booking_cancelled: {
    type: 'booking_cancelled',
    category: 'booking',
    priority: 'normal',
    titleTemplate: 'Booking Cancelled',
    messageTemplate: 'Booking #{bookingId} has been cancelled',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'cancel',
    color: '#F44336',
    sound: false,
    vibration: false,
    requiresAction: false,
  },
  booking_completed: {
    type: 'booking_completed',
    category: 'booking',
    priority: 'high',
    titleTemplate: 'Trip Completed! ✅',
    messageTemplate: 'Your trip #{tripId} has been completed successfully',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'check-circle',
    color: '#4CAF50',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  booking_updated: {
    type: 'booking_updated',
    category: 'booking',
    priority: 'normal',
    titleTemplate: 'Booking Updated',
    messageTemplate: 'Your booking #{bookingId} has been updated',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'update',
    color: '#2196F3',
    sound: false,
    vibration: false,
    requiresAction: false,
  },
  instant_request_rejected: {
    type: 'instant_request_rejected',
    category: 'booking',
    priority: 'normal',
    titleTemplate: 'Request Not Accepted',
    messageTemplate: 'Your instant request was not accepted. Try again or book in advance',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'close-circle',
    color: '#F44336',
    sound: false,
    vibration: false,
    requiresAction: true,
  },
  instant_request_expired: {
    type: 'instant_request_expired',
    category: 'booking',
    priority: 'normal',
    titleTemplate: 'Request Expired',
    messageTemplate: 'Your instant request has expired. Please create a new one',
    defaultChannels: ['push', 'in-app'],
    icon: 'clock-alert',
    color: '#FF9800',
    sound: false,
    vibration: false,
    requiresAction: true,
  },
  trip_in_progress: {
    type: 'trip_in_progress',
    category: 'trip',
    priority: 'normal',
    titleTemplate: 'Trip In Progress',
    messageTemplate: 'Your trip #{tripId} is currently in progress',
    defaultChannels: ['in-app'],
    icon: 'truck',
    color: '#2196F3',
    sound: false,
    vibration: false,
    requiresAction: false,
  },
  trip_completed: {
    type: 'trip_completed',
    category: 'trip',
    priority: 'high',
    titleTemplate: 'Trip Completed! 🎉',
    messageTemplate: 'Trip #{tripId} has been completed successfully',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'check-circle',
    color: '#4CAF50',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  trip_delayed: {
    type: 'trip_delayed',
    category: 'trip',
    priority: 'high',
    titleTemplate: 'Trip Delayed',
    messageTemplate: 'Your trip #{tripId} has been delayed. New ETA: {newEta}',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'clock-alert',
    color: '#FF9800',
    sound: true,
    vibration: true,
    requiresAction: false,
  },
  trip_cancelled: {
    type: 'trip_cancelled',
    category: 'trip',
    priority: 'high',
    titleTemplate: 'Trip Cancelled',
    messageTemplate: 'Trip #{tripId} has been cancelled. Reason: {reason}',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'cancel',
    color: '#F44336',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  location_update: {
    type: 'location_update',
    category: 'trip',
    priority: 'low',
    titleTemplate: 'Location Update',
    messageTemplate: 'Transporter location updated',
    defaultChannels: ['in-app'],
    icon: 'map-marker',
    color: '#2196F3',
    sound: false,
    vibration: false,
    requiresAction: false,
  },
  route_deviation: {
    type: 'route_deviation',
    category: 'trip',
    priority: 'high',
    titleTemplate: 'Route Deviation',
    messageTemplate: 'Transporter has deviated from the planned route',
    defaultChannels: ['push', 'in-app', 'sms'],
    icon: 'alert-circle',
    color: '#FF9800',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  voice_call_missed: {
    type: 'voice_call_missed',
    category: 'communication',
    priority: 'normal',
    titleTemplate: 'Missed Call',
    messageTemplate: 'Missed call from {callerName}',
    defaultChannels: ['push', 'in-app'],
    icon: 'phone-missed',
    color: '#F44336',
    sound: false,
    vibration: false,
    requiresAction: true,
  },
  message_urgent: {
    type: 'message_urgent',
    category: 'communication',
    priority: 'urgent',
    titleTemplate: 'Urgent Message! ⚠️',
    messageTemplate: 'Urgent message from {senderName}: {messagePreview}',
    defaultChannels: ['push', 'in-app', 'sms'],
    icon: 'message-alert',
    color: '#F44336',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  payment_pending: {
    type: 'payment_pending',
    category: 'payment',
    priority: 'normal',
    titleTemplate: 'Payment Pending',
    messageTemplate: 'Payment of {amount} is pending for trip #{tripId}',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'clock',
    color: '#FF9800',
    sound: false,
    vibration: false,
    requiresAction: true,
  },
  refund_processed: {
    type: 'refund_processed',
    category: 'payment',
    priority: 'normal',
    titleTemplate: 'Refund Processed',
    messageTemplate: 'Refund of {amount} has been processed for trip #{tripId}',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'cash-refund',
    color: '#4CAF50',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  subscription_renewal: {
    type: 'subscription_renewal',
    category: 'payment',
    priority: 'normal',
    titleTemplate: 'Subscription Renewed',
    messageTemplate: 'Your subscription has been renewed successfully',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'refresh',
    color: '#4CAF50',
    sound: false,
    vibration: false,
    requiresAction: false,
  },
  subscription_expired: {
    type: 'subscription_expired',
    category: 'payment',
    priority: 'high',
    titleTemplate: 'Subscription Expired',
    messageTemplate: 'Your subscription has expired. Please renew to continue using premium features',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'alert-circle',
    color: '#F44336',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  subscription_cancelled: {
    type: 'subscription_cancelled',
    category: 'payment',
    priority: 'normal',
    titleTemplate: 'Subscription Cancelled',
    messageTemplate: 'Your subscription has been cancelled',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'cancel',
    color: '#F44336',
    sound: false,
    vibration: false,
    requiresAction: false,
  },
  pricing_updated: {
    type: 'pricing_updated',
    category: 'payment',
    priority: 'normal',
    titleTemplate: 'Pricing Updated',
    messageTemplate: 'Our pricing has been updated. Check the new rates',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'currency-usd',
    color: '#2196F3',
    sound: false,
    vibration: false,
    requiresAction: false,
  },
  app_update_available: {
    type: 'app_update_available',
    category: 'system',
    priority: 'normal',
    titleTemplate: 'App Update Available',
    messageTemplate: 'A new version of TRUKAPP is available. Update now for the latest features',
    defaultChannels: ['push', 'in-app'],
    icon: 'update',
    color: '#2196F3',
    sound: false,
    vibration: false,
    requiresAction: true,
  },
  security_alert: {
    type: 'security_alert',
    category: 'system',
    priority: 'critical',
    titleTemplate: 'Security Alert! 🔒',
    messageTemplate: 'Suspicious activity detected on your account. Please verify your identity',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'shield-alert',
    color: '#F44336',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  account_verified: {
    type: 'account_verified',
    category: 'system',
    priority: 'normal',
    titleTemplate: 'Account Verified! ✅',
    messageTemplate: 'Your account has been successfully verified',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'check-circle',
    color: '#4CAF50',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  account_suspended: {
    type: 'account_suspended',
    category: 'system',
    priority: 'critical',
    titleTemplate: 'Account Suspended',
    messageTemplate: 'Your account has been suspended. Contact support for assistance',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'account-alert',
    color: '#F44336',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  profile_updated: {
    type: 'profile_updated',
    category: 'system',
    priority: 'normal',
    titleTemplate: 'Profile Updated',
    messageTemplate: 'Your profile has been updated successfully',
    defaultChannels: ['in-app'],
    icon: 'account-edit',
    color: '#2196F3',
    sound: false,
    vibration: false,
    requiresAction: false,
  },
  document_expired: {
    type: 'document_expired',
    category: 'system',
    priority: 'high',
    titleTemplate: 'Document Expired',
    messageTemplate: 'Your {documentType} has expired. Please upload a new one',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'file-alert',
    color: '#FF9800',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  document_approved: {
    type: 'document_approved',
    category: 'system',
    priority: 'normal',
    titleTemplate: 'Document Approved! ✅',
    messageTemplate: 'Your {documentType} has been approved',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'check-circle',
    color: '#4CAF50',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  document_rejected: {
    type: 'document_rejected',
    category: 'system',
    priority: 'high',
    titleTemplate: 'Document Rejected',
    messageTemplate: 'Your {documentType} was rejected. Reason: {reason}',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'close-circle',
    color: '#F44336',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  job_assigned: {
    type: 'job_assigned',
    category: 'booking',
    priority: 'high',
    titleTemplate: 'Job Assigned! 💼',
    messageTemplate: 'You have been assigned a new job: {pickupLocation} to {deliveryLocation}',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'briefcase-check',
    color: '#4CAF50',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  job_unassigned: {
    type: 'job_unassigned',
    category: 'booking',
    priority: 'normal',
    titleTemplate: 'Job Unassigned',
    messageTemplate: 'You have been unassigned from job #{jobId}',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'briefcase-remove',
    color: '#F44336',
    sound: false,
    vibration: false,
    requiresAction: false,
  },
  review_received: {
    type: 'review_received',
    category: 'system',
    priority: 'normal',
    titleTemplate: 'New Review! 📝',
    messageTemplate: 'You received a review from {clientName}: "{reviewText}"',
    defaultChannels: ['push', 'in-app'],
    icon: 'star-text',
    color: '#FF9800',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  vehicle_approved: {
    type: 'vehicle_approved',
    category: 'system',
    priority: 'normal',
    titleTemplate: 'Vehicle Approved! 🚛',
    messageTemplate: 'Your vehicle {vehiclePlate} has been approved',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'truck-check',
    color: '#4CAF50',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  vehicle_rejected: {
    type: 'vehicle_rejected',
    category: 'system',
    priority: 'high',
    titleTemplate: 'Vehicle Rejected',
    messageTemplate: 'Your vehicle {vehiclePlate} was rejected. Reason: {reason}',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'truck-remove',
    color: '#F44336',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  license_expiring: {
    type: 'license_expiring',
    category: 'system',
    priority: 'high',
    titleTemplate: 'License Expiring Soon',
    messageTemplate: 'Your driving license expires in {daysLeft} days. Please renew it',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'alert-circle',
    color: '#FF9800',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  insurance_expiring: {
    type: 'insurance_expiring',
    category: 'system',
    priority: 'high',
    titleTemplate: 'Insurance Expiring Soon',
    messageTemplate: 'Your vehicle insurance expires in {daysLeft} days. Please renew it',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'alert-circle',
    color: '#FF9800',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  transporter_assigned: {
    type: 'transporter_assigned',
    category: 'booking',
    priority: 'high',
    titleTemplate: 'Transporter Assigned! 🚛',
    messageTemplate: 'Transporter {transporterName} has been assigned to your booking',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'truck',
    color: '#4CAF50',
    sound: true,
    vibration: true,
    requiresAction: false,
  },
  transporter_arrived: {
    type: 'transporter_arrived',
    category: 'trip',
    priority: 'high',
    titleTemplate: 'Transporter Arrived! 📍',
    messageTemplate: 'Your transporter has arrived at the pickup location',
    defaultChannels: ['push', 'in-app', 'sms'],
    icon: 'map-marker-check',
    color: '#4CAF50',
    sound: true,
    vibration: true,
    requiresAction: false,
  },
  delivery_confirmed: {
    type: 'delivery_confirmed',
    category: 'trip',
    priority: 'high',
    titleTemplate: 'Delivery Confirmed! ✅',
    messageTemplate: 'Your delivery has been confirmed and completed',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'package-check',
    color: '#4CAF50',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  delivery_delayed: {
    type: 'delivery_delayed',
    category: 'trip',
    priority: 'high',
    titleTemplate: 'Delivery Delayed',
    messageTemplate: 'Your delivery has been delayed. New ETA: {newEta}',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'clock-alert',
    color: '#FF9800',
    sound: true,
    vibration: true,
    requiresAction: false,
  },
  delivery_failed: {
    type: 'delivery_failed',
    category: 'trip',
    priority: 'critical',
    titleTemplate: 'Delivery Failed',
    messageTemplate: 'Your delivery failed. Reason: {reason}. We\'ll arrange a new delivery',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'alert-circle',
    color: '#F44336',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  feedback_requested: {
    type: 'feedback_requested',
    category: 'system',
    priority: 'normal',
    titleTemplate: 'Rate Your Experience',
    messageTemplate: 'Please rate your experience for trip #{tripId}',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'star',
    color: '#FF9800',
    sound: false,
    vibration: false,
    requiresAction: true,
  },
  client_registered: {
    type: 'client_registered',
    category: 'system',
    priority: 'normal',
    titleTemplate: 'New Client Registered',
    messageTemplate: 'New client {clientName} has registered in your network',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'account-plus',
    color: '#4CAF50',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  transporter_registered: {
    type: 'transporter_registered',
    category: 'system',
    priority: 'normal',
    titleTemplate: 'New Transporter Registered',
    messageTemplate: 'New transporter {transporterName} has joined your network',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'truck-plus',
    color: '#4CAF50',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  commission_earned: {
    type: 'commission_earned',
    category: 'payment',
    priority: 'normal',
    titleTemplate: 'Commission Earned! 💰',
    messageTemplate: 'You earned {amount} commission from {transactionType}',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'cash-plus',
    color: '#4CAF50',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  dispute_created: {
    type: 'dispute_created',
    category: 'system',
    priority: 'high',
    titleTemplate: 'New Dispute Created',
    messageTemplate: 'A new dispute has been created for trip #{tripId}',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'alert-circle',
    color: '#F44336',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  dispute_resolved: {
    type: 'dispute_resolved',
    category: 'system',
    priority: 'normal',
    titleTemplate: 'Dispute Resolved',
    messageTemplate: 'Dispute for trip #{tripId} has been resolved',
    defaultChannels: ['push', 'in-app', 'email'],
    icon: 'check-circle',
    color: '#4CAF50',
    sound: true,
    vibration: false,
    requiresAction: false,
  },
  safety_incident: {
    type: 'safety_incident',
    category: 'safety',
    priority: 'critical',
    titleTemplate: 'Safety Incident Reported',
    messageTemplate: 'A safety incident has been reported. Please review immediately',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'alert',
    color: '#F44336',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
  weather_warning: {
    type: 'weather_warning',
    category: 'safety',
    priority: 'high',
    titleTemplate: 'Weather Warning! ⛈️',
    messageTemplate: 'Severe weather conditions in your area. Drive safely',
    defaultChannels: ['push', 'in-app', 'sms'],
    icon: 'weather-cloudy',
    color: '#FF9800',
    sound: true,
    vibration: true,
    requiresAction: false,
  },
  route_hazard: {
    type: 'route_hazard',
    category: 'safety',
    priority: 'high',
    titleTemplate: 'Route Hazard Alert',
    messageTemplate: 'Hazard reported on your route. Consider alternative routes',
    defaultChannels: ['push', 'in-app', 'sms'],
    icon: 'alert-triangle',
    color: '#FF9800',
    sound: true,
    vibration: true,
    requiresAction: false,
  },
  vehicle_breakdown: {
    type: 'vehicle_breakdown',
    category: 'safety',
    priority: 'critical',
    titleTemplate: 'Vehicle Breakdown Reported',
    messageTemplate: 'Vehicle breakdown reported for trip #{tripId}. Assistance dispatched',
    defaultChannels: ['push', 'in-app', 'email', 'sms'],
    icon: 'truck-alert',
    color: '#F44336',
    sound: true,
    vibration: true,
    requiresAction: true,
  },
};

class EnhancedNotificationService {
  private templates = NOTIFICATION_TEMPLATES;

  /**
   * Send a notification using template and custom data
   */
  async sendNotification(
    type: EnhancedNotificationType,
    userId: string,
    customData: Record<string, any> = {},
    overrides: Partial<EnhancedNotificationPayload> = {}
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const template = this.templates[type];
      if (!template) {
        throw new Error(`No template found for notification type: ${type}`);
      }

      // Build notification payload
      const payload: EnhancedNotificationPayload = {
        userId,
        type,
        category: template.category,
        priority: template.priority,
        title: this.interpolateTemplate(template.titleTemplate, customData),
        message: this.interpolateTemplate(template.messageTemplate, customData),
        data: customData,
        channels: template.defaultChannels,
        icon: template.icon,
        color: template.color,
        sound: template.sound,
        vibration: template.vibration,
        requiresAction: template.requiresAction,
        ...overrides,
      };

      // Send through multiple channels
      const results = await Promise.allSettled(
        payload.channels.map(channel => this.sendToChannel(payload, channel))
      );

      // Check if any channel succeeded
      const success = results.some(result => result.status === 'fulfilled');
      
      if (success) {
        return { success: true, notificationId: payload.id };
      } else {
        const errors = results
          .filter(result => result.status === 'rejected')
          .map(result => (result as PromiseRejectedResult).reason);
        return { success: false, error: errors.join(', ') };
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to specific channel
   */
  private async sendToChannel(payload: EnhancedNotificationPayload, channel: 'push' | 'in-app' | 'email' | 'sms'): Promise<void> {
    const { userId, title, message, type, category, priority, data } = payload;

    try {
      switch (channel) {
        case 'push':
          await notificationService.sendPush(userId, title, message, data);
          break;
        case 'in-app':
          await notificationService.sendInApp(userId, message, 'customer', type, data);
          break;
        case 'email':
          await notificationService.sendEmail(userId, title, message, 'customer', type, data);
          break;
        case 'sms':
          await notificationService.sendSMS(userId, message, 'customer', type, data);
          break;
        default:
          console.warn(`Unknown notification channel: ${channel}`);
      }
    } catch (error) {
      console.error(`Error sending notification via ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Interpolate template with custom data
   */
  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    notifications: Array<{
      type: EnhancedNotificationType;
      userId: string;
      customData?: Record<string, any>;
      overrides?: Partial<EnhancedNotificationPayload>;
    }>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = await Promise.allSettled(
      notifications.map(notification => 
        this.sendNotification(notification.type, notification.userId, notification.customData, notification.overrides)
      )
    );

    const success = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failed = results.length - success;
    const errors = results
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason);

    return { success, failed, errors };
  }

  /**
   * Schedule notification for later
   */
  async scheduleNotification(
    type: EnhancedNotificationType,
    userId: string,
    scheduledFor: Date,
    customData: Record<string, any> = {},
    overrides: Partial<EnhancedNotificationPayload> = {}
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    // This would integrate with a scheduling service
    // For now, we'll use setTimeout as a simple implementation
    const delay = scheduledFor.getTime() - Date.now();
    
    if (delay <= 0) {
      return this.sendNotification(type, userId, customData, overrides);
    }

    setTimeout(async () => {
      await this.sendNotification(type, userId, customData, overrides);
    }, delay);

    return { success: true, notificationId: `scheduled_${Date.now()}` };
  }

  /**
   * Get notification template
   */
  getTemplate(type: EnhancedNotificationType): NotificationTemplate | undefined {
    return this.templates[type];
  }

  /**
   * Get all notification types for a category
   */
  getNotificationTypesByCategory(category: NotificationCategory): EnhancedNotificationType[] {
    return Object.keys(this.templates).filter(
      type => this.templates[type as EnhancedNotificationType].category === category
    ) as EnhancedNotificationType[];
  }

  /**
   * Show critical notification as alert
   */
  async showCriticalAlert(
    type: EnhancedNotificationType,
    customData: Record<string, any> = {}
  ): Promise<void> {
    const template = this.templates[type];
    if (!template || template.priority !== 'critical') {
      return;
    }

    const title = this.interpolateTemplate(template.titleTemplate, customData);
    const message = this.interpolateTemplate(template.messageTemplate, customData);

    Alert.alert(title, message, [
      { text: 'OK', style: 'default' },
      ...(template.requiresAction ? [{ text: 'Take Action', style: 'destructive' }] : [])
    ]);
  }
}

export const enhancedNotificationService = new EnhancedNotificationService();

