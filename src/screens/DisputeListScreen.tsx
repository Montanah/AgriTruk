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
  Animated,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { disputeService, Dispute, DisputeStats, DisputeFilters, DisputeStatus, DisputePriority } from '../services/disputeService';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';

// Robust date formatter that handles various date formats including Firestore Timestamps
const formatDate = (dateString: string | undefined | null | any): string => {
  if (!dateString) return 'N/A';
  
  try {
    let date: Date;
    
    // Handle Firestore Timestamp objects
    if (typeof dateString === 'object' && dateString !== null) {
      if ('toDate' in dateString && typeof dateString.toDate === 'function') {
        // Firestore Timestamp object
        date = dateString.toDate();
      } else if ('seconds' in dateString && 'nanoseconds' in dateString) {
        // Firestore Timestamp-like object with seconds/nanoseconds
        date = new Date(dateString.seconds * 1000 + (dateString.nanoseconds || 0) / 1000000);
      } else if ('_seconds' in dateString) {
        // Alternative Firestore Timestamp format
        date = new Date(dateString._seconds * 1000);
      } else {
        // Try to convert object to date
        date = new Date(dateString);
      }
    } else if (typeof dateString === 'string') {
      date = new Date(dateString);
    } else if (typeof dateString === 'number') {
      // Unix timestamp (seconds or milliseconds)
      date = dateString > 1000000000000 ? new Date(dateString) : new Date(dateString * 1000);
    } else {
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return 'N/A';
    }
    
    // Format date nicely
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
    return 'N/A';
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
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Load disputes when screen is focused (e.g., returning from CreateDisputeScreen)
  useFocusEffect(
    React.useCallback(() => {
      loadDisputes();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, [filters])
  );

  const loadDisputes = async () => {
    try {
      setLoading(true);
      console.log('🔄 [DisputeList] Loading disputes with filters:', filters);
      const data = await disputeService.getDisputes(filters);
      console.log('📊 [DisputeList] Loaded disputes:', {
        count: data.disputes?.length || 0,
        stats: data.stats,
        disputes: data.disputes?.map(d => ({
          disputeId: d.disputeId || d.id,
          status: d.status,
          priority: d.priority,
          reason: d.reason?.substring(0, 30),
        })),
      });
      setDisputes(data.disputes || []);
      // Always update stats, even if empty, to ensure UI reflects current state
      if (data.stats) {
        console.log('📈 [DisputeList] Setting stats:', data.stats);
        setStats(data.stats);
      } else {
        // If no stats returned, calculate from disputes
        const calculatedStats: DisputeStats = {
          pending: (data.disputes || []).filter(d => d.status === 'open' || d.status === 'pending' || d.status === 'in_progress').length,
          resolvedToday: (data.disputes || []).filter(d => {
            if (d.status !== 'resolved' || !d.resolvedAt) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const resolvedDate = new Date(d.resolvedAt);
            return resolvedDate >= today;
          }).length,
          escalated: (data.disputes || []).filter(d => d.status === 'escalated' || d.priority === 'high').length,
          total: (data.disputes || []).length,
        };
        console.log('📈 [DisputeList] Calculated stats:', calculatedStats);
        setStats(calculatedStats);
      }
    } catch (error: any) {
      console.error('❌ [DisputeList] Error loading disputes:', error);
      console.error('❌ [DisputeList] Error details:', {
        message: error.message,
        stack: error.stack,
      });
      // On error, reset to empty state
      setDisputes([]);
      setStats({ pending: 0, resolvedToday: 0, escalated: 0, total: 0 });
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
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return colors.text.secondary;
    }
  };

  const getStatusColor = (status: DisputeStatus) => {
    switch (status) {
      case 'open': return '#F59E0B';
      case 'resolved': return '#10B981';
      case 'in_progress': return colors.primary;
      case 'closed': return colors.text.secondary;
      default: return colors.text.secondary;
    }
  };

  const renderDisputeItem = ({ item, index }: { item: Dispute; index: number }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{
          translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        }],
      }}
    >
      <TouchableOpacity
        style={styles.disputeCard}
        onPress={() => {
          try {
            const id = item.disputeId || item.id;
            console.log('🔍 [DisputeList] Navigating to DisputeDetail with ID:', id);
            console.log('🔍 [DisputeList] Navigation object:', {
              canGoBack: navigation.canGoBack(),
              navigate: typeof navigation.navigate,
            });
            if (id) {
              const navResult = (navigation as any).navigate('DisputeDetail', { disputeId: id });
              console.log('✅ [DisputeList] Navigation called, result:', navResult);
            } else {
              Alert.alert('Error', 'Dispute ID is missing. Please try again.');
            }
          } catch (navError: any) {
            console.error('❌ [DisputeList] Navigation error:', navError);
            Alert.alert('Navigation Error', `Failed to navigate: ${navError?.message || 'Unknown error'}`);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.disputeHeader}>
          <View style={styles.disputeIdContainer}>
            <View style={styles.disputeIdRow}>
              <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.primary} />
              <Text style={styles.disputeId}>
                {item.disputeId || `DSP${(item.id || '').substring(0, 6).toUpperCase()}`}
              </Text>
            </View>
            <View style={styles.bookingIdRow}>
              <MaterialCommunityIcons name="package-variant" size={14} color={colors.text.secondary} />
              <Text style={styles.bookingId}>
                {(() => {
                  // Priority 1: Use readableId from booking object if available
                  if (item.booking) {
                    // ONLY use readableId from database - no fallback generation
                    const readableId = item.booking.readableId || 
                                       item.booking.displayId || 
                                       item.booking.userFriendlyId || 
                                       item.booking.customerReadableId || 
                                       item.booking.shipperReadableId;
                    if (readableId) return readableId;
                    // If no readableId, show raw bookingId from booking object
                    return item.booking.id || item.booking.bookingId || item.bookingId || 'N/A';
                  }
                  // Priority 2: If no booking object, just show bookingId (don't generate fallback)
                  return item.bookingId || 'N/A';
                })()}
              </Text>
            </View>
          </View>
          <View style={styles.badgeContainer}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '15', borderColor: getPriorityColor(item.priority) + '40' }]}>
              <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
              <Text style={[styles.badgeText, { color: getPriorityColor(item.priority) }]}>
                {item.priority}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15', borderColor: getStatusColor(item.status) + '40' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.disputeBody}>
          {item.openedBy && typeof item.openedBy === 'object' && (
            <View style={styles.partyRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="account-circle" size={18} color={colors.primary} />
              </View>
              <View style={styles.partyInfo}>
                <Text style={styles.partyLabel}>Customer</Text>
                <Text style={styles.partyValue}>{item.openedBy.name || item.openedBy.displayName || 'N/A'}</Text>
                {item.openedBy.phone && <Text style={styles.partyPhone}>{item.openedBy.phone}</Text>}
              </View>
            </View>
          )}

          {item.transporter && (
            <View style={styles.partyRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons 
                  name={item.transporterType === 'driver' ? "account-circle" : "truck-delivery"} 
                  size={18} 
                  color={colors.secondary} 
                />
              </View>
              <View style={styles.partyInfo}>
                <Text style={styles.partyLabel}>
                  {item.transporterType === 'driver' ? 'Driver' : 'Transporter'}
                </Text>
                <Text style={styles.partyValue}>
                  {item.transporter.name || item.transporter.companyName || item.transporter.displayName || 'N/A'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.issueRow}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={colors.warning} />
            <Text style={styles.issueText} numberOfLines={2}>{item.reason}</Text>
          </View>

          <View style={styles.dateRow}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.text.light} />
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.disputeActions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => {
          try {
            const id = item.disputeId || item.id;
            console.log('🔍 [DisputeList] Navigating to DisputeDetail with ID:', id);
            console.log('🔍 [DisputeList] Navigation object:', {
              canGoBack: navigation.canGoBack(),
              navigate: typeof navigation.navigate,
            });
            if (id) {
              const navResult = (navigation as any).navigate('DisputeDetail', { disputeId: id });
              console.log('✅ [DisputeList] Navigation called, result:', navResult);
            } else {
              Alert.alert('Error', 'Dispute ID is missing. Please try again.');
            }
          } catch (navError: any) {
            console.error('❌ [DisputeList] Navigation error:', navError);
            Alert.alert('Navigation Error', `Failed to navigate: ${navError?.message || 'Unknown error'}`);
          }
        }}
          >
            <MaterialCommunityIcons name="eye" size={16} color={colors.primary} />
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
          {item.status === 'open' && (
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={() => {
              try {
                const id = item.disputeId || item.id;
                console.log('🔍 [DisputeList] Navigating to DisputeDetail (resolve) with ID:', id);
                if (id) {
                  const navResult = (navigation as any).navigate('DisputeDetail', { disputeId: id, action: 'resolve' });
                  console.log('✅ [DisputeList] Navigation called (resolve), result:', navResult);
                } else {
                  Alert.alert('Error', 'Dispute ID is missing. Please try again.');
                }
              } catch (navError: any) {
                console.error('❌ [DisputeList] Navigation error (resolve):', navError);
                Alert.alert('Navigation Error', `Failed to navigate: ${navError?.message || 'Unknown error'}`);
              }
            }}
            >
              <MaterialCommunityIcons name="check-circle" size={16} color={colors.white} />
              <Text style={styles.resolveButtonText}>Resolve</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark || colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>Dispute Resolution</Text>
            <Text style={styles.headerSubtitle}>Manage and track disputes</Text>
          </View>
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterButton}>
            <MaterialCommunityIcons name="filter-variant" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Summary Cards with Gradient */}
        <View style={styles.summaryContainer}>
          <TouchableOpacity style={styles.summaryCard} activeOpacity={0.8}>
            <LinearGradient
              colors={['#F59E0B', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryGradient}
            >
              <MaterialCommunityIcons name="clock-alert-outline" size={32} color={colors.white} />
              <Text style={styles.summaryNumber}>{stats.pending}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.summaryCard} activeOpacity={0.8}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryGradient}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={32} color={colors.white} />
              <Text style={styles.summaryNumber}>{stats.resolvedToday}</Text>
              <Text style={styles.summaryLabel}>Resolved</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.summaryCard} activeOpacity={0.8}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryGradient}
            >
              <MaterialCommunityIcons name="alert-circle-outline" size={32} color={colors.white} />
              <Text style={styles.summaryNumber}>{stats.escalated}</Text>
              <Text style={styles.summaryLabel}>Escalated</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>Filter Disputes</Text>
            
            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterChips}>
                {(['open', 'resolved', 'in_progress', 'closed'] as DisputeStatus[]).map((status) => {
                  const isSelected = filters.status?.includes(status);
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterChip,
                        isSelected && styles.filterChipSelected,
                        { borderColor: isSelected ? getStatusColor(status) : colors.border }
                      ]}
                      onPress={() => {
                        const currentStatuses = filters.status || [];
                        const newStatuses = isSelected
                          ? currentStatuses.filter(s => s !== status)
                          : [...currentStatuses, status];
                        setFilters({ ...filters, status: newStatuses.length > 0 ? newStatuses : undefined });
                      }}
                    >
                      <Text style={[styles.filterChipText, isSelected && { color: getStatusColor(status) }]}>
                        {status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Priority Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Priority</Text>
              <View style={styles.filterChips}>
                {(['low', 'medium', 'high'] as DisputePriority[]).map((priority) => {
                  const isSelected = filters.priority?.includes(priority);
                  return (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.filterChip,
                        isSelected && styles.filterChipSelected,
                        { borderColor: isSelected ? getPriorityColor(priority) : colors.border }
                      ]}
                      onPress={() => {
                        const currentPriorities = filters.priority || [];
                        const newPriorities = isSelected
                          ? currentPriorities.filter(p => p !== priority)
                          : [...currentPriorities, priority];
                        setFilters({ ...filters, priority: newPriorities.length > 0 ? newPriorities : undefined });
                      }}
                    >
                      <Text style={[styles.filterChipText, isSelected && { color: getPriorityColor(priority) }]}>
                        {priority.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Search Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Search</Text>
              <View style={styles.searchContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.text.secondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by dispute ID, booking ID, or reason..."
                  placeholderTextColor={colors.text.light}
                  value={filters.search || ''}
                  onChangeText={(text) => setFilters({ ...filters, search: text || undefined })}
                />
                {filters.search && (
                  <TouchableOpacity onPress={() => setFilters({ ...filters, search: undefined })}>
                    <MaterialCommunityIcons name="close-circle" size={20} color={colors.text.secondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Clear Filters Button */}
            {(filters.status || filters.priority || filters.search) && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => setFilters({})}
              >
                <MaterialCommunityIcons name="filter-remove" size={18} color={colors.white} />
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Disputes List */}
        <View style={styles.disputesSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="format-list-bulleted" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Recent Disputes</Text>
            <Text style={styles.sectionCount}>({disputes.length})</Text>
          </View>
          
          {loading && disputes.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading disputes...</Text>
            </View>
          ) : disputes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={[colors.background, colors.white]}
                style={styles.emptyGradient}
              >
                <MaterialCommunityIcons name="check-circle-outline" size={80} color={colors.success} />
                <Text style={styles.emptyText}>No disputes found</Text>
                <Text style={styles.emptySubtext}>All disputes have been resolved</Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => navigation.navigate('CreateDispute' as never)}
                >
                  <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
                  <Text style={styles.createButtonText}>Create New Dispute</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : (
            <FlatList
              data={disputes}
              renderItem={renderDisputeItem}
              keyExtractor={(item) => item.disputeId || item.id || `dispute_${item.bookingId}`}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Create Dispute FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateDispute' as never)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark || colors.primary]}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="plus" size={28} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  filterButton: {
    padding: spacing.xs,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryGradient: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  summaryNumber: {
    fontSize: 36,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginTop: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  summaryLabel: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filtersContainer: {
    backgroundColor: colors.white,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersTitle: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  filterSection: {
    marginBottom: spacing.md,
  },
  filterLabel: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: colors.background,
  },
  filterChipSelected: {
    backgroundColor: colors.background,
  },
  filterChipText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  clearFiltersText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  disputesSection: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  sectionCount: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginLeft: 'auto',
  },
  disputeCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  disputeIdContainer: {
    flex: 1,
  },
  disputeIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  disputeId: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  bookingIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  bookingId: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs / 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs / 2,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  partyInfo: {
    flex: 1,
  },
  partyLabel: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    fontFamily: fonts.family.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  partyValue: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
  },
  partyPhone: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 8,
  },
  issueText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    flex: 1,
    fontFamily: fonts.family.regular,
    lineHeight: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs / 2,
  },
  dateText: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
    fontFamily: fonts.family.regular,
  },
  disputeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs / 2,
  },
  viewButtonText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.primary,
  },
  resolveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.success,
    gap: spacing.xs / 2,
  },
  resolveButtonText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.white,
  },
  loadingContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
  },
  emptyContainer: {
    marginTop: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyGradient: {
    padding: spacing.xl * 2,
    alignItems: 'center',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  createButtonText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md + 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DisputeListScreen;
