import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image, Modal, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../constants/colors';

const MOCK_ACTIVITIES = [
  {
    id: 'REQ-001',
    type: 'AgriTRUK',
    status: 'On Transit',
    from: 'Farm A',
    to: 'Market B',
    date: '2024-06-10 09:30',
    canTrack: true,
    cost: 1200,
    transporter: {
      name: 'John Transporters',
      photo: 'https://randomuser.me/api/portraits/men/32.jpg',
      vehicle: 'Refrigerated Truck',
      reg: 'KDA 123A',
    },
    progress: 0.6,
    paymentStatus: 'Paid',
    rating: null,
    details: 'Perishable produce, fast delivery required.'
  },
  {
    id: 'REQ-002',
    type: 'CargoTRUK',
    status: 'Completed',
    from: 'Warehouse X',
    to: 'Shop Y',
    date: '2024-06-08 14:10',
    canTrack: false,
    cost: 800,
    transporter: {
      name: 'AgriMove Ltd',
      photo: 'https://randomuser.me/api/portraits/men/45.jpg',
      vehicle: 'Open Pickup',
      reg: 'KCF 456B',
    },
    progress: 1,
    paymentStatus: 'Paid',
    rating: 5,
    details: 'Oversized cargo, handled with care.'
  },
  {
    id: 'REQ-003',
    type: 'AgriTRUK',
    status: 'Pending',
    from: 'Farm C',
    to: 'Market D',
    date: '2024-06-07 11:00',
    canTrack: false,
    cost: 950,
    transporter: null,
    progress: 0,
    paymentStatus: 'Unpaid',
    rating: null,
    details: 'Awaiting transporter assignment.'
  },
  {
    id: 'REQ-004',
    type: 'CargoTRUK',
    status: 'Cancelled',
    from: 'Depot Z',
    to: 'Client Q',
    date: '2024-06-05 16:20',
    canTrack: false,
    cost: 0,
    transporter: null,
    progress: 0,
    paymentStatus: 'Refunded',
    rating: null,
    details: 'Request was cancelled by user.'
  },
];

const FILTERS = ['All', 'Active', 'Completed', 'Cancelled'];

const statusColors = {
  'On Transit': colors.secondary,
  'Completed': colors.success,
  'Pending': colors.primary,
  'Cancelled': colors.error,
};

const paymentColors = {
  'Paid': colors.success,
  'Unpaid': colors.error,
  'Refunded': colors.text.light,
};

