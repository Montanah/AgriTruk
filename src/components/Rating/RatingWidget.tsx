import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants';
import { enhancedRatingService, RatingStats } from '../../services/enhancedRatingService';

interface RatingWidgetProps {
  transporterId: string;
  transporterName: string;
  compact?: boolean;
  showViewAll?: boolean;
  onViewAll?: () => void;
  onPress?: () => void;
}

const RatingWidget: React.FC<RatingWidgetProps> = ({
  transporterId,
  transporterName,
  compact = false,
  showViewAll = true,
  onViewAll,
  onPress,
}) => {
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRatingStats();
  }, [transporterId]);

  const loadRatingStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const ratingStats = await enhancedRatingService.getTransporterStats(transporterId);
      setStats(ratingStats);
    } catch (err) {
      console.error('Error loading rating stats:', err);
      setError('Failed to load ratings');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return colors.success;
    if (rating >= 3.5) return '#FF9800';
    if (rating >= 2.5) return '#FF5722';
    return colors.error;
  };

  const renderStars = (rating: number, size: 'small' | 'medium' | 'large' = 'medium') => {
    const starSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <View style={styles.starContainer}>
        {Array.from({ length: 5 }, (_, index) => {
          if (index < fullStars) {
            return (
              <MaterialCommunityIcons
                key={index}
                name="star"
                size={starSize}
                color="#FFD700"
              />
            );
          } else if (index === fullStars && hasHalfStar) {
            return (
              <MaterialCommunityIcons
                key={index}
                name="star-half-full"
                size={starSize}
                color="#FFD700"
              />
            );
          } else {
            return (
              <MaterialCommunityIcons
                key={index}
                name="star-outline"
                size={starSize}
                color={colors.text.light}
              />
            );
          }
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Loading ratings...</Text>
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <MaterialCommunityIcons name="star-outline" size={20} color={colors.text.light} />
        <Text style={styles.noRatingText}>No ratings yet</Text>
      </View>
    );
  }

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.compactRating}>
          <Text style={[styles.compactRatingValue, { color: getRatingColor(stats.overallAverage) }]}>
            {stats.overallAverage.toFixed(1)}
          </Text>
          {renderStars(stats.overallAverage, 'small')}
        </View>
        <Text style={styles.compactCount}>
          ({stats.totalRatings} ratings)
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <View style={styles.ratingInfo}>
          <Text style={[styles.ratingValue, { color: getRatingColor(stats.overallAverage) }]}>
            {stats.overallAverage.toFixed(1)}
          </Text>
          {renderStars(stats.overallAverage, 'medium')}
          <Text style={styles.ratingCount}>
            Based on {stats.totalRatings} ratings
          </Text>
        </View>
        
        {showViewAll && onViewAll && (
          <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
            <Text style={styles.viewAllText}>View All</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.recommendationRate}%</Text>
          <Text style={styles.statLabel}>Recommend</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.verifiedRatings}</Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons
            name={stats.recentTrend === 'improving' ? 'trending-up' : 
                  stats.recentTrend === 'declining' ? 'trending-down' : 'trending-neutral'}
            size={20}
            color={stats.recentTrend === 'improving' ? colors.success : 
                   stats.recentTrend === 'declining' ? colors.error : colors.text.secondary}
          />
          <Text style={[styles.statLabel, { 
            color: stats.recentTrend === 'improving' ? colors.success : 
                   stats.recentTrend === 'declining' ? colors.error : colors.text.secondary 
          }]}>
            {stats.recentTrend}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  noRatingText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.light,
    marginLeft: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  ratingInfo: {
    flex: 1,
  },
  ratingValue: {
    fontSize: 24,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.xs,
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  ratingCount: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginRight: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  compactRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactRatingValue: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    marginRight: spacing.sm,
  },
  compactCount: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
});

export default RatingWidget;

