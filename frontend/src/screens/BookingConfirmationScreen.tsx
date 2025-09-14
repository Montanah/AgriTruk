import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { apiRequest } from '../utils/api';

// Accepts either a single booking or an array of bookings (for consolidated)
const BookingConfirmationScreen = ({ route, navigation }: any) => {
  const params = route.params || {};
  const requests = params.requests || (params.booking ? [params.booking] : []);
  const isConsolidated = Array.isArray(requests) && requests.length > 1;
  const mode = params.mode || 'shipper'; // shipper, broker, business
  // Initialize pickup date from request data
  const getInitialPickupDate = () => {
    if (isConsolidated && requests.length > 0) {
      // For consolidated bookings, use the pickup date from the last item
      const lastRequest = requests[requests.length - 1];
      if (lastRequest.pickUpDate) {
        return new Date(lastRequest.pickUpDate);
      }
      if (lastRequest.date) {
        return new Date(lastRequest.date);
      }
    } else if (requests.length > 0) {
      // For single bookings, use the pickup date from the request
      const request = requests[0];
      if (request.pickUpDate) {
        return new Date(request.pickUpDate);
      }
      if (request.date) {
        return new Date(request.date);
      }
    }
    return new Date();
  };
  
  const [pickupDate, setPickupDate] = useState(getInitialPickupDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [posting, setPosting] = useState(false);

  // Fallback function to store booking locally when backend is unavailable
  const storeBookingLocally = async (bookingData: any) => {
    try {
      const existingBookings = await AsyncStorage.getItem('pending_bookings');
      const bookings = existingBookings ? JSON.parse(existingBookings) : [];
      
      const localBooking = {
        ...bookingData,
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        storedAt: new Date().toISOString(),
        status: 'pending_local',
        needsSync: true
      };
      
      bookings.push(localBooking);
      await AsyncStorage.setItem('pending_bookings', JSON.stringify(bookings));
      
      // Booking stored locally
      return localBooking;
    } catch (error) {
      console.error('❌ Failed to store booking locally:', error);
      throw error;
    }
  };

  // Handler for posting booking(s)
  const handlePostBooking = async () => {
    setPosting(true);
    
    // Add timeout to prevent infinite posting state
    const timeoutId = setTimeout(() => {
      console.error('❌ Booking request timeout after 30 seconds');
      setPosting(false);
      Alert.alert('Timeout', 'The booking request is taking too long. Please try again.');
    }, 30000);
    
    // Prepare payload outside try block so it's available in catch block
    let payload: any[] = [];
    
    try {
      // Validate requests data
      if (!requests || requests.length === 0) {
        throw new Error('No booking requests found. Please try again.');
      }
      
      // Validating booking requests
      
      // Prepare payload for backend booking format
      payload = requests.map((req: any, index: number) => {
        // Validate required fields
        if (!req.fromLocation || !req.toLocation) {
          throw new Error(`Request ${index + 1} is missing required location information.`);
        }
        if (!req.productType) {
          throw new Error(`Request ${index + 1} is missing product type.`);
        }
        if (!req.weight || isNaN(parseFloat(req.weight))) {
          throw new Error(`Request ${index + 1} has invalid weight.`);
        }
        
        // Simplified payload that was working before
        const bookingData = {
          bookingType: req.bookingType || (req.type === 'agriTRUK' ? 'Agri' : 'Cargo'),
          bookingMode: req.bookingMode || req.requestType || 'booking',
          fromLocation: req.fromLocation,
          toLocation: req.toLocation,
          productType: req.productType,
          weightKg: req.weightKg || parseFloat(req.weight) || 0,
          pickUpDate: pickupDate.toISOString(),
          urgencyLevel: req.urgencyLevel || (req.urgency ? req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1) : 'Low'),
          priority: req.priority || req.isPriority || false,
          perishable: req.perishable || req.isPerishable || false,
          needsRefrigeration: req.needsRefrigeration || req.isPerishable || false,
          humidityControl: req.humidityControl || req.isPerishable || false,
          specialCargo: req.specialCargo || (req.isSpecialCargo ? (req.specialCargoSpecs || []) : []),
          insured: req.insured || req.insureGoods || false,
          value: req.value || (req.insuranceValue ? parseFloat(req.insuranceValue) : 0),
          additionalNotes: req.additionalNotes || req.additional || '',
          status: 'pending',
        };
        return bookingData;
      });

      // Sending booking confirmation to backend
      // Validating booking data before sending
      // Sending request to backend

      // Post to backend bookings endpoint with retry logic
      let response;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          
          // Attempting booking submission
          response = await apiRequest('/bookings', {
            method: 'POST',
            body: JSON.stringify(payload[0])
          });
          break; // Success, exit retry loop
        } catch (error: any) {
          retryCount++;
          // Booking attempt failed
          
          if (retryCount >= maxRetries) {
            throw error; // Re-throw if all retries failed
          }
          
          // Wait before retry (exponential backoff)
          const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          // Waiting before retry
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      // Booking posted successfully
      // Extract booking ID from response
      const bookingId = response?.booking?.bookingId || response?.id || response?.bookingId || 'N/A';
      Alert.alert(
        'Booking Posted Successfully!', 
        `Your ${isConsolidated ? 'consolidated ' : ''}booking has been posted.\n\nBooking ID: ${bookingId}\n\nYou will be notified when a transporter accepts your request.`
      );
      navigation.goBack();
    } catch (error: any) {
      // Booking confirmation error

      console.error('Failed to post booking:', error);
      
      // Check if it's a 500 error (server error)
      if (error.message?.includes('Failed to create booking')) {
        // Backend returned 500 error - this might be a data validation issue
      }
      
      // Try fallback: store locally when backend is unavailable
      try {
        if (!payload || payload.length === 0) {
          throw new Error('No booking data available for local storage');
        }
        
        // Attempting to store booking locally as fallback
        await storeBookingLocally(payload[0]);
        
        Alert.alert(
          'Booking Saved Locally', 
          'The booking server is currently unavailable. Your booking has been saved locally and will be synced when the server is back online.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } catch (fallbackError) {
        console.error('❌ Fallback storage also failed:', fallbackError);
        Alert.alert('Error', `Failed to post booking: ${error.message}. Please try again later.`);
      }
    } finally {
      clearTimeout(timeoutId);
      setPosting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isConsolidated ? 'Confirm Consolidated Booking' : 'Confirm Booking'}
        {mode !== 'shipper' && ` (${mode})`}
      </Text>
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <View style={[styles.bookingCard, index % 2 === 0 ? { backgroundColor: colors.surface } : { backgroundColor: colors.background }]}>
            <Text style={styles.bookingId}>Request ID: {item.id}</Text>
            <Text style={styles.bookingDetail}>From: <Text style={{ fontWeight: 'bold' }}>{item.fromLocationAddress || (typeof item.fromLocation === 'object' ? (item.fromLocation.address || `${item.fromLocation.latitude}, ${item.fromLocation.longitude}`) : item.fromLocation)}</Text></Text>
            <Text style={styles.bookingDetail}>To: <Text style={{ fontWeight: 'bold' }}>{item.toLocationAddress || (typeof item.toLocation === 'object' ? (item.toLocation.address || `${item.toLocation.latitude}, ${item.toLocation.longitude}`) : item.toLocation)}</Text></Text>
            <Text style={styles.bookingDetail}>Product: {item.productType} | {item.weight}kg</Text>
            <Text style={styles.bookingDetail}>Type: {item.type === 'agriTRUK' ? 'Agri' : 'Cargo'}</Text>
          </View>
        )}
        style={{ maxHeight: 180, marginBottom: 18 }}
      />
      <View style={styles.dateRow}>
        <Text style={styles.label}>Pickup Date & Time</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <MaterialCommunityIcons name="calendar" size={20} color={colors.secondary} style={{ marginRight: 8 }} />
          <Text style={styles.dateText}>{pickupDate.toLocaleString()}</Text>
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="datetime"
          date={pickupDate}
          onConfirm={date => {
            setPickupDate(date);
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
        />
      </View>
      <TouchableOpacity
        style={[styles.postBtn, posting && { opacity: 0.6 }]}
        onPress={handlePostBooking}
        disabled={posting}
      >
        {posting ? (
          <>
            <MaterialCommunityIcons name="loading" size={22} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.postBtnText}>Posting...</Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="check-circle" size={22} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.postBtnText}>Confirm & Post Booking</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  title: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 18,
    fontFamily: fonts.family.bold,
  },
  bookingCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  bookingId: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  bookingDetail: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    marginBottom: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  label: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    marginRight: 8,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dateText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 18,
  },
  postBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.lg,
    marginLeft: 4,
  },
});

export default BookingConfirmationScreen;
