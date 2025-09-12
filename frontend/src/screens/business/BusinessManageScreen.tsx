import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import { PLACEHOLDER_IMAGES } from '../../constants/images';
import { apiRequest } from '../../utils/api';

// Real API integration - no mock data

interface RequestItem {
  id: string;
  type: 'instant' | 'booking';
  status: string;
  fromLocation: string;
  toLocation: string;
  pickupLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  toLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  productType: string;
  weight: string;
  createdAt: string;
  transporter: {
    name: string;
    phone: string;
    profilePhoto?: string;
    photo?: string;
    rating?: number;
    experience?: string;
    languages?: string[];
    availability?: string;
    tripsCompleted?: number;
    status?: string;
  } | null;
  isConsolidated: boolean;
  consolidatedRequests?: {
    id: string;
    fromLocation: string;
    toLocation: string;
    productType: string;
    weight: string;
  }[];
}

const BusinessManageScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('all'); // all, instant, booking
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // TODO: Replace with correct business API endpoint when backend is ready
      // const data = await apiRequest('/business/requests');
      // setRequests(data.requests || []);
      
      // For now, return empty array - no mock data
      setRequests([]);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRequests = () => {
    if (activeTab === 'all') return requests;
    return requests.filter(req => req.type === activeTab);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'confirmed': return colors.primary;
      case 'in_transit': return colors.secondary;
      case 'delivered': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'confirmed': return 'check-circle-outline';
      case 'in_transit': return 'truck-delivery';
      case 'delivered': return 'check-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle-outline';
    }
  };

  const handleTrackRequest = (request: RequestItem) => {
    if (request.isConsolidated) {
      navigation.navigate('TrackingScreen', {
        booking: request,
        isConsolidated: true,
        consolidatedRequests: request.consolidatedRequests
      });
    } else {
      if (request.type === 'instant') {
        navigation.navigate('TripDetailsScreen', {
          booking: {
            ...request,
            pickupLocation: request.pickupLocation,
            toLocation: request.toLocation
          },
          isInstant: true,
          userType: 'business'
        });
      } else {
        navigation.navigate('TrackingScreen', {
          booking: request,
          isConsolidated: false
        });
      }
    }
  };

  const handleViewMap = (request: RequestItem) => {
    navigation.navigate('MapViewScreen', {
      booking: request,
      isConsolidated: request.isConsolidated
    });
  };

  const renderRequestItem = ({ item }: { item: RequestItem }) => (
    <Card style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.requestId}>
          <Text style={styles.requestIdText}>#{item.id}</Text>
          {item.isConsolidated && (
            <View style={styles.consolidatedBadge}>
              <MaterialCommunityIcons name="layers" size={12} color={colors.white} />
              <Text style={styles.consolidatedText}>Consolidated</Text>
            </View>
          )}
        </View>
        <View style={styles.statusBadge}>
          <MaterialCommunityIcons
            name={getStatusIcon(item.status)}
            size={16}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.requestDetails}>
        <View style={styles.routeInfo}>
          <MaterialCommunityIcons name="map-marker-path" size={20} color={colors.primary} />
          <View style={styles.routeText}>
            <Text style={styles.routeLabel}>Route</Text>
            <Text style={styles.routeValue}>
              {item.isConsolidated ? 'Multiple Locations' : `${item.fromLocation} → ${item.toLocation}`}
            </Text>
          </View>
        </View>

        <View style={styles.productInfo}>
          <MaterialCommunityIcons name="package-variant" size={20} color={colors.secondary} />
          <View style={styles.productText}>
            <Text style={styles.productLabel}>Product</Text>
            <Text style={styles.productValue}>
              {item.isConsolidated ? 'Mixed Products' : item.productType}
            </Text>
          </View>
        </View>

        <View style={styles.weightInfo}>
          <MaterialCommunityIcons name="weight-kilogram" size={20} color={colors.tertiary} />
          <View style={styles.weightText}>
            <Text style={styles.weightLabel}>Weight</Text>
            <Text style={styles.weightValue}>{item.weight}</Text>
          </View>
        </View>

        {item.isConsolidated && item.consolidatedRequests && (
          <View style={styles.consolidatedDetails}>
            <Text style={styles.consolidatedTitle}>Consolidated Requests:</Text>
            {item.consolidatedRequests.map((req, index) => (
              <View key={req.id} style={styles.consolidatedItem}>
                <Text style={styles.consolidatedItemText}>
                  • {req.fromLocation} → {req.toLocation} ({req.productType}, {req.weight})
                </Text>
              </View>
            ))}
          </View>
        )}

        {item.transporter && (
          <View style={styles.transporterInfo}>
            <View style={styles.transporterHeader}>
              <MaterialCommunityIcons name="account-tie" size={20} color={colors.success} />
              <Text style={styles.transporterLabel}>Transporter Details</Text>
            </View>
            <View style={styles.transporterDetails}>
              <View style={styles.transporterProfile}>
                <Image
                  source={{ uri: item.transporter?.profilePhoto || item.transporter?.photo || PLACEHOLDER_IMAGES.PROFILE_PHOTO_SMALL }}
                  style={styles.transporterPhoto}
                />
                <View style={styles.transporterBasic}>
                  <Text style={styles.transporterName}>{item.transporter.name}</Text>
                  <View style={styles.transporterRating}>
                    <MaterialCommunityIcons name="star" size={14} color={colors.secondary} style={{ marginRight: 2 }} />
                    <Text style={styles.ratingText}>{item.transporter?.rating || 'N/A'}</Text>
                    <Text style={styles.tripsText}> • {item.transporter?.tripsCompleted || 0} trips</Text>
                  </View>
                </View>
              </View>
              <View style={styles.transporterMeta}>
                <Text style={styles.transporterMetaText}>
                  {item.transporter?.experience || 'N/A'} • {item.transporter?.availability || 'N/A'}
                </Text>
                <Text style={styles.transporterMetaText}>
                  {item.transporter?.languages ? item.transporter.languages.join(', ') : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.requestMeta}>
          <Text style={styles.requestDate}>
            Created: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.requestType}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)} Request
          </Text>
        </View>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.trackButton]}
          onPress={() => handleTrackRequest(item)}
        >
          <MaterialCommunityIcons name="map-marker-radius" size={18} color={colors.white} />
          <Text style={styles.trackButtonText}>Track</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.mapButton]}
          onPress={() => handleViewMap(item)}
        >
          <MaterialCommunityIcons name="map" size={18} color={colors.primary} />
          <Text style={styles.mapButtonText}>Map</Text>
        </TouchableOpacity>

        {item.transporter && (
          <TouchableOpacity
            style={[styles.actionButton, styles.contactButton]}
            onPress={() => Alert.alert('Contact', `Call ${item.transporter.name} at ${item.transporter.phone}`)}
          >
            <MaterialCommunityIcons name="phone" size={18} color={colors.secondary} />
            <Text style={styles.contactButtonText}>Contact</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark, colors.secondary]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Requests</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={fetchRequests} style={styles.refreshButton}>
              <Ionicons name="refresh" size={24} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => navigation.navigate('BusinessRequest')}
            >
              <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.consolidateHeaderButton} 
              onPress={() => navigation.navigate('Consolidation')}
            >
              <FontAwesome5 name="layer-group" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'instant' && styles.activeTab]}
          onPress={() => setActiveTab('instant')}
        >
          <Text style={[styles.tabText, activeTab === 'instant' && styles.activeTabText]}>Instant</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'booking' && styles.activeTab]}
          onPress={() => setActiveTab('booking')}
        >
          <Text style={[styles.tabText, activeTab === 'booking' && styles.activeTabText]}>Bookings</Text>
        </TouchableOpacity>
      </View>


      {/* Requests List */}
      <FlatList
        data={getFilteredRequests()}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="office-building" size={64} color={colors.text.light} />
            <Text style={styles.emptyTitle}>No business requests found</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'all'
                ? 'Create your first business request or consolidate multiple requests to get started'
                : `No ${activeTab} business requests available`
              }
            </Text>
            <View style={styles.emptyActions}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('BusinessRequest')}
              >
                <Text style={styles.createButtonText}>Create Request</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.consolidateButton}
                onPress={() => navigation.navigate('Consolidation')}
              >
                <Text style={styles.consolidateButtonText}>Consolidate Requests</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />

      <LoadingSpinner
        visible={loading}
        message="Loading Requests..."
        size="large"
        type="pulse"
        logo={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  consolidateHeaderButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: -10,
    borderRadius: 12,
    padding: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.white,
  },
  listContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  requestCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  requestId: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestIdText: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.primary,
  },
  consolidatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  consolidatedText: {
    color: colors.white,
    fontSize: fonts.size.xs,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  statusText: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    marginLeft: 4,
  },
  requestDetails: {
    gap: spacing.sm,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  routeLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  routeValue: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  productLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  productValue: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  weightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  weightLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  weightValue: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  consolidatedDetails: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  consolidatedTitle: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  consolidatedItem: {
    marginBottom: 2,
  },
  consolidatedItemText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
  },
  transporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transporterText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  transporterLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  transporterValue: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  transporterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  transporterDetails: {
    flex: 1,
  },
  transporterProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  transporterPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  transporterBasic: {
    flex: 1,
  },
  transporterName: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  transporterRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  tripsText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  transporterMeta: {
    marginTop: spacing.xs,
  },
  transporterMetaText: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  requestMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.text.light + '20',
  },
  requestDate: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  requestType: {
    fontSize: fonts.size.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  requestActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  trackButton: {
    backgroundColor: colors.primary,
  },
  trackButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  mapButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  mapButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  contactButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  contactButtonText: {
    color: colors.secondary,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fonts.size.md,
    color: colors.text.light,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  createButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  consolidateButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  consolidateButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
  },
});

export default BusinessManageScreen;
