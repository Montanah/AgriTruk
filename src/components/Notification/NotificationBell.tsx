import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Text, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotification } from './NotificationContext';
import colors from '../../constants/colors';

const NotificationBell: React.FC = () => {
  const { notifications, markAllRead } = useNotification();
  const [modalVisible, setModalVisible] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <View style={styles.fabWrap} pointerEvents="box-none">
        <TouchableOpacity style={styles.bellFab} activeOpacity={0.8} onPress={() => { setModalVisible(true); markAllRead(); }}>
          <Ionicons name="notifications-outline" size={28} color={colors.primary} />
          {unreadCount > 0 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>Notifications</Text>
            <FlatList
              data={notifications}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={[styles.notificationItem, !item.read && styles.unreadItem]}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  <Text style={styles.notificationMsg}>{item.message}</Text>
                  <Text style={styles.notificationTime}>{new Date(item.timestamp).toLocaleString()}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
              style={{ maxHeight: 320 }}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 100,
    elevation: 100,
    pointerEvents: 'box-none',
  },
  bellFab: {
    backgroundColor: colors.white,
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 8,
  },
  counter: { position: 'absolute', top: 6, right: 6, backgroundColor: colors.error, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  counterText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: colors.white, borderRadius: 18, padding: 18, width: '90%', maxWidth: 400, shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  title: { fontWeight: 'bold', fontSize: 18, marginBottom: 10, color: colors.primary },
  notificationItem: { borderBottomWidth: 1, borderBottomColor: colors.background, paddingVertical: 8 },
  unreadItem: { backgroundColor: colors.primary + '11' },
  notificationTitle: { fontWeight: 'bold', color: colors.secondary, fontSize: 15 },
  notificationMsg: { color: colors.text.primary, fontSize: 14 },
  notificationTime: { color: colors.text.light, fontSize: 12, marginTop: 2 },
  empty: { color: colors.text.light, textAlign: 'center', marginTop: 20 },
  closeBtn: { marginTop: 16, alignSelf: 'center', backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24 },
  closeText: { color: '#fff', fontWeight: 'bold' },
});

export default NotificationBell;
