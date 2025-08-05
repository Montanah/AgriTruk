import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Animated, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTransporters } from '../hooks/UseTransporters';
import { mockTransporters as importedMockTransporters } from '../mocks/transporters';
import colors from '../constants/colors';

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
      return amt >= 1e6
        ? `KES ${(amt / 1e6).toFixed(1).replace(/\.0$/, '')}M`
        : amt >= 1e3
        ? `KES ${(amt / 1e3).toFixed(1).replace(/\.0$/, '')}K`
        : `KES ${amt.toFixed(0)}`;
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
          },
          vehicle: {
            type: t.vehicleType,
            color: t.vehicleColor,
            make: t.vehicleMake,
            capacity: t.capacity + 'T',
            plate: t.reg,
            driveType: t.driveType || '',
          },
          reference: 'REF-' + t.id,
          eta: t.est,
          distance,
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
        <ScrollView style={{ maxHeight: 420 }}>
          {filteredTransporters.map((t) => {
            const estAmount = getEstAmount(t, distance);
            const displayName = t.name && t.name.length > 18 ? t.name.slice(0, 16) + '…' : t.name;
            const photoUri = (t.vehiclePhotos && t.vehiclePhotos.length > 0 && t.vehiclePhotos[0]) || t.photo || 'https://via.placeholder.com/54x54?text=TRUK';
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
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
                    <Animated.Image
                      source={{ uri: photoUri }}
                      style={{ width: 54, height: 54, borderRadius: 27 }}
                      defaultSource={{ uri: 'https://via.placeholder.com/54x54?text=TRUK' }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: colors.text.primary }} numberOfLines={1} ellipsizeMode="tail">{displayName}</Text>
                    <Text style={{ color: accent, fontWeight: 'bold', fontSize: 13 }}>ETA: {t.est || 'N/A'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="star" size={16} color={colors.secondary} style={{ marginRight: 2 }} />
                      <Text style={{ color: colors.secondary, fontWeight: 'bold', fontSize: 15 }}>{t.rating}</Text>
                    </View>
                    <Text style={{ color: t.status === 'Active' ? colors.success : colors.warning, fontWeight: 'bold', fontSize: 12 }}>{t.status}</Text>
                  </View>
                </View>
                <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 15, marginBottom: 2 }}>
                  {t.vehicleType}{t.bodyType ? ` (${t.bodyType})` : ''} • {t.vehicleMake} • {t.vehicleColor} • {t.capacity}T • {t.reg}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  {t.refrigeration && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                      <MaterialCommunityIcons name="snowflake" size={15} color={accent} style={{ marginRight: 2 }} />
                      <Text style={{ color: accent, fontSize: 13 }}>Refrigerated</Text>
                    </View>
                  )}
                  {t.humidityControl && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                      <MaterialCommunityIcons name="water-percent" size={15} color={accent} style={{ marginRight: 2 }} />
                      <Text style={{ color: accent, fontSize: 13 }}>Humidity Ctrl</Text>
                    </View>
                  )}
                  {t.driveType && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                      <MaterialCommunityIcons name="car" size={15} color={accent} style={{ marginRight: 2 }} />
                      <Text style={{ color: accent, fontSize: 13 }}>{t.driveType}</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: colors.secondary, fontWeight: 'bold', fontSize: 15, marginBottom: 2 }}>
                  Est: {estAmount || 'N/A'}
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: accent,
                    borderRadius: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 18,
                    alignSelf: 'flex-end',
                    marginTop: 8,
                  }}
                  onPress={() => handleSelect(t)}
                >
                  <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 16 }}>Select</Text>
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
