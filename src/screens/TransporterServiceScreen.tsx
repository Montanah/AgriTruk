import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../constants/colors';

import { MOCK_REQUESTS, MOCK_ACTIVE, MOCK_COMPLETED } from '../mocks/jobs';
import { MOCK_TRANSPORTERS, MOCK_ASSIGNED_JOBS } from '../mocks/transporters';

const TABS = ['Incoming', 'Active', 'Completed'];

import { useRoute, useNavigation } from '@react-navigation/native';

const TransporterServiceScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const transporterType = route?.params?.transporterType || 'company';
  const isCompany = transporterType === 'company';
  const [tab, setTab] = useState('Incoming');
  const [showSubscription, setShowSubscription] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedTransporter, setSelectedTransporter] = useState(null);
  const [notification, setNotification] = useState('Your subscription expires in 3 days. Renew now to avoid interruption.');
  const [subscriptionStatus, setSubscriptionStatus] = useState({ plan: '6 Months', expires: '2024-06-30', active: true });

  const getData = () => {
    if (tab === 'Incoming') return MOCK_REQUESTS;
    if (tab === 'Active') return MOCK_ACTIVE;
    if (tab === 'Completed') return MOCK_COMPLETED;
    return [];
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <MaterialCommunityIcons
          name={item.type === 'AgriTRUK' ? 'tractor' : 'truck'}
          size={22}
          color={item.type === 'AgriTRUK' ? colors.primary : colors.secondary}
        />
        <Text style={styles.cardTitle}>{item.type}</Text>
        <Text style={styles.cardStatus}>{item.status}</Text>
        <Text style={styles.cardId}>{item.id}</Text>
      </View>
      <Text style={styles.route}>{item.from} → {item.to}</Text>
      <Text style={styles.date}>{item.date}</Text>
      <Text style={styles.cargo}>{item.cargo} • {item.weight}</Text>
      <Text style={styles.price}>Ksh {item.price}</Text>
      <Text style={styles.customer}>Customer: {item.customer.name}</Text>
      {item.status === 'On Transit' && (
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.round((item.progress || 0) * 100)}%` }]} />
        </View>
      )}
      <View style={styles.actionsRow}>
        {item.status === 'Incoming' && (
          <>
            <TouchableOpacity style={styles.acceptBtn}>
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineBtn}>
              <Ionicons name="close-circle" size={20} color={colors.error} />
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </>
        )}
        {item.status === 'On Transit' && (
          <TouchableOpacity style={styles.trackBtn}>
            <Ionicons name="navigate" size={18} color={colors.white} />
            <Text style={styles.trackText}>Track</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Completed' && (
          <TouchableOpacity style={styles.receiptBtn}>
            <MaterialCommunityIcons name="file-download-outline" size={18} color={colors.primary} />
            <Text style={styles.receiptText}>Receipt</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Compose dashboard header/sections as a single component for FlatList's ListHeaderComponent
  const DashboardHeader = (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={2} ellipsizeMode="tail">{isCompany ? 'Broker/Company Dashboard' : 'Transporter Dashboard'}</Text>
        </View>
        <View style={{ marginLeft: 8, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.subscriptionBtn, { marginRight: 8 }]}
            onPress={() => navigation.navigate('TransporterBookingManagement')}
          >
            <Ionicons name="clipboard-list-outline" size={20} color={colors.secondary} />
            <Text style={styles.subscriptionBtnText}>Manage Bookings & Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.subscriptionBtn} onPress={() => setShowSubscription(true)}>
            <Ionicons name="card-outline" size={20} color={colors.primary} />
            <Text style={styles.subscriptionBtnText}>Subscription</Text>
          </TouchableOpacity>
        </View>
      </View>
      {notification && (
        <View style={styles.notificationBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.error} style={{ marginRight: 6 }} />
          <Text style={styles.notificationText}>{notification}</Text>
          <TouchableOpacity onPress={() => setNotification(null)}>
            <Ionicons name="close" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.subscriptionStatusRow}>
        <Ionicons name="medal-outline" size={20} color={subscriptionStatus.active ? colors.success : colors.error} />
        <Text style={styles.subscriptionStatusText}>
          {subscriptionStatus.active ? `Active: ${subscriptionStatus.plan} (expires ${subscriptionStatus.expires})` : 'No active subscription'}
        </Text>
        <TouchableOpacity onPress={() => setShowSubscription(true)}>
          <Text style={styles.subscriptionStatusAction}>{subscriptionStatus.active ? 'Renew' : 'Subscribe'}</Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={showSubscription}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSubscription(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose a Subscription Plan</Text>
            <TouchableOpacity
              style={[styles.planOption, selectedPlan === 'monthly' && styles.planOptionSelected]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <Text style={styles.planText}>Monthly - Ksh 2,000</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.planOption, selectedPlan === '6months' && styles.planOptionSelected]}
              onPress={() => setSelectedPlan('6months')}
            >
              <Text style={styles.planText}>6 Months - Ksh 10,000</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.planOption, selectedPlan === 'yearly' && styles.planOptionSelected]}
              onPress={() => setSelectedPlan('yearly')}
            >
              <Text style={styles.planText}>1 Year - Ksh 18,000</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.subscribeBtn} onPress={() => setShowSubscription(false)}>
              <Text style={styles.subscribeBtnText}>{subscriptionStatus.active ? 'Renew' : 'Subscribe'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSubscription(false)}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {isCompany ? (
        <>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>My Transporters</Text>
            {MOCK_TRANSPORTERS.map(t => (
              <View key={t.id} style={styles.transporterRow}>
                <Ionicons name="person-circle-outline" size={32} color={colors.primary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.transporterName}>{t.name}</Text>
                  <Text style={styles.transporterStatus}>{t.status}</Text>
                </View>
                <TouchableOpacity style={styles.assignBtn} onPress={() => { setSelectedJob(MOCK_REQUESTS[0]); setSelectedTransporter(t); setShowAssignModal(true); }}>
                  <Text style={styles.assignBtnText}>Assign Job</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Assigned Jobs</Text>
            {MOCK_ASSIGNED_JOBS.map(j => (
              <View key={j.id} style={styles.assignedJobRow}>
                <Ionicons name="cube-outline" size={22} color={colors.secondary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.assignedJobText}>{j.job}</Text>
                  <Text style={styles.assignedJobMeta}>To: {j.assignedTo} • {j.date} • {j.status}</Text>
                </View>
              </View>
            ))}
          </View>
          <Modal
            visible={showAssignModal}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setShowAssignModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Assign Job</Text>
                <Text style={{ marginBottom: 10 }}>Assigning <Text style={{ fontWeight: 'bold' }}>{selectedJob?.id}</Text> to <Text style={{ fontWeight: 'bold' }}>{selectedTransporter?.name}</Text></Text>
                <TouchableOpacity style={styles.subscribeBtn} onPress={() => setShowAssignModal(false)}>
                  <Text style={styles.subscribeBtnText}>Confirm Assignment (Mock)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAssignModal(false)}>
                  <Text style={styles.closeBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>My Vehicle</Text>
            <View style={styles.transporterRow}>
              <Ionicons name="car-outline" size={32} color={colors.primary} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.transporterName}>KDA 123A</Text>
                <Text style={styles.transporterStatus}>Truck • Active</Text>
              </View>
            </View>
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Revenue</Text>
            <View style={{ padding: 10 }}>
              <Text style={styles.assignedJobText}>Total Earnings: Ksh 120,000</Text>
              <Text style={styles.assignedJobMeta}>Last Payment: Ksh 10,000 on 2024-06-10</Text>
            </View>
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <View style={{ padding: 10 }}>
              <Text style={styles.assignedJobText}>Name: John Doe</Text>
              <Text style={styles.assignedJobMeta}>Phone: +254700111222</Text>
              <Text style={styles.assignedJobMeta}>Status: Active</Text>
            </View>
          </View>
        </>
      )}
      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <FlatList
      data={getData()}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      ListEmptyComponent={<Text style={styles.emptyText}>No requests found.</Text>}
      ListHeaderComponent={DashboardHeader}
      ListFooterComponent={<View style={{ height: 72 }} />}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 32, paddingBottom: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.background, paddingHorizontal: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.primaryDark },
  notificationBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff6f6', borderRadius: 8, padding: 10, margin: 12, borderWidth: 1, borderColor: colors.error + '33' },
  notificationText: { color: colors.error, flex: 1, fontSize: 14 },
  subscriptionStatusRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, padding: 10, marginHorizontal: 16, marginBottom: 8, marginTop: 2 },
  subscriptionStatusText: { color: colors.text.primary, flex: 1, marginLeft: 8, fontSize: 15 },
  subscriptionStatusAction: { color: colors.primary, fontWeight: 'bold', marginLeft: 8 },
  subscriptionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  subscriptionBtnText: { color: colors.primary, marginLeft: 6, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.white, borderRadius: 16, padding: 24, width: 320, alignItems: 'center', elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 18, color: colors.primaryDark },
  planOption: { width: '100%', padding: 14, borderRadius: 10, backgroundColor: colors.surface, marginBottom: 10, alignItems: 'center' },
  planOptionSelected: { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary },
  planText: { fontSize: 16, color: colors.text.primary },
  subscribeBtn: { marginTop: 18, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 32 },
  subscribeBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  closeBtn: { marginTop: 10, padding: 8 },
  closeBtnText: { color: colors.error, fontWeight: '600', fontSize: 15 },
  sectionCard: { backgroundColor: colors.white, borderRadius: 14, padding: 16, margin: 12, marginBottom: 0, elevation: 1 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: colors.secondary, marginBottom: 8 },
  transporterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: colors.background, borderRadius: 10, padding: 8 },
  transporterName: { fontWeight: 'bold', fontSize: 15 },
  transporterStatus: { color: colors.text.secondary, fontSize: 13 },
  assignBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14, marginLeft: 10 },
  assignBtnText: { color: colors.white, fontWeight: '600' },
  assignedJobRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: colors.background, borderRadius: 10, padding: 8 },
  assignedJobText: { fontWeight: 'bold', fontSize: 15 },
  assignedJobMeta: { color: colors.text.secondary, fontSize: 13 },
  tabRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 18, borderRadius: 16, backgroundColor: colors.surface, marginHorizontal: 4 },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { color: colors.text.secondary, fontWeight: '600' },
  tabTextActive: { color: colors.white },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 18, shadowColor: colors.black, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: colors.primaryDark },
  cardStatus: { fontSize: 13, fontWeight: 'bold', marginLeft: 8, color: colors.secondary },
  cardId: { marginLeft: 'auto', color: colors.text.light, fontSize: 13, fontWeight: 'bold' },
  route: { fontSize: 15, marginTop: 8, color: colors.text.primary },
  date: { fontSize: 13, color: colors.text.light, marginTop: 2 },
  cargo: { fontSize: 14, color: colors.text.secondary, marginTop: 2 },
  price: { color: colors.primary, fontWeight: 'bold', fontSize: 15, marginTop: 2 },
  customer: { color: colors.text.light, fontSize: 13, marginTop: 2 },
  progressBarBg: { height: 8, backgroundColor: colors.background, borderRadius: 6, marginTop: 10, marginBottom: 4, width: '100%' },
  progressBarFill: { height: 8, backgroundColor: colors.secondary, borderRadius: 6 },
  actionsRow: { flexDirection: 'row', marginTop: 10, gap: 8, flexWrap: 'wrap' },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14, marginRight: 10 },
  acceptText: { color: colors.white, marginLeft: 6, fontWeight: '600' },
  declineBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.error, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  declineText: { color: colors.white, marginLeft: 6, fontWeight: '600' },
  trackBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14, marginRight: 10 },
  trackText: { color: colors.white, marginLeft: 6, fontWeight: '600' },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  receiptText: { color: colors.primary, marginLeft: 4, fontWeight: '600' },
  emptyText: { color: colors.text.light, fontSize: 16, marginTop: 32, textAlign: 'center' },
});

export default TransporterServiceScreen;
