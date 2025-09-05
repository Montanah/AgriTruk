import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ratingService from '../services/ratingService';

interface RouteParams {
  bookingId: string;
  transporterId: string;
  transporterName?: string;
}

const RatingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { bookingId, transporterId, transporterName } = route.params as RouteParams;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRatingPress = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const response = await ratingService.submitRating(
        bookingId,
        transporterId,
        rating,
        comment.trim() || undefined
      );

      if (response.success) {
        Alert.alert(
          'Success',
          'Thank you for your rating!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleRatingPress(i)}
          style={styles.starButton}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={40}
            color={i <= rating ? '#FFD700' : '#CCCCCC'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const getRatingText = () => {
    switch (rating) {
      case 1:
        return 'Poor';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Very Good';
      case 5:
        return 'Excellent';
      default:
        return 'Select a rating';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Rate Your Experience</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.transporterInfo}>
          <Text style={styles.transporterName}>
            {transporterName || 'Transporter'}
          </Text>
          <Text style={styles.bookingId}>Booking ID: {bookingId}</Text>
        </View>

        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>How was your experience?</Text>
          <View style={styles.starsContainer}>
            {renderStars()}
          </View>
          <Text style={styles.ratingText}>{getRatingText()}</Text>
        </View>

        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>Additional Comments (Optional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Tell us more about your experience..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || rating === 0}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Rating</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 20,
  },
  transporterInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  transporterName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  bookingId: {
    fontSize: 14,
    color: '#666',
  },
  ratingSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  starButton: {
    marginHorizontal: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
  },
  commentSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: '#f9f9f9',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RatingScreen;
