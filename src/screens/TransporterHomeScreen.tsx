import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing, fonts } from '../constants';
import Divider from '../components/common/Divider';
import { useNavigation } from '@react-navigation/native';

// Mock data for incoming requests
const MOCK_REQUESTS = [
  {
    id: 'REQ001',
    customer: 'Jane Doe',
    from: 'Nairobi',
    to: 'Mombasa',
    product: 'Fruits',
    weight: 1200,
    status: 'Pending',
    eta: '5h 30m',
    price: 18000,
    contact: '+254712345678',
    special: ['Refrigerated'],
  },
  {
    id: 'REQ002',
    customer: 'John Smith',
    from: 'Eldoret',
    to: 'Kisumu',
    product: 'Machinery',
    weight: 3000,
    status: 'Pending',
    eta: '2h 10m',
    price: 9500,
    contact: '+254798765432',
    special: ['Oversized'],
  },
  {
    id: 'REQ003',
    customer: 'Mary Wanjiku',
    from: 'Nakuru',
    to: 'Kericho',
    product: 'Tea',
    weight: 800,
    status: 'Pending',
    eta: '1h 45m',
    price: 6000,
    contact: '+254701234567',
    special: [],
  },
];

const MOCK_CURRENT_TRIP = {
  id: 'TRIP001',
  customer: 'Jane Doe',
  from: 'Nairobi',
  to: 'Mombasa',
  product: 'Fruits',
  weight: 1200,
  status: 'On Transit',
  eta: '4h 10m',
  price: 18000,
  contact: '+254712345678',
  special: ['Refrigerated'],
  route: [
    { latitude: -1.2921, longitude: 36.8219 },
    { latitude: -1.3000, longitude: 36.8300 },
  ],
};

export default function TransporterHomeScreen() {
  const navigation = useNavigation();
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [currentTrip, setCurrentTrip] = useState(MOCK_CURRENT_TRIP);

  const handleAccept = (req) => {
    // For now, just move to current trip
    setCurrentTrip({ ...req, status: 'On Transit' });
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Transporter Dashboard</Text>
      <Divider style={{ marginVertical: spacing.md }} />
      {/* Current Trip */}
      {currentTrip ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current Trip</Text>
          <Text style={styles.label}>Customer: <Text style={styles.value}>{currentTrip.customer}</Text></Text>
          <Text style={styles.label}>From: <Text style={styles.value}>{currentTrip.from}</Text></Text>
          <Text style={styles.label}>To: <Text style={styles.value}>{currentTrip.to}</Text></Text>
          <Text style={styles.label}>Product: <Text style={styles.value}>{currentTrip.product}</Text></Text>
          <Text style={styles.label}>Weight: <Text style={styles.value}>{currentTrip.weight} kg</Text></Text>
          <Text style={styles.label}>ETA: <Text style={styles.value}>{currentTrip.eta}</Text></Text>
          <Text style={styles.label}>Status: <Text style={[styles.value, { color: colors.success }]}>{currentTrip.status}</Text></Text>
          <Text style={styles.label}>Contact: <Text style={styles.value}>{currentTrip.contact}</Text></Text>
          {currentTrip.special && currentTrip.special.length > 0 && (
            <Text style={styles.label}>Special: <Text style={styles.value}>{currentTrip.special.join(', ')}</Text></Text>
          )}
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => navigation.navigate('TripDetails', { trip: currentTrip })}
          >
            <Ionicons name="information-circle-outline" size={20} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.detailsBtnText}>View Trip Details</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {/* Incoming Requests */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Incoming Requests</Text>
        {requests.length === 0 ? (
          <Text style={styles.emptyText}>No new requests at the moment.</Text>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.requestItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>From: <Text style={styles.value}>{item.from}</Text></Text>
                  <Text style={styles.label}>To: <Text style={styles.value}>{item.to}</Text></Text>
                  <Text style={styles.label}>Product: <Text style={styles.value}>{item.product}</Text></Text>
                  <Text style={styles.label}>Weight: <Text style={styles.value}>{item.weight} kg</Text></Text>
                  <Text style={styles.label}>ETA: <Text style={styles.value}>{item.eta}</Text></Text>
                  {item.special && item.special.length > 0 && (
                    <Text style={styles.label}>Special: <Text style={styles.value}>{item.special.join(', ')}</Text></Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAccept(item)}
                >
                  <MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.white} style={{ marginRight: 4 }} />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
              </View>
            )}
            ItemSeparatorComponent={() => <Divider style={{ marginVertical: 8 }} />}
          />
        )}
      </View>
      {/* History, Notifications, etc. can be added here */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    flexGrow: 1,
  },
  header: {
    fontSize: fonts.size.xl + 2,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  value: {
    fontWeight: '400',
    color: colors.text.secondary,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  acceptBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
  },
  detailsBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  detailsBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
  },
  emptyText: {
    color: colors.text.light,
    fontStyle: 'italic',
    marginTop: 8,
  },
});
