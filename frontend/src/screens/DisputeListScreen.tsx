/**
 * Dispute List Screen
 * Shows all disputes with filters, status, and priority badges matching admin dashboard
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { disputeService, Dispute, DisputeStats, DisputeFilters, DisputeStatus, DisputePriority } from '../services/disputeService';
// Simple date formatter
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
};

const DisputeListScreen = () => {
  const navigation = useNavigation();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<DisputeStats>({
    pending: 0,
    resolvedToday: 0,
    escalated: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<DisputeFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, [filters]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      const data = await disputeService.getDisputes(filters);
      setDisputes(data.disputes || []);
      setStats(data.stats || stats);
    } catch (error: any) {
      console.error('Error loading disputes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDisputes();
  };

  const getPriorityColor = (priority: DisputePriority) => {
    switch (priority) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text.secondary;
    }
  };

  const getStatusColor = (status: DisputeStatus) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'resolved': return colors.success;
      case 'escalated': return colors.error;
      case 'in_progress': return colors.primary;
      case 'closed': return colors.text.secondary;
      default: return colors.text.secondary;
    }
  };


  const renderDisputeItem = ({ item }: { item: Dispute }) => (
    <TouchableOpacity
      style={styles.disputeCard}
      onPress={() => navigation.navigate('DisputeDetail' as never, { disputeId: item.id } as never)}
    >
      <View style={styles.disputeHeader}>
        <View style={styles.disputeIdContainer}>
          <Text style={styles.disputeId}>{item.disputeId || `DSP${item.id.substring(0, 6).toUpperCase()}`}</Text>
          <Text style={styles.bookingId}>Booking: {item.booking?.readableId || item.bookingId}</Text>
        </View>
        <View style={styles.badgeContainer}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
            <Text style={[styles.badgeText, { color: getPriorityColor(item.priority) }]}>
              {item.priority}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.disputeBody}>
        <View style={styles.partyRow}>
          <MaterialCommunityIcons name="account" size={16} color={colors.text.secondary} />
          <Text style={styles.partyLabel}>Customer:</Text>
          <Text style={styles.partyValue}>{item.customer.name}</Text>
          <Text style={styles.partyPhone}>{item.customer.phone}</Text>
        </View>

        <View style={styles.partyRow}>
          <MaterialCommunityIcons name="truck" size={16} color={colors.text.secondary} />
          <Text style={styles.partyLabel}>Transporter:</Text>
          <Text style={styles.partyValue}>{item.transporter.name}</Text>
        </View>

        <View style={styles.issueRow}>
          <MaterialCommunityIcons name="alert-circle" size={16} color={colors.text.secondary} />
          <Text style={styles.issueText}>{item.issue}</Text>
        </View>

        <View style={styles.dateRow}>
          <MaterialCommunityIcons name="clock-outline" size={14} color={colors.text.light} />
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.disputeActions}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => navigation.navigate('DisputeDetail' as never, { disputeId: item.id } as never)}
        >
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
        {item.status === 'pending' && (
          <TouchableOpacity
            style={styles.resolveButton}
            onPress={() => navigation.navigate('DisputeDetail' as never, { disputeId: item.id, action: 'resolve' } as never)}
          >
            <Text style={styles.resolveButtonText}>Resolve</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute Resolution</Text>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterButton}>
          <MaterialCommunityIcons name="filter" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{stats.pending}</Text>
            <Text style={styles.summaryLabel}>Pending Disputes</Text>
            <Text style={styles.summaryDescription}>Require immediate attention</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{stats.resolvedToday}</Text>
            <Text style={styles.summaryLabel}>Resolved Today</Text>
            <Text style={styles.summaryDescription}>Successfully resolved</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{stats.escalated}</Text>
            <Text style={styles.summaryLabel}>Escalated Cases</Text>
            <Text style={styles.summaryDescription}>Management review required</Text>
          </View>
        </View>

        {/* Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>Filters</Text>
            {/* Add filter UI here */}
          </View>
        )}

        {/* Disputes List */}
        <View style={styles.disputesSection}>
          <Text style={styles.sectionTitle}>Recent Disputes</Text>
          
          {loading && disputes.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading disputes...</Text>
            </View>
          ) : disputes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="check-circle-outline" size={64} color={colors.text.light} />
              <Text style={styles.emptyText}>No disputes found</Text>
              <Text style={styles.emptySubtext}>All disputes have been resolved</Text>
            </View>
          ) : (
            <FlatList
              data={disputes}
              renderItem={renderDisputeItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          )}
        </View>
      </ScrollView>

      {/* Create Dispute FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateDispute' as never)}
      >
        <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fonts.size.xl,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  filterButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryNumber: {
    fontSize: 32,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  summaryDescription: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  filtersContainer: {
    backgroundColor: colors.white,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 12,
  },
  filtersTitle: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  disputesSection: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  disputeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  disputeIdContainer: {
    flex: 1,
  },
  disputeId: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  bookingId: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.medium,
    textTransform: 'capitalize',
  },
  disputeBody: {
    marginBottom: spacing.sm,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  partyLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  partyValue: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginRight: spacing.xs,
  },
  partyPhone: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  issueText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  dateText: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
    marginLeft: spacing.xs,
  },
  disputeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
  },
  resolveButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  resolveButtonText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.white,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.text.secondary,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default DisputeListScreen;

