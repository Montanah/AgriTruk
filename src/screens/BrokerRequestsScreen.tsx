import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import colors from '../constants/colors';

const mockRequests = [
  { id: 'R001', for: 'Green Agri Co.', type: 'Booking', status: 'Pending', amount: 12000 },
  { id: 'R002', for: 'John Farmer', type: 'Instant', status: 'Completed', amount: 8000 },
  { id: 'R003', for: 'Farmers United', type: 'Booking', status: 'Completed', amount: 15000 },
  { id: 'R004', for: 'Mary Grower', type: 'Instant', status: 'Pending', amount: 6000 },
];
const mockBusinesses = [
  { id: 'B001', name: 'Green Agri Co.' },
  { id: 'B002', name: 'Farmers United' },
];
const mockFarmers = [
  { id: 'F001', name: 'John Farmer' },
  { id: 'F002', name: 'Mary Grower' },
];
const mockTransporters = [
  { id: 'T001', name: 'QuickMove Ltd.' },
  { id: 'T002', name: 'AgriTrans' },
];
const mockRevenue = {
  total: 120000,
  thisMonth: 18000,
  commissionRate: 0.08,
};

export default function BrokerRequestsScreen() {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestFor, setRequestFor] = useState('');
  const [requestType, setRequestType] = useState('instant');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [cargoDetails, setCargoDetails] = useState('');
  const [preferredTransporter, setPreferredTransporter] = useState('');

  function handlePlaceRequest() {
    if (!requestFor || !pickupLocation || !dropoffLocation || !cargoDetails) {
      alert('Please fill all required fields.');
      return;
    }
    setShowRequestModal(false);
    setRequestFor('');
    setPickupLocation('');
    setDropoffLocation('');
    setCargoDetails('');
    setPreferredTransporter('');
    setRequestType('instant');
    alert('Request/Booking placed!');
  }

  const totalRequests = mockRequests.length;
  const completed = mockRequests.filter(r => r.status === 'Completed').length;
  const pending = mockRequests.filter(r => r.status === 'Pending').length;
  const totalRevenue = mockRequests.reduce((sum, r) => sum + (r.status === 'Completed' ? r.amount : 0), 0);

  const ListHeader = () => (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={{ height: 32 }} />
      <View style={styles.analyticsRow}>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="clipboard-list-outline" size={28} color={colors.primary} />
          <Text style={styles.analyticsValue}>{totalRequests}</Text>
          <Text style={styles.analyticsLabel}>Total</Text>
        </View>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="check-circle-outline" size={28} color={colors.secondary} />
          <Text style={styles.analyticsValue}>{completed}</Text>
          <Text style={styles.analyticsLabel}>Completed</Text>
        </View>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="clock-outline" size={28} color={colors.primaryDark} />
          <Text style={styles.analyticsValue}>{pending}</Text>
          <Text style={styles.analyticsLabel}>Pending</Text>
        </View>
      </View>
      <View style={styles.revenueCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <MaterialCommunityIcons name="cash-multiple" size={28} color={colors.primaryDark} style={{ marginRight: 8 }} />
          <Text style={styles.revenueTitle}>Revenue & Commission</Text>
        </View>
        <View style={styles.revenueRow}>
          <View style={styles.revenueStat}><Text style={styles.revenueValue}>Ksh {totalRevenue.toLocaleString()}</Text><Text style={styles.revenueLabel}>Total</Text></View>
          <View style={styles.revenueStat}><Text style={styles.revenueValue}>Ksh {mockRevenue.thisMonth.toLocaleString()}</Text><Text style={styles.revenueLabel}>This Month</Text></View>
        </View>
        <Text style={styles.revenueNote}>Commission Rate: <Text style={{ color: colors.secondary, fontWeight: 'bold' }}>{(mockRevenue.commissionRate * 100).toFixed(0)}%</Text></Text>
      </View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Requests/Bookings</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowRequestModal(true)}>
          <Ionicons name="add-circle" size={22} color={colors.white} />
          <Text style={styles.createBtnText}>Place Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListFooter = () => (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <Text style={styles.sectionTitle}>Broker Tips</Text>
        <Text style={styles.tipText}>• Place requests for your network and track their status here.</Text>
        <Text style={styles.tipText}>• Completed requests earn you commission.</Text>
        <Text style={styles.tipText}>• Use the analytics above to monitor your performance.</Text>
      </View>
    </View>
  );

  const insets = require('react-native-safe-area-context').useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.bg}>
      <FlatList
        data={mockRequests}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.requestCard}>
            <View style={styles.requestCardRow}>
              <MaterialCommunityIcons name={item.type === 'Booking' ? 'calendar-check' : 'flash'} size={24} color={item.type === 'Booking' ? colors.primary : colors.secondary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.requestFor}>{item.for}</Text>
                <Text style={styles.requestInfo}>{item.type} • Ksh {item.amount.toLocaleString()}</Text>
                <Text style={styles.requestStatusLabel}>Status: <Text style={[styles.requestStatus, item.status === 'Completed' ? { color: colors.secondary } : { color: colors.primaryDark }]}>{item.status}</Text></Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No requests/bookings yet.</Text>}
        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={<ListFooter />}
        contentContainerStyle={{ paddingBottom: 68 + (insets?.bottom || 0) }}
        showsVerticalScrollIndicator={false}
      />

      {/* ✨ Modal Included Below */}
      <Modal visible={showRequestModal} animationType="slide" transparent onRequestClose={() => setShowRequestModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.modalHeader}>
                <MaterialCommunityIcons name="clipboard-plus-outline" size={28} color={colors.primary} style={{ marginRight: 10 }} />
                <Text style={styles.modalTitle}>Place Request/Booking</Text>
              </View>
              <View style={styles.modalDivider} />

              <View style={styles.modalSection}>
                <Text style={styles.inputLabel}>For (Business/Farmer) *</Text>
                <View style={styles.pickerWrap}>
                  <Picker selectedValue={requestFor} onValueChange={setRequestFor} style={styles.picker}>
                    <Picker.Item label="Select..." value="" />
                    {mockBusinesses.concat(mockFarmers).map(p => (
                      <Picker.Item key={p.id} label={p.name} value={p.name} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.inputLabel}>Pickup Location *</Text>
                <TextInput style={styles.input} value={pickupLocation} onChangeText={setPickupLocation} placeholder="e.g. Farm A" />
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.inputLabel}>Drop-off Location *</Text>
                <TextInput style={styles.input} value={dropoffLocation} onChangeText={setDropoffLocation} placeholder="e.g. Market B" />
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.inputLabel}>Cargo Details *</Text>
                <TextInput style={styles.input} value={cargoDetails} onChangeText={setCargoDetails} placeholder="e.g. Maize, 2 tons" />
              </View>

              <View style={styles.modalSectionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Type *</Text>
                  <View style={styles.pickerWrap}>
                    <Picker selectedValue={requestType} onValueChange={setRequestType} style={styles.picker}>
                      <Picker.Item label="Instant" value="instant" />
                      <Picker.Item label="Booking" value="booking" />
                    </Picker>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Transporter</Text>
                  <View style={styles.pickerWrap}>
                    <Picker selectedValue={preferredTransporter} onValueChange={setPreferredTransporter} style={styles.picker}>
                      <Picker.Item label="App Transporter" value="" />
                      {mockTransporters.map(t => (
                        <Picker.Item key={t.id} label={t.name} value={t.name} />
                      ))}
                      <Picker.Item label="External Transporter" value="external" />
                    </Picker>
                  </View>
                </View>
              </View>

              {/* External Fields (if needed) */}
              {preferredTransporter === 'external' && (
                <View style={styles.modalSection}>
                  <Text style={styles.inputLabel}>External Transporter Name *</Text>
                  <TextInput style={styles.input} placeholder="Name" />
                  <Text style={styles.inputLabel}>Contact *</Text>
                  <TextInput style={styles.input} placeholder="Phone or Email" />
                  <Text style={styles.inputLabel}>Amount Agreed *</Text>
                  <TextInput style={styles.input} placeholder="e.g. 15000" keyboardType="numeric" />
                  <Text style={styles.tipText}>A commission will be deducted from this amount.</Text>
                </View>
              )}

              <View style={styles.modalDivider} />

              <View style={styles.modalSection}>
                <Text style={styles.inputLabel}>Summary</Text>
                <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 12 }}>
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Customer:</Text><Text style={styles.summaryValue}>{requestFor || '--'}</Text></View>
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Pickup:</Text><Text style={styles.summaryValue}>{pickupLocation || '--'}</Text></View>
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Drop-off:</Text><Text style={styles.summaryValue}>{dropoffLocation || '--'}</Text></View>
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Cargo:</Text><Text style={styles.summaryValue}>{cargoDetails || '--'}</Text></View>
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Type:</Text><Text style={styles.summaryValue}>{requestType}</Text></View>
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Transporter:</Text><Text style={styles.summaryValue}>{preferredTransporter || 'Any'}</Text></View>
                </View>
              </View>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRequestModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handlePlaceRequest}>
                  <Text style={styles.saveText}>Place Request</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  analyticsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, marginTop: 8, gap: 8 },
  analyticsCard: { flex: 1, alignItems: 'center', borderRadius: 16, padding: 14, marginHorizontal: 2, elevation: 1, shadowColor: colors.primary, shadowOpacity: 0.06, shadowRadius: 6 },
  analyticsLabel: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  analyticsValue: { fontSize: 20, fontWeight: 'bold', color: colors.primary, marginTop: 2 },
  revenueCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: colors.primary, shadowOpacity: 0.06, shadowRadius: 6 },
  revenueTitle: { fontWeight: 'bold', color: colors.primaryDark, fontSize: 16 },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 2 },
  revenueStat: { alignItems: 'center', flex: 1 },
  revenueValue: { fontWeight: 'bold', color: colors.secondary, fontSize: 16 },
  revenueLabel: { color: colors.text.secondary, fontSize: 13 },
  revenueNote: { color: colors.text.secondary, fontSize: 13, marginTop: 6 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.secondary, letterSpacing: 0.2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 22, paddingVertical: 8, paddingHorizontal: 18, marginLeft: 8 },
  createBtnText: { color: colors.white, fontWeight: 'bold', marginLeft: 6, fontSize: 16 },
  requestCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 12, marginHorizontal: 8, elevation: 1, shadowColor: colors.primary, shadowOpacity: 0.04, shadowRadius: 4 },
  requestCardRow: { flexDirection: 'row', alignItems: 'center' },
  requestFor: { fontSize: 16, color: colors.text.primary, fontWeight: '700' },
  requestInfo: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  requestStatusLabel: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  requestStatus: { fontWeight: 'bold' },
  emptyText: { color: colors.text.light, fontSize: 14, textAlign: 'center', marginTop: 8 },
  tipText: { color: colors.text.secondary, fontSize: 14, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: colors.white, borderRadius: 18, padding: 22, width: '92%', shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8, marginBottom: 80 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: colors.background, borderRadius: 8, padding: 10, marginVertical: 6, fontSize: 15, borderWidth: 1, borderColor: colors.text.light },
  inputLabel: { fontWeight: 'bold', color: colors.text.secondary, marginTop: 8, marginBottom: 2 },
  pickerWrap: { borderWidth: 1, borderColor: colors.text.light, borderRadius: 8, marginBottom: 8, backgroundColor: colors.surface },
  picker: { height: Platform.OS === 'ios' ? 120 : 44, width: '100%' },
  modalActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelBtn: { backgroundColor: colors.background, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, borderWidth: 1, borderColor: colors.text.light, marginRight: 8 },
  cancelText: { color: colors.error, fontWeight: 'bold', fontSize: 15 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  saveText: { color: colors.white, fontWeight: 'bold' },
});
