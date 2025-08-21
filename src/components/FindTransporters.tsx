import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import colors from '../constants/colors';
import { useTransporters } from '../hooks/UseTransporters';
import { mockTransporters as importedMockTransporters } from '../mocks/transporters';

const mockTransporters = Array.isArray(importedMockTransporters) ? importedMockTransporters : [];

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

  // Normalize requests to array
  const reqs = Array.isArray(requests) ? requests : [requests];
  // For consolidated, show combined info
  const isConsolidated = reqs.length > 1;

  // Get transporters from hook and mock
  let { transporters } = useTransporters();
  if (!Array.isArray(transporters)) transporters = [];

  useEffect(() => {
    setLoading(true);
    setFilteredTransporters([]);
    setTimeout(() => {
      let allTransporters = [...transporters, ...mockTransporters];
      // TODO: Add real filtering logic based on request(s) details
      setFilteredTransporters(allTransporters);
      setLoading(false);
    }, 1000);
  }, [JSON.stringify(requests)]);

  // Helper to calculate estimated amount
  function getEstAmount(t: any, distance: string | number) {
    const costPerKm = t.costPerKm || 100;
    let distNum = 0;
    if (typeof distance === 'string') {
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
      ? { requests: reqs, transporter: t, type: 'instant', status: 'in-progress', eta: t.est, distance }
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
        distance,
        estimatedCost: t.estimatedCost,
        specialFeatures: t.specialFeatures,
      };
    if (onSelect) {
      onSelect(t, payload);
    } else {
      navigation.navigate('TripDetails', isConsolidated ? { requests: reqs, transporter: t, eta: t.est, distance } : { booking: payload });
    }
  }

  return (
    <View style={{ width: '100%', marginTop: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: accent }}>
        Available Transporters
      </Text>
      {loading ? (
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
        <Text style={{ color: colors.error, marginBottom: 12 }}>
          No suitable transporters found for your request.
        </Text>
      ) : (
        <ScrollView>
          {filteredTransporters.map((t) => {
            // Fallback random distance if not valid
            let distNum = 0;
            if (typeof distance === 'string') {
              const match = distance.replace(/,/g, '').match(/([\d.]+)/);
              if (match) distNum = parseFloat(match[1]);
            } else if (typeof distance === 'number') {
              distNum = distance;
            }
            if (!distNum || isNaN(distNum) || distNum <= 0) {
              distNum = Math.floor(Math.random() * 281) + 20; // 20-300 km
            }
            const estAmount = getEstAmount(t, distNum);
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 27,
                      backgroundColor: '#eee',
                      overflow: 'hidden',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 16,
                    }}
                  >
                    <Image
                      source={{ uri: profilePhotoUri }}
                      style={{ width: 54, height: 54, borderRadius: 27 }}
                      defaultSource={{ uri: 'https://via.placeholder.com/54x54?text=TRUK' }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: colors.text.primary }} numberOfLines={1} ellipsizeMode="tail">
                      {displayName}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <MaterialCommunityIcons name="star" size={14} color={colors.secondary} style={{ marginRight: 4 }} />
                      <Text style={{ color: colors.secondary, fontWeight: 'bold', fontSize: 13 }}>{t.rating || 'N/A'}</Text>
                      <Text style={{ color: colors.text.secondary, fontSize: 12, marginLeft: 8 }}>
                        {t.tripsCompleted || 0} trips
                      </Text>
                    </View>
                    <Text style={{ color: colors.text.secondary, fontSize: 12, marginTop: 2 }}>
                      {t.experience || 'N/A'} • {t.availability || 'N/A'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{
                      backgroundColor: t.status === 'Active' ? colors.success + '20' : colors.warning + '20',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}>
                      <Text style={{
                        color: t.status === 'Active' ? colors.success : colors.warning,
                        fontWeight: 'bold',
                        fontSize: 11
                      }}>
                        {t.status || 'Unknown'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Vehicle Details Section */}
                <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 80,
                      height: 60,
                      borderRadius: 8,
                      backgroundColor: '#eee',
                      overflow: 'hidden',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Image
                      source={{ uri: vehiclePhotoUri }}
                      style={{ width: 80, height: 60, borderRadius: 8 }}
                      defaultSource={{ uri: 'https://via.placeholder.com/80x60?text=VEHICLE' }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 14, marginBottom: 2 }}>
                      {t.vehicleType}{t.bodyType ? ` (${t.bodyType})` : ''} • {t.vehicleMake}
                    </Text>
                    <Text style={{ color: colors.text.secondary, fontSize: 12, marginBottom: 2 }}>
                      {t.vehicleColor} • {t.capacity}T • {t.reg}
                    </Text>
                    <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
                      {t.driveType || 'N/A'} • {t.year || 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Special Features */}
                {t.specialFeatures && t.specialFeatures.length > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                    {t.specialFeatures.map((feature, index) => (
                      <View key={index} style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginRight: 8,
                        marginBottom: 4,
                        backgroundColor: accent + '15',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 8,
                      }}>
                        <MaterialCommunityIcons name="check-circle" size={12} color={accent} style={{ marginRight: 2 }} />
                        <Text style={{ color: accent, fontSize: 11, fontWeight: '500' }}>
                          {feature.replace('-', ' ')}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Insurance & GPS Status */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  {t.insurance && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                      <MaterialCommunityIcons name="shield-check" size={14} color={colors.success} style={{ marginRight: 4 }} />
                      <Text style={{ color: colors.success, fontSize: 12, fontWeight: '500' }}>Insured</Text>
                    </View>
                  )}
                  {t.gpsTracking && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                      <MaterialCommunityIcons name="crosshairs-gps" size={14} color={colors.secondary} style={{ marginRight: 4 }} />
                      <Text style={{ color: colors.secondary, fontSize: 12, fontWeight: '500' }}>GPS</Text>
                    </View>
                  )}
                </View>

                {/* ETA & Cost Section */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: colors.background,
                  padding: 12,
                  borderRadius: 10,
                  marginBottom: 12,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="time" size={16} color={accent} style={{ marginRight: 6 }} />
                    <Text style={{ color: accent, fontWeight: 'bold', fontSize: 14 }}>
                      ETA: {t.est || 'N/A'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <FontAwesome5 name="shipping-fast" size={14} color={colors.secondary} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.secondary, fontWeight: 'bold', fontSize: 14 }}>
                      {t.distance || 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Estimated Cost */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}>
                  <Text style={{ color: colors.text.primary, fontWeight: 'bold', fontSize: 16 }}>
                    Estimated Cost:
                  </Text>
                  <Text style={{ color: colors.secondary, fontWeight: 'bold', fontSize: 18 }}>
                    {estAmount || 'N/A'}
                  </Text>
                </View>

                {/* Select Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: accent,
                    borderRadius: 10,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    alignSelf: 'flex-end',
                  }}
                  onPress={() => handleSelect(t)}
                >
                  <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 16 }}>Select Transporter</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default FindTransporters;
