import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RequestForm from '../components/common/RequestForm';
import colors from '../constants/colors';
import fonts from '../constants/fonts';

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

export default function BrokerRequestsScreen() {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [requests, setRequests] = useState(mockRequests);
  const [clients, setClients] = useState(MOCK_CLIENTS);

  const renderRequest = ({ item }) => (
    <TouchableOpacity style={styles.requestCard} activeOpacity={0.8}>
      <View style={styles.requestHeader}>
        <Text style={styles.requestId}>#{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.clientName}>{item.for}</Text>
      <Text style={styles.requestSummary}>{item.summary}</Text>

      <View style={styles.requestFooter}>
        <View style={[styles.typeBadge, { backgroundColor: item.category === 'agri' ? colors.primary + '20' : colors.secondary + '20' }]}>
          <Text style={[styles.typeText, { color: item.category === 'agri' ? colors.primary : colors.secondary }]}>
            {item.type}
          </Text>
        </View>
        <Text style={styles.amount}>KES {item.amount.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return colors.success;
      case 'In Progress': return colors.secondary;
      case 'Pending': return colors.warning;
      default: return colors.text.secondary;
    }
  };

  const handleNewRequest = (client) => {
    setSelectedClient(client);
    setShowRequestModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Client Requests</Text>
        <TouchableOpacity style={styles.newRequestBtn} onPress={() => setShowRequestModal(true)}>
          <Ionicons name="add" size={24} color={colors.white} />
          <Text style={styles.newRequestText}>New Request</Text>
        </TouchableOpacity>
      </View>

      {/* Client Quick Actions */}
      <View style={styles.clientsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <FlatList
          data={clients}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.clientCard}
              onPress={() => handleNewRequest(item)}
            >
              <MaterialCommunityIcons
                name={item.type === 'business' ? 'domain' : 'account'}
                size={24}
                color={colors.primary}
              />
              <Text style={styles.clientName}>{item.name}</Text>
              <Text style={styles.clientType}>{item.type}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.clientsList}
        />
      </View>

      {/* Requests List */}
      <View style={styles.requestsSection}>
        <Text style={styles.sectionTitle}>Recent Requests</Text>
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.requestsList}
        />
      </View>

      {/* Request Form Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <RequestForm
          mode="broker"
          clientId={selectedClient?.id}
          isModal={true}
          onClose={() => {
            setShowRequestModal(false);
            setSelectedClient(null);
          }}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  headerTitle: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  newRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newRequestText: {
    color: colors.white,
    fontWeight: '600',
    marginLeft: 4,
  },
  clientsSection: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  clientsList: {
    paddingHorizontal: 20,
  },
  clientCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 100,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clientName: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  clientType: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  requestsSection: {
    flex: 1,
    paddingTop: 16,
  },
  requestsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  requestId: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: fonts.size.xs,
    fontWeight: '600',
  },
  requestSummary: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    marginBottom: 12,
  },
  requestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: fonts.size.xs,
    fontWeight: '600',
  },
  amount: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.secondary,
  },
});
