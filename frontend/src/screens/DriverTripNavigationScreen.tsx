import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';
import { googleMapsService } from '../services/googleMapsService';
import LocationDisplay from '../components/common/LocationDisplay';
import { unifiedTrackingService } from '../services/unifiedTrackingService';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';

const { width, height } = Dimensions.get('window');

interface DriverTripNavigationParams {
  jobId: string;
  bookingId: string;
  job: any;
}

type TripStatus = 'started' | 'picked_up' | 'enroute' | 'completed';

interface RouteInfo {
  distance: string;
  duration: string;
  polyline: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
}

const DriverTripNavigationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as DriverTripNavigationParams;

  const [job, setJob] = useState<any>(params?.job || {});
  const [jobStatus, setJobStatus] = useState<TripStatus>('started');
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [routeLoads, setRouteLoads] = useState<any[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [lastRoute, setLastRoute] = useState<RouteInfo | null>(null);

  useEffect(() => {
    fetchJobDetails();
    getCurrentLocation();
    startLocationTracking();
    return () => {
      if (job.id) {
        unifiedTrackingService.stopTracking(job.id);
      }
    };
  }, [job.id]);

  useEffect(() => {
    if (currentLocation && job.fromLocation && jobStatus === 'started') {
      calculateRouteToPickup();
    } else if (currentLocation && job.toLocation && (jobStatus === 'picked_up' || jobStatus === 'enroute')) {
      calculateRouteToDropoff();
    }
  }, [currentLocation, jobStatus, job.fromLocation, job.toLocation]);

  const fetchJobDetails = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Use actual bookingId for API calls (not readable ID)
      const actualBookingId = params.bookingId || params.jobId || job?.id;
      if (!actualBookingId) {
        console.error('No booking ID available for API call');
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${actualBookingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const booking = data.booking || data;
        setJob(booking);
        // Determine status - map backend statuses to our internal statuses
        const status = booking.status || 'started';
        if (status === 'started') {
          setJobStatus('started');
        } else if (status === 'picked_up' || status === 'picked-up') {
          setJobStatus('picked_up');
        } else if (status === 'in_progress' || status === 'enroute' || status === 'in-transit') {
          setJobStatus('enroute');
          // Fetch route loads when enroute
          fetchRouteLoads();
        } else if (status === 'completed' || status === 'delivered') {
          setJobStatus('completed');
        } else {
          setJobStatus('started');
        }
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required for navigation.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (err) {
      console.error('Error getting location:', err);
    }
  };

  const startLocationTracking = async () => {
    // Use actual bookingId for tracking, but display readable ID in UI
    const actualBookingId = job.id || params.jobId || params.bookingId;
    if (!actualBookingId) return;

    try {
      setIsTracking(true);
      // Pass callbacks object to startTracking - use actual ID for backend
      await unifiedTrackingService.startTracking(actualBookingId, {
        onLocationUpdate: (location) => {
          setCurrentLocation({
            latitude: location.latitude,
            longitude: location.longitude,
          });

          // Check for route deviation
          if (routeInfo && lastRoute) {
            checkRouteDeviation(location);
          }
        },
        onTrafficAlert: (alert) => {
          Alert.alert(
            'Traffic Alert',
            alert.message,
            [{ text: 'OK' }]
          );
        },
        onStatusUpdate: (trackingData) => {
          // Handle status updates if needed
          console.log('Tracking status update:', trackingData);
        },
        onRouteDeviation: (deviation) => {
          Alert.alert(
            'Route Deviation',
            deviation.deviation.reason || 'Driver has deviated from the planned route.',
            [{ text: 'OK' }]
          );
        },
      });
    } catch (err) {
      console.error('Error starting tracking:', err);
      setIsTracking(false);
    }
  };

  const calculateRouteToPickup = async () => {
    // Validate current location before attempting route calculation
    if (!currentLocation || !currentLocation.latitude || !currentLocation.longitude) {
      console.warn('Current location not available yet, skipping route calculation');
      return;
    }

    if (!job.fromLocation) {
      console.warn('Pickup location not available, skipping route calculation');
      return;
    }

    try {
      // Get pickup location from job - use actual location data
      const pickupLocation = typeof job.fromLocation === 'object' && job.fromLocation
        ? {
            latitude: job.fromLocation.latitude || 0,
            longitude: job.fromLocation.longitude || 0,
          }
        : null;

      if (!pickupLocation || !pickupLocation.latitude || !pickupLocation.longitude) {
        console.warn('Invalid pickup location, skipping route calculation');
        return;
      }

      // Validate coordinates are reasonable (latitude: -90 to 90, longitude: -180 to 180)
      if (
        Math.abs(currentLocation.latitude) > 90 || 
        Math.abs(currentLocation.longitude) > 180 ||
        Math.abs(pickupLocation.latitude) > 90 || 
        Math.abs(pickupLocation.longitude) > 180
      ) {
        console.warn('Invalid coordinate values, skipping route calculation');
        return;
      }

      // Calculate route from current location to pickup location
      // Using 'driving' mode for best route calculation
      const route = await googleMapsService.getDirections(
        currentLocation,
        pickupLocation,
        undefined, // No waypoints
        'driving' // Use driving mode for best route
      );

      // Decode polyline to get coordinates
      const coordinates = decodePolyline(route.polyline);

      setRouteInfo({
        distance: route.distance,
        duration: route.duration,
        polyline: route.polyline,
        coordinates,
      });

      setLastRoute({
        distance: route.distance,
        duration: route.duration,
        polyline: route.polyline,
        coordinates,
      });
    } catch (err: any) {
      // Handle ZERO_RESULTS gracefully - might happen if locations are too close or invalid
      if (err?.message?.includes('ZERO_RESULTS')) {
        console.warn('No route found - locations may be invalid or too close together');
        // Set a fallback route with just the two points
        const pickupLocation = typeof job.fromLocation === 'object' && job.fromLocation
          ? { latitude: job.fromLocation.latitude || 0, longitude: job.fromLocation.longitude || 0 }
          : null;
        if (pickupLocation && pickupLocation.latitude && pickupLocation.longitude) {
          setRouteInfo({
            distance: 'Calculating...',
            duration: 'Calculating...',
            polyline: '',
            coordinates: [currentLocation, pickupLocation],
          });
        }
      } else {
        console.error('Error calculating route to pickup:', err);
      }
    }
  };

  const calculateRouteToDropoff = async () => {
    // Validate current location before attempting route calculation
    if (!currentLocation || !currentLocation.latitude || !currentLocation.longitude) {
      console.warn('Current location not available yet, skipping route calculation');
      return;
    }

    if (!job.toLocation) {
      console.warn('Dropoff location not available, skipping route calculation');
      return;
    }

    try {
      // Get dropoff location from job - use actual location data
      const dropoffLocation = typeof job.toLocation === 'object' && job.toLocation
        ? {
            latitude: job.toLocation.latitude || 0,
            longitude: job.toLocation.longitude || 0,
          }
        : null;

      if (!dropoffLocation || !dropoffLocation.latitude || !dropoffLocation.longitude) {
        console.warn('Invalid dropoff location, skipping route calculation');
        return;
      }

      // Validate coordinates are reasonable
      if (
        Math.abs(currentLocation.latitude) > 90 || 
        Math.abs(currentLocation.longitude) > 180 ||
        Math.abs(dropoffLocation.latitude) > 90 || 
        Math.abs(dropoffLocation.longitude) > 180
      ) {
        console.warn('Invalid coordinate values, skipping route calculation');
        return;
      }

      // Calculate route from current location to dropoff location
      // Using 'driving' mode for best route calculation
      const route = await googleMapsService.getDirections(
        currentLocation,
        dropoffLocation,
        undefined, // No waypoints
        'driving' // Use driving mode for best route
      );

      // Decode polyline to get coordinates
      const coordinates = decodePolyline(route.polyline);

      setRouteInfo({
        distance: route.distance,
        duration: route.duration,
        polyline: route.polyline,
        coordinates,
      });

      setLastRoute({
        distance: route.distance,
        duration: route.duration,
        polyline: route.polyline,
        coordinates,
      });

      // Check traffic conditions
      checkTrafficConditions(currentLocation, dropoffLocation);
    } catch (err: any) {
      // Handle ZERO_RESULTS gracefully
      if (err?.message?.includes('ZERO_RESULTS')) {
        console.warn('No route found - locations may be invalid or too close together');
        const dropoffLocation = typeof job.toLocation === 'object' && job.toLocation
          ? { latitude: job.toLocation.latitude || 0, longitude: job.toLocation.longitude || 0 }
          : null;
        if (dropoffLocation && dropoffLocation.latitude && dropoffLocation.longitude) {
          setRouteInfo({
            distance: 'Calculating...',
            duration: 'Calculating...',
            polyline: '',
            coordinates: [currentLocation, dropoffLocation],
          });
        }
      } else {
        console.error('Error calculating route to dropoff:', err);
      }
    }
  };

  const checkTrafficConditions = async (from: any, to: any) => {
    try {
      const alerts = await unifiedTrackingService.getTrafficConditions(
        {
          latitude: from.latitude,
          longitude: from.longitude,
          address: '',
        },
        {
          latitude: to.latitude,
          longitude: to.longitude,
          address: '',
        }
      );

      if (alerts.length > 0) {
        const alert = alerts[0];
        Alert.alert(
          'Traffic Alert',
          `${alert.message}\nEstimated delay: ${alert.estimatedDelay} minutes`,
          [
            { text: 'Continue Route' },
            {
              text: 'Find Alternative',
              onPress: () => {
                if (alert.alternativeRoutes && alert.alternativeRoutes.length > 0) {
                  // Use alternative route
                  const altRoute = alert.alternativeRoutes[0];
                  sendRouteChangeAlert('Traffic avoidance');
                }
              },
            },
          ]
        );
      }
    } catch (err) {
      console.error('Error checking traffic:', err);
    }
  };

  const checkRouteDeviation = (currentLoc: any) => {
    if (!routeInfo || !lastRoute) return;

    // Simple distance check - if driver is more than 500m from route, alert
    const distanceFromRoute = calculateDistanceToRoute(currentLoc, routeInfo.coordinates);
    
    if (distanceFromRoute > 500) {
      // Significant deviation detected
      sendRouteChangeAlert('Route change detected');
    }
  };

  const calculateDistanceToRoute = (point: any, routeCoords: Array<{ latitude: number; longitude: number }>): number => {
    let minDistance = Infinity;
    
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const distance = distanceToLineSegment(
        point,
        routeCoords[i],
        routeCoords[i + 1]
      );
      minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
  };

  const distanceToLineSegment = (point: any, lineStart: any, lineEnd: any): number => {
    const A = point.latitude - lineStart.latitude;
    const B = point.longitude - lineStart.longitude;
    const C = lineEnd.latitude - lineStart.latitude;
    const D = lineEnd.longitude - lineStart.longitude;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.latitude;
      yy = lineStart.longitude;
    } else if (param > 1) {
      xx = lineEnd.latitude;
      yy = lineEnd.longitude;
    } else {
      xx = lineStart.latitude + param * C;
      yy = lineStart.longitude + param * D;
    }

    const dx = point.latitude - xx;
    const dy = point.longitude - yy;
    return Math.sqrt(dx * dx + dy * dy) * 111000; // Convert to meters
  };

  const sendRouteChangeAlert = async (reason: string) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Use actual bookingId for tracking API calls
      const actualBookingId = job.id || params.bookingId || params.jobId;
      if (!actualBookingId) {
        console.error('No booking ID available for route deviation alert');
        return;
      }

      await unifiedTrackingService.sendRouteDeviationAlert(
        actualBookingId,
        {
          originalRoute: lastRoute?.coordinates || [],
          currentRoute: routeInfo?.coordinates || [],
          deviation: {
            distance: 0,
            reason,
            severity: 'medium' as const,
          },
          timestamp: new Date().toISOString(),
        }
      );

      Alert.alert('Alert Sent', 'Customer has been notified of the route change.');
    } catch (err) {
      console.error('Error sending route alert:', err);
    }
  };

  const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
    const coordinates: Array<{ latitude: number; longitude: number }> = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLat = ((result & 1) !== 0) ? ~(result >> 1) : (result >> 1);
      lat += deltaLat;

      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLng = ((result & 1) !== 0) ? ~(result >> 1) : (result >> 1);
      lng += deltaLng;

      coordinates.push({
        latitude: lat * 1e-5,
        longitude: lng * 1e-5,
      });
    }

    return coordinates;
  };

  const handlePickup = async () => {
    try {
      setUpdatingStatus(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Use actual bookingId for API calls
      const actualBookingId = job.id || params.bookingId || params.jobId;
      if (!actualBookingId) {
        throw new Error('Booking ID not found');
      }

      const token = await user.getIdToken();
      // Use /update/:bookingId endpoint (same as start trip and cancel)
      let response = await fetch(`${API_ENDPOINTS.BOOKINGS}/update/${actualBookingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'picked_up',
          pickedUpAt: new Date().toISOString(),
        }),
      });

      // Fallback to /status endpoint if /update doesn't work
      if (!response.ok && response.status === 404) {
        response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${actualBookingId}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'picked_up',
            pickedUpAt: new Date().toISOString(),
          }),
        });
      }

      if (response.ok) {
        setJobStatus('picked_up');
        // After pickup, we can calculate route to dropoff
        calculateRouteToDropoff();
        Alert.alert('Picked Up', 'Cargo picked up successfully. You can now proceed to the drop-off location.');
      } else {
        throw new Error('Failed to update status');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to mark as picked up');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleMarkEnroute = async () => {
    try {
      setUpdatingStatus(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Use actual bookingId for API calls
      const actualBookingId = job.id || params.bookingId || params.jobId;
      if (!actualBookingId) {
        throw new Error('Booking ID not found');
      }

      const token = await user.getIdToken();
      // Use /update/:bookingId endpoint (same as start trip and cancel)
      let response = await fetch(`${API_ENDPOINTS.BOOKINGS}/update/${actualBookingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'enroute',
          enrouteAt: new Date().toISOString(),
        }),
      });

      // Fallback to /status endpoint if /update doesn't work
      if (!response.ok && response.status === 404) {
        response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${actualBookingId}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'enroute',
            enrouteAt: new Date().toISOString(),
          }),
        });
      }

      if (response.ok) {
        setJobStatus('enroute');
        fetchRouteLoads();
        Alert.alert('En Route', 'Status updated. You can now see route loads for consolidation.');
      } else {
        throw new Error('Failed to update status');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const fetchRouteLoads = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      // Try the route loads endpoint
      let response = await fetch(`${API_ENDPOINTS.BOOKINGS}/transporters/route-loads`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // If 404, try alternative endpoint with bookingId as query param
      if (!response.ok && response.status === 404) {
        const actualBookingId = job.id || params.bookingId || params.jobId;
        if (actualBookingId) {
          response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${actualBookingId}/route-loads`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        }
      }

      // If still not found, try drivers endpoint
      if (!response.ok && response.status === 404) {
        response = await fetch(`${API_ENDPOINTS.DRIVERS}/route-loads`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }

      if (response.ok) {
        const data = await response.json();
        setRouteLoads(data.routeLoads || data.loads || []);
      } else if (response.status === 404) {
        // Endpoint doesn't exist - this is OK, just set empty array
        console.log('Route loads endpoint not available - feature may not be implemented yet');
        setRouteLoads([]);
      }
    } catch (err) {
      console.error('Error fetching route loads:', err);
      // On error, set empty array so UI doesn't break
      setRouteLoads([]);
    }
  };

  const getDestination = () => {
    if (jobStatus === 'started') {
      return job.fromLocation;
    } else {
      return job.toLocation;
    }
  };

  const getDestinationLabel = () => {
    if (jobStatus === 'started') {
      return 'Pickup Location';
    } else {
      return 'Drop-off Location';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading navigation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const destination = getDestination();
  const markers = [
    ...(currentLocation ? [{
      id: 'current',
      coordinate: currentLocation,
      title: 'Your Location',
      description: 'Current position',
      pinColor: colors.primary,
    }] : []),
    ...(destination ? [{
      id: 'destination',
      coordinate: typeof destination === 'object' 
        ? {
            latitude: destination.latitude || -1.2921,
            longitude: destination.longitude || 36.8219,
          }
        : {
            latitude: -1.2921,
            longitude: 36.8219,
          },
      title: getDestinationLabel(),
      description: typeof destination === 'object' && destination.address 
        ? destination.address 
        : 'Destination',
      pinColor: colors.secondary,
    }] : []),
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Navigation</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={currentLocation ? {
            ...currentLocation,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          } : {
            latitude: -1.2921,
            longitude: 36.8219,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {/* Markers */}
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              coordinate={marker.coordinate}
              title={marker.title}
              description={marker.description}
              pinColor={marker.pinColor}
            />
          ))}

          {/* Route Polyline */}
          {routeInfo && routeInfo.coordinates.length > 0 && (
            <Polyline
              coordinates={routeInfo.coordinates}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineDashPattern={[5, 5]}
            />
          )}
        </MapView>
      </View>

      {/* Info Panel */}
      <View style={styles.infoPanel}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Job Info */}
          <View style={styles.jobInfoCard}>
            <Text style={styles.jobId}>Job: {getDisplayBookingId(job)}</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(jobStatus) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(jobStatus) }]}>
                {jobStatus.toUpperCase().replace('_', ' ')}
              </Text>
            </View>
          </View>

          {/* Route Info */}
          {routeInfo && (
            <View style={styles.routeInfoCard}>
              <MaterialCommunityIcons name="map-marker-path" size={24} color={colors.primary} />
              <View style={styles.routeDetails}>
                <Text style={styles.routeLabel}>Route to {getDestinationLabel()}</Text>
                <View style={styles.routeStats}>
                  <View style={styles.routeStat}>
                    <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.text.secondary} />
                    <Text style={styles.routeStatText}>{routeInfo.distance}</Text>
                  </View>
                  <View style={styles.routeStat}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color={colors.text.secondary} />
                    <Text style={styles.routeStatText}>{routeInfo.duration}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Location Info */}
          <View style={styles.locationCard}>
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
              <View style={styles.locationDetails}>
                <Text style={styles.locationLabel}>{getDestinationLabel()}</Text>
                <LocationDisplay location={destination} />
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {jobStatus === 'started' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.pickupButton]}
                onPress={handlePickup}
                disabled={updatingStatus}
              >
                {updatingStatus ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="package-variant" size={20} color={colors.white} />
                    <Text style={styles.actionButtonText}>Mark as Picked Up</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {jobStatus === 'picked_up' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.enrouteButton]}
                onPress={handleMarkEnroute}
                disabled={updatingStatus}
              >
                {updatingStatus ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="truck-delivery" size={20} color={colors.white} />
                    <Text style={styles.actionButtonText}>Start En Route</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {jobStatus === 'enroute' && routeLoads.length > 0 && (
              <View style={styles.routeLoadsSection}>
                <Text style={styles.routeLoadsTitle}>Available Route Loads</Text>
                <Text style={styles.routeLoadsSubtitle}>
                  {routeLoads.length} load{routeLoads.length !== 1 ? 's' : ''} available along your route
                </Text>
                <TouchableOpacity
                  style={styles.viewLoadsButton}
                  onPress={() => {
                    (navigation as any).navigate('RouteLoadsScreen', {
                      routeLoads,
                      currentTrip: job,
                    });
                  }}
                >
                  <Text style={styles.viewLoadsButtonText}>View & Accept Loads</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {jobStatus === 'enroute' && routeLoads.length === 0 && (
              <View style={styles.routeLoadsSection}>
                <Text style={styles.routeLoadsTitle}>No Route Loads Available</Text>
                <Text style={styles.routeLoadsSubtitle}>
                  There are currently no additional loads available along your route.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const getStatusColor = (status: TripStatus): string => {
  switch (status) {
    case 'started':
      return colors.primary;
    case 'picked_up':
      return colors.warning;
    case 'enroute':
      return colors.success;
    case 'completed':
      return colors.secondary;
    default:
      return colors.text.secondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fonts.size.md,
    color: colors.text.secondary,
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
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.primary,
  },
  headerSpacer: {
    width: 40,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  infoPanel: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: height * 0.45,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  jobInfoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  jobId: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  routeInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  routeDetails: {
    marginLeft: spacing.md,
    flex: 1,
  },
  routeLabel: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  routeStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  routeStatText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  locationCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationDetails: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  locationLabel: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  actionButtons: {
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    gap: spacing.sm,
  },
  pickupButton: {
    backgroundColor: colors.warning,
  },
  enrouteButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: 'bold',
  },
  routeLoadsSection: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 12,
  },
  routeLoadsTitle: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  routeLoadsSubtitle: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  viewLoadsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  viewLoadsButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    marginRight: spacing.xs,
  },
});

export default DriverTripNavigationScreen;