const ActivityScreen = () => {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const filtered = (MOCK_ACTIVITIES || []).filter((a) => {
    if (filter === 'Active') return a.status === 'On Transit' || a.status === 'Pending';
    if (filter === 'Completed') return a.status === 'Completed';
    if (filter === 'Cancelled') return a.status === 'Cancelled';
    return true;
  }).filter((a) =>
    a.from.toLowerCase().includes(search.toLowerCase()) ||
    a.to.toLowerCase().includes(search.toLowerCase()) ||
    a.id.toLowerCase().includes(search.toLowerCase()) ||
    (a.transporter && a.transporter.name.toLowerCase().includes(search.toLowerCase()))
  );

  const renderProgress = (progress) => (
    <View style={styles.progressBarBg}>
      <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` }]} />
    </View>
  );

  const renderItem = ({ item }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => { setSelected(item); setModalVisible(true); }}
    >
      <View style={styles.cardHeaderRow}>
        <View style={styles.badgeType}>
          <MaterialCommunityIcons
            name={item.type === 'AgriTRUK' ? 'tractor' : 'truck'}
            size={20}
            color={item.type === 'AgriTRUK' ? colors.primary : colors.secondary}
          />
          <Text style={styles.badgeTypeText}>{item.type}</Text>
        </View>
        <View style={[styles.badgeStatus, { backgroundColor: statusColors[item.status] || colors.text.light }] }>
          <Text style={styles.badgeStatusText}>{item.status}</Text>
        </View>
        <Text style={styles.idText}>{item.id}</Text>
      </View>
      <Text style={styles.route}>{item.from} → {item.to}</Text>
      <Text style={styles.date}>{item.date}</Text>
      {item.transporter && (
        <View style={styles.transporterRow}>
          <Image source={{ uri: item.transporter.photo }} style={styles.transporterPhoto} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.transporterName}>{item.transporter.name}</Text>
            <Text style={styles.transporterDetails}>{item.transporter.vehicle} ({item.transporter.reg})</Text>
          </View>
        </View>
      )}
      <View style={styles.infoRow}>
        <Text style={styles.costText}>Ksh {item.cost}</Text>
        <View style={[styles.badgePayment, { backgroundColor: paymentColors[item.paymentStatus] || colors.text.light }] }>
          <Text style={styles.badgePaymentText}>{item.paymentStatus}</Text>
        </View>
      </View>
      {item.status === 'On Transit' && (
        <View style={styles.progressWrap}>
          {renderProgress(item.progress)}
          <View style={styles.progressLabelsRow}>
            <Text style={styles.progressLabel}>Picked</Text>
            <Text style={styles.progressLabel}>In Transit</Text>
            <Text style={styles.progressLabel}>Delivered</Text>
          </View>
        </View>
      )}
      <View style={styles.actionsRow}>
        {item.canTrack && (
          <TouchableOpacity style={styles.trackBtn}>
            <Ionicons name="navigate" size={18} color={colors.white} />
            <Text style={styles.trackText}>Track</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.detailsBtn} onPress={() => { setSelected(item); setModalVisible(true); }}>
          <Text style={styles.detailsText}>Details</Text>
        </TouchableOpacity>
        {item.status === 'Completed' && (
          <TouchableOpacity style={styles.receiptBtn}>
            <MaterialCommunityIcons name="file-download-outline" size={18} color={colors.primary} />
            <Text style={styles.receiptText}>Receipt</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Completed' && (
          <TouchableOpacity style={styles.rateBtn}>
            <MaterialCommunityIcons name="star" size={18} color={colors.secondary} />
            <Text style={styles.rateText}>{item.rating ? `Rated (${item.rating})` : 'Rate'}</Text>
          </TouchableOpacity>
        )}
        {item.status === 'On Transit' && (
          <TouchableOpacity style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by location, transporter, or ID..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor={colors.text.light}
      />
      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="history" size={48} color={colors.text.light} />
          <Text style={styles.emptyText}>No activity found.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        />
      )}
      {/* Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <MaterialCommunityIcons name={selected?.type === 'AgriTRUK' ? 'tractor' : 'truck'} size={28} color={selected?.type === 'AgriTRUK' ? colors.primary : colors.secondary} />
              <Text style={styles.modalTitle}>{selected?.type} - {selected?.id}</Text>
              <View style={[styles.badgeStatus, { backgroundColor: statusColors[selected?.status] || colors.text.light, marginLeft: 8 }] }>
                <Text style={styles.badgeStatusText}>{selected?.status}</Text>
              </View>
            </View>
            <Text style={styles.modalRoute}>{selected?.from} → {selected?.to}</Text>
            <Text style={styles.modalDate}>{selected?.date}</Text>
            {selected?.transporter && (
              <View style={styles.modalTransporterRow}>
                <Image source={{ uri: selected.transporter.photo }} style={styles.modalTransporterPhoto} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.modalTransporterName}>{selected.transporter.name}</Text>
                  <Text style={styles.modalTransporterDetails}>{selected.transporter.vehicle} ({selected.transporter.reg})</Text>
                </View>
              </View>
            )}
            <Text style={styles.modalDetails}>{selected?.details}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.costText}>Ksh {selected?.cost}</Text>
              <View style={[styles.badgePayment, { backgroundColor: paymentColors[selected?.paymentStatus] || colors.text.light }] }>
                <Text style={styles.badgePaymentText}>{selected?.paymentStatus}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={22} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add-circle" size={48} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { paddingTop: 32, paddingBottom: 8, alignItems: 'center', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.background },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.primaryDark },
  filterRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 18, borderRadius: 16, backgroundColor: colors.surface, marginHorizontal: 4 },
  filterBtnActive: { backgroundColor: colors.primary },
  filterText: { color: colors.text.secondary, fontWeight: '600' },
  filterTextActive: { color: colors.white },
  searchInput: { backgroundColor: colors.white, borderRadius: 10, padding: 10, margin: 12, fontSize: 16, borderWidth: 1, borderColor: colors.background, color: colors.text.primary },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 18, marginBottom: 18, shadowColor: colors.black, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, transition: 'all 0.2s' },
  cardPressed: { backgroundColor: colors.surface },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  badgeType: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2, marginRight: 8 },
  badgeTypeText: { color: colors.primaryDark, fontWeight: 'bold', marginLeft: 4 },
  badgeStatus: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2, marginRight: 8 },
  badgeStatusText: { color: '#fff', fontWeight: 'bold' },
  idText: { marginLeft: 'auto', color: colors.text.light, fontSize: 13, fontWeight: 'bold' },
  route: { fontSize: 16, marginTop: 8, color: colors.text.primary },
  date: { fontSize: 14, color: colors.text.light, marginTop: 4 },
  transporterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: colors.background, borderRadius: 10, padding: 6, paddingRight: 16 },
  transporterPhoto: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' },
  transporterName: { fontWeight: 'bold', fontSize: 15 },
  transporterDetails: { color: colors.text.secondary, fontSize: 13 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  costText: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  badgePayment: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2, marginLeft: 8 },
  badgePaymentText: { color: '#fff', fontWeight: 'bold' },
  progressWrap: { marginTop: 10, marginBottom: 2 },
  progressBarBg: { height: 8, backgroundColor: colors.background, borderRadius: 6, marginBottom: 4, width: '100%' },
  progressBarFill: { height: 8, backgroundColor: colors.secondary, borderRadius: 6 },
  progressLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  progressLabel: { fontSize: 12, color: colors.text.light, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', marginTop: 10, gap: 8, flexWrap: 'wrap' },
  trackBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14, marginRight: 10 },
  trackText: { color: colors.white, marginLeft: 6, fontWeight: '600' },
  detailsBtn: { backgroundColor: colors.background, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  detailsText: { color: colors.primary, fontWeight: '600' },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  receiptText: { color: colors.primary, marginLeft: 4, fontWeight: '600' },
  rateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  rateText: { color: colors.secondary, marginLeft: 4, fontWeight: '600' },
  cancelBtn: { backgroundColor: colors.error, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  cancelText: { color: colors.white, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: colors.text.light, fontSize: 18, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: colors.white, borderRadius: 18, padding: 22, width: '92%', shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primaryDark, marginLeft: 8 },
  modalRoute: { fontSize: 16, color: colors.text.primary, marginTop: 4 },
  modalDate: { fontSize: 14, color: colors.text.light, marginTop: 2 },
  modalTransporterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: colors.background, borderRadius: 10, padding: 6, paddingRight: 16 },
  modalTransporterPhoto: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee' },
  modalTransporterName: { fontWeight: 'bold', fontSize: 16 },
  modalTransporterDetails: { color: colors.text.secondary, fontSize: 14 },
  modalDetails: { color: colors.text.primary, fontSize: 15, marginTop: 10, marginBottom: 8 },
  modalCloseBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: colors.background, borderRadius: 16, padding: 6 },
  fab: { position: 'absolute', right: 24, bottom: 32, backgroundColor: 'transparent', zIndex: 10 },
});

export default ActivityScreen;
