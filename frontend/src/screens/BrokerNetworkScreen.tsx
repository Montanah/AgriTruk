import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useState, useEffect } from 'react';
import { FlatList, Modal, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import colors from '../constants/colors';
import { API_ENDPOINTS } from '../constants/api';

const regions = ['Nairobi', 'Central', 'Western', 'Rift Valley', 'Coast'];

function getDaysLeftInMonth() {
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return endOfMonth.getDate() - today.getDate();
}

export default function BrokerNetworkScreen() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editClientIdx, setEditClientIdx] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientType, setClientType] = useState('business');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientRegion, setClientRegion] = useState('Nairobi');
  const [search, setSearch] = useState('');
  const [showReminder, setShowReminder] = useState(true);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.BROKERS}/clients-with-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data.data || []);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Add or edit client
  const handleSaveClient = () => {
    if (!clientName || !clientEmail || !clientPhone || !clientAddress) return;
    const newClient = {
      id: editClientIdx !== null ? clients[editClientIdx].id : Date.now().toString(),
      name: clientName,
      type: clientType,
      email: clientEmail,
      phone: clientPhone,
      address: clientAddress,
      region: clientRegion,
    };
    let updated;
    if (editClientIdx !== null) {
      updated = [...clients];
      updated[editClientIdx] = newClient;
    } else {
      updated = [...clients, newClient];
    }
    setClients(updated);
    setShowAddModal(false);
    setEditClientIdx(null);
    setClientName('');
    setClientType('business');
    setClientEmail('');
    setClientPhone('');
    setClientAddress('');
    setClientRegion('Nairobi');
  };
  const handleEditClient = (idx) => {
    const c = clients[idx];
    setEditClientIdx(idx);
    setClientName(c.name);
    setClientType(c.type);
    setClientEmail(c.email);
    setClientPhone(c.phone);
    setClientAddress(c.address);
    setClientRegion(c.region || 'Nairobi');
    setShowAddModal(true);
  };
  const handleRemoveClient = (idx) => {
    setClients((clients || []).filter((_, i) => i !== idx));
  };

  // Filtered clients for search
  const filteredClients = (clients || []).filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  // Analytics
  const totalBusinesses = (clients || []).filter(c => c.type === 'business').length;
  const totalIndividuals = (clients || []).filter(c => c.type === 'individual').length;
  const totalClients = (clients || []).length;

  const daysLeft = getDaysLeftInMonth();

  return (
    <SafeAreaView style={styles.bg}>
      <View style={styles.headerWrap}>
        <Text style={styles.title}>Broker Dashboard</Text>
        <Text style={styles.subtitle}>Manage your clients and network</Text>
      </View>
      {showReminder && (
        <View style={
          daysLeft > 15 ? styles.reminderHealthy :
            daysLeft > 5 ? styles.reminderWarning :
              styles.reminderDanger
        }>
          <Text style={styles.reminderText}>
            {daysLeft > 15 && 'Your subscription is healthy.'}
            {daysLeft <= 15 && daysLeft > 5 && `Your subscription will renew in ${daysLeft} days. Consider checking your plan.`}
            {daysLeft <= 5 && `Your subscription will renew in ${daysLeft} days! Please renew to avoid interruption.`}
          </Text>
          <TouchableOpacity onPress={() => setShowReminder(false)} style={styles.reminderCloseBtn}>
            <Ionicons name="close" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.analyticsRow}>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="office-building" size={28} color={colors.primary} />
          <Text style={styles.analyticsValue}>{totalBusinesses}</Text>
          <Text style={styles.analyticsLabel}>Businesses</Text>
        </View>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="account" size={28} color={colors.secondary} />
          <Text style={styles.analyticsValue}>{totalIndividuals}</Text>
          <Text style={styles.analyticsLabel}>Individuals</Text>
        </View>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="account-group" size={28} color={colors.primaryDark} />
          <Text style={styles.analyticsValue}>{totalClients}</Text>
          <Text style={styles.analyticsLabel}>Total Clients</Text>
        </View>
      </View>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>My Clients</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setShowAddModal(true); setEditClientIdx(null); setClientName(''); setClientType('business'); setClientEmail(''); setClientPhone(''); setClientAddress(''); setClientRegion('Nairobi'); }}>
          <Ionicons name="person-add" size={22} color={colors.primary} />
          <Text style={styles.addBtnText}>Add Client</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Search clients..."
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filteredClients}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.clientCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name={item.type === 'business' ? 'office-building' : 'account'} size={28} color={item.type === 'business' ? colors.primary : colors.secondary} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.clientName}>{item.name}</Text>
                <Text style={styles.clientInfo}>{item.type === 'business' ? 'Business' : 'Individual'} • {item.email} • {item.phone} • {item.address} • {item.region}</Text>
                {/* Request history for this client */}
                {item.requests && item.requests.length > 0 && (
                  <View style={styles.requestHistoryWrap}>
                    <Text style={styles.requestHistoryTitle}>Recent Requests:</Text>
                    {item.requests.slice(0, 3).map(req => (
                      <View key={req.id} style={styles.requestHistoryItem}>
                        <MaterialCommunityIcons name={req.type === 'booking' ? 'calendar-check' : 'flash'} size={16} color={req.type === 'booking' ? colors.primary : colors.secondary} style={{ marginRight: 4 }} />
                        <Text style={styles.requestHistoryText}>{new Date(req.createdAt).toLocaleDateString()}: {req.cargoDescription || 'Transport request'} <Text style={{ color: req.status === 'completed' ? colors.secondary : colors.primaryDark }}>({req.status})</Text></Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.editBtn} onPress={() => handleEditClient(index)}>
                <Ionicons name="create-outline" size={20} color={colors.secondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveClient(index)}>
                <Ionicons name="trash" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No clients added yet.</Text>}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
      {/* Add/Edit Client Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editClientIdx !== null ? 'Edit Client' : 'Add Client'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Client Name"
              value={clientName}
              onChangeText={setClientName}
            />
            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeBtn, clientType === 'business' && styles.typeBtnActive]} onPress={() => setClientType('business')}>
                <MaterialCommunityIcons name="office-building" size={20} color={clientType === 'business' ? colors.white : colors.primary} />
                <Text style={[styles.typeBtnText, clientType === 'business' && { color: colors.white }]}>Business</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, clientType === 'individual' && styles.typeBtnActive]} onPress={() => setClientType('individual')}>
                <MaterialCommunityIcons name="account" size={20} color={clientType === 'individual' ? colors.white : colors.secondary} />
                <Text style={[styles.typeBtnText, clientType === 'individual' && { color: colors.white }]}>Individual</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={clientEmail}
              onChangeText={setClientEmail}
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone"
              value={clientPhone}
              onChangeText={setClientPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Address"
              value={clientAddress}
              onChangeText={setClientAddress}
            />
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.inputDropdownLabel}>Region</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={clientRegion}
                  onValueChange={setClientRegion}
                  style={styles.picker}
                >
                  {regions.map(r => <Picker.Item key={r} label={r} value={r} />)}
                </Picker>
              </View>
            </View>
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveClient}>
                <Text style={styles.saveText}>{editClientIdx !== null ? 'Save Changes' : 'Add Client'}</Text>
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
  headerWrap: { paddingTop: Platform.OS === 'android' ? 36 : 48, paddingBottom: 8, alignItems: 'center', backgroundColor: colors.primary, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: colors.white, marginBottom: 2 },
  subtitle: { fontSize: 15, color: colors.white, opacity: 0.85, marginBottom: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 18, paddingHorizontal: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.secondary, letterSpacing: 0.2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: colors.primary },
  addBtnText: { color: colors.primary, fontWeight: 'bold', marginLeft: 4, fontSize: 15 },
  input: { backgroundColor: colors.background, borderRadius: 8, padding: 10, marginVertical: 6, fontSize: 15, borderWidth: 1, borderColor: colors.text.light, width: '100%' },
  analyticsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, marginTop: 8, gap: 8 },
  analyticsCard: { flex: 1, alignItems: 'center', borderRadius: 16, padding: 14, marginHorizontal: 2, elevation: 1, shadowColor: colors.primary, shadowOpacity: 0.06, shadowRadius: 6 },
  analyticsLabel: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  analyticsValue: { fontSize: 24, fontWeight: 'bold', color: colors.primaryDark, marginTop: 2, letterSpacing: 0.5 },
  clientCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 16, marginHorizontal: 8, elevation: 2, shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 8 },
  clientName: { fontSize: 17, color: colors.text.primary, fontWeight: '700' },
  clientInfo: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  requestHistoryWrap: { marginTop: 6, backgroundColor: colors.background, borderRadius: 8, padding: 8 },
  requestHistoryTitle: { fontWeight: 'bold', color: colors.primaryDark, fontSize: 13, marginBottom: 2 },
  requestHistoryItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  requestHistoryText: { color: colors.text.primary, fontSize: 13 },
  editBtn: { marginLeft: 8, marginRight: 2 },
  removeBtn: { marginLeft: 2 },
  emptyText: { color: colors.text.light, fontSize: 14, textAlign: 'center', marginTop: 8 },
  reminderHealthy: { backgroundColor: '#e6fbe6', borderRadius: 12, padding: 12, marginHorizontal: 16, marginTop: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  reminderWarning: { backgroundColor: '#fffbe6', borderRadius: 12, padding: 12, marginHorizontal: 16, marginTop: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  reminderDanger: { backgroundColor: '#ffe6e6', borderRadius: 12, padding: 12, marginHorizontal: 16, marginTop: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  reminderText: { color: colors.primaryDark, fontSize: 14, flex: 1 },
  reminderCloseBtn: { marginLeft: 10, padding: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: colors.white, borderRadius: 18, padding: 22, width: '92%', shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 16, textAlign: 'center' },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: colors.text.light },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnText: { color: colors.primary, fontWeight: 'bold', marginLeft: 6, fontSize: 15 },
  pickerWrap: { borderWidth: 1, borderColor: colors.text.light, borderRadius: 8, marginBottom: 8, backgroundColor: colors.surface },
  picker: { height: 44, width: '100%' },
  modalActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelBtn: { backgroundColor: colors.background, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, borderWidth: 1, borderColor: colors.text.light, marginRight: 8 },
  cancelText: { color: colors.error, fontWeight: 'bold', fontSize: 15 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  saveText: { color: colors.white, fontWeight: 'bold' },
});
