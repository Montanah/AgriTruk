import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants';
import { EnhancedRating, RatingStats, RatingCategory } from '../../services/enhancedRatingService';

interface RatingDisplayProps {
  stats: RatingStats;
  ratings?: EnhancedRating[];
  showDetails?: boolean;
  onViewAll?: () => void;
  onRatingPress?: (rating: EnhancedRating) => void;
  compact?: boolean;
}

const RATING_CATEGORIES: Record<RatingCategory, {
  label: string;
  icon: string;
}> = {
  overall: { label: 'Overall', icon: 'star' },
  punctuality: { label: 'Punctuality', icon: 'clock' },
  communication: { label: 'Communication', icon: 'message' },
  safety: { label: 'Safety', icon: 'shield-check' },
  vehicle_condition: { label: 'Vehicle', icon: 'truck' },
  professionalism: { label: 'Professionalism', icon: 'account-tie' },
  value_for_money: { label: 'Value', icon: 'cash' },
};

const StarRating: React.FC<{
  rating: number;
  size?: 'small' | 'medium' | 'large';
  showValue?: boolean;
  maxRating?: number;
}> = ({ rating, size = 'medium', showValue = false, maxRating = 5 }) => {
  const starSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <View style={styles.starContainer}>
      {Array.from({ length: maxRating }, (_, index) => {
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
      {showValue && (
        <Text style={[styles.ratingValue, { fontSize: size === 'small' ? 12 : size === 'large' ? 18 : 14 }]}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
};

const RatingDistribution: React.FC<{
  distribution: RatingStats['ratingDistribution'];
  totalRatings: number;
}> = ({ distribution, totalRatings }) => {
  const maxCount = Math.max(...Object.values(distribution));
  
  return (
    <View style={styles.distributionContainer}>
      {Object.entries(distribution)
        .reverse()
        .map(([stars, count]) => {
          const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
          
          return (
            <View key={stars} style={styles.distributionRow}>
              <Text style={styles.distributionStars}>{stars}★</Text>
              <View style={styles.distributionBarContainer}>
                <View
                  style={[
                    styles.distributionBar,
                    { width: `${barWidth}%` },
                  ]}
                />
              </View>
              <Text style={styles.distributionCount}>{count}</Text>
            </View>
          );
        })}
    </View>
  );
};

const CategoryBreakdown: React.FC<{
  categoryAverages: RatingStats['categoryAverages'];
  compact?: boolean;
}> = ({ categoryAverages, compact = false }) => {
  const categories = Object.entries(categoryAverages) as [keyof typeof categoryAverages, number][];
  
  if (compact) {
    return (
      <View style={styles.compactCategories}>
        {categories.slice(0, 3).map(([category, average]) => (
          <View key={category} style={styles.compactCategoryItem}>
            <MaterialCommunityIcons
              name={RATING_CATEGORIES[category]?.icon || 'star'}
              size={16}
              color={colors.primary}
            />
            <Text style={styles.compactCategoryLabel}>
              {RATING_CATEGORIES[category]?.label || category}
            </Text>
            <Text style={styles.compactCategoryValue}>
              {average.toFixed(1)}
            </Text>
          </View>
        ))}
      </View>
    );
  }
  
  return (
    <View style={styles.categoriesContainer}>
      {categories.map(([category, average]) => (
        <View key={category} style={styles.categoryItem}>
          <View style={styles.categoryInfo}>
            <MaterialCommunityIcons
              name={RATING_CATEGORIES[category]?.icon || 'star'}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.categoryLabel}>
              {RATING_CATEGORIES[category]?.label || category}
            </Text>
          </View>
          <View style={styles.categoryRating}>
            <StarRating rating={average} size="small" />
            <Text style={styles.categoryValue}>{average.toFixed(1)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const RatingItem: React.FC<{
  rating: EnhancedRating;
  onPress?: () => void;
}> = ({ rating, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={styles.ratingItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.ratingHeader}>
        <View style={styles.ratingUserInfo}>
          <Text style={styles.ratingUserName}>
            {rating.isAnonymous ? 'Anonymous' : rating.raterName}
          </Text>
          <View style={styles.ratingMeta}>
            <Text style={styles.ratingRole}>
              {rating.raterRole.charAt(0).toUpperCase() + rating.raterRole.slice(1)}
            </Text>
            <Text style={styles.ratingDate}>• {formatDate(rating.createdAt)}</Text>
            {rating.isVerified && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-circle" size={12} color={colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.ratingScore}>
          <StarRating rating={rating.overallRating} size="small" showValue />
        </View>
      </View>
      
      {rating.comment && (
        <Text style={styles.ratingComment} numberOfLines={3}>
          {rating.comment}
        </Text>
      )}
      
      {rating.highlights && rating.highlights.length > 0 && (
        <View style={styles.ratingHighlights}>
          <Text style={styles.highlightsTitle}>Highlights:</Text>
          {rating.highlights.map((highlight, index) => (
            <Text key={index} style={styles.highlightItem}>• {highlight}</Text>
          ))}
        </View>
      )}
      
      <View style={styles.ratingFooter}>
        <View style={styles.ratingActions}>
          {rating.wouldRecommend && (
            <View style={styles.recommendationBadge}>
              <MaterialCommunityIcons name="thumb-up" size={14} color={colors.success} />
              <Text style={styles.recommendationText}>Recommended</Text>
            </View>
          )}
        </View>
        
        {rating.transporterResponse && (
          <View style={styles.transporterResponse}>
            <Text style={styles.responseLabel}>Transporter Response:</Text>
            <Text style={styles.responseText}>{rating.transporterResponse.comment}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const RatingDisplay: React.FC<RatingDisplayProps> = ({
  stats,
  ratings = [],
  showDetails = true,
  onViewAll,
  onRatingPress,
  compact = false,
}) => {
  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return colors.success;
    if (rating >= 3.5) return '#FF9800';
    if (rating >= 2.5) return '#FF5722';
    return colors.error;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'trending-up';
      case 'declining':
        return 'trending-down';
      default:
        return 'trending-neutral';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return colors.success;
      case 'declining':
        return colors.error;
      default:
        return colors.text.secondary;
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <View style={styles.compactRating}>
            <Text style={styles.compactRatingValue}>
              {stats.overallAverage.toFixed(1)}
            </Text>
            <StarRating rating={stats.overallAverage} size="small" />
          </View>
          <Text style={styles.compactCount}>
            ({stats.totalRatings} ratings)
          </Text>
        </View>
        <CategoryBreakdown categoryAverages={stats.categoryAverages} compact />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <View style={styles.mainRating}>
          <Text style={[styles.ratingValue, { color: getRatingColor(stats.overallAverage) }]}>
            {stats.overallAverage.toFixed(1)}
          </Text>
          <StarRating rating={stats.overallAverage} size="large" />
          <Text style={styles.ratingCount}>
            Based on {stats.totalRatings} ratings
          </Text>
        </View>
        
        <View style={styles.statsGrid}>
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
              name={getTrendIcon(stats.recentTrend)}
              size={20}
              color={getTrendColor(stats.recentTrend)}
            />
            <Text style={[styles.statLabel, { color: getTrendColor(stats.recentTrend) }]}>
              {stats.recentTrend}
            </Text>
          </View>
        </View>
      </View>

      {showDetails && (
        <>
          {/* Category Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rating Breakdown</Text>
            <CategoryBreakdown categoryAverages={stats.categoryAverages} />
          </View>

          {/* Rating Distribution */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rating Distribution</Text>
            <RatingDistribution
              distribution={stats.ratingDistribution}
              totalRatings={stats.totalRatings}
            />
          </View>

          {/* Role-based Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ratings by User Type</Text>
            <View style={styles.roleBreakdown}>
              {Object.entries(stats.ratingsByRole).map(([role, data]) => (
                <View key={role} style={styles.roleItem}>
                  <Text style={styles.roleLabel}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}s
                  </Text>
                  <View style={styles.roleRating}>
                    <StarRating rating={data.average} size="small" />
                    <Text style={styles.roleValue}>
                      {data.average.toFixed(1)} ({data.count})
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Recent Ratings */}
          {ratings.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Ratings</Text>
                {onViewAll && (
                  <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
                    <Text style={styles.viewAllText}>View All</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {ratings.slice(0, 5).map((rating) => (
                  <RatingItem
                    key={rating.id}
                    rating={rating}
                    onPress={() => onRatingPress?.(rating)}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    margin: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  compactContainer: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.xs,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  mainRating: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ratingValue: {
    fontSize: 48,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.sm,
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  ratingValue: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  ratingCount: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
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
  categoriesContainer: {
    gap: spacing.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryLabel: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  categoryRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryValue: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  compactCategories: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  compactCategoryItem: {
    alignItems: 'center',
    flex: 1,
  },
  compactCategoryLabel: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  compactCategoryValue: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginTop: 2,
  },
  distributionContainer: {
    gap: spacing.sm,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distributionStars: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    width: 30,
  },
  distributionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginHorizontal: spacing.sm,
  },
  distributionBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  distributionCount: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    width: 30,
    textAlign: 'right',
  },
  roleBreakdown: {
    gap: spacing.sm,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  roleLabel: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
  },
  roleRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleValue: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  ratingItem: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginRight: spacing.sm,
    width: 280,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  ratingUserInfo: {
    flex: 1,
  },
  ratingUserName: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  ratingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingRole: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  ratingDate: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: colors.text.light,
    marginLeft: spacing.xs,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  verifiedText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.medium,
    color: colors.success,
    marginLeft: 2,
  },
  ratingScore: {
    alignItems: 'flex-end',
  },
  ratingComment: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  ratingHighlights: {
    marginBottom: spacing.sm,
  },
  highlightsTitle: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.bold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  highlightItem: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  ratingFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  ratingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recommendationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  recommendationText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.medium,
    color: colors.success,
    marginLeft: 4,
  },
  transporterResponse: {
    backgroundColor: colors.primary + '10',
    padding: spacing.sm,
    borderRadius: 6,
  },
  responseLabel: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  responseText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactRatingValue: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  compactCount: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
});

export default RatingDisplay;

