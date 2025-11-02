import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants';
import { 
  EnhancedRating, 
  RatingCategory, 
  RaterRole, 
  RatingTemplate,
  RatingSubmission 
} from '../../services/enhancedRatingService';

interface RatingComponentProps {
  transporterId: string;
  transporterName: string;
  raterRole: RaterRole;
  bookingId?: string;
  tripId?: string;
  existingRating?: EnhancedRating;
  onSubmit: (rating: RatingSubmission) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const RATING_CATEGORIES: Record<RatingCategory, {
  label: string;
  description: string;
  icon: string;
}> = {
  overall: {
    label: 'Overall Experience',
    description: 'How was your overall experience?',
    icon: 'star',
  },
  punctuality: {
    label: 'Punctuality',
    description: 'Did they arrive on time?',
    icon: 'clock',
  },
  communication: {
    label: 'Communication',
    description: 'How well did they communicate?',
    icon: 'message',
  },
  safety: {
    label: 'Safety',
    description: 'How safe did you feel?',
    icon: 'shield-check',
  },
  vehicle_condition: {
    label: 'Vehicle Condition',
    description: 'How was the vehicle condition?',
    icon: 'truck',
  },
  professionalism: {
    label: 'Professionalism',
    description: 'How professional were they?',
    icon: 'account-tie',
  },
  value_for_money: {
    label: 'Value for Money',
    description: 'Was it worth the price?',
    icon: 'cash',
  },
};

const StarRating: React.FC<{
  rating: number;
  onRatingChange: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}> = ({ rating, onRatingChange, size = 'medium', disabled = false }) => {
  const starSize = size === 'small' ? 20 : size === 'large' ? 32 : 24;
  
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => !disabled && onRatingChange(star)}
          style={styles.starButton}
          disabled={disabled}
        >
          <MaterialCommunityIcons
            name={star <= rating ? 'star' : 'star-outline'}
            size={starSize}
            color={star <= rating ? '#FFD700' : colors.text.light}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const CategoryRating: React.FC<{
  category: RatingCategory;
  rating: number;
  onRatingChange: (rating: number) => void;
  required: boolean;
  disabled?: boolean;
}> = ({ category, rating, onRatingChange, required, disabled = false }) => {
  const categoryInfo = RATING_CATEGORIES[category];
  
  return (
    <View style={styles.categoryContainer}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryInfo}>
          <MaterialCommunityIcons 
            name={categoryInfo.icon} 
            size={20} 
            color={colors.primary} 
          />
          <Text style={styles.categoryLabel}>
            {categoryInfo.label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
        <Text style={styles.ratingValue}>{rating}/5</Text>
      </View>
      <Text style={styles.categoryDescription}>{categoryInfo.description}</Text>
      <StarRating
        rating={rating}
        onRatingChange={onRatingChange}
        disabled={disabled}
      />
    </View>
  );
};

const RatingComponent: React.FC<RatingComponentProps> = ({
  transporterId,
  transporterName,
  raterRole,
  bookingId,
  tripId,
  existingRating,
  onSubmit,
  onCancel,
  loading = false,
  disabled = false,
}) => {
  const [overallRating, setOverallRating] = useState(existingRating?.overallRating || 0);
  const [categoryRatings, setCategoryRatings] = useState(existingRating?.categoryRatings || {
    punctuality: 0,
    communication: 0,
    safety: 0,
    vehicle_condition: 0,
    professionalism: 0,
    value_for_money: 0,
  });
  const [comment, setComment] = useState(existingRating?.comment || '');
  const [wouldRecommend, setWouldRecommend] = useState(existingRating?.wouldRecommend ?? true);
  const [highlights, setHighlights] = useState<string[]>(existingRating?.highlights || []);
  const [improvements, setImprovements] = useState<string[]>(existingRating?.improvements || []);
  const [isAnonymous, setIsAnonymous] = useState(existingRating?.isAnonymous || false);
  const [highlightText, setHighlightText] = useState('');
  const [improvementText, setImprovementText] = useState('');

  // Get rating template for the role
  const template = {
    role: raterRole,
    categories: ['overall', 'punctuality', 'communication', 'safety', 'vehicle_condition', 'professionalism', 'value_for_money'] as RatingCategory[],
    requiredCategories: ['overall', 'punctuality', 'communication', 'safety'] as RatingCategory[],
    optionalCategories: ['vehicle_condition', 'professionalism', 'value_for_money'] as RatingCategory[],
    maxCommentLength: 500,
    allowAnonymous: true,
    allowHighlights: true,
    allowImprovements: true,
    requireRecommendation: true,
  };

  const handleCategoryRatingChange = (category: RatingCategory, rating: number) => {
    setCategoryRatings(prev => ({
      ...prev,
      [category]: rating,
    }));
  };

  const addHighlight = () => {
    if (highlightText.trim() && highlights.length < 3) {
      setHighlights(prev => [...prev, highlightText.trim()]);
      setHighlightText('');
    }
  };

  const removeHighlight = (index: number) => {
    setHighlights(prev => prev.filter((_, i) => i !== index));
  };

  const addImprovement = () => {
    if (improvementText.trim() && improvements.length < 3) {
      setImprovements(prev => [...prev, improvementText.trim()]);
      setImprovementText('');
    }
  };

  const removeImprovement = (index: number) => {
    setImprovements(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validate required ratings
    const requiredCategories = template.requiredCategories;
    const missingRatings = requiredCategories.filter(cat => {
      if (cat === 'overall') return overallRating === 0;
      return categoryRatings[cat] === 0;
    });

    if (missingRatings.length > 0) {
      Alert.alert(
        'Incomplete Rating',
        'Please provide ratings for all required categories.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (template.requireRecommendation && !wouldRecommend && !comment.trim()) {
      Alert.alert(
        'Recommendation Required',
        'Please provide a comment explaining why you would not recommend this transporter.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const ratingSubmission: RatingSubmission = {
        transporterId,
        bookingId,
        tripId,
        overallRating,
        categoryRatings: {
          ...categoryRatings,
          overall: overallRating,
        },
        comment: comment.trim() || undefined,
        wouldRecommend,
        highlights: highlights.length > 0 ? highlights : undefined,
        improvements: improvements.length > 0 ? improvements : undefined,
        isAnonymous,
      };

      await onSubmit(ratingSubmission);
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    }
  };

  const isFormValid = () => {
    const requiredCategories = template.requiredCategories;
    const hasRequiredRatings = requiredCategories.every(cat => {
      if (cat === 'overall') return overallRating > 0;
      return categoryRatings[cat] > 0;
    });
    
    const hasValidRecommendation = !template.requireRecommendation || 
      wouldRecommend || 
      (comment.trim().length > 0);
    
    return hasRequiredRatings && hasValidRecommendation;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {existingRating ? 'Update Rating' : 'Rate Transporter'}
        </Text>
        <Text style={styles.subtitle}>
          {existingRating ? 'Update your rating for' : 'Rate your experience with'} {transporterName}
        </Text>
      </View>

      {/* Overall Rating */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overall Rating *</Text>
        <View style={styles.overallRatingContainer}>
          <StarRating
            rating={overallRating}
            onRatingChange={setOverallRating}
            size="large"
            disabled={disabled}
          />
          <Text style={styles.overallRatingText}>
            {overallRating > 0 ? `${overallRating}/5` : 'Tap to rate'}
          </Text>
        </View>
      </View>

      {/* Category Ratings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detailed Ratings</Text>
        {template.categories
          .filter(cat => cat !== 'overall')
          .map((category) => (
            <CategoryRating
              key={category}
              category={category}
              rating={categoryRatings[category]}
              onRatingChange={(rating) => handleCategoryRatingChange(category, rating)}
              required={template.requiredCategories.includes(category)}
              disabled={disabled}
            />
          ))}
      </View>

      {/* Recommendation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Would you recommend this transporter? *</Text>
        <View style={styles.recommendationContainer}>
          <TouchableOpacity
            style={[
              styles.recommendationButton,
              wouldRecommend && styles.recommendationButtonActive,
            ]}
            onPress={() => !disabled && setWouldRecommend(true)}
            disabled={disabled}
          >
            <MaterialCommunityIcons
              name="thumb-up"
              size={24}
              color={wouldRecommend ? colors.white : colors.success}
            />
            <Text style={[
              styles.recommendationText,
              wouldRecommend && styles.recommendationTextActive,
            ]}>
              Yes
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.recommendationButton,
              !wouldRecommend && styles.recommendationButtonActive,
            ]}
            onPress={() => !disabled && setWouldRecommend(false)}
            disabled={disabled}
          >
            <MaterialCommunityIcons
              name="thumb-down"
              size={24}
              color={!wouldRecommend ? colors.white : colors.error}
            />
            <Text style={[
              styles.recommendationText,
              !wouldRecommend && styles.recommendationTextActive,
            ]}>
              No
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Comment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Additional Comments
          {!wouldRecommend && <Text style={styles.required}> *</Text>}
        </Text>
        <TextInput
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          placeholder="Share your experience..."
          multiline
          maxLength={template.maxCommentLength}
          editable={!disabled}
        />
        <Text style={styles.characterCount}>
          {comment.length}/{template.maxCommentLength}
        </Text>
      </View>

      {/* Highlights */}
      {template.allowHighlights && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What went well?</Text>
          <View style={styles.highlightInputContainer}>
            <TextInput
              style={styles.highlightInput}
              value={highlightText}
              onChangeText={setHighlightText}
              placeholder="Add a highlight..."
              editable={!disabled}
            />
            <TouchableOpacity
              style={[
                styles.addButton,
                (!highlightText.trim() || highlights.length >= 3) && styles.addButtonDisabled,
              ]}
              onPress={addHighlight}
              disabled={disabled || !highlightText.trim() || highlights.length >= 3}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
          {highlights.map((highlight, index) => (
            <View key={index} style={styles.highlightItem}>
              <Text style={styles.highlightText}>{highlight}</Text>
              <TouchableOpacity
                onPress={() => removeHighlight(index)}
                disabled={disabled}
              >
                <MaterialCommunityIcons name="close" size={16} color={colors.text.light} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Improvements */}
      {template.allowImprovements && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What could be improved?</Text>
          <View style={styles.highlightInputContainer}>
            <TextInput
              style={styles.highlightInput}
              value={improvementText}
              onChangeText={setImprovementText}
              placeholder="Add an improvement suggestion..."
              editable={!disabled}
            />
            <TouchableOpacity
              style={[
                styles.addButton,
                (!improvementText.trim() || improvements.length >= 3) && styles.addButtonDisabled,
              ]}
              onPress={addImprovement}
              disabled={disabled || !improvementText.trim() || improvements.length >= 3}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
          {improvements.map((improvement, index) => (
            <View key={index} style={styles.highlightItem}>
              <Text style={styles.highlightText}>{improvement}</Text>
              <TouchableOpacity
                onPress={() => removeImprovement(index)}
                disabled={disabled}
              >
                <MaterialCommunityIcons name="close" size={16} color={colors.text.light} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Anonymous Option */}
      {template.allowAnonymous && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.anonymousContainer}
            onPress={() => !disabled && setIsAnonymous(!isAnonymous)}
            disabled={disabled}
          >
            <MaterialCommunityIcons
              name={isAnonymous ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color={isAnonymous ? colors.primary : colors.text.light}
            />
            <Text style={styles.anonymousText}>Submit anonymously</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isFormValid() || loading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid() || loading || disabled}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <MaterialCommunityIcons name="send" size={20} color={colors.white} />
              <Text style={styles.submitButtonText}>
                {existingRating ? 'Update Rating' : 'Submit Rating'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fonts.size.xl,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  overallRatingContainer: {
    alignItems: 'center',
  },
  overallRatingText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    padding: spacing.xs,
    marginHorizontal: 2,
  },
  categoryContainer: {
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
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
  required: {
    color: colors.error,
  },
  ratingValue: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.bold,
    color: colors.primary,
  },
  categoryDescription: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  recommendationContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  recommendationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
  },
  recommendationButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  recommendationText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  recommendationTextActive: {
    color: colors.white,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fonts.size.md,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: colors.text.light,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  highlightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  highlightInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: colors.text.light,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlightText: {
    flex: 1,
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
  },
  anonymousContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anonymousText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: colors.text.light,
  },
  submitButtonText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: spacing.sm,
  },
});

export default RatingComponent;

