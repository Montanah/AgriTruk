import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, fonts, spacing } from '../constants';
import RatingComponent from '../components/Rating/RatingComponent';
import { 
  enhancedRatingService, 
  RatingSubmission, 
  RaterRole,
  EnhancedRating 
} from '../services/enhancedRatingService';

interface RatingSubmissionScreenProps {
  route: {
    params: {
      transporterId: string;
      transporterName: string;
      bookingId?: string;
      tripId?: string;
      raterRole?: RaterRole;
      existingRating?: EnhancedRating;
    };
  };
}

const RatingSubmissionScreen: React.FC<RatingSubmissionScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const { 
    transporterId, 
    transporterName, 
    bookingId, 
    tripId, 
    raterRole = 'client',
    existingRating 
  } = route.params;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (rating: RatingSubmission) => {
    try {
      setSubmitting(true);
      
      if (existingRating) {
        // Update existing rating
        await enhancedRatingService.updateRating(existingRating.id, rating);
        Alert.alert(
          'Rating Updated',
          'Your rating has been updated successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // Submit new rating
        await enhancedRatingService.submitRating(rating);
        Alert.alert(
          'Rating Submitted',
          'Thank you for your feedback! Your rating helps improve our service.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert(
        'Error',
        'Failed to submit rating. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (existingRating) {
      // If updating, just go back
      navigation.goBack();
    } else {
      // If new rating, ask for confirmation
      Alert.alert(
        'Cancel Rating',
        'Are you sure you want to cancel? You can rate this transporter later.',
        [
          { text: 'Keep Rating', style: 'cancel' },
          { text: 'Cancel', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {existingRating ? 'Update Rating' : 'Rate Transporter'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {transporterName}
            </Text>
          </View>
        </View>
      </View>

      {/* Rating Component */}
      <RatingComponent
        transporterId={transporterId}
        transporterName={transporterName}
        raterRole={raterRole}
        bookingId={bookingId}
        tripId={tripId}
        existingRating={existingRating}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={submitting}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fonts.size.xl,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.white,
    opacity: 0.9,
  },
});

export default RatingSubmissionScreen;

