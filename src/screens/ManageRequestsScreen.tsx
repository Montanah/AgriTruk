import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import colors from '../constants/colors';
import { spacing, fonts } from '../constants';

// --- MOCK DATA ---
import { MOCK_REQUESTS, ROUTES, TYPES, STATUS } from '../mocks/requests';

export default function ManageRequestsScreen({ navigation }) {
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [filterRoute, setFilterRoute] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPickupDate, setFilterPickupDate] = useState('');
  const [sortBy, setSortBy] = useState('pickupDate');
  const [showMap, setShowMap] = useState(false);
  const [showDetails, setShowDetails] = useState(null);

  // Filtered requests
  let filteredRequests = MOCK_REQUESTS.filter(r =>
    (filterRoute === 'All' || r.route === filterRoute) &&
    (filterType === 'All' || r.type === filterType) &&
    (filterStatus === 'All' || r.status === filterStatus)
  );
  // Filter by pickup date if set
  if (filterPickupDate) {
    filteredRequests = filteredRequests.filter(r =>
      r.pickupDate && r.pickupDate.startsWith(filterPickupDate)
    );
  }
  // Sort
  filteredRequests = [...filteredRequests].sort((a, b) => {
    return (a.route || '').localeCompare(b.route || '');
  });

  // Analytics for current view
  const totalWeight = filteredRequests.reduce((sum, r) => sum + r.weight, 0);
  const totalValue = filteredRequests.reduce((sum, r) => sum + r.price, 0);

  // Smart consolidate suggestion (group by route)
  const smartConsolidate = () => {
    const byRoute = {};
    filteredRequests.forEach(r => {
      if (!byRoute[r.route]) byRoute[r.route] = [];
      byRoute[r.route].push(r);
    });
    return Object.values(byRoute).filter(arr => arr.length > 1);
  };

  // Bulk actions
  const handleBulkConsolidate = () => {
    if (selectedRequests.length < 2) {
      alert('Select at least two requests to consolidate.');
      return;
    }
    alert('Consolidated ' + selectedRequests.length + ' requests!');
    setSelectedRequests([]);
  };

  const handleBulkAccept = () => {
    if (selectedRequests.length === 0) {
      alert('Select requests to accept.');
      return;
    }
    alert('Accepted ' + selectedRequests.length + ' requests!');
    setSelectedRequests([]);
  };

  const handleBulkReject = () => {
    if (selectedRequests.length === 0) {
      alert('Select requests to reject.');
      return;
    }
    alert('Rejected ' + selectedRequests.length + ' requests!');
    setSelectedRequests([]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Requests</Text>
        <View style={{ width: 32 }} />
      </View>
      {/* Analytics/Insights */}
      <View style={styles.analyticsRow}>
        <View style={styles.analyticsCard}><Text style={styles.analyticsNum}>{filteredRequests.length}</Text><Text style={styles.analyticsLabel}>Jobs</Text></View>
        <View style={styles.analyticsCard}><Text style={styles.analyticsNum}>{totalWeight}kg</Text><Text style={styles.analyticsLabel}>Total Weight</Text></View>
        <View style={styles.analyticsCard}><Text style={styles.analyticsNum}>KES {totalValue.toLocaleString()}</Text><Text style={styles.analyticsLabel}>Total Value</Text></View>
      </View>
      {/* Filters */}
      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Route Filter */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Route:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={filterRoute}
                style={styles.picker}
                onValueChange={val => setFilterRoute(val)}
                dropdownIconColor={colors.secondary}
              >
                {ROUTES.map(route => (
                  <Picker.Item key={route} label={route} value={route} />
                ))}
              </Picker>
            </View>
          </View>
          {/* Status */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Status:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={filterStatus}
                style={styles.picker}
                onValueChange={val => setFilterStatus(val)}
                dropdownIconColor={colors.secondary}
              >
                {STATUS.map(status => (
                  <Picker.Item key={status} label={status} value={status} />
                ))}
              </Picker>
            </View>
          </View>
          {/* Sort By - Only Route */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Sort By:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={sortBy}
                style={styles.picker}
                onValueChange={val => setSortBy(val)}
                dropdownIconColor={colors.secondary}
              >
                <Picker.Item label="Route" value="route" />
              </Picker>
            </View>
          </View>
        </ScrollView>
        <TouchableOpacity style={styles.mapToggleBtn} onPress={() => setShowMap(v => !v)}>
          <MaterialCommunityIcons name="map-search-outline" size={22} color={showMap ? colors.secondary : colors.primary} />
        </TouchableOpacity>
      </View>
      {/* Bulk Actions */}
      <View style={styles.bulkActionsRow}>
        <TouchableOpacity style={styles.bulkBtn} onPress={handleBulkConsolidate}>
          <MaterialCommunityIcons name="package-variant" size={20} color={colors.white} />
          <Text style={styles.bulkBtnText}>Consolidate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bulkBtn} onPress={handleBulkAccept}>
          <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.white} />
          <Text style={styles.bulkBtnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bulkBtn} onPress={handleBulkReject}>
          <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.white} />
          <Text style={styles.bulkBtnText}>Reject</Text>
        </TouchableOpacity>
      </View>
      {/* Smart Consolidate Suggestion */}
      {smartConsolidate().length > 0 && (
        <View style={styles.smartConsolidateCard}>
          <Text style={styles.smartConsolidateTitle}>Smart Consolidate Suggestions</Text>
          {smartConsolidate().map((group, idx) => (
            <Text key={idx} style={styles.smartConsolidateText}>Route {group[0].route}: {group.map(r => r.product).join(', ')}</Text>
          ))}
        </View>
      )}
      {/* Requests List */}
      <FlatList
        data={filteredRequests}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.requestCard, selectedRequests.includes(item.id) && styles.requestCardSelected]}
            onPress={() => setShowDetails(item)}
            onLongPress={() => setSelectedRequests(selectedRequests.includes(item.id)
              ? selectedRequests.filter(id => id !== item.id)
              : [...selectedRequests, item.id])}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={{ marginRight: 10 }}
                onPress={() => setSelectedRequests(selectedRequests.includes(item.id)
                  ? selectedRequests.filter(id => id !== item.id)
                  : [...selectedRequests, item.id])}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={selectedRequests.includes(item.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={22}
                  color={selectedRequests.includes(item.id) ? colors.secondary : colors.text.light}
                />
              </TouchableOpacity>
              <MaterialCommunityIcons name={item.type === 'booking' ? 'calendar-check' : 'flash'} size={22} color={item.type === 'booking' ? colors.primary : colors.secondary} style={{ marginRight: 10 }} />
              <Text style={styles.reqMain}>{item.from} → {item.to}</Text>
              <View style={[styles.reqTypeBadge, { backgroundColor: item.type === 'booking' ? colors.primary : colors.secondary }]}> 
                <Text style={styles.reqTypeBadgeText}>{item.type === 'booking' ? 'Booking' : 'Instant'}</Text>
              </View>
              <View style={[styles.reqStatusBadge, { backgroundColor: item.status === 'Pending' ? colors.warning : colors.success, marginLeft: 8 }]}> 
                <Text style={styles.reqStatusBadgeText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.reqSub}>{item.product} • {item.weight}kg • ETA: {item.eta}</Text>
            {item.pickupDate && (
              <Text style={[styles.reqSub, { color: colors.secondary }]}>Pickup: {item.pickupDate.slice(0, 16).replace('T', ' ')}</Text>
            )}
            {item.special && item.special.length > 0 && (
              <Text style={styles.reqSpecial}>{item.special.join(', ')}</Text>
            )}
            <Text style={styles.reqRoute}>Route: {item.route}</Text>
          </TouchableOpacity>
        )}
      />
      {/* Details Modal */}
      <Modal visible={!!showDetails} animationType="slide" transparent onRequestClose={() => setShowDetails(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {showDetails && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Request Details</Text>
                <Text style={styles.modalLabel}>From: <Text style={styles.modalValue}>{showDetails.from}</Text></Text>
                <Text style={styles.modalLabel}>To: <Text style={styles.modalValue}>{showDetails.to}</Text></Text>
                <Text style={styles.modalLabel}>Product: <Text style={styles.modalValue}>{showDetails.product}</Text></Text>
                <Text style={styles.modalLabel}>Weight: <Text style={styles.modalValue}>{showDetails.weight} kg</Text></Text>
                <Text style={styles.modalLabel}>ETA: <Text style={styles.modalValue}>{showDetails.eta}</Text></Text>
                {showDetails.pickupDate && (
                  <Text style={styles.modalLabel}>Pickup Date: <Text style={styles.modalValue}>{showDetails.pickupDate.slice(0, 16).replace('T', ' ')}</Text></Text>
                )}
                <Text style={styles.modalLabel}>Price: <Text style={styles.modalValue}>KES {showDetails.price?.toLocaleString()}</Text></Text>
                <Text style={styles.modalLabel}>Route: <Text style={styles.modalValue}>{showDetails.route}</Text></Text>
                {showDetails.special && showDetails.special.length > 0 && (
                  <Text style={styles.modalLabel}>Special: <Text style={styles.modalValue}>{showDetails.special.join(', ')}</Text></Text>
                )}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity style={[styles.acceptBtn, { flex: 1, marginRight: 8 }]} onPress={() => { alert('Accepted!'); setShowDetails(null); }}>
                    <MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.white} style={{ marginRight: 4 }} />
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.rejectBtn, { flex: 1, marginLeft: 8 }]} onPress={() => { alert('Rejected!'); setShowDetails(null); }}>
                    <Ionicons name="close-circle-outline" size={22} color={colors.white} style={{ marginRight: 4 }} />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowDetails(null)}>
                  <Ionicons name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.surface },
  backBtn: { marginRight: 12, padding: 6, borderRadius: 16, backgroundColor: colors.surface },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.primary, flex: 1, textAlign: 'center' },
  analyticsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, marginTop: 8, gap: 8, paddingHorizontal: 12 },
  analyticsCard: { flex: 1, alignItems: 'center', borderRadius: 16, padding: 10, marginHorizontal: 2, backgroundColor: colors.surface, elevation: 1, shadowColor: colors.primary, shadowOpacity: 0.06, shadowRadius: 6 },
  analyticsNum: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginTop: 2 },
  analyticsLabel: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  filtersRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 8, backgroundColor: '#fff', borderRadius: 16, elevation: 1, shadowColor: colors.primary, shadowOpacity: 0.04, shadowRadius: 4, paddingVertical: 6 },
  filterItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  filterLabel: { fontWeight: 'bold', color: colors.primary, marginRight: 4, fontSize: 15 },
  pickerWrapper: { backgroundColor: '#f7fafd', borderRadius: 10, borderWidth: 1, borderColor: colors.text.light, overflow: 'hidden', minWidth: 90 },
  picker: { width: 110, color: colors.text.primary, height: 36, fontSize: 15 },
  filterBtn: { backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 16, marginRight: 8, borderWidth: 1, borderColor: colors.surface },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { color: colors.text.primary, fontWeight: 'bold' },
  filterBtnTextActive: { color: colors.white },
  mapToggleBtn: { marginLeft: 8, backgroundColor: colors.surface, borderRadius: 16, padding: 8 },
    bulkActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 12 },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 18, marginHorizontal: 4 },
  bulkBtnText: { color: colors.white, fontWeight: 'bold', marginLeft: 6, fontSize: 15 },
  smartConsolidateCard: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 12, marginHorizontal: 12, marginBottom: 8 },
  smartConsolidateTitle: { fontWeight: 'bold', color: colors.secondary, marginBottom: 4 },
  smartConsolidateText: { color: colors.primary, fontSize: 14, marginBottom: 2 },
  requestCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 12, marginHorizontal: 12, elevation: 1, shadowColor: colors.primary, shadowOpacity: 0.04, shadowRadius: 4 },
  requestCardSelected: { borderColor: colors.secondary, borderWidth: 2, backgroundColor: '#f2f7fa' },
  reqMain: { fontWeight: 'bold', color: colors.primary, fontSize: 16, flex: 1 },
  reqTypeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginLeft: 8 },
  reqTypeBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  reqStatusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  reqStatusBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  reqSub: { color: colors.text.secondary, fontSize: 14, marginTop: 2 },
  reqSpecial: { color: colors.warning, fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  reqRoute: { color: colors.text.light, fontSize: 13, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: colors.white, borderRadius: 18, padding: 22, width: '92%', shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8, marginBottom: 80 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 16, textAlign: 'center' },
  modalLabel: { fontWeight: 'bold', color: colors.text.secondary, marginTop: 8, marginBottom: 2 },
  modalValue: { color: colors.text.primary, fontWeight: '400' },
  modalActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, gap: 12 },
  acceptBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  acceptBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  rejectBtn: { backgroundColor: colors.error, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rejectBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  closeModalBtn: { position: 'absolute', top: 10, right: 10, padding: 4 },
});
