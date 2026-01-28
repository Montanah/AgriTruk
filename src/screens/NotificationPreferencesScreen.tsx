import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../constants';
import { EnhancedNotificationType, NotificationCategory, NotificationPriority } from '../services/enhancedNotificationService';

interface NotificationPreference {
  type: EnhancedNotificationType;
  enabled: boolean;
  channels: {
    push: boolean;
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
  priority: NotificationPriority;
}

interface CategoryPreferences {
  category: NotificationCategory;
  enabled: boolean;
  channels: {
    push: boolean;
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
}

const NotificationPreferencesScreen: React.FC = () => {
  const [preferences, setPreferences] = useState<Record<EnhancedNotificationType, NotificationPreference>>({});
  const [categoryPreferences, setCategoryPreferences] = useState<Record<NotificationCategory, CategoryPreferences>>({});
  const [loading, setLoading] = useState(true);

  const categories: NotificationCategory[] = ['booking', 'trip', 'communication', 'payment', 'system', 'safety', 'marketing'];
  
  const categoryLabels: Record<NotificationCategory, string> = {
    booking: 'Bookings & Requests',
    trip: 'Trips & Tracking',
    communication: 'Messages & Calls',
    payment: 'Payments & Billing',
    system: 'System & Account',
    safety: 'Safety & Emergency',
    marketing: 'Marketing & Updates',
  };

  const channelLabels = {
    push: 'Push Notifications',
    inApp: 'In-App Notifications',
    email: 'Email Notifications',
    sms: 'SMS Notifications',
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      // In a real app, this would fetch from the backend
      // For now, we'll use default preferences
      const defaultPreferences = getDefaultPreferences();
      setPreferences(defaultPreferences);
      setCategoryPreferences(getDefaultCategoryPreferences());
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPreferences = (): Record<EnhancedNotificationType, NotificationPreference> => {
    const prefs: Record<EnhancedNotificationType, NotificationPreference> = {} as any;
    
    // Set default preferences for each notification type
    Object.values(EnhancedNotificationType).forEach(type => {
      prefs[type] = {
        type,
        enabled: true,
        channels: {
          push: true,
          inApp: true,
          email: type.includes('payment') || type.includes('critical'),
          sms: type.includes('critical') || type.includes('urgent'),
        },
        priority: 'normal',
      };
    });
    
    return prefs;
  };

  const getDefaultCategoryPreferences = (): Record<NotificationCategory, CategoryPreferences> => {
    const prefs: Record<NotificationCategory, CategoryPreferences> = {} as any;
    
    categories.forEach(category => {
      prefs[category] = {
        category,
        enabled: true,
        channels: {
          push: true,
          inApp: true,
          email: category === 'payment' || category === 'system',
          sms: category === 'safety' || category === 'payment',
        },
      };
    });
    
    return prefs;
  };

  const updatePreference = (type: EnhancedNotificationType, field: keyof NotificationPreference, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const updateCategoryPreference = (category: NotificationCategory, field: keyof CategoryPreferences, value: any) => {
    setCategoryPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const updateChannelPreference = (type: EnhancedNotificationType, channel: keyof NotificationPreference['channels'], value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        channels: {
          ...prev[type].channels,
          [channel]: value,
        },
      },
    }));
  };

