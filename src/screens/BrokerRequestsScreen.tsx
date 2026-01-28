import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RequestForm from '../components/common/RequestForm';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';

// No mock data - will fetch from API

export default function BrokerRequestsScreen() {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [requests, setRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API calls when backend is ready
      // const [requestsResponse, clientsResponse] = await Promise.all([
      //   apiRequest('/broker/requests'),
      //   apiRequest('/broker/clients')
      // ]);
      // setRequests(requestsResponse.data || []);
      // setClients(clientsResponse.data || []);

      // For now, return empty arrays - no mock data
      setRequests([]);
      setClients([]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const renderRequest = ({ item }) => (
    <TouchableOpacity style={styles.requestCard} activeOpacity={0.8}>
      <View style={styles.requestHeader}>
        <Text style={styles.requestId}>#{getDisplayBookingId({
          ...item,
          readableId: item.readableId,
          bookingType: item.bookingType || (item.category === 'agri' ? 'Agri' : 'Cargo'),
          bookingMode: item.bookingMode || (item.type === 'instant' ? 'instant' : 'booking'),
          createdAt: item.createdAt,
          bookingId: item.id || item.bookingId
        })}</Text>
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Client Requests</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading client requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Client Requests</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Data</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Client Requests</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setShowRequestModal(true)}
        >
          <Ionicons name="add" size={24} color={colors.white} />
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
          ListEmptyComponent={
            <View style={styles.emptyClientsContainer}>
              <MaterialCommunityIcons name="account-group" size={48} color={colors.text.light} />
              <Text style={styles.emptyClientsText}>No clients available</Text>
              <Text style={styles.emptyClientsSubtext}>Add clients to create requests for them</Text>
            </View>
          }
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
          ListEmptyComponent={
            <View style={styles.emptyRequestsContainer}>
              <MaterialCommunityIcons name="file-document-outline" size={64} color={colors.text.light} />
              <Text style={styles.emptyRequestsTitle}>No requests found</Text>
              <Text style={styles.emptyRequestsSubtitle}>
                Create your first request for a client to get started
              </Text>
              <TouchableOpacity
                style={styles.createRequestButton}
                onPress={() => setShowRequestModal(true)}
              >
                <Text style={styles.createRequestButtonText}>Create Request</Text>
              </TouchableOpacity>
            </View>
          }
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
  addButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: 20,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.error,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorSubtitle: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '600',
  },
  emptyClientsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyClientsText: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  emptyClientsSubtext: {
    fontSize: fonts.size.sm,
    color: colors.text.light,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emptyRequestsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyRequestsTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyRequestsSubtitle: {
    fontSize: fonts.size.md,
    color: colors.text.light,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  createRequestButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  createRequestButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '600',
  },
});
