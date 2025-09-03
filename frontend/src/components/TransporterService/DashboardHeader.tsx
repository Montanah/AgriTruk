import { Ionicons } from '@expo/vector-icons';
import React, { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants';
import { Booking } from '@/types';

type TabType = 'Incoming' | 'Active' | 'Completed';

type Props = {
  isCompany: boolean;
  notification: string | null;
  onCloseNotification: () => void;
  subscriptionStatus: {
    plan: string;
    expires: string;
    active: boolean;
  };
  tab: TabType;
  setTab: (tab: TabType) => void;
  onManage: () => void;
  showSubscription: () => void;
  onAssignPress: (job: Booking, transporter: Booking['assignedTransporter']) => void;
};

const DashboardHeader: FC<Props> = ({
  isCompany,
  notification,
  onCloseNotification,
  subscriptionStatus,
  tab,
  setTab,
  onManage,
  showSubscription,
  onAssignPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Title and Buttons */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Transporter Service</Text>
        <View style={styles.buttonRow}>
          <Pressable style={styles.button} onPress={onManage}>
            <Text style={styles.buttonText}>Manage</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={showSubscription}>
            <Text style={styles.buttonText}>Subscription</Text>
          </Pressable>
        </View>
      </View>

      {/* Notification Banner */}
      {notification && (
        <View style={styles.banner}>
          <Ionicons name="warning-outline" size={18} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.bannerText}>{notification}</Text>
          <Pressable onPress={onCloseNotification} style={{ marginLeft: 12 }}>
            <Ionicons name="close" size={18} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* Subscription Status */}
      {!subscriptionStatus.active && (
        <View style={styles.banner}>
          <Ionicons name="alert-circle-outline" size={18} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.bannerText}>Subscription inactive</Text>
        </View>
      )}

      {/* Assign Button for Company/Broker */}
      {isCompany && (
        <View style={styles.assignContainer}>
          <Text style={styles.assignText}>Assign a job manually</Text>
          <Pressable onPress={() => onAssignPress(null as any, null)} style={styles.assignButton}>
            <Text style={styles.assignButtonText}>Assign Transporter</Text>
          </Pressable>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {['Incoming', 'Active', 'Completed'].map((key) => (
          <Pressable
            key={key}
            onPress={() => setTab(key as TabType)}
            style={[styles.tab, tab === key && styles.activeTab]}
          >
            <Text style={[styles.tabText, tab === key && styles.activeTabText]}>
              {key}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export default DashboardHeader;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning,
    padding: 10,
    borderRadius: 6,
  },
  bannerText: {
    color: '#fff',
    fontSize: 14,
    flexShrink: 1,
  },
  assignContainer: {
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    backgroundColor: theme.colors.background,
  },
  assignText: {
    marginBottom: 8,
    fontSize: 14,
    color: theme.colors.text,
  },
  assignButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: theme.colors.background,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.text,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
});
