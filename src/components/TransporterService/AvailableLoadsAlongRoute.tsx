import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import { apiRequest } from '../../utils/api';

// Type for a load/job
export interface Load {
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
}

interface Props {
  tripId: string;
  onLoadAccepted?: (load: Load) => void;
  onViewAll?: () => void;
}

const AvailableLoadsAlongRoute: React.FC<Props> = ({ tripId, onLoadAccepted, onViewAll }) => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvailableLoads = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiRequest(`/transporters/trips/${tripId}/available-loads`);
        if (Array.isArray(data)) {
          setLoads(data.slice(0, 3)); // Show only first 3 loads
        } else {
          setLoads([]);
        }
      } catch (error) {
        console.error('Failed to fetch available loads:', error);
        setError('Failed to load available loads');
        setLoads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableLoads();
  }, [tripId]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return colors.error;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return colors.text.secondary;
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'fire';
      case 'medium':
        return 'clock-outline';
      case 'low':
        return 'check-circle-outline';
      default:
        return 'information-outline';
    }
  };

  const handleAccept = async (load: Load) => {
    setAcceptingId(load.id);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (onLoadAccepted) onLoadAccepted(load);

      // Remove from list
      setLoads(prev => prev.filter(l => l.id !== load.id));

      Alert.alert('Success', `Load ${load.id} accepted successfully!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to accept load. Please try again.');
    } finally {
      setAcceptingId(null);
    }
  };

  const renderLoadItem = ({ item }: { item: Load }) => (
    <View style={styles.loadCard}>
      {/* Header with urgency indicator */}
      <View style={styles.loadHeader}>
        <View style={styles.urgencyContainer}>
          <MaterialCommunityIcons
            name={getUrgencyIcon(item.urgency)}
            size={16}
            color={getUrgencyColor(item.urgency)}
          />
          <Text style={[styles.urgencyText, { color: getUrgencyColor(item.urgency) }]}>
            {item.urgency.toUpperCase()} PRIORITY
          </Text>
        </View>
        <Text style={styles.loadId}>#{item.id}</Text>
      </View>

      {/* Route information */}
      <View style={styles.routeContainer}>
        <View style={styles.routeItem}>
          <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
          <Text style={styles.routeText}>{item.pickup}</Text>
        </View>
        <View style={styles.routeArrow}>
          <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.secondary} />
        </View>
        <View style={styles.routeItem}>
          <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.secondary} />
          <Text style={styles.routeText}>{item.dropoff}</Text>
        </View>
      </View>

      {/* Load details */}
      <View style={styles.loadDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="weight-kilogram" size={14} color={colors.text.secondary} />
            <Text style={styles.detailText}>{item.weight} kg</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={14} color={colors.text.secondary} />
            <Text style={styles.detailText}>{item.route.distance}</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.detailText}>{item.route.estimatedTime}</Text>
          </View>
        </View>
      </View>

      {/* Description */}
      {item.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>
      )}

      {/* Special requirements */}
      {item.specialRequirements.length > 0 && (
        <View style={styles.requirementsContainer}>
          {item.specialRequirements.map((req, index) => (
            <View key={index} style={styles.requirementBadge}>
              <MaterialCommunityIcons name="check-circle" size={12} color={colors.primary} />
              <Text style={styles.requirementText}>{req}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Client rating and estimated value */}
      <View style={styles.clientContainer}>
        <View style={styles.clientInfo}>
          <View style={styles.ratingContainer}>
            <MaterialCommunityIcons name="star" size={14} color={colors.secondary} />
            <Text style={styles.ratingText}>{item.clientRating}</Text>
          </View>
          <Text style={styles.valueText}>Ksh {item.estimatedValue.toLocaleString()}</Text>
        </View>
      </View>

      {/* Detour information */}
      {item.detourKm > 0 && (
        <View style={styles.detourContainer}>
          <MaterialCommunityIcons name="map-marker-path" size={14} color={colors.warning} />
          <Text style={styles.detourText}>Detour: {item.detourKm} km</Text>
        </View>
      )}

      {/* Pricing and action */}
      <View style={styles.pricingContainer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Earnings:</Text>
          <Text style={styles.priceValue}>Ksh {item.price.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => handleAccept(item)}
          disabled={acceptingId === item.id}
        >
          {acceptingId === item.id ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={16} color={colors.white} />
              <Text style={styles.acceptText}>Accept Load</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="map-marker-path" size={24} color={colors.primary} />
          <Text style={styles.title}>Available Loads Along Your Route</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{loads.length}</Text>
          </View>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={loads}
        keyExtractor={item => item.id}
        renderItem={renderLoadItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  badgeText: {
    color: colors.white,
    fontSize: fonts.size.xs,
    fontWeight: 'bold',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: colors.primary,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: spacing.xl * 2,
  },
  loadCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  loadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  urgencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgencyText: {
    fontSize: fonts.size.xs,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  loadId: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  routeArrow: {
    marginHorizontal: spacing.sm,
  },
  loadDetails: {
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  descriptionContainer: {
    marginBottom: spacing.sm,
  },
  descriptionText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
  requirementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  requirementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  requirementText: {
    fontSize: fonts.size.xs,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 2,
  },
  clientContainer: {
    marginBottom: spacing.sm,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: fonts.size.sm,
    color: colors.secondary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  valueText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: '600',
  },
  detourContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detourText: {
    fontSize: fonts.size.xs,
    color: colors.warning,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  pricingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
  },
  priceValue: {
    fontSize: fonts.size.lg,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  acceptText: {
    color: colors.white,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  separator: {
    height: spacing.sm,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginVertical: 24,
  },
});

export default AvailableLoadsAlongRoute;
