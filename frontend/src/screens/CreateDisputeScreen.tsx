/**
 * Create Dispute Screen
 * Submit a new dispute for a booking
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { disputeService, DisputePriority } from '../services/disputeService';
import { unifiedBookingService } from '../services/unifiedBookingService';

const PRIORITIES: { label: string; value: DisputePriority; color: string }[] = [
  { label: 'Low', value: 'low', color: colors.success },
  { label: 'Medium', value: 'medium', color: colors.warning },
  { label: 'High', value: 'high', color: colors.error },
];

const CreateDisputeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { bookingId, edit, disputeId } = route.params as { 
    bookingId?: string; 
    edit?: boolean; 
    disputeId?: string;
  };

  const [booking, setBooking] = useState<any>(null);
  const [reason, setReason] = useState(''); // Backend uses 'reason' not 'issue'/'description'
  const [priority, setPriority] = useState<DisputePriority>('medium');
  const [evidence, setEvidence] = useState<string[]>([]); // Backend uses 'evidence' array of URLs
  const [attachments, setAttachments] = useState<Array<{ uri: string; type: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState(false);

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setLoadingBooking(true);
      // Try to get booking from unified service
      const bookings = await unifiedBookingService.getBookings('shipper');
      const found = bookings.find((b: any) => b.id === bookingId || b.bookingId === bookingId);
      if (found) {
        setBooking(found);
      }
    } catch (error) {
      console.error('Error loading booking:', error);
    } finally {
      setLoadingBooking(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to add photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newAttachments = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'image',
          name: asset.fileName || `image_${Date.now()}.jpg`,
        }));
        setAttachments([...attachments, ...newAttachments]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Error', 'Please describe the issue/reason for the dispute');
      return;
    }

    if (!bookingId && !booking?.id) {
      Alert.alert('Error', 'Booking ID is required');
      return;
    }

    // Get transporterId from booking
    const transporterId = booking?.transporter?.id || booking?.transporterId || booking?.assignedDriver?.id;
    if (!transporterId) {
      Alert.alert('Error', 'Transporter/Driver information is required. Please ensure the booking has an assigned transporter.');
      return;
    }

    try {
      setLoading(true);
      
      // Upload attachments if any and convert to evidence URLs
      // TODO: Upload images to backend storage and get URLs
      // For now, we'll use the URIs directly (they should be uploaded first)
      const evidenceUrls = attachments.map(att => att.uri);

      const disputeData = {
        bookingId: bookingId || booking?.id,
        transporterId,
        reason: reason.trim(), // Backend uses 'reason'
        priority,
        evidence: evidenceUrls, // Backend uses 'evidence' array
      };

      await disputeService.createDispute(disputeData);
      
      Alert.alert(
        'Success',
        'Dispute submitted successfully. Our team will review it shortly.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating dispute:', error);
      Alert.alert('Error', error.message || 'Failed to submit dispute. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {edit ? 'Update Dispute' : 'Create Dispute'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Booking Information */}
        {booking && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Information</Text>
            <View style={styles.bookingCard}>
              <Text style={styles.bookingId}>
                Booking: {booking.bookingId || booking.id}
              </Text>
              {booking.fromLocation && (
                <Text style={styles.bookingRoute}>
                  From: {booking.fromLocation.address || 'N/A'}
                </Text>
              )}
              {booking.toLocation && (
                <Text style={styles.bookingRoute}>
                  To: {booking.toLocation.address || 'N/A'}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Reason (Backend uses 'reason' not 'issue'/'description') */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason for Dispute *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={reason}
            onChangeText={setReason}
            placeholder="Describe the issue or reason for this dispute..."
            placeholderTextColor={colors.text.light}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority</Text>
          <View style={styles.priorityContainer}>
            {PRIORITIES.map((pri) => (
              <TouchableOpacity
                key={pri.value}
                style={[
                  styles.priorityCard,
                  priority === pri.value && { backgroundColor: pri.color + '20', borderColor: pri.color },
                ]}
                onPress={() => setPriority(pri.value)}
              >
                <View style={[styles.priorityDot, { backgroundColor: pri.color }]} />
                <Text
                  style={[
                    styles.priorityText,
                    priority === pri.value && { color: pri.color, fontFamily: fonts.family.bold },
                  ]}
                >
                  {pri.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Attachments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attachments (Optional)</Text>
          <TouchableOpacity style={styles.addAttachmentButton} onPress={pickImage}>
            <MaterialCommunityIcons name="camera" size={24} color={colors.primary} />
            <Text style={styles.addAttachmentText}>Add Photos</Text>
          </TouchableOpacity>
          
          {attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {attachments.map((attachment, index) => (
                <View key={index} style={styles.attachmentItem}>
                  <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
                  <TouchableOpacity
                    style={styles.removeAttachmentButton}
                    onPress={() => removeAttachment(index)}
                  >
                    <MaterialCommunityIcons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <MaterialCommunityIcons name="send" size={20} color={colors.white} />
              <Text style={styles.submitButtonText}>
                {edit ? 'Update Dispute' : 'Submit Dispute'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fonts.size.xl,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.white,
    padding: spacing.md,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  bookingCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
  },
  bookingId: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  bookingRoute: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 120,
    paddingTop: spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  categoryTextSelected: {
    color: colors.primary,
    fontFamily: fonts.family.medium,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priorityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  priorityText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
  },
  addAttachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.xs,
  },
  addAttachmentText: {
    fontSize: fonts.size.sm,
    color: colors.primary,
    fontFamily: fonts.family.medium,
  },
  attachmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  attachmentItem: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeAttachmentButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
});

export default CreateDisputeScreen;

