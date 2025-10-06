import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { PLACEHOLDER_IMAGES } from '../constants/images';
import { apiRequest } from '../utils/api';
import { getAuth } from 'firebase/auth';
import LocationDisplay from '../components/common/LocationDisplay';
import { getLocationNameSync } from '../utils/locationUtils';
import { calculateRoadDistanceWithFallback } from '../utils/distanceUtils';
import { getDisplayBookingId, getBookingTypeAndMode } from '../utils/unifiedIdSystem';

interface RequestItem {
  id: string;
  type: 'instant' | 'booking';
  status: string;
  fromLocation: string | { latitude: number; longitude: number; address?: string };
  toLocation: string | { latitude: number; longitude: number; address?: string };
  productType: string;
  weight: string;
  cargoDetails: string;
  vehicleType: string;
  estimatedCost: string | number;
  distance: string;
  estimatedDuration: string;
  specialRequirements: string[];
  needsRefrigeration: boolean;
  isPerishable: boolean;
  isInsured: boolean;
  priority: boolean;
  urgencyLevel: string;
  createdAt: string;
  transporter: {
    name: string;
    phone: string;
    profilePhoto?: string;
    photo?: string;
    rating?: number;
    experience?: string;
    availability?: string;
    tripsCompleted?: number;
    status?: string;
  } | null;
  vehicle: {
    make: string;
    model: string;
    year: string;
    type: string;
    registration: string;
    color: string;
    capacity: string;
  } | null;
}

type NavigationProp = {
  navigate: (screen: string, params?: any) => void;
};

// No mock data - will fetch from API

const ActivityScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, instant, booking
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch bookings for the current user
      const response = await apiRequest(`/bookings/shipper/${user.uid}`);

      if (response.bookings && Array.isArray(response.bookings)) {
        
        // Transform backend booking data to frontend format
        const transformedBookings = await Promise.all(response.bookings.map(async (booking: any) => {
          console.log('Processing booking:', booking.id || booking.bookingId, 'Cost data:', {
            cost: booking.cost,
            estimatedCost: booking.estimatedCost,
            costBreakdown: booking.costBreakdown
          });
          console.log('Distance data:', {
            actualDistance: booking.actualDistance,
            fromLocation: booking.fromLocation,
            toLocation: booking.toLocation
          });
          console.log('Transporter data:', {
            transporterId: booking.transporterId,
            transporterName: booking.transporterName,
            transporterPhone: booking.transporterPhone,
            transporterPhoto: booking.transporterPhoto,
            transporterRating: booking.transporterRating,
            transporter: booking.transporter,
            driverName: booking.driverName,
            driverPhone: booking.driverPhone
          });
          console.log('Vehicle data:', {
            vehicleId: booking.vehicleId,
            vehicleMake: booking.vehicleMake,
            vehicleModel: booking.vehicleModel,
            vehicleType: booking.vehicleType,
            vehicleRegistration: booking.vehicleRegistration,
            vehicle: booking.vehicle
          });
          
          // Calculate distance if not provided by backend
          let calculatedDistance = booking.actualDistance;
          let calculatedDistanceFormatted = calculatedDistance ? `${calculatedDistance} km` : 'Calculating...';
          
          if (!calculatedDistance && booking.fromLocation && booking.toLocation) {
            try {
              const fromLoc = typeof booking.fromLocation === 'string' 
                ? JSON.parse(booking.fromLocation) 
                : booking.fromLocation;
              const toLoc = typeof booking.toLocation === 'string' 
                ? JSON.parse(booking.toLocation) 
                : booking.toLocation;
              
              if (fromLoc.latitude && fromLoc.longitude && toLoc.latitude && toLoc.longitude) {
                // Use accurate road distance calculation (same as RequestForm)
                const distanceResult = await calculateRoadDistanceWithFallback(fromLoc, toLoc);
                if (distanceResult.success) {
                  calculatedDistance = distanceResult.distanceKm;
                  calculatedDistanceFormatted = distanceResult.distance;
                  console.log('Calculated accurate road distance:', calculatedDistance, 'km');
                } else {
                  console.log('Error calculating road distance:', distanceResult.error);
                }
              }
            } catch (error) {
              console.log('Error calculating distance:', error);
            }
          }
          
          // Calculate total cost from costBreakdown if available
          let totalCost = booking.cost || booking.estimatedCost;
          if (booking.costBreakdown && typeof booking.costBreakdown === 'object') {
            const breakdown = booking.costBreakdown;
            totalCost = breakdown.baseFare + breakdown.distanceCost + breakdown.weightCost + 
                       breakdown.urgencySurcharge + breakdown.perishableSurcharge + 
                       breakdown.refrigerationSurcharge + breakdown.humiditySurcharge + 
                       breakdown.insuranceFee + breakdown.priorityFee + breakdown.waitTimeFee + 
                       breakdown.tollFee + breakdown.nightSurcharge + breakdown.fuelSurcharge;
          }
          
          // Process location data consistently
          const fromLocation = booking.fromLocation || booking.from;
          const toLocation = booking.toLocation || booking.to;
          
          
          const transformedBooking = {
            id: booking.bookingId || booking.id || `booking_${Date.now()}`,
            type: booking.bookingMode === 'instant' ? 'instant' : 'booking',
            status: booking.status || 'pending',
            fromLocation: fromLocation,
            toLocation: toLocation,
            productType: booking.productType || booking.cargoDetails || 'Unknown',
            weight: booking.weightKg ? `${booking.weightKg}kg` : (booking.weight ? `${booking.weight}kg` : 'Unknown'),
            cargoDetails: booking.cargoDetails || booking.productType || 'Unknown',
            vehicleType: booking.vehicleType || 'Any',
            estimatedCost: totalCost || 'TBD',
            distance: calculatedDistanceFormatted,
            estimatedDuration: booking.estimatedDuration || 'TBD',
            specialRequirements: booking.specialCargo || [],
            needsRefrigeration: booking.needsRefrigeration || false,
            isPerishable: booking.perishable || false,
            isInsured: booking.insured || false,
            priority: booking.priority || false,
            urgencyLevel: booking.urgencyLevel || 'normal',
            createdAt: booking.createdAt || new Date().toISOString(),
            transporter: (booking.transporterId || booking.transporterName || booking.transporter?.name || booking.driverName) ? {
              name: booking.transporterName || booking.transporter?.name || booking.driverName || 'Unknown Transporter',
              phone: booking.transporterPhone || booking.transporter?.phone || booking.driverPhone || 'N/A',
              profilePhoto: booking.transporterPhoto || booking.transporter?.photo || booking.driverPhoto,
              photo: booking.transporterPhoto || booking.transporter?.photo || booking.driverPhoto,
              rating: booking.transporterRating || booking.transporter?.rating || 0,
              experience: booking.transporterExperience || booking.transporter?.experience || 'N/A',
              availability: booking.transporterAvailability || booking.transporter?.availability || 'N/A',
              tripsCompleted: booking.transporterTripsCompleted || booking.transporter?.tripsCompleted || 0,
              status: booking.transporterStatus || booking.transporter?.status || 'unknown'
            } : null,
            vehicle: (booking.vehicleId || booking.vehicleMake || booking.vehicleRegistration || booking.vehicle?.make || booking.vehicle?.registration || booking.transporter?.assignedVehicle?.vehicleMake || booking.transporter?.vehicleMake) ? {
              make: booking.vehicleMake || booking.vehicle?.make || booking.transporter?.assignedVehicle?.vehicleMake || booking.transporter?.vehicleMake || 'Unknown',
              model: booking.vehicleModel || booking.vehicle?.model || booking.transporter?.assignedVehicle?.vehicleModel || booking.transporter?.vehicleModel || '',
              year: booking.vehicleYear || booking.vehicle?.year || booking.transporter?.assignedVehicle?.vehicleYear || booking.transporter?.vehicleYear || 'N/A',
              type: booking.vehicleType || booking.vehicle?.type || booking.transporter?.assignedVehicle?.vehicleType || booking.transporter?.vehicleType || 'N/A',
              registration: booking.vehicleRegistration || booking.vehicle?.registration || booking.transporter?.assignedVehicle?.vehicleRegistration || booking.transporter?.vehicleRegistration || 'N/A',
              color: booking.vehicleColor || booking.vehicle?.color || booking.transporter?.assignedVehicle?.vehicleColor || booking.transporter?.vehicleColor || 'N/A',
              capacity: booking.vehicleCapacity || booking.vehicle?.capacity || booking.transporter?.assignedVehicle?.vehicleCapacity || booking.transporter?.vehicleCapacity || 'N/A'
            } : null
          };
          
          // Debug the final transformed data
          console.log('Final transformed booking:', {
            id: transformedBooking.id,
            transporter: transformedBooking.transporter,
            vehicle: transformedBooking.vehicle
          });
          
          return transformedBooking;
        }));

        setRequests(transformedBookings);
      } else {
        setRequests([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const getFilteredRequests = () => {
    if (activeTab === 'all') return requests;
    return requests.filter(req => req.type === activeTab);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'accepted': return colors.primary;
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
      case 'accepted': return 'check-circle';
      case 'confirmed': return 'check-circle-outline';
      case 'in_transit': return 'truck-delivery';
      case 'delivered': return 'check-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle-outline';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    const urgencyLower = urgency?.toLowerCase();
    switch (urgencyLower) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text.secondary;
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    const urgencyLower = urgency?.toLowerCase();
    switch (urgencyLower) {
      case 'high': return 'alert-circle';
      case 'medium': return 'clock';
      case 'low': return 'check-circle';
      default: return 'circle';
    }
  };

  const handleTrackRequest = (request: RequestItem) => {
    if (request.type === 'instant') {
      navigation.navigate('TripDetailsScreen', {
        booking: request,
        isInstant: true
      });
    } else {
      navigation.navigate('TrackingScreen', {
        booking: request,
        isConsolidated: false
      });
    }
  };

  const handleViewMap = (request: RequestItem) => {
    navigation.navigate('MapViewScreen', {
      booking: request,
      isConsolidated: false
    });
  };

  const renderRequestItem = ({ item }: { item: RequestItem }) => (
    <TouchableOpacity style={styles.requestCard} onPress={() => handleTrackRequest(item)}>
      {/* Header with ID and Status */}
      <View style={styles.requestHeader}>
        <View style={styles.requestId}>
          <Text style={styles.requestIdText}>#{getDisplayBookingId(item)}</Text>
          <View style={[styles.typeBadge, { backgroundColor: item.type === 'instant' ? colors.warning + '15' : colors.primary + '15' }]}>
            <MaterialCommunityIcons 
              name={item.type === 'instant' ? 'lightning-bolt' : 'calendar-clock'} 
              size={12} 
              color={item.type === 'instant' ? colors.warning : colors.primary} 
            />
            <Text style={[styles.typeText, { color: item.type === 'instant' ? colors.warning : colors.primary }]}>
              {item.type.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15', borderColor: getStatusColor(item.status) + '30' }]}>
          <MaterialCommunityIcons
            name={getStatusIcon(item.status)}
            size={14}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Route Information */}
      <View style={styles.routeSection}>
        <View style={styles.routeHeader}>
          <MaterialCommunityIcons name="map-marker-path" size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>Route</Text>
        </View>
        <View style={styles.routeContainer}>
          <View style={styles.locationItem}>
            <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
            <LocationDisplay 
              location={item.fromLocation || 'Unknown location'} 
              style={styles.locationText}
              showIcon={false}
              numberOfLines={1}
            />
          </View>
          <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.light} style={styles.routeArrow} />
          <View style={styles.locationItem}>
            <MaterialCommunityIcons name="flag-checkered" size={16} color={colors.secondary} />
            <LocationDisplay 
              location={item.toLocation || 'Unknown location'} 
              style={styles.locationText}
              showIcon={false}
              numberOfLines={1}
            />
          </View>
        </View>
      </View>

      {/* Cargo Details */}
      <View style={styles.cargoSection}>
        <View style={styles.cargoHeader}>
          <MaterialCommunityIcons name="package-variant" size={18} color={colors.secondary} />
          <Text style={styles.sectionTitle}>Cargo Details</Text>
        </View>
        <View style={styles.cargoGrid}>
          <View style={styles.cargoItem}>
            <MaterialCommunityIcons name="package" size={20} color={colors.primary} />
            <Text style={styles.cargoLabel}>Product</Text>
            <Text style={styles.cargoValue}>{item.cargoDetails}</Text>
          </View>
          <View style={styles.cargoItem}>
            <MaterialCommunityIcons name="weight-kilogram" size={20} color={colors.primary} />
            <Text style={styles.cargoLabel}>Weight</Text>
            <Text style={styles.cargoValue}>{item.weight}</Text>
          </View>
          <View style={styles.cargoItem}>
            <MaterialCommunityIcons name="truck" size={20} color={colors.primary} />
            <Text style={styles.cargoLabel}>Vehicle</Text>
            <Text style={styles.cargoValue}>{item.vehicleType}</Text>
          </View>
          <View style={styles.cargoItem}>
            <MaterialCommunityIcons name="currency-usd" size={20} color={colors.primary} />
            <Text style={styles.cargoLabel}>Cost</Text>
            <Text style={styles.cargoValue}>
              {item.estimatedCost === 'TBD' || item.estimatedCost === 'Unknown' ? 'TBD' : 
               `KSh ${typeof item.estimatedCost === 'number' ? item.estimatedCost.toLocaleString() : item.estimatedCost}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Special Requirements */}
      {(item.needsRefrigeration || item.isPerishable || item.isInsured || item.priority || item.specialRequirements.length > 0) && (
        <View style={styles.requirementsSection}>
          <View style={styles.requirementsHeader}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={colors.warning} />
            <Text style={styles.sectionTitle}>Special Requirements</Text>
          </View>
          <View style={styles.requirementsList}>
            {item.needsRefrigeration && (
              <View style={styles.requirementTag}>
                <MaterialCommunityIcons name="snowflake" size={14} color={colors.primary} />
                <Text style={styles.requirementText}>Refrigeration</Text>
              </View>
            )}
            {item.isPerishable && (
              <View style={styles.requirementTag}>
                <MaterialCommunityIcons name="clock-fast" size={14} color={colors.warning} />
                <Text style={styles.requirementText}>Perishable</Text>
              </View>
            )}
            {item.isInsured && (
              <View style={styles.requirementTag}>
                <MaterialCommunityIcons name="shield-check" size={14} color={colors.success} />
                <Text style={styles.requirementText}>Insured</Text>
              </View>
            )}
            {item.priority && (
              <View style={styles.requirementTag}>
                <MaterialCommunityIcons name="star" size={14} color={colors.tertiary} />
                <Text style={styles.requirementText}>Priority</Text>
              </View>
            )}
            {item.urgencyLevel && item.urgencyLevel !== 'normal' && (
              <View style={[styles.requirementTag, { backgroundColor: getUrgencyColor(item.urgencyLevel) + '20' }]}>
                <MaterialCommunityIcons name={getUrgencyIcon(item.urgencyLevel)} size={14} color={getUrgencyColor(item.urgencyLevel)} />
                <Text style={[styles.requirementText, { color: getUrgencyColor(item.urgencyLevel) }]}>
                  {item.urgencyLevel.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Trip Details */}
      <View style={styles.tripDetailsSection}>
        <View style={styles.tripDetailsGrid}>
          <View style={styles.tripDetailItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.text.secondary} />
            <Text style={styles.tripDetailLabel}>Distance</Text>
            <Text style={styles.tripDetailValue}>{item.distance}</Text>
          </View>
          <View style={styles.tripDetailItem}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.tripDetailLabel}>Duration</Text>
            <Text style={styles.tripDetailValue}>{item.estimatedDuration}</Text>
          </View>
          <View style={styles.tripDetailItem}>
            <MaterialCommunityIcons name="calendar" size={16} color={colors.text.secondary} />
            <Text style={styles.tripDetailLabel}>Created</Text>
            <Text style={styles.tripDetailValue}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>

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
              {item.transporter?.phone && item.transporter.phone !== 'N/A' && (
                <Text style={styles.transporterPhoneText}>
                  📞 {item.transporter.phone}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {item.vehicle && (
        <View style={styles.vehicleInfo}>
          <View style={styles.vehicleHeader}>
            <MaterialCommunityIcons name="truck" size={20} color={colors.primary} />
            <Text style={styles.vehicleLabel}>Vehicle Details</Text>
          </View>
          <View style={styles.vehicleDetails}>
            <View style={styles.vehicleRow}>
              <Text style={styles.vehicleDetailLabel}>Vehicle:</Text>
              <Text style={styles.vehicleDetailValue}>
                {item.vehicle.make} {item.vehicle.model} ({item.vehicle.year})
              </Text>
            </View>
            <View style={styles.vehicleRow}>
              <Text style={styles.vehicleDetailLabel}>Registration:</Text>
              <Text style={styles.vehicleDetailValue}>{item.vehicle.registration}</Text>
            </View>
            <View style={styles.vehicleRow}>
              <Text style={styles.vehicleDetailLabel}>Type:</Text>
              <Text style={styles.vehicleDetailValue}>{item.vehicle.type}</Text>
            </View>
            <View style={styles.vehicleRow}>
              <Text style={styles.vehicleDetailLabel}>Capacity:</Text>
              <Text style={styles.vehicleDetailValue}>{item.vehicle.capacity}</Text>
            </View>
            <View style={styles.vehicleRow}>
              <Text style={styles.vehicleDetailLabel}>Color:</Text>
              <Text style={styles.vehicleDetailValue}>{item.vehicle.color}</Text>
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
            onPress={() => Alert.alert('Contact', `Call ${item.transporter?.name} at ${item.transporter?.phone}`)}
          >
            <MaterialCommunityIcons name="phone" size={18} color={colors.secondary} />
            <Text style={styles.contactButtonText}>Contact</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Shipments</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your shipments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Shipments</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Shipments</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRequests}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Shipments</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.refreshButton} onPress={loadRequests}>
            <MaterialCommunityIcons name="refresh" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => navigation.navigate('ServiceRequest')}
          >
            <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="truck-delivery" size={64} color={colors.text.light} />
            <Text style={styles.emptyTitle}>No shipments found</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'all'
                ? 'Create your first shipment request to get started'
                : `No ${activeTab} shipments available`
              }
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('ServiceRequest')}
            >
              <Text style={styles.createButtonText}>Create Shipment Request</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: 80, // Add bottom padding to account for tab bar
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  headerTitle: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshButton: {
    padding: spacing.sm,
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.white,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: spacing.lg,
    paddingBottom: 100, // Extra bottom padding for tab bar clearance
    flexGrow: 1,
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  activityTitle: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    maxWidth: '45%',
    flexShrink: 1,
  },
  statusText: {
    fontSize: fonts.size.xs,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  activityDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestamp: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
  },
  amount: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  reference: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: fonts.size.md,
    color: colors.text.light,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    marginHorizontal: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.text.light + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '10',
    flexWrap: 'wrap',
  },
  requestId: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestIdText: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
  },


  requestDetails: {
    marginBottom: spacing.md,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  routeText: {
    marginLeft: spacing.sm,
  },
  routeLabel: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  routeValue: {
    fontSize: fonts.size.md,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 22,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeArrow: {
    marginHorizontal: spacing.xs,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  productText: {
    marginLeft: spacing.sm,
  },
  productLabel: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  productValue: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  weightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  weightText: {
    marginLeft: spacing.sm,
  },
  weightLabel: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  weightValue: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  consolidatedDetails: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  consolidatedTitle: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  consolidatedItem: {
    marginBottom: spacing.xs,
  },
  consolidatedItemText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  transporterInfo: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  transporterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  transporterLabel: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  transporterDetails: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  transporterProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
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
  },
  transporterRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  ratingText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: '600',
  },
  tripsText: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  transporterMeta: {
    marginTop: spacing.xs,
  },
  transporterMetaText: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
  },
  transporterPhoneText: {
    fontSize: fonts.size.xs,
    color: colors.primary,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  vehicleInfo: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  vehicleLabel: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  vehicleDetails: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  vehicleDetailLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  vehicleDetailValue: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  requestMeta: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  requestDate: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
    marginBottom: spacing.xs,
  },
  requestType: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    flex: 1,
    minHeight: 48,
  },
  trackButton: {
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  trackButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  mapButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    marginHorizontal: spacing.sm,
  },
  mapButtonText: {
    color: colors.primary,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  contactButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.secondary,
    marginLeft: spacing.sm,
  },
  contactButtonText: {
    color: colors.secondary,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fonts.size.md,
    color: colors.text.light,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  createButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '600',
  },
  // New improved card styles
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    marginLeft: spacing.sm,
    borderWidth: 1,
  },
  typeText: {
    fontSize: fonts.size.xs,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  routeSection: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    marginLeft: spacing.sm,
    flex: 1,
    flexShrink: 1,
  },
  cargoSection: {
    marginBottom: spacing.sm,
  },
  cargoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cargoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cargoItem: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.text.light + '20',
  },
  cargoLabel: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  cargoValue: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  requirementsSection: {
    marginBottom: spacing.sm,
  },
  requirementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  requirementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  requirementTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.text.light + '30',
  },
  requirementText: {
    fontSize: fonts.size.xs,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  tripDetailsSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tripDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripDetailItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  tripDetailLabel: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  tripDetailValue: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default ActivityScreen;
