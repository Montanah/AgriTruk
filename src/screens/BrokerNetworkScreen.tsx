import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import { FlatList, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import colors from '../constants/colors';
import {
  MOCK_BUSINESSES,
  MOCK_FARMERS,
  MOCK_RECENT,
  MOCK_TRANSPORTERS,
} from '../mocks/brokerNetwork';

const useMockData = true; // Set to false to use real data implementation
const regions = ['All', 'Nairobi', 'Central', 'Western', 'Rift Valley', 'Coast'];

const networkTypes = [
  { key: 'businesses', label: 'Businesses', icon: (selected: boolean) => <MaterialCommunityIcons name="office-building" size={22} color={selected ? colors.white : colors.primary} /> },
  { key: 'farmers', label: 'Farmers', icon: (selected: boolean) => <MaterialCommunityIcons name="tractor" size={22} color={selected ? colors.white : colors.secondary} /> },
  { key: 'transporters', label: 'Transporters', icon: (selected: boolean) => <FontAwesome5 name="truck" size={20} color={selected ? colors.white : colors.primaryDark} /> },
];

const mockSubscription = {
  plan: 'Pro',
  status: 'Active',
  renewal: '2024-07-01',
};
const planOptions = [
  { key: 'basic', label: 'Basic', price: 'KES 200', features: ['Up to 10 requests/month', 'No analytics', 'Standard support'] },
  { key: 'pro', label: 'Pro', price: 'KES 1500', features: ['Unlimited requests', 'Analytics', 'Priority support'] },
  { key: 'platinum', label: 'Platinum', price: 'KES 2000', features: ['All Pro features', 'Platinum badge', 'Faster payouts', 'Advanced analytics'] },
  { key: 'enterprise', label: 'Enterprise', price: 'Contact Us', features: ['Custom features', 'Dedicated support', 'Custom integrations'] },
];

export default function BrokerNetworkScreen() {
  const [tab, setTab] = useState<'businesses' | 'farmers' | 'transporters'>('businesses');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addType, setAddType] = useState<'business' | 'farmer'>('business');
  const [requestSent, setRequestSent] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState('All');
  const [currentSub] = useState(mockSubscription);

  // Data source switch
  let businesses = [];
  let farmers = [];
  let transporters = [];
  let recent = [];
  if (useMockData) {
    const withRegion = (arr, region) => arr.map((e, i) => ({ ...e, region: regions[(i % (regions.length - 1)) + 1] }));
    businesses = withRegion(MOCK_BUSINESSES, 'Nairobi');
    farmers = withRegion(MOCK_FARMERS, 'Central');
    transporters = withRegion(MOCK_TRANSPORTERS, 'Rift Valley');
    recent = MOCK_RECENT;
  } else {
    // Placeholder for real data fetching
    businesses = [];
    farmers = [];
    transporters = [];
    recent = [];
  }

  let data = [];
  if (tab === 'businesses') data = businesses;
  else if (tab === 'farmers') data = farmers;
  else data = transporters;

  // For connect modal: always show businesses if addType is business, farmers if addType is farmer
  const connectEntities = addType === 'business' ? businesses : farmers;
  const filteredEntities = connectEntities.filter(e =>
    (regionFilter === 'All' || e.region === regionFilter) &&
    e.name.toLowerCase().includes(addSearch.toLowerCase())
  );

  // Analytics
  const totalBusinesses = businesses.length;
  const totalFarmers = farmers.length;
  const totalTransporters = transporters.length;

  // Calculate days remaining for reminder
  function getDaysRemaining(renewalDate: string) {
    const today = new Date();
    const renewal = new Date(renewalDate);
    return Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  const daysRemaining = getDaysRemaining(currentSub.renewal);
  const [showReminder, setShowReminder] = useState(true);

  const ListHeader = () => (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={{ height: 24 }} />
      {/* Subscription Status */}
      <View style={styles.subscriptionStatusCard}>
        <MaterialCommunityIcons name="star-circle" size={24} color={colors.secondary} style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.subPlan}>{currentSub.plan} Plan</Text>
          <Text style={styles.subStatus}>{currentSub.status} • Renews {currentSub.renewal}</Text>
        </View>
      </View>
      {/* Subscription Reminder */}
      {showReminder && (
        <View style={
          daysRemaining > 15 ? styles.reminderHealthy :
          daysRemaining > 5 ? styles.reminderWarning :
          styles.reminderDanger
        }>
          <Text style={styles.reminderText}>
            {daysRemaining > 15 && 'Your subscription is healthy.'}
            {daysRemaining <= 15 && daysRemaining > 5 && `Your subscription will renew in ${daysRemaining} days. Consider checking your plan.`}
            {daysRemaining <= 5 && `Your subscription will renew in ${daysRemaining} days! Please renew to avoid interruption.`}
          </Text>
          <TouchableOpacity onPress={() => setShowReminder(false)} style={styles.reminderCloseBtn}>
            <Ionicons name="close" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )}
      <View style={{ height: 8 }} />
      {/* Analytics Summary */}
      <View style={styles.analyticsRow}>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface }]}> 
          <MaterialCommunityIcons name="office-building" size={28} color={colors.primary} />
          <Text style={styles.analyticsValue}>{totalBusinesses}</Text>
          <Text style={styles.analyticsLabel}>Businesses</Text>
        </View>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface }]}> 
          <MaterialCommunityIcons name="tractor" size={28} color={colors.secondary} />
          <Text style={styles.analyticsValue}>{totalFarmers}</Text>
          <Text style={styles.analyticsLabel}>Farmers</Text>
        </View>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface }]}> 
          <MaterialCommunityIcons name="truck" size={28} color={colors.primaryDark} />
          <Text style={styles.analyticsValue}>{totalTransporters}</Text>
          <Text style={styles.analyticsLabel}>Transporters</Text>
        </View>
      </View>
      {/* Segmented Control */}
      <View style={styles.segmentedControlWrap}>
        <View style={styles.segmentedRow}>
          {networkTypes.map((nt) => (
            <TouchableOpacity
              key={nt.key}
              style={[styles.segmentedBtn, tab === nt.key && styles.segmentedBtnActive]}
              onPress={() => setTab(nt.key as any)}
              activeOpacity={0.85}
            >
              <View style={styles.segmentedIconTextWrap}>
                {nt.icon(tab === nt.key)}
                <Text style={[styles.segmentedText, tab === nt.key && styles.segmentedTextActive]}>{nt.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {/* Filters */}
      {(tab === 'businesses' || tab === 'farmers') && (
        <View style={styles.filterRow}>
          <View style={styles.filterCol}>
            <Text style={styles.filterLabel}>Region:</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={regionFilter}
                onValueChange={setRegionFilter}
                style={styles.picker}
              >
                {regions.map(r => <Picker.Item key={r} label={r} value={r} />)}
              </Picker>
            </View>
          </View>
        </View>
      )}
      <View style={[styles.sectionCard, { marginTop: 18 }]}> 
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>My Network</Text>
          {(tab === 'businesses' || tab === 'farmers') ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => { setAddType(tab === 'businesses' ? 'business' : 'farmer'); setShowAddModal(true); setAddSearch(''); setRequestSent(null); setSelectedId(null); }}>
              <Ionicons name="person-add" size={22} color={colors.primary} />
              <Text style={styles.addBtnText}>Connect</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ minWidth: 40 }} />
          )}
        </View>
      </View>
    </View>
  );

  const ListFooter = () => (
    <View style={{ paddingHorizontal: 16 }}>
      {/* Recent Activity */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recent.map((item) => (
          <View key={item.id} style={styles.recentItem}>
            <MaterialCommunityIcons name="history" size={18} color={colors.secondary} style={{ marginRight: 8 }} />
            <Text style={styles.recentText}>{item.type} <Text style={{ fontWeight: 'bold' }}>{item.name}</Text> <Text style={{ color: colors.text.light }}>({item.date})</Text></Text>
          </View>
        ))}
      </View>
      {/* Broker Tips/Help */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}> 
        <Text style={styles.sectionTitle}>Broker Tips</Text>
        <Text style={styles.tipText}>• Grow your network by inviting more businesses and farmers.</Text>
        <Text style={styles.tipText}>• Use the "Place Request" button in the Requests tab to quickly create bookings for your network.</Text>
        <Text style={styles.tipText}>• Track your network growth and recent activity above.</Text>
      </View>
    </View>
  );

  const insets = require('react-native-safe-area-context').useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.bg}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.networkCard}>
            <View style={styles.networkCardRow}>
              {tab === 'businesses' && <MaterialCommunityIcons name="office-building" size={28} color={colors.primary} style={{ marginRight: 12 }} />}
              {tab === 'farmers' && <MaterialCommunityIcons name="tractor" size={28} color={colors.secondary} style={{ marginRight: 12 }} />}
              {tab === 'transporters' && <FontAwesome5 name="truck" size={24} color={colors.primaryDark} style={{ marginRight: 12 }} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.networkName}>{item.name}</Text>
                <Text style={styles.networkInfo}>{item.email} • {item.phone} • {item.region}</Text>
              </View>
              {(tab === 'businesses' || tab === 'farmers') ? (
                <TouchableOpacity style={styles.removeBtn}>
                  <Ionicons name="remove-circle" size={22} color={colors.error} />
                </TouchableOpacity>
              ) : (
                <View style={{ minWidth: 22 }} />
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No {tab} in your network.</Text>}
        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={<ListFooter />}
        contentContainerStyle={{ paddingBottom: 68 + (insets?.bottom || 0) }}
        showsVerticalScrollIndicator={false}
      />
      {/* Add to Network Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Connect with {addType === 'business' ? 'Business' : 'Farmer'}</Text>
            <TextInput
              style={styles.input}
              placeholder={`Search ${addType === 'business' ? 'businesses' : 'farmers'}...`}
              value={addSearch}
              onChangeText={setAddSearch}
            />
            <View style={styles.filterRow}>
              <View style={styles.filterCol}>
                <Text style={styles.filterLabel}>Region:</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={regionFilter}
                    onValueChange={setRegionFilter}
                    style={styles.picker}
                  >
                    {regions.map(r => <Picker.Item key={r} label={r} value={r} />)}
                  </Picker>
                </View>
              </View>
            </View>
            <FlatList
              data={filteredEntities}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.connectCard, selectedId === item.id && { borderColor: colors.primary, borderWidth: 2 }]}
                  onPress={() => setSelectedId(item.id)}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {addType === 'business' && <MaterialCommunityIcons name="office-building" size={22} color={colors.primary} style={{ marginRight: 10 }} />}
                    {addType === 'farmer' && <MaterialCommunityIcons name="tractor" size={22} color={colors.secondary} style={{ marginRight: 10 }} />}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.connectName}>{item.name}</Text>
                      <Text style={styles.connectInfo}>{item.email} • {item.phone} • {item.region}</Text>
                    </View>
                    {requestSent === item.id ? (
                      <Text style={styles.requestSent}>Request Sent</Text>
                    ) : (
                      <Ionicons name={selectedId === item.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={selectedId === item.id ? colors.primary : colors.text.light} />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No results found.</Text>}
              style={{ maxHeight: 260, marginTop: 8 }}
            />
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { opacity: selectedId && !requestSent ? 1 : 0.5 }]}
                disabled={!selectedId || !!requestSent}
                onPress={() => {
                  if (selectedId) setRequestSent(selectedId);
                }}
              >
                <Text style={styles.saveText}>Send Request</Text>
              </TouchableOpacity>
            </View>
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
  segmentedControlWrap: { backgroundColor: colors.surface, borderRadius: 24, padding: 6, marginBottom: 18, marginTop: 8 },
  segmentedRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  segmentedBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 22, backgroundColor: colors.surface, marginHorizontal: 4, borderWidth: 1, borderColor: colors.primary, minWidth: 100 },
  segmentedIconTextWrap: { alignItems: 'center', justifyContent: 'center' },
  segmentedText: { color: colors.primary, fontWeight: '700', fontSize: 14, marginTop: 4 },
  segmentedTextActive: { color: colors.white },
  segmentedBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentedText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  segmentedTextActive: { color: colors.white },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 2, gap: 12 },
  filterCol: { flex: 1 },
  filterLabel: { fontWeight: 'bold', color: colors.text.secondary, marginBottom: 2 },
  sectionCard: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 18, elevation: 2, shadowColor: colors.black, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.secondary, letterSpacing: 0.2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: colors.primary },
  addBtnText: { color: colors.primary, fontWeight: 'bold', marginLeft: 4, fontSize: 15 },
  networkCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 12, marginHorizontal: 8, elevation: 1, shadowColor: colors.primary, shadowOpacity: 0.04, shadowRadius: 4 },
  networkCardRow: { flexDirection: 'row', alignItems: 'center' },
  networkName: { fontSize: 16, color: colors.text.primary, fontWeight: '700' },
  networkInfo: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  removeBtn: { marginLeft: 8 },
  emptyText: { color: colors.text.light, fontSize: 14, textAlign: 'center', marginTop: 8 },
  recentItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  recentText: { color: colors.text.primary, fontSize: 15 },
  tipText: { color: colors.text.secondary, fontSize: 14, marginTop: 2 },
  connectCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 10, marginHorizontal: 2, elevation: 1, shadowColor: colors.primary, shadowOpacity: 0.03, shadowRadius: 2 },
  connectName: { fontWeight: 'bold', color: colors.primary, fontSize: 15 },
  connectInfo: { color: colors.text.secondary, fontSize: 13 },
  connectBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16, marginLeft: 10 },
  connectBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 14 },
  requestSent: { color: colors.secondary, fontWeight: 'bold', fontSize: 14, marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: colors.white, borderRadius: 18, padding: 22, width: '92%', shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: colors.background, borderRadius: 8, padding: 10, marginVertical: 6, fontSize: 15, borderWidth: 1, borderColor: colors.text.light },
  modalActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelBtn: { backgroundColor: colors.background, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, borderWidth: 1, borderColor: colors.text.light, marginRight: 8 },
  cancelText: { color: colors.error, fontWeight: 'bold', fontSize: 15 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  saveText: { color: colors.white, fontWeight: 'bold' },
});
