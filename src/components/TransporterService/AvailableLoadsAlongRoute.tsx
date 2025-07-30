import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';

// Type for a load/job
export interface Load {
  id: string;
  pickup: string;
  dropoff: string;
  detourKm: number;
  weight: number;
  price: number;
  description?: string;
}

interface Props {
  tripId: string;
  onLoadAccepted?: (load: Load) => void;
}

const AvailableLoadsAlongRoute: React.FC<Props> = ({ tripId, onLoadAccepted }) => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Fetch available loads along the route
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    // Replace with your backend API endpoint
    fetch(`/api/loads/along-route?tripId=${tripId}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setLoads(data.loads || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Failed to fetch loads.');
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [tripId]);

  const handleAccept = async (load: Load) => {
    setAcceptingId(load.id);
    try {
      // Replace with your backend API endpoint
      await fetch(`/api/loads/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, loadId: load.id }),
      });
      if (onLoadAccepted) onLoadAccepted(load);
      setLoads(prev => prev.filter(l => l.id !== load.id));
    } catch {
      setError('Failed to accept load.');
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginVertical: 24 }} color={colors.secondary} />;
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!loads.length) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Available Loads Along Your Route</Text>
      <FlatList
        data={loads}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.loadRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <MaterialCommunityIcons name="map-marker-distance" size={18} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.loadMain}>{item.pickup} → {item.dropoff}</Text>
              </View>
              <Text style={styles.loadDetail}>Detour: <Text style={{ color: colors.secondary }}>{item.detourKm} km</Text></Text>
              <Text style={styles.loadDetail}>Weight: <Text style={{ color: colors.secondary }}>{item.weight} kg</Text></Text>
              <Text style={styles.loadDetail}>Price: <Text style={{ color: colors.primary }}>Ksh {item.price}</Text></Text>
              {item.description && <Text style={styles.loadDesc}>{item.description}</Text>}
            </View>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => handleAccept(item)}
              disabled={acceptingId === item.id}
            >
              {acceptingId === item.id ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.acceptText}>Accept</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    marginVertical: 18,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 10,
  },
  loadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    shadowColor: colors.primary,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  loadMain: {
    fontWeight: 'bold',
    color: colors.primary,
    fontSize: 15,
  },
  loadDetail: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 1,
  },
  loadDesc: {
    color: colors.text.light,
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  acceptBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  acceptText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginVertical: 18,
  },
});

export default AvailableLoadsAlongRoute;
