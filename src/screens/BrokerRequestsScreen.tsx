import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useRef, useState } from 'react';
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
import { notificationService } from '../../services/notificationService';
import colors from '../constants/colors';

const MOCK_CLIENTS = [
  { id: 'C001', name: 'Green Agri Co.', type: 'business' },
  { id: 'C002', name: 'Mary Grower', type: 'individual' },
  { id: 'C003', name: 'Farmers United', type: 'business' },
  { id: 'C004', name: 'John Farmer', type: 'individual' },
];

const mockRequests = [
  { id: 'R001', clientId: 'C001', for: 'Green Agri Co.', type: 'Booking', status: 'Pending', amount: 12000, category: 'cargo', summary: 'Maize, 10 tons, to Mombasa' },
  { id: 'R002', clientId: 'C002', for: 'Mary Grower', type: 'Instant', status: 'Completed', amount: 8000, category: 'agri', summary: 'Vegetables, 2 tons, to Nairobi' },
  { id: 'R003', clientId: 'C003', for: 'Farmers United', type: 'Booking', status: 'Completed', amount: 15000, category: 'cargo', summary: 'Tea, 8 tons, to Mombasa' },
  { id: 'R004', clientId: 'C004', for: 'John Farmer', type: 'Instant', status: 'Pending', amount: 6000, category: 'agri', summary: 'Potatoes, 3 tons, to Nakuru' },
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

const CARGO_SPECIALS = [
  { key: 'fragile', label: 'Fragile' },
  { key: 'oversized', label: 'Oversized' },
  { key: 'hazardous', label: 'Hazardous' },
];
const AGRI_PERISHABLES = [
  { key: 'refrigerated', label: 'Refrigerated' },
  { key: 'humidity', label: 'Humidity Control' },
  { key: 'fast', label: 'Fast Delivery' },
];
const PRODUCT_SUGGESTIONS = [
  'Maize', 'Fruits', 'Beans', 'Wheat', 'Rice', 'Vegetables', 'Coffee', 'Tea', 'Livestock', 'Machinery', 'Electronics', 'Furniture', 'Clothing', 'Chemicals', 'Other',
];


export default function BrokerRequestsScreen() {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestClientId, setRequestClientId] = useState('');
  const [requestType, setRequestType] = useState('instant');
  const [requestCategory, setRequestCategory] = useState('cargo');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [productType, setProductType] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [isPerishable, setIsPerishable] = useState(false);
  const [perishableSpecs, setPerishableSpecs] = useState([]);
  const [isSpecialCargo, setIsSpecialCargo] = useState(false);
  const [specialCargoSpecs, setSpecialCargoSpecs] = useState([]);
  const [weight, setWeight] = useState('');
  const [value, setValue] = useState('');
  const [additional, setAdditional] = useState('');
  const [pickupTime, setPickupTime] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState([]); // For consolidation
  const [showTransporters, setShowTransporters] = useState(false);
  const [loadingTransporters, setLoadingTransporters] = useState(false);
  const [filteredTransporters, setFilteredTransporters] = useState([]);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [error, setError] = useState('');
  const [requestFor, setRequestFor] = useState('');
  const scrollRef = useRef(null);

  function handlePlaceRequest() {
    if (!requestClientId || !pickupLocation || !dropoffLocation || !productType || !weight) {
      setError('Please fill all required fields.');
      return;
    }
    // Mock users (replace with real user context)
    const client = MOCK_CLIENTS.find(c => c.id === requestClientId) || { id: requestClientId, name: requestFor, email: 'client@trukapp.com', phone: '+254700111111' };
    const broker = { id: 'B001', name: 'BrokerX', email: 'brokerx@trukapp.com', phone: '+254700999888' };
    const admin = { id: 'ADMIN', name: 'Admin', email: 'admin@trukapp.com', phone: '+254700000000' };
    const request = {
      clientId: requestClientId,
      for: requestFor,
      pickupLocation,
      dropoffLocation,
      productType,
      weight,
      value,
      additional,
      perishableSpecs,
      specialCargoSpecs,
      pickupTime: pickupTime ? pickupTime.toLocaleString() : '',
      requestType,
      requestCategory,
      status: 'pending',
    };
    // Notify all parties
    notificationService.sendInApp(client.id, `Request placed: ${productType} from ${pickupLocation} to ${dropoffLocation}`, 'customer', 'request_allocated', { request });
    notificationService.sendEmail(client.email, 'Request Placed', `Your request for ${productType} from ${pickupLocation} to ${dropoffLocation} has been placed.`, 'customer', 'request_allocated', { request });
    notificationService.sendSMS(client.phone, `Request placed: ${productType} from ${pickupLocation} to ${dropoffLocation}`, 'customer', 'request_allocated', { request });
    notificationService.sendInApp(broker.id, `Placed request for ${client.name}: ${productType} from ${pickupLocation} to ${dropoffLocation}`, 'broker', 'request_allocated', { request });
    notificationService.sendEmail(broker.email, 'Request Placed', `Placed request for ${client.name}: ${productType} from ${pickupLocation} to ${dropoffLocation}`, 'broker', 'request_allocated', { request });
    notificationService.sendSMS(broker.phone, `Placed request for ${client.name}: ${productType} from ${pickupLocation} to ${dropoffLocation}`, 'broker', 'request_allocated', { request });
    notificationService.sendInApp(admin.id, `New request placed: ${productType} from ${pickupLocation} to ${dropoffLocation}`, 'admin', 'request_allocated', { request });
    notificationService.sendEmail(admin.email, 'Request Placed', `New request placed: ${productType} from ${pickupLocation} to ${dropoffLocation}`, 'admin', 'request_allocated', { request });
    notificationService.sendSMS(admin.phone, `New request placed: ${productType} from ${pickupLocation} to ${dropoffLocation}`, 'admin', 'request_allocated', { request });
    setShowRequestModal(false);
    setRequestFor('');
    setRequestClientId('');
    setPickupLocation('');
    setDropoffLocation('');
    setProductType('');
    setWeight('');
    setValue('');
    setAdditional('');
    setRequestType('instant');
    setRequestCategory('cargo');
    setIsPerishable(false);
    setIsSpecialCargo(false);
    setPerishableSpecs([]);
    setSpecialCargoSpecs([]);
    setPickupTime(null);
    setError('');
    setLoadingTransporters(true);
    setShowTransporters(false);
    setFormCollapsed(true);
    setTimeout(() => {
      setFilteredTransporters(mockTransporters);
      setLoadingTransporters(false);
      setShowTransporters(true);
      if (scrollRef.current) {
        scrollRef.current.scrollToEnd({ animated: true });
      }
    }, 1200);
    alert('Request/Booking placed!');
  }

  // Consolidate selected requests
  function handleConsolidateRequests() {
    if (selectedRequests.length < 2) {
      alert('Select at least two requests to consolidate.');
      return;
    }
    alert('Consolidated ' + selectedRequests.length + ' requests into a bulk shipment!');
    setSelectedRequests([]);
  }

  const totalRequests = mockRequests.length;
  const completed = mockRequests.filter(r => r.status === 'Completed').length;
  const pending = mockRequests.filter(r => r.status === 'Pending').length;
  const totalRevenue = mockRequests.reduce((sum, r) => sum + (r.status === 'Completed' ? r.amount : 0), 0);

  const ListHeader = () => (
    <View style={{ paddingHorizontal: 18, paddingTop: 24 }}>
      <View style={{ height: 16 }} />
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
      <View style={[styles.sectionHeaderRow, { gap: 10, flexWrap: 'wrap' }]}>
        <Text style={styles.sectionTitle}>Requests/Bookings</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowRequestModal(true)}>
            <Ionicons name="add-circle" size={22} color={colors.white} />
            <Text style={styles.createBtnText}>Place Request</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.secondary }]} onPress={handleConsolidateRequests}>
            <MaterialCommunityIcons name="package-variant" size={22} color={colors.white} />
            <Text style={[styles.createBtnText, { color: colors.white }]}>Consolidate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const ListFooter = () => (
    <View style={{ paddingHorizontal: 18 }}>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <Text style={styles.sectionTitle}>Broker Tips</Text>
        <Text style={styles.tipText}>• Place requests for your clients and track their status here.</Text>
        <Text style={styles.tipText}>• Completed requests earn you commission.</Text>
        <Text style={styles.tipText}>• Use the analytics above to monitor your performance.</Text>
        <Text style={styles.tipText}>• Consolidate multiple requests into a single bulk shipment for efficiency.</Text>
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
          <TouchableOpacity
            style={[styles.requestCard, selectedRequests.includes(item.id) && { borderColor: colors.secondary, borderWidth: 2 }]}
            onLongPress={() => {
              setSelectedRequests(selectedRequests.includes(item.id)
                ? selectedRequests.filter(id => id !== item.id)
                : [...selectedRequests, item.id]);
            }}
          >
            <View style={styles.requestCardRow}>
              <MaterialCommunityIcons name={item.type === 'Booking' ? 'calendar-check' : 'flash'} size={24} color={item.type === 'Booking' ? colors.primary : colors.secondary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.requestFor}>{item.for}</Text>
                <Text style={styles.requestInfo}>{item.type} • {item.category === 'agri' ? 'Agri' : 'Cargo'} • Ksh {item.amount.toLocaleString()}</Text>
                <Text style={styles.requestStatusLabel}>Status: <Text style={[styles.requestStatus, item.status === 'Completed' ? { color: colors.secondary } : { color: colors.primaryDark }]}>{item.status}</Text></Text>
                <Text style={styles.requestSummary}>{item.summary}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No requests/bookings yet.</Text>}
        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={<ListFooter />}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 10 }}
        showsVerticalScrollIndicator={false}
      />
      {/* Request Modal */}
      <Modal visible={showRequestModal} animationType="slide" transparent onRequestClose={() => setShowRequestModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 8 }}>
              <View style={styles.modalHeader}>
                <MaterialCommunityIcons name="clipboard-plus-outline" size={28} color={colors.primary} style={{ marginRight: 10 }} />
                <Text style={styles.modalTitle}>Place Request/Booking</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalSectionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Category *</Text>
                  <View style={styles.pickerWrap}>
                    <Picker selectedValue={requestCategory} onValueChange={setRequestCategory} style={styles.picker}>
                      <Picker.Item label="Cargo" value="cargo" />
                      <Picker.Item label="Agri" value="agri" />
                    </Picker>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Type *</Text>
                  <View style={styles.pickerWrap}>
                    <Picker selectedValue={requestType} onValueChange={setRequestType} style={styles.picker}>
                      <Picker.Item label="Instant" value="instant" />
                      <Picker.Item label="Booking" value="booking" />
                    </Picker>
                  </View>
                </View>
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.inputLabel}>Client *</Text>
                <View style={styles.pickerWrap}>
                  <Picker selectedValue={requestClientId} onValueChange={val => {
                    setRequestClientId(val);
                    const client = MOCK_CLIENTS.find(c => c.id === val);
                    setRequestFor(client ? client.name : '');
                  }} style={styles.picker}>
                    <Picker.Item label="Select..." value="" />
                    {MOCK_CLIENTS.map(c => (
                      <Picker.Item key={c.id} label={`${c.name} (${c.type === 'business' ? 'Business' : 'Individual'})`} value={c.id} />
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
                <Text style={styles.inputLabel}>Product Type *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Maize, Electronics, etc."
                  value={productType}
                  onChangeText={setProductType}
                />
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.inputLabel}>Weight (kg) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2000"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.inputLabel}>Value (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 50000"
                  keyboardType="numeric"
                  value={value}
                  onChangeText={setValue}
                />
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.inputLabel}>Additional/Special Request</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Any additional info for the driver"
                  value={additional}
                  onChangeText={setAdditional}
                />
              </View>
              {/* Booking Pickup Time Field */}
              {requestType === 'booking' && (
                <>
                  <Text style={styles.inputLabel}>Pickup Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2024-07-01 10:00"
                    value={pickupTime ? pickupTime.toLocaleString() : ''}
                    editable={false}
                  />
                </>
              )}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#2e7d32', marginTop: 12 }]}
                onPress={handlePlaceRequest}
              >
                <Text style={styles.saveText}>Place Request</Text>
              </TouchableOpacity>
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
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 22, paddingVertical: 8, paddingHorizontal: 18, marginLeft: 8, marginBottom: 4 },
  createBtnText: { color: colors.white, fontWeight: 'bold', marginLeft: 6, fontSize: 16 },
  requestCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 16, marginHorizontal: 8, elevation: 1, shadowColor: colors.primary, shadowOpacity: 0.04, shadowRadius: 4 },
  requestCardRow: { flexDirection: 'row', alignItems: 'center' },
  requestFor: { fontSize: 16, color: colors.text.primary, fontWeight: '700' },
  requestInfo: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  requestStatusLabel: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  requestStatus: { fontWeight: 'bold' },
  requestSummary: { color: colors.text.secondary, fontSize: 13, marginTop: 2 },
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
