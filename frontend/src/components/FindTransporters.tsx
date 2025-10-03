import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import colors from '../constants/colors';
import spacing from '../constants/spacing';
import { PLACEHOLDER_IMAGES } from '../constants/images';
import { useTransporters } from '../hooks/UseTransporters';
import { googleMapsService } from '../services/googleMapsService';
import { chatService } from '../services/chatService';
import { enhancedNotificationService } from '../services/enhancedNotificationService';
// import { instantRequestService } from '../services/enhancedInstantRequestService'; // Not needed - using direct API call

// Props: requests (array or single), distance, onSelect (optional override), accent color
export type FindTransportersProps = {
  requests: any[] | any; // single request or array of requests for consolidation
  distance: string | number;
  accent?: string;
  onSelect?: (transporter: any, payload: any) => void;
  onBackToForm?: () => void; // Optional callback for back to form
};

const FindTransporters: React.FC<FindTransportersProps> = ({ requests, distance = '50 km', accent = colors.primary, onSelect, onBackToForm }) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [filteredTransporters, setFilteredTransporters] = useState<any[]>([]);
  const [calculatedDistance, setCalculatedDistance] = useState<string>('');

  // Normalize requests to array
  const reqs = Array.isArray(requests) ? requests : [requests];
  // For consolidated, show combined info
  const isConsolidated = reqs.length > 1;

  // Get transporters from hook
  const { transporters, loading: transportersLoading } = useTransporters();

  const filterTransporters = useCallback(async () => {
    try {
      console.log('🔍 DEBUG: Starting transporter filtering...');
      console.log('🔍 DEBUG: Total transporters available:', transporters?.length || 0);
      console.log('🔍 DEBUG: Request data:', reqs[0]);

      let filtered = [...transporters];

      // Filter by availability
      filtered = filtered.filter(t => t.availability !== false);

      // Filter by vehicle type if specified in request
      if (reqs[0].type === 'agriTRUK') {
        filtered = filtered.filter(t =>
          t.vehicleType === 'truck' ||
          t.vehicleType === 'pickup' ||
          t.vehicleType === 'trailer'
        );
      } else if (reqs[0].type === 'cargoTRUK') {
        filtered = filtered.filter(t =>
          t.vehicleType === 'truck' ||
          t.vehicleType === 'trailer' ||
          t.vehicleType === 'container'
        );
      }

      // Filter by capacity if weight is specified
      if (reqs[0].weight) {
        const weightKg = parseFloat(reqs[0].weight);
        if (!isNaN(weightKg)) {
          filtered = filtered.filter(t => {
            const capacity = parseFloat(t.capacity) || 0;
            return capacity >= weightKg;
          });
        }
      }

      // Filter by special requirements
      if (reqs[0].isPerishable) {
        filtered = filtered.filter(t =>
          t.refrigerated || t.humidityControl || t.specialFeatures?.includes('temperature_controlled')
        );
      }

      if (reqs[0].isSpecialCargo) {
        filtered = filtered.filter(t =>
          t.specialFeatures && t.specialFeatures.length > 0
        );
      }

      // Calculate real distances for accurate ETA and cost calculation
      if (reqs[0].fromLocation && reqs[0].toLocation) {
        try {
          console.log('🔍 DEBUG: Calculating distance from', reqs[0].fromLocation, 'to', reqs[0].toLocation);
          
          let fromCoords, toCoords;
          
          // Handle fromLocation - could be object with lat/lng or string
          if (typeof reqs[0].fromLocation === 'object' && reqs[0].fromLocation.latitude) {
            fromCoords = reqs[0].fromLocation;
          } else {
            fromCoords = await googleMapsService.geocodeAddress(reqs[0].fromLocationAddress || reqs[0].fromLocation);
          }
          
          // Handle toLocation - could be object with lat/lng or string
          if (typeof reqs[0].toLocation === 'object' && reqs[0].toLocation.latitude) {
            toCoords = reqs[0].toLocation;
          } else {
            toCoords = await googleMapsService.geocodeAddress(reqs[0].toLocationAddress || reqs[0].toLocation);
          }

          // Calculate route distance
          const route = await googleMapsService.getDirections(fromCoords, toCoords);
          setCalculatedDistance(route.distance);
          console.log('🔍 DEBUG: Calculated distance:', route.distance);

          // Filter transporters by reasonable distance from pickup location
          // (within 50km of pickup location for efficiency)
          const nearbyTransporters = filtered.filter(t => {
            if (t.currentLocation) {
              const distance = googleMapsService.calculateDistance(
                fromCoords,
                { latitude: t.currentLocation.latitude, longitude: t.currentLocation.longitude }
              );
              return distance <= 50; // 50km radius
            }
            return true; // Include if no location data
          });

          // Sort by proximity to pickup location
          nearbyTransporters.sort((a, b) => {
            if (!a.currentLocation || !b.currentLocation) return 0;
            const distA = googleMapsService.calculateDistance(fromCoords, a.currentLocation);
            const distB = googleMapsService.calculateDistance(fromCoords, b.currentLocation);
            return distA - distB;
          });

          filtered = nearbyTransporters;
        } catch (error) {
          console.error('Error calculating distances:', error);
          // Set a default distance for cost calculation
          setCalculatedDistance('50 km');
        }
      } else {
        // Set a default distance for cost calculation
        setCalculatedDistance('50 km');
      }

      // Sort by rating and experience
      filtered.sort((a, b) => {
        const ratingA = parseFloat(a.rating) || 0;
        const ratingB = parseFloat(b.rating) || 0;
        const experienceA = parseInt(a.experience) || 0;
        const experienceB = parseInt(b.experience) || 0;

        // Weight rating more heavily than experience
        return (ratingB * 0.7 + experienceB * 0.3) - (ratingA * 0.7 + experienceA * 0.3);
      });

      console.log('🔍 DEBUG: Final filtered transporters count:', filtered.length);
      setFilteredTransporters(filtered);

      /* ORIGINAL FILTERING CODE - COMMENTED OUT FOR TESTING
      // Filter by availability
      filtered = filtered.filter(t => t.availability !== false);

      // Filter by vehicle type if specified in request
      if (reqs[0].type === 'agriTRUK') {
        filtered = filtered.filter(t =>
          t.vehicleType === 'truck' ||
          t.vehicleType === 'pickup' ||
          t.vehicleType === 'trailer'
        );
      } else if (reqs[0].type === 'cargoTRUK') {
        filtered = filtered.filter(t =>
          t.vehicleType === 'truck' ||
          t.vehicleType === 'trailer' ||
          t.vehicleType === 'container'
        );
      }

      // Filter by capacity if weight is specified
      if (reqs[0].weight) {
        const weightKg = parseFloat(reqs[0].weight);
        if (!isNaN(weightKg)) {
          filtered = filtered.filter(t => {
            const capacity = parseFloat(t.capacity) || 0;
            return capacity >= weightKg;
          });
        }
      }

      // Filter by special requirements
      if (reqs[0].isPerishable) {
        filtered = filtered.filter(t =>
          t.refrigerated || t.humidityControl || t.specialFeatures?.includes('temperature_controlled')
        );
      }

      if (reqs[0].isSpecialCargo) {
        filtered = filtered.filter(t =>
          t.specialFeatures && t.specialFeatures.length > 0
        );
      }

      // Calculate real distances and filter by proximity
      if (reqs[0].fromLocation && reqs[0].toLocation) {
        try {
          // Get coordinates for pickup and delivery locations
          const fromCoords = await googleMapsService.geocodeAddress(reqs[0].fromLocation);
          const toCoords = await googleMapsService.geocodeAddress(reqs[0].toLocation);

          // Calculate route distance
          const route = await googleMapsService.getDirections(fromCoords, toCoords);
          setCalculatedDistance(route.distance);

          // Filter transporters by reasonable distance from pickup location
          // (within 50km of pickup location for efficiency)
          const nearbyTransporters = filtered.filter(t => {
            if (t.currentLocation) {
              const distance = googleMapsService.calculateDistance(
                fromCoords,
                { latitude: t.currentLocation.latitude, longitude: t.currentLocation.longitude }
              );
              return distance <= 50; // 50km radius
            }
            return true; // Include if no location data
          });

          // Sort by proximity to pickup location
          nearbyTransporters.sort((a, b) => {
            if (!a.currentLocation || !b.currentLocation) return 0;
            const distA = googleMapsService.calculateDistance(fromCoords, a.currentLocation);
            const distB = googleMapsService.calculateDistance(fromCoords, b.currentLocation);
            return distA - distB;
          });

          filtered = nearbyTransporters;
        } catch (error) {
          console.error('Error calculating distances:', error);
          // Fallback to original filtering if distance calculation fails
          // Set a default distance for cost calculation
          setCalculatedDistance('50 km');
        }
      }
      */

    } catch (error) {
      console.error('Error filtering transporters:', error);
      setFilteredTransporters(transporters || []);
    }
  }, [transporters, reqs]);

  useEffect(() => {
    const loadTransporters = async () => {
      console.log('🔍 DEBUG: useEffect triggered - loading transporters');
      console.log('🔍 DEBUG: transportersLoading:', transportersLoading);
      console.log('🔍 DEBUG: transporters data:', transporters);
      
      setLoading(true);
      setFilteredTransporters([]);

      if (transporters && transporters.length > 0) {
        console.log('🔍 DEBUG: Found transporters, starting filtering...');
        await filterTransporters();
      } else {
        console.log('🔍 DEBUG: No transporters available or still loading');
      }
      setLoading(false);
    };

    loadTransporters();
  }, [transporters, requests, filterTransporters]);

  // Helper to calculate estimated amount
  function getEstAmount(t: any, distance: string | number) {
    const costPerKm = t.costPerKm || 100;
    let distNum = 0;

    if (calculatedDistance) {
      const match = calculatedDistance.replace(/,/g, '').match(/([\d.]+)/);
      if (match) distNum = parseFloat(match[1]);
    } else if (typeof distance === 'string') {
      const match = distance.replace(/,/g, '').match(/([\d.]+)/);
      if (match) distNum = parseFloat(match[1]);
    } else if (typeof distance === 'number') {
      distNum = distance;
    }

    if (!isNaN(distNum) && distNum > 0 && costPerKm) {
      const amt = distNum * costPerKm;
      // Format as sh. 4,800 (with thousands separator)
      return `sh. ${amt.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
    }
    return '';
  }

  // On transporter select
  async function handleSelect(t: any) {
    try {
      // Compose booking/trip payload
      const base = reqs[0];
      const payload = isConsolidated
        ? { requests: reqs, transporter: t, type: 'instant', status: 'in-progress', eta: t.est, distance: calculatedDistance || distance }
        : {
          id: t.id,
          pickupLocation: base.fromLocation,
          toLocation: base.toLocation,
          cargoDetails: base.productType + (base.weight ? `, ${base.weight} kg` : ''),
          pickupTime: '',
          status: 'in-progress',
          type: 'instant',
          transporterType: 'individual',
          transporter: {
            id: t.id,
            name: t.name,
            phone: t.phone,
            photo: t.photo,
            profilePhoto: t.profilePhoto,
            rating: t.rating,
            experience: t.experience,
            languages: t.languages,
            availability: t.availability,
            tripsCompleted: t.tripsCompleted,
            status: t.status,
          },
          vehicle: {
            type: t.vehicleType,
            color: t.vehicleColor,
            make: t.vehicleMake,
            capacity: t.capacity + 'T',
            plate: t.reg,
            bodyType: t.bodyType,
            driveType: t.driveType || '',
            year: t.year,
            photo: t.vehiclePhoto,
            specialFeatures: t.specialFeatures,
            insurance: t.insurance,
            gpsTracking: t.gpsTracking,
          },
          reference: 'REF-' + t.id,
          eta: t.est,
          distance: calculatedDistance || distance,
          estimatedCost: t.estimatedCost,
          specialFeatures: t.specialFeatures,
        };

      // For instant requests, also submit to backend
      if (base.requestType === 'instant' || base.bookingMode === 'instant') {
        try {
          // Format locations for backend
          const formatLocation = (location: any) => {
            if (typeof location === 'string') {
              return {
                address: location,
                latitude: -1.2921, // Nairobi coordinates as fallback
                longitude: 36.8219
              };
            } else if (location && typeof location === 'object') {
              const lat = location.latitude || location.lat;
              const lng = location.longitude || location.lng;
              
              // Ensure we have valid coordinates
              if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
                return {
                  address: location.address || location.name || 'Unknown location',
                  latitude: -1.2921,
                  longitude: 36.8219
                };
              }
              
              return {
                address: location.address || location.name || 'Unknown location',
                latitude: parseFloat(lat),
                longitude: parseFloat(lng)
              };
            } else {
              return {
                address: 'Unknown location',
                latitude: -1.2921,
                longitude: 36.8219
              };
            }
          };

          const instantRequestData = {
            // Core booking fields
            type: base.type === 'agriTRUK' ? 'Agri' : 'Cargo',
            fromLocation: formatLocation(base.fromLocation),
            toLocation: formatLocation(base.toLocation),
            productType: base.productType,
            weight: parseFloat(base.weight) || 0,
            weightKg: parseFloat(base.weight) || 0,
            pickUpDate: new Date().toISOString(),
            urgency: base.urgency || 'High',
            urgencyLevel: base.urgency || 'High',
            isPriority: base.isPriority || false,
            priority: base.isPriority || false,
            
            // Cargo specifications
            isPerishable: base.isPerishable || false,
            perishable: base.isPerishable || false,
            needsRefrigeration: base.isPerishable || false,
            humidyControl: base.isPerishable || false,
            
            // Special cargo and insurance
            isSpecialCargo: base.isSpecialCargo || false,
            specialCargo: base.isSpecialCargo ? base.specialCargoSpecs : [],
            specialCargoSpecs: base.specialCargoSpecs || [],
            insureGoods: base.insureGoods || false,
            insured: base.insureGoods || false,
            insuranceValue: base.insuranceValue ? parseFloat(base.insuranceValue) : 0,
            value: base.insuranceValue ? parseFloat(base.insuranceValue) : 0,
            
            // Additional information
            additional: base.additional || '',
            additionalNotes: base.additional || '',
            specialRequest: base.specialRequest || '',
            
            // Dimensions and costs
            lengthCm: base.lengthCm || 0,
            widthCm: base.widthCm || 0,
            heightCm: base.heightCm || 0,
            tolls: base.tolls || 0,
            fuelSurchargePct: base.fuelSurchargePct || 0,
            waitMinutes: base.waitMinutes || 0,
            nightSurcharge: base.nightSurcharge || false,
            
            // Booking metadata
            consolidated: false,
            status: 'pending',
            createdAt: new Date().toISOString(),
            bookingMode: 'instant',
            selectedTransporterId: t.id,
            matchedTransporterId: t.id,
            
            // Recurrence (always false for instant bookings)
            recurrence: {
              isRecurring: false,
              frequency: null,
              timeFrame: null,
              duration: null,
              startDate: null,
              endDate: null,
              interval: 1,
              occurences: [],
              baseBookingId: null
            }
          };

          console.log('🚀 Creating instant request for transporter:', t.name);
          
          // Submit instant request using the regular booking endpoint with instant mode
          const { apiRequest } = require('../utils/api');
          const response = await apiRequest('/bookings', {
            method: 'POST',
            body: JSON.stringify(instantRequestData)
          });
          
          if (response.bookingId || response.id) {
            console.log('✅ Instant request created successfully:', response.bookingId || response.id);
            // Add request ID to payload
            payload.requestId = response.bookingId || response.id;
            payload.isInstantRequest = true;

            // Create chat room for communication
            try {
              const chatRoom = await chatService.getOrCreateChatRoom(
                response.bookingId || response.id,
                t.id,
                base.userId || base.clientId || 'current-user' // Use actual user ID
              );
              console.log('✅ Chat room created successfully:', chatRoom.id);
              payload.chatRoomId = chatRoom.id;
            } catch (chatError) {
              console.warn('⚠️ Chat room creation failed:', chatError);
              // Don't fail the request if chat creation fails
            }

            // Send notification to transporter about the new job
            try {
              await enhancedNotificationService.sendNotification(
                'instant_request_assigned',
                t.id,
                {
                  requestId: response.bookingId || response.id,
                  clientName: base.clientName || 'Client',
                  pickupLocation: base.fromLocation,
                  deliveryLocation: base.toLocation,
                  cargoType: base.productType,
                  weight: base.weight,
                  estimatedPrice: estAmount,
                }
              );
              console.log('✅ Notification sent to transporter');
            } catch (notificationError) {
              console.warn('⚠️ Notification sending failed:', notificationError);
              // Don't fail the request if notification fails
            }
          } else {
            console.warn('⚠️ Instant request creation failed:', response.message);
            throw new Error(response.message || 'Failed to create instant request');
          }
        } catch (error) {
          // If backend submission fails, continue with local flow
          console.error('Failed to submit instant request to backend:', error);
          Alert.alert(
            'Request Warning',
            'Instant request created locally but may not be visible to transporters. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }

      if (onSelect) {
        onSelect(t, payload);
      } else {
        // For consolidated requests, go to ShipmentManagementScreen for consolidation management
        if (isConsolidated) {
          (navigation as any).navigate('ShipmentManagementScreen', { 
            requests: reqs, 
            transporter: t, 
            eta: t.est, 
            distance: calculatedDistance || distance,
            isConsolidated: true
          });
        } else {
          // For single instant requests, go to TripDetailsScreen
          (navigation as any).navigate('TripDetailsScreen', { booking: payload });
        }
      }
    } catch (error) {
      console.error('Error in handleSelect:', error);
      // Still navigate even if backend submission fails
      if (onSelect) {
        onSelect(t, payload);
      } else {
        // For consolidated requests, go to ShipmentManagementScreen for consolidation management
        if (isConsolidated) {
          (navigation as any).navigate('ShipmentManagementScreen', { 
            requests: reqs, 
            transporter: t, 
            eta: t.est, 
            distance: calculatedDistance || distance,
            isConsolidated: true
          });
        } else {
          // For single instant requests, go to TripDetailsScreen
          (navigation as any).navigate('TripDetailsScreen', { booking: payload });
        }
      }
    }
  }

  const renderTransporterCard = (t: any) => {
    const estAmount = getEstAmount(t, calculatedDistance || distance);
    const displayName = t.name && t.name.length > 18 ? t.name.slice(0, 16) + '…' : t.name;
    const profilePhotoUri = t.profilePhoto || t.photo || PLACEHOLDER_IMAGES.PROFILE_PHOTO_MEDIUM;
    
    console.log('👤 DEBUG: Profile photo for', t.name, ':', {
      profilePhoto: t.profilePhoto,
      photo: t.photo,
      finalUri: profilePhotoUri
    });
    const vehiclePhotoUri = t.vehiclePhoto || 
                           (t.vehiclePhotos && t.vehiclePhotos.length > 0 && t.vehiclePhotos[0]) || 
                           t.photo || 
                           PLACEHOLDER_IMAGES.VEHICLE_PHOTO_SMALL;
    
    console.log('🚛 DEBUG: Vehicle photo for', t.name, ':', {
      vehiclePhoto: t.vehiclePhoto,
      vehiclePhotos: t.vehiclePhotos,
      vehicleImagesUrl: t.vehicleImagesUrl,
      photo: t.photo,
      finalUri: vehiclePhotoUri
    });
    
    // Calculate ETA based on distance and average speed
    const calculateETA = () => {
      if (calculatedDistance) {
        const distanceMatch = calculatedDistance.replace(/,/g, '').match(/([\d.]+)/);
        if (distanceMatch) {
          const distanceKm = parseFloat(distanceMatch[1]);
          const avgSpeed = 60; // km/h average speed
          const hours = distanceKm / avgSpeed;
          const minutes = Math.floor((hours % 1) * 60);
          const hoursInt = Math.floor(hours);
          
          if (hoursInt > 0) {
            return `${hoursInt}h ${minutes}m`;
          } else {
            return `${minutes}m`;
          }
        }
      }
      return 'Calculating...';
    };
    
    const eta = calculateETA();

    return (
      <View key={t.transporterId || t.id} style={styles.transporterCard}>
        {/* Transporter Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: profilePhotoUri }}
              style={styles.profileImage}
              resizeMode="cover"
              defaultSource={PLACEHOLDER_IMAGES.PROFILE_PHOTO_MEDIUM}
              onError={(error) => {
                console.log('Profile photo failed to load for:', t.name, 'Error:', error.nativeEvent.error);
              }}
            />
            <View style={styles.onlineIndicator} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.transporterName}>{displayName}</Text>
            {/* Company information for company drivers */}
            {t.companyName && t.companyName !== t.name && (
              <View style={styles.companyInfo}>
                <MaterialCommunityIcons name="office-building" size={12} color={colors.text.secondary} />
                <Text style={styles.companyName}>{t.companyName}</Text>
              </View>
            )}
            <View style={styles.ratingContainer}>
              <View style={styles.starRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialCommunityIcons
                    key={star}
                    name={star <= (t.rating || 0) ? "star" : "star-outline"}
                    size={14}
                    color={star <= (t.rating || 0) ? colors.warning : colors.text.light}
                  />
                ))}
              </View>
              <Text style={styles.ratingText}>
                {t.rating ? `${t.rating.toFixed(1)}/5` : 'New'}
              </Text>
              {t.experience && (
                <>
                  <Text style={styles.separator}>•</Text>
                  <Text style={styles.experienceText}>
                    {t.experience} years exp.
                  </Text>
                </>
              )}
            </View>
            <View style={styles.tripsContainer}>
              <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} />
              <Text style={styles.tripsText}>
                {t.tripsCompleted || 0} trips completed
              </Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceAmount}>{estAmount}</Text>
            <Text style={styles.priceLabel}>Estimated Cost</Text>
          </View>
        </View>

        {/* Vehicle Information Card */}
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleHeader}>
            <Image
              source={{ uri: vehiclePhotoUri }}
              style={styles.vehicleImage}
              resizeMode="cover"
              defaultSource={PLACEHOLDER_IMAGES.VEHICLE_PHOTO_SMALL}
              onError={(error) => {
                console.log('Vehicle photo failed to load for:', t.name, 'Error:', error.nativeEvent.error);
              }}
            />
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleTitle}>
                {t.vehicleMake} {t.vehicleType}
              </Text>
              <Text style={styles.vehicleSubtitle}>
                {t.vehicleYear} • {t.bodyType}
                {t.vehicleColor && ` • ${t.vehicleColor}`}
              </Text>
              <View style={styles.vehicleSpecs}>
                <View style={styles.specItem}>
                  <MaterialCommunityIcons name="weight" size={14} color={colors.text.secondary} />
                  <Text style={styles.specText}>{t.capacity}T</Text>
                </View>
                <View style={styles.specItem}>
                  <MaterialCommunityIcons name="car" size={14} color={colors.text.secondary} />
                  <Text style={styles.specText}>{t.bodyType}</Text>
                </View>
                <View style={styles.specItem}>
                  <MaterialCommunityIcons name="license" size={14} color={colors.text.secondary} />
                  <Text style={styles.specText}>{t.reg || 'N/A'}</Text>
                </View>
                {t.vehicleColor && (
                  <View style={styles.specItem}>
                    <MaterialCommunityIcons name="palette" size={14} color={colors.text.secondary} />
                    <Text style={styles.specText}>{t.vehicleColor}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ETA and Distance Info */}
          <View style={styles.timingInfo}>
            <View style={styles.timingItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={colors.primary} />
              <Text style={styles.timingLabel}>ETA</Text>
              <Text style={styles.timingValue}>{eta}</Text>
            </View>
            <View style={styles.timingDivider} />
            <View style={styles.timingItem}>
              <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.secondary} />
              <Text style={styles.timingLabel}>Distance</Text>
              <Text style={styles.timingValue}>{calculatedDistance || '50 km'}</Text>
            </View>
          </View>
        </View>

        {/* Special Features */}
        {t.specialFeatures && t.specialFeatures.length > 0 && (
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Special Features</Text>
            <View style={styles.featuresList}>
              {t.specialFeatures.slice(0, 3).map((feature: string, index: number) => (
                <View key={index} style={styles.featureTag}>
                  <MaterialCommunityIcons name="check" size={12} color={colors.primary} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
              {t.specialFeatures.length > 3 && (
                <View style={styles.moreFeatures}>
                  <Text style={styles.moreFeaturesText}>
                    +{t.specialFeatures.length - 3} more
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.selectButton, { backgroundColor: accent }]}
          onPress={() => handleSelect(t)}
        >
          <MaterialCommunityIcons name="check" size={20} color={colors.white} />
          <Text style={styles.selectButtonText}>Select This Transporter</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Enhanced Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <MaterialCommunityIcons name="truck-delivery" size={28} color={colors.white} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Available Transporters</Text>
              <Text style={styles.headerSubtitle}>
                {filteredTransporters.length} {filteredTransporters.length === 1 ? 'transporter' : 'transporters'} found
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.countBadge}>
              <Text style={styles.transporterCount}>{filteredTransporters.length}</Text>
              <Text style={styles.countLabel}>available</Text>
            </View>
            {calculatedDistance && (
              <View style={styles.distanceBadge}>
                <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.white} />
                <Text style={styles.distanceText}>{calculatedDistance}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Content Section */}
      {loading || transportersLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingHeader}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={styles.loadingTitle}>Finding Available Transporters</Text>
            <Text style={styles.loadingSubtitle}>Matching your requirements with nearby transporters...</Text>
          </View>

          {/* Enhanced Loading Skeletons */}
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonHeader}>
                <View style={styles.skeletonAvatar} />
                <View style={styles.skeletonInfo}>
                  <View style={[styles.skeletonLine, { width: '70%' }]} />
                  <View style={[styles.skeletonLine, { width: '50%' }]} />
                  <View style={[styles.skeletonLine, { width: '40%' }]} />
                </View>
                <View style={styles.skeletonPrice} />
              </View>
              <View style={styles.skeletonVehicle}>
                <View style={styles.skeletonVehicleImage} />
                <View style={styles.skeletonVehicleInfo}>
                  <View style={[styles.skeletonLine, { width: '80%' }]} />
                  <View style={[styles.skeletonLine, { width: '60%' }]} />
                </View>
              </View>
              <View style={styles.skeletonButton} />
            </View>
          ))}
        </View>
      ) : filteredTransporters.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <MaterialCommunityIcons name="truck" size={64} color={colors.text.light} />
          </View>
          <Text style={styles.emptyTitle}>No Transporters Available</Text>
          <Text style={styles.emptySubtitle}>
            {transportersLoading ? 'Loading transporters...' : 'We couldn\'t find any transporters matching your requirements at the moment.'}
          </Text>
          {!transportersLoading && (
            <View style={styles.emptySuggestions}>
              <Text style={styles.suggestionTitle}>Try:</Text>
              <Text style={styles.suggestionItem}>• Adjusting your pickup time</Text>
              <Text style={styles.suggestionItem}>• Expanding your search radius</Text>
              <Text style={styles.suggestionItem}>• Relaxing special requirements</Text>
            </View>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.transportersList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.transportersListContent}
        >
          {filteredTransporters.map(renderTransporterCard)}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: spacing.lg,
  },

  // Enhanced Header Styles
  header: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.white + 'CC',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  countBadge: {
    backgroundColor: colors.white + '20',
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  transporterCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  countLabel: {
    fontSize: 10,
    color: colors.white + 'CC',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  distanceText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Loading Styles
  loadingContainer: {
    paddingVertical: spacing.lg,
  },
  loadingHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Skeleton Styles
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  skeletonAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.text.light + '30',
    marginRight: spacing.md,
  },
  skeletonInfo: {
    flex: 1,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: colors.text.light + '30',
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
  skeletonPrice: {
    width: 80,
    height: 24,
    backgroundColor: colors.text.light + '30',
    borderRadius: 12,
  },
  skeletonVehicle: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  skeletonVehicleImage: {
    width: 100,
    height: 75,
    backgroundColor: colors.text.light + '30',
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  skeletonVehicleInfo: {
    flex: 1,
  },
  skeletonButton: {
    height: 48,
    backgroundColor: colors.text.light + '30',
    borderRadius: 12,
  },

  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.text.light + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  emptySuggestions: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    width: '100%',
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  suggestionItem: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },

  // Transporters List Styles
  transportersList: {
    maxHeight: 600,
  },
  transportersListContent: {
    paddingBottom: 100, // Extra padding to ensure content doesn't get hidden behind bottom nav
  },

  // Transporter Card Styles
  transporterCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.text.light + '20',
  },

  // Profile Header Styles
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.primary + '20',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  transporterName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  starRating: {
    flexDirection: 'row',
    marginRight: spacing.xs,
  },
  ratingText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  separator: {
    fontSize: 12,
    color: colors.text.light,
    marginHorizontal: spacing.xs,
  },
  experienceText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  tripsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripsText: {
    fontSize: 12,
    color: colors.success,
    marginLeft: 4,
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  priceLabel: {
    fontSize: 11,
    color: colors.text.light,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Vehicle Card Styles
  vehicleCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.text.light + '20',
  },
  vehicleHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  vehicleImage: {
    width: 120,
    height: 90,
    borderRadius: 12,
    marginRight: spacing.sm,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  vehicleSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  vehicleSpecs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.text.light + '30',
  },
  specText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  timingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '08',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  timingItem: {
    flex: 1,
    alignItems: 'center',
  },
  timingLabel: {
    fontSize: 11,
    color: colors.text.light,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timingValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  timingDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.text.light + '30',
    marginHorizontal: spacing.sm,
  },

  // Features Styles
  featuresContainer: {
    marginBottom: spacing.md,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  featureText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  moreFeatures: {
    backgroundColor: colors.text.light + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  moreFeaturesText: {
    fontSize: 12,
    color: colors.text.light,
    fontStyle: 'italic',
  },

  // Button Styles
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  selectButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },

  // Company Info Styles
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
    fontStyle: 'italic',
  },
});

export default FindTransporters;
