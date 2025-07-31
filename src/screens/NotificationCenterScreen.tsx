import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

// For demo, import the mock notification log
let mockNotifications: any[] = [];
try {
  // @ts-ignore
  mockNotifications = (typeof window !== 'undefined' && window.mockNotifications) ? window.mockNotifications : require('../../mock/mockNotifications').mockNotifications;
} catch (e) {}

// Props: userId, role (driver, customer, broker, admin, transporter)
export default function NotificationCenterScreen({ userId, role, onReadAll }) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Filter notifications for this user/role
    const filtered = (mockNotifications || []).filter(
      n => (n.to === userId || n.audience === role)
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setNotifications(filtered);
    // Mark as read
    filtered.forEach(n => { n.read = true; });
    if (onReadAll) onReadAll();
  }, [userId, role, mockNotifications.length]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {notifications.length === 0 ? (
          <Text style={styles.empty}>No notifications yet.</Text>
        ) : (
          notifications.map((n, i) => (
            <View key={i} style={[styles.card, n.read ? {} : { borderColor: colors.primary, borderWidth: 1 }] }>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={iconForType(n.type)} size={22} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.type}>{n.type.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={styles.time}>{formatTime(n.timestamp)}</Text>
              </View>
              <Text style={styles.message}>{n.message}</Text>
              {n.subject && <Text style={styles.subject}>{n.subject}</Text>}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function iconForType(type: string) {
  switch (type) {
    case 'driver_recruited': return 'person-add';
    case 'vehicle_assigned': return 'car';
    case 'request_allocated': return 'mail';
    case 'tracking_near_pickup': return 'navigate';
    case 'tracking_wrong_route': return 'alert-circle';
    case 'admin_alert': return 'notifications';
    default: return 'notifications-outline';
  }
}
function formatTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 12 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 12, elevation: 1 },
  type: { fontWeight: 'bold', color: colors.primary, marginRight: 8 },
  time: { color: colors.text.secondary, fontSize: 12, marginLeft: 'auto' },
  message: { color: colors.text.primary, marginTop: 4, fontSize: 15 },
  subject: { color: colors.text.secondary, fontSize: 13, marginTop: 2 },
  empty: { color: colors.text.light, fontSize: 15, textAlign: 'center', marginTop: 40 },
});