  const updateCategoryChannelPreference = (category: NotificationCategory, channel: keyof CategoryPreferences['channels'], value: boolean) => {
    setCategoryPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        channels: {
          ...prev[category].channels,
          [channel]: value,
        },
      },
    }));
  };

  const savePreferences = async () => {
    try {
      // In a real app, this would save to the backend
      Alert.alert('Success', 'Notification preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save notification preferences');
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all notification preferences to default settings?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setPreferences(getDefaultPreferences());
            setCategoryPreferences(getDefaultCategoryPreferences());
          },
        },
      ]
    );
  };

  const renderCategorySection = (category: NotificationCategory) => {
    const categoryPref = categoryPreferences[category];
    if (!categoryPref) return null;

    return (
      <View key={category} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{categoryLabels[category]}</Text>
          <Switch
            value={categoryPref.enabled}
            onValueChange={(value) => updateCategoryPreference(category, 'enabled', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
        
        {categoryPref.enabled && (
          <View style={styles.channelContainer}>
            {Object.entries(channelLabels).map(([channel, label]) => (
              <View key={channel} style={styles.channelRow}>
                <Text style={styles.channelLabel}>{label}</Text>
                <Switch
                  value={categoryPref.channels[channel as keyof CategoryPreferences['channels']]}
                  onValueChange={(value) => updateCategoryChannelPreference(category, channel as keyof CategoryPreferences['channels'], value)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderNotificationType = (type: EnhancedNotificationType) => {
    const pref = preferences[type];
    if (!pref) return null;

    return (
      <View key={type} style={styles.notificationTypeRow}>
        <View style={styles.notificationTypeInfo}>
          <Text style={styles.notificationTypeTitle}>{type.replace(/_/g, ' ').toUpperCase()}</Text>
          <Text style={styles.notificationTypeDescription}>
            {getNotificationDescription(type)}
          </Text>
        </View>
        <Switch
          value={pref.enabled}
          onValueChange={(value) => updatePreference(type, 'enabled', value)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>
    );
  };

  const getNotificationDescription = (type: EnhancedNotificationType): string => {
    const descriptions: Record<EnhancedNotificationType, string> = {
      booking_created: 'When you create a new booking',
      booking_accepted: 'When your booking is accepted',
      booking_rejected: 'When your booking is rejected',
      booking_cancelled: 'When your booking is cancelled',
      booking_completed: 'When your booking is completed',
      booking_updated: 'When your booking is updated',
      instant_request_received: 'When you receive a new instant request',
      instant_request_accepted: 'When your instant request is accepted',
      instant_request_rejected: 'When your instant request is rejected',
      instant_request_expired: 'When your instant request expires',
      trip_started: 'When a trip starts',
      trip_in_progress: 'When a trip is in progress',
      trip_completed: 'When a trip is completed',
      trip_delayed: 'When a trip is delayed',
      trip_cancelled: 'When a trip is cancelled',
      location_update: 'When transporter location updates',
      near_pickup: 'When transporter is near pickup',
      near_delivery: 'When transporter is near delivery',
      route_deviation: 'When transporter deviates from route',
      chat_message_received: 'When you receive a chat message',
      voice_call_incoming: 'When you receive a voice call',
      voice_call_missed: 'When you miss a voice call',
      message_urgent: 'When you receive an urgent message',
      payment_received: 'When you receive a payment',
      payment_failed: 'When a payment fails',
      payment_pending: 'When a payment is pending',
      refund_processed: 'When a refund is processed',
      subscription_renewal: 'When subscription renews',
      subscription_expired: 'When subscription expires',
      subscription_cancelled: 'When subscription is cancelled',
      pricing_updated: 'When pricing is updated',
      system_maintenance: 'When system maintenance is scheduled',
      app_update_available: 'When app update is available',
      security_alert: 'When security alert is triggered',
      account_verified: 'When account is verified',
      account_suspended: 'When account is suspended',
      profile_updated: 'When profile is updated',
      document_expired: 'When document expires',
      document_approved: 'When document is approved',
      document_rejected: 'When document is rejected',
      new_job_available: 'When new jobs are available',
      job_assigned: 'When you are assigned a job',
      job_unassigned: 'When you are unassigned from a job',
      rating_received: 'When you receive a rating',
      review_received: 'When you receive a review',
      vehicle_approved: 'When vehicle is approved',
      vehicle_rejected: 'When vehicle is rejected',
      license_expiring: 'When license is expiring',
      insurance_expiring: 'When insurance is expiring',
      transporter_assigned: 'When transporter is assigned',
      transporter_arrived: 'When transporter arrives',
      delivery_confirmed: 'When delivery is confirmed',
      delivery_delayed: 'When delivery is delayed',
      delivery_failed: 'When delivery fails',
      feedback_requested: 'When feedback is requested',
      client_registered: 'When new client registers',
      transporter_registered: 'When new transporter registers',
      commission_earned: 'When commission is earned',
      dispute_created: 'When dispute is created',
      dispute_resolved: 'When dispute is resolved',
      emergency_alert: 'Emergency alerts',
      safety_incident: 'Safety incident reports',
      weather_warning: 'Weather warnings',
      route_hazard: 'Route hazard alerts',
      vehicle_breakdown: 'Vehicle breakdown reports',
    };
    
    return descriptions[type] || 'Notification for this event';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Preferences</Text>
        <Text style={styles.subtitle}>Customize how you receive notifications</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Categories</Text>
          {categories.map(renderCategorySection)}
        </View>

        {/* Individual Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specific Notifications</Text>
          {Object.keys(preferences).map(type => renderNotificationType(type as EnhancedNotificationType))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.saveButton} onPress={savePreferences}>
            <MaterialCommunityIcons name="content-save" size={20} color={colors.white} />
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
            <MaterialCommunityIcons name="refresh" size={20} color={colors.primary} />
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fonts.size.xl,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  categorySection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  categoryTitle: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    flex: 1,
  },
  channelContainer: {
    marginTop: spacing.sm,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  channelLabel: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    flex: 1,
  },
  notificationTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  notificationTypeInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  notificationTypeTitle: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  notificationTypeDescription: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  actionButtons: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  saveButtonText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
  },
  resetButtonText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
});

export default NotificationPreferencesScreen;

