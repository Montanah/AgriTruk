import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../constants/colors';

const MOCK_REQUESTS = [
  {
    id: 'REQ-101',
    from: 'Farm X',
    to: 'Market Y',
    type: 'AgriTRUK',
    date: '2024-06-12 10:00',
    cargo: 'Fruits, Perishable',
    weight: '500kg',
    price: 1500,
    status: 'Incoming',
    customer: { name: 'Jane Doe', phone: '+254712345678' },
  },
  {
    id: 'REQ-102',
    from: 'Depot A',
    to: 'Shop B',
    type: 'CargoTRUK',
    date: '2024-06-12 12:30',
    cargo: 'Electronics',
    weight: '200kg',
    price: 900,
    status: 'Incoming',
    customer: { name: 'John Smith', phone: '+254798765432' },
  },
];

const MOCK_ACTIVE = [
  {
    id: 'REQ-099',
    from: 'Farm Z',
    to: 'Market Q',
    type: 'AgriTRUK',
    date: '2024-06-11 09:00',
    cargo: 'Vegetables',
    weight: '300kg',
    price: 1100,
    status: 'On Transit',
    customer: { name: 'Alice', phone: '+254700000000' },
    progress: 0.7,
  },
];

const MOCK_COMPLETED = [
  {
    id: 'REQ-090',
    from: 'Warehouse W',
    to: 'Client E',
    type: 'CargoTRUK',
    date: '2024-06-09 15:00',
    cargo: 'Machinery',
    weight: '1.2T',
    price: 2500,
    status: 'Completed',
    customer: { name: 'Bob', phone: '+254733333333' },
    rating: 5,
  },
];

const TABS = ['Incoming', 'Active', 'Completed'];

const TransporterServiceScreen = () => {
  const [tab, setTab] = useState('Incoming');

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

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Transporter Dashboard</Text>
      </View>
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
      <FlatList
        data={getData()}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No requests found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { paddingTop: 32, paddingBottom: 8, alignItems: 'center', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.background },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.primaryDark },
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
