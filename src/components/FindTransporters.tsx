import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import colors from '../constants/colors';
import { useTransporters } from '../hooks/UseTransporters';
import { googleMapsService } from '../services/googleMapsService';

// Props: requests (array or single), distance, onSelect (optional override), accent color
export type FindTransportersProps = {
  requests: any[] | any; // single request or array of requests for consolidation
  distance: string | number;
  accent?: string;
  onSelect?: (transporter: any, payload: any) => void;
};

const FindTransporters: React.FC<FindTransportersProps> = ({ requests, distance, accent = colors.primary, onSelect }) => {
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

  useEffect(() => {
    setLoading(true);
    setFilteredTransporters([]);

    if (transporters && transporters.length > 0) {
      filterTransporters();
    }
    setLoading(false);
  }, [transporters, JSON.stringify(requests)]);

  const filterTransporters = async () => {
    try {
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
        }
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

      setFilteredTransporters(filtered);
    } catch (error) {
      console.error('Error filtering transporters:', error);
      setFilteredTransporters(transporters || []);
    }
  };

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
  function handleSelect(t: any) {
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
    if (onSelect) {
      onSelect(t, payload);
    } else {
      navigation.navigate('TripDetails', isConsolidated ? { requests: reqs, transporter: t, eta: t.est, distance: calculatedDistance || distance } : { booking: payload });
    }
  }

  const renderTransporterCard = (t: any) => {
    const estAmount = getEstAmount(t, calculatedDistance || distance);
    const displayName = t.name && t.name.length > 18 ? t.name.slice(0, 16) + '…' : t.name;
    const profilePhotoUri = t.profilePhoto || t.photo || 'https://via.placeholder.com/54x54?text=TRUK';
    const vehiclePhotoUri = t.vehiclePhoto || (t.vehiclePhotos && t.vehiclePhotos.length > 0 && t.vehiclePhotos[0]) || 'https://via.placeholder.com/80x60?text=VEHICLE';

    return (
      <View
        key={t.id}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          shadowColor: colors.black,
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Transporter Profile Section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#eee',
              overflow: 'hidden',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 16,
              borderWidth: 2,
              borderColor: colors.primary + '20',
            }}
          >
            <Image
              source={{ uri: profilePhotoUri }}
              style={{ width: 60, height: 60, borderRadius: 30 }}
              resizeMode="cover"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 6 }}>
              {displayName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <MaterialCommunityIcons name="star" size={18} color={colors.warning} />
              <Text style={{ fontSize: 15, color: colors.text.secondary, marginLeft: 6, fontWeight: '600' }}>
                {t.rating ? `${t.rating}/5` : 'New'}
              </Text>
              {t.experience && (
                <>
                  <Text style={{ fontSize: 14, color: colors.text.light, marginHorizontal: 8 }}>•</Text>
                  <Text style={{ fontSize: 14, color: colors.text.secondary, fontWeight: '500' }}>
                    {t.experience} years exp.
                  </Text>
                </>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
              <Text style={{ fontSize: 13, color: colors.success, marginLeft: 6, fontWeight: '500' }}>
                {t.tripsCompleted || 0} trips completed
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: accent, marginBottom: 4 }}>
              {estAmount}
            </Text>
            <Text style={{ fontSize: 12, color: colors.text.light, textAlign: 'right' }}>
              {calculatedDistance || 'Distance calculating...'}
            </Text>
          </View>
        </View>

        {/* Vehicle Information - Enhanced */}
        <View style={{
          backgroundColor: colors.background,
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.text.light + '20'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Image
              source={{ uri: vehiclePhotoUri }}
              style={{ width: 100, height: 75, borderRadius: 8, marginRight: 12 }}
              resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 4 }}>
                {t.vehicleMake} {t.vehicleModel} ({t.vehicleYear})
              </Text>
              <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 3, fontWeight: '600' }}>
                {t.vehicleType} • {t.capacity}T • {t.bodyType}
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 2 }}>
                Plate: {t.reg || 'N/A'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary }}>
                Drive: {t.driveType || 'N/A'}
              </Text>
            </View>
          </View>

          {/* ETA and Cost Row */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: colors.primary + '10',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={colors.primary} />
              <Text style={{ fontSize: 14, color: colors.primary, marginLeft: 6, fontWeight: '600' }}>
                ETA: {t.est || 'Calculating...'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="currency-usd" size={16} color={colors.success} />
              <Text style={{ fontSize: 14, color: colors.success, marginLeft: 6, fontWeight: '600' }}>
                {t.estimatedCost || 'Cost calculating...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Special Features - Enhanced */}
        {t.specialFeatures && t.specialFeatures.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: colors.text.primary, marginBottom: 8, fontWeight: '600' }}>
              Special Features:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {t.specialFeatures.slice(0, 4).map((feature: string, index: number) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: colors.primary + '15',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.primary + '30',
                  }}
                >
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>
                    {feature}
                  </Text>
                </View>
              ))}
              {t.specialFeatures.length > 4 && (
                <Text style={{ fontSize: 11, color: colors.text.light, fontStyle: 'italic', alignSelf: 'center' }}>
                  +{t.specialFeatures.length - 4} more
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Action Button - Enhanced */}
        <TouchableOpacity
          style={{
            backgroundColor: accent,
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 10,
            alignItems: 'center',
            shadowColor: accent,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
          }}
          onPress={() => handleSelect(t)}
        >
          <Text style={{ color: colors.white, fontSize: 16, fontWeight: 'bold' }}>
            Select Transporter
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ width: '100%', marginTop: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: accent }}>
        Available Transporters ({filteredTransporters.length})
      </Text>

      {loading || transportersLoading ? (
        <>
          <Text style={{ textAlign: 'center', color: accent, fontWeight: 'bold', marginBottom: 12, fontSize: 16 }}>
            Finding available transporters...
          </Text>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                opacity: 0.6,
              }}
            >
              <View style={{ marginRight: 16 }}>
                <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#e0e0e0' }} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ height: 16, width: '60%', backgroundColor: '#e0e0e0', borderRadius: 8, marginBottom: 8 }} />
                <View style={{ height: 12, width: '40%', backgroundColor: '#e0e0e0', borderRadius: 8, marginBottom: 6 }} />
                <View style={{ height: 10, width: '30%', backgroundColor: '#e0e0e0', borderRadius: 8, marginBottom: 6 }} />
                <View style={{ height: 14, width: '50%', backgroundColor: '#e0e0e0', borderRadius: 8 }} />
              </View>
              <View style={{ width: 70, height: 32, backgroundColor: '#e0e0e0', borderRadius: 8 }} />
            </View>
          ))}
        </>
      ) : filteredTransporters.length === 0 ? (
        <View style={{ alignItems: 'center', padding: 20 }}>
          <MaterialCommunityIcons name="truck" size={48} color={colors.text.light} />
          <Text style={{ fontSize: 16, color: colors.text.secondary, marginTop: 12, textAlign: 'center' }}>
            No suitable transporters found for your request.
          </Text>
          <Text style={{ fontSize: 14, color: colors.text.light, marginTop: 8, textAlign: 'center' }}>
            Try adjusting your requirements or expanding your search area.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {filteredTransporters.map(renderTransporterCard)}
        </ScrollView>
      )}
    </View>
  );
};

export default FindTransporters;
