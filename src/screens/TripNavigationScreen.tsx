import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import MapView, { Marker, Polyline } from 'react-native-maps';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { API_ENDPOINTS } from '../constants/api';
import LocationDisplay from '../components/common/LocationDisplay';

interface TripNavigationParams {
  jobId: string;
  bookingId: string;
  job: any;
}

interface RouteLoad {
  id: string;
  pickup: string;
  dropoff: string;
  detourKm: number;
  weight: number;
  price: number;
  description?: string;
  urgency: 'high' | 'medium' | 'low';
  specialRequirements: string[];
  clientRating: number;
  estimatedValue: number;
  route: {
    distance: string;
    estimatedTime: string;
  };
  coordinates?: {
    pickup: { lat: number; lng: number };
    dropoff: { lat: number; lng: number };
  };
}

const { width, height } = Dimensions.get('window');

const TripNavigationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as TripNavigationParams;

  const [job, setJob] = useState<any>(params.job);
  const [routeLoads, setRouteLoads] = useState<RouteLoad[]>([]);
  const [selectedLoads, setSelectedLoads] = useState<RouteLoad[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showRouteLoads, setShowRouteLoads] = useState(false);
  const [tripStatus, setTripStatus] = useState<'pickup' | 'delivery' | 'completed'>('pickup');

  useEffect(() => {
    fetchRouteLoads();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    // In a real app, you would use location services here
    // For now, we'll use a default location
    setCurrentLocation({
      latitude: -1.2921,
      longitude: 36.8219, // Nairobi coordinates
    });
  };

  const fetchRouteLoads = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/transporters/route-loads`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRouteLoads(data.routeLoads || []);
      } else {
        // If no route loads available, set empty array instead of throwing error
        setRouteLoads([]);
      }
    } catch (err: any) {
      console.error('Error fetching route loads:', err);
      Alert.alert('Error', err.message || 'Failed to fetch route loads');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRouteLoads();
    setRefreshing(false);
  };

  const handleCall = (phoneNumber: string) => {
    const phoneUrl = `tel:${phoneNumber}`;
    Linking.openURL(phoneUrl).catch(err => {
      console.error('Error opening phone app:', err);
      Alert.alert('Error', 'Unable to open phone app');
    });
  };

  const handleChat = () => {
    (navigation as any).navigate('ChatScreen', { 
      jobId: params.jobId,
      bookingId: params.bookingId,
      clientId: job.client?.id || job.userId,
      clientName: job.client?.name || job.customerName,
      job: job // Pass full job object for proper ID generation
    });
  };

  const toggleLoadSelection = (load: RouteLoad) => {
    setSelectedLoads(prev => 
      prev.find(l => l.id === load.id) 
        ? prev.filter(l => l.id !== load.id)
        : [...prev, load]
    );
  };

  const acceptSelectedLoads = async () => {
    if (selectedLoads.length === 0) {
      Alert.alert('No Loads Selected', 'Please select at least one load to accept.');
      return;
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/accept-route-loads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loadIds: selectedLoads.map(load => load.id) })
      });

      if (response.ok) {
        Alert.alert('Success', 'Loads accepted successfully!');
        setSelectedLoads([]);
        fetchRouteLoads();
      } else {
        throw new Error('Failed to accept loads');
      }
    } catch (err: any) {
      console.error('Error accepting loads:', err);
      Alert.alert('Error', err.message || 'Failed to accept loads');
    }
  };

  const updateTripStatus = async (status: 'pickup' | 'delivery' | 'completed') => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/update/${params.jobId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: status === 'completed' ? 'completed' : 'in_progress',
          tripStatus: status
        })
      });

      if (response.ok) {
        setTripStatus(status);
        if (status === 'completed') {
          Alert.alert('Success', 'Trip completed successfully!');
          navigation.goBack();
        }
      } else {
        throw new Error('Failed to update trip status');
      }
    } catch (err: any) {
      console.error('Error updating trip status:', err);
      Alert.alert('Error', err.message || 'Failed to update trip status');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text.secondary;
    }
  };

  const renderRouteLoadItem = ({ item }: { item: RouteLoad }) => (
    <TouchableOpacity 
      style={[
        styles.loadCard,
        selectedLoads.find(l => l.id === item.id) && styles.selectedLoadCard
      ]}
      onPress={() => toggleLoadSelection(item)}
    >
      <View style={styles.loadHeader}>
        <View style={styles.loadInfo}>
          <Text style={styles.loadId}>Load #{item.id.slice(-6)}</Text>
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency) + '20' }]}>
            <Text style={[styles.urgencyText, { color: getUrgencyColor(item.urgency) }]}>
              {item.urgency.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.loadPrice}>KES {item.price.toLocaleString()}</Text>
      </View>

      <View style={styles.loadRoute}>
        <Text style={styles.loadPickup}>{item.pickup}</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} />
        <Text style={styles.loadDropoff}>{item.dropoff}</Text>
      </View>

      <View style={styles.loadDetails}>
        <Text style={styles.loadWeight}>{item.weight} kg</Text>
        <Text style={styles.loadDetour}>+{item.detourKm}km detour</Text>
        <Text style={styles.loadTime}>{item.route.estimatedTime}</Text>
      </View>

      {selectedLoads.find(l => l.id === item.id) && (
        <View style={styles.selectedIndicator}>
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
        </View>
      )}
    </TouchableOpacity>
  );

  const getMapRegion = () => {
    if (!currentLocation) return null;
    
    return {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Navigation</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleChat} style={styles.headerButton}>
            <MaterialCommunityIcons name="message-text" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleCall(job.client?.phone || job.customerPhone || '')} style={styles.headerButton}>
            <MaterialCommunityIcons name="phone" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {currentLocation && (
          <MapView
            style={styles.map}
            region={getMapRegion()}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {/* Pickup Marker */}
            <Marker
              coordinate={{
                latitude: job.fromLocation?.coordinates?.lat || -1.2921,
                longitude: job.fromLocation?.coordinates?.lng || 36.8219,
              }}
              title="Pickup Location"
              description={job.fromLocation?.address || 'Pickup Point'}
            >
              <MaterialCommunityIcons name="map-marker" size={30} color={colors.primary} />
            </Marker>

            {/* Delivery Marker */}
            <Marker
              coordinate={{
                latitude: job.toLocation?.coordinates?.lat || -1.2921,
                longitude: job.toLocation?.coordinates?.lng || 36.8219,
              }}
              title="Delivery Location"
              description={job.toLocation?.address || 'Delivery Point'}
            >
              <MaterialCommunityIcons name="flag-checkered" size={30} color={colors.success} />
            </Marker>

            {/* Route Polyline */}
            <Polyline
              coordinates={[
                {
                  latitude: job.fromLocation?.coordinates?.lat || -1.2921,
                  longitude: job.fromLocation?.coordinates?.lng || 36.8219,
                },
                {
                  latitude: job.toLocation?.coordinates?.lat || -1.2921,
                  longitude: job.toLocation?.coordinates?.lng || 36.8219,
                },
              ]}
              strokeColor={colors.primary}
              strokeWidth={3}
            />
          </MapView>
        )}
      </View>

      {/* Trip Status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <View style={[styles.statusStep, tripStatus === 'pickup' && styles.activeStep]}>
            <MaterialCommunityIcons 
              name="package-variant" 
              size={20} 
              color={tripStatus === 'pickup' ? colors.white : colors.text.secondary} 
            />
            <Text style={[styles.statusText, tripStatus === 'pickup' && styles.activeStatusText]}>
              Pickup
            </Text>
          </View>
          <View style={[styles.statusLine, tripStatus !== 'pickup' && styles.activeLine]} />
          <View style={[styles.statusStep, tripStatus === 'delivery' && styles.activeStep]}>
            <MaterialCommunityIcons 
              name="truck-delivery" 
              size={20} 
              color={tripStatus === 'delivery' ? colors.white : colors.text.secondary} 
            />
            <Text style={[styles.statusText, tripStatus === 'delivery' && styles.activeStatusText]}>
              Delivery
            </Text>
          </View>
          <View style={[styles.statusLine, tripStatus === 'completed' && styles.activeLine]} />
          <View style={[styles.statusStep, tripStatus === 'completed' && styles.activeStep]}>
            <MaterialCommunityIcons 
              name="check-circle" 
              size={20} 
              color={tripStatus === 'completed' ? colors.white : colors.text.secondary} 
            />
            <Text style={[styles.statusText, tripStatus === 'completed' && styles.activeStatusText]}>
              Complete
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {tripStatus === 'pickup' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateTripStatus('delivery')}
          >
            <MaterialCommunityIcons name="package-variant-closed" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Picked Up</Text>
          </TouchableOpacity>
        )}
        
        {tripStatus === 'delivery' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateTripStatus('completed')}
          >
            <MaterialCommunityIcons name="check-circle" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Delivered</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => setShowRouteLoads(!showRouteLoads)}
        >
          <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
            {showRouteLoads ? 'Hide' : 'Show'} Route Loads
          </Text>
        </TouchableOpacity>
      </View>

      {/* Route Loads */}
      {showRouteLoads && (
        <View style={styles.routeLoadsContainer}>
          <View style={styles.routeLoadsHeader}>
            <Text style={styles.routeLoadsTitle}>Available Loads Along Route</Text>
            {selectedLoads.length > 0 && (
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={acceptSelectedLoads}
              >
                <Text style={styles.acceptButtonText}>Accept Selected ({selectedLoads.length})</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={routeLoads}
            renderItem={renderRouteLoadItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.loadsList}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 8,
  },
  mapContainer: {
    height: height * 0.4,
  },
  map: {
    flex: 1,
  },
  statusContainer: {
    backgroundColor: colors.white,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusStep: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 25,
    backgroundColor: colors.background,
    minWidth: 80,
  },
  activeStep: {
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: 4,
  },
  activeStatusText: {
    color: colors.white,
  },
  statusLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  activeLine: {
    backgroundColor: colors.primary,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  secondaryButtonText: {
    color: colors.primary,
  },
  routeLoadsContainer: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  routeLoadsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  routeLoadsTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  acceptButton: {
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acceptButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  loadsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedLoadCard: {
    borderColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginRight: 8,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  loadRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadPickup: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  },
  loadDropoff: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  loadDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loadWeight: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  loadDetour: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  loadTime: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default TripNavigationScreen;
