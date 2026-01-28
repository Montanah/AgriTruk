import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../constants';
import RatingDisplay from '../components/Rating/RatingDisplay';
import { 
  enhancedRatingService, 
  RatingStats, 
  EnhancedRating,
  RaterRole 
} from '../services/enhancedRatingService';

interface RatingAnalyticsScreenProps {
  route: {
    params: {
      transporterId: string;
      transporterName: string;
    };
  };
}

const RatingAnalyticsScreen: React.FC<RatingAnalyticsScreenProps> = ({ route }) => {
  const { transporterId, transporterName } = route.params;
  
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [ratings, setRatings] = useState<EnhancedRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | RaterRole>('all');
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    loadData();
  }, [transporterId, filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load rating statistics
      const statsData = await enhancedRatingService.getTransporterStats(transporterId);
      setStats(statsData);
      
      // Load ratings with filter
      const ratingsData = await enhancedRatingService.getTransporterRatings(
        transporterId,
        {
          limit: 20,
          role: filter === 'all' ? undefined : filter,
        }
      );
      setRatings(ratingsData.ratings);
    } catch (error) {
      console.error('Error loading rating data:', error);
      Alert.alert('Error', 'Failed to load rating data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleViewAllRatings = () => {
    // Navigate to full ratings list
    // This would typically navigate to a dedicated ratings list screen
    Alert.alert('View All Ratings', 'This would open a full ratings list screen');
  };

  const handleRatingPress = (rating: EnhancedRating) => {
    // Show rating details or allow response
    Alert.alert(
      'Rating Details',
      `Rating from ${rating.raterName}\n\n${rating.comment || 'No comment provided'}`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Respond', onPress: () => respondToRating(rating) },
      ]
    );
  };

  const respondToRating = async (rating: EnhancedRating) => {
    // This would typically open a response modal or screen
    Alert.alert('Respond to Rating', 'This would open a response interface');
  };

  const getFilterOptions = () => [
    { key: 'all', label: 'All Ratings', count: stats?.totalRatings || 0 },
    { key: 'client', label: 'Clients', count: stats?.ratingsByRole.client.count || 0 },
    { key: 'broker', label: 'Brokers', count: stats?.ratingsByRole.broker.count || 0 },
    { key: 'business', label: 'Businesses', count: stats?.ratingsByRole.business.count || 0 },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading rating analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>No Rating Data</Text>
          <Text style={styles.errorMessage}>
            No ratings found for this transporter yet.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rating Analytics</Text>
        <Text style={styles.headerSubtitle}>{transporterName}</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Options */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {getFilterOptions().map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterButton,
                  filter === option.key && styles.activeFilterButton,
                ]}
                onPress={() => setFilter(option.key as any)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filter === option.key && styles.activeFilterButtonText,
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.filterCount,
                  filter === option.key && styles.activeFilterCount,
                ]}>
                  {option.count}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Rating Display */}
        <RatingDisplay
          stats={stats}
          ratings={ratings}
          showDetails={showDetails}
          onViewAll={handleViewAllRatings}
          onRatingPress={handleRatingPress}
        />

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowDetails(!showDetails)}
          >
            <MaterialCommunityIcons
              name={showDetails ? 'eye-off' : 'eye'}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.actionButtonText}>
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewAllRatings}
          >
            <MaterialCommunityIcons name="format-list-bulleted" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>View All Ratings</Text>
          </TouchableOpacity>
        </View>

        {/* Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>Insights</Text>
          
          <View style={styles.insightItem}>
            <MaterialCommunityIcons name="trending-up" size={24} color={colors.success} />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Recent Performance</Text>
              <Text style={styles.insightDescription}>
                Your ratings are {stats.recentTrend}. Keep up the great work!
              </Text>
            </View>
          </View>

          <View style={styles.insightItem}>
            <MaterialCommunityIcons name="thumb-up" size={24} color={colors.primary} />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Recommendation Rate</Text>
              <Text style={styles.insightDescription}>
                {stats.recommendationRate}% of customers would recommend you
              </Text>
            </View>
          </View>

          <View style={styles.insightItem}>
            <MaterialCommunityIcons name="shield-check" size={24} color={colors.success} />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Verified Ratings</Text>
              <Text style={styles.insightDescription}>
                {stats.verifiedRatings} out of {stats.totalRatings} ratings are verified
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: fonts.size.xl,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fonts.size.xl,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.regular,
    color: colors.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  filterContainer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginRight: spacing.xs,
  },
  activeFilterButtonText: {
    color: colors.white,
  },
  filterCount: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.bold,
    color: colors.text.secondary,
    backgroundColor: colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeFilterCount: {
    color: colors.primary,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  actionButtonText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  insightsContainer: {
    backgroundColor: colors.white,
    margin: spacing.md,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  insightsTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  insightContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  insightTitle: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  insightDescription: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

export default RatingAnalyticsScreen;

