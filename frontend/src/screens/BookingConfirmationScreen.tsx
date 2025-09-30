import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { apiRequest } from '../utils/api';
import CustomAlert from '../components/common/CustomAlert';
import SuccessBookingModal from '../components/common/SuccessBookingModal';
import { cleanLocationDisplay } from '../utils/locationUtils';

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fallback function to store booking locally when backend is unavailable
  // const storeBookingLocally = async (bookingData: any) => {
  //   try {
  //     const existingBookings = await AsyncStorage.getItem('pending_bookings');
  //     const bookings = existingBookings ? JSON.parse(existingBookings) : [];
      
  //     const localBooking = {
  //       ...bookingData,
  //       id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  //       storedAt: new Date().toISOString(),
  //       status: 'pending_local',
  //       needsSync: true
  //     };
      
  //     bookings.push(localBooking);
  //     await AsyncStorage.setItem('pending_bookings', JSON.stringify(bookings));
      
  //     // Booking stored locally
  //     return localBooking;
  //   } catch (error) {
  //     console.error('❌ Failed to store booking locally:', error);
  //     throw error;
  //   }
  // };

  // Handler for posting booking(s)
  const handlePostBooking = async () => {
    console.log('🚀 STARTING BOOKING SUBMISSION');
    console.log('🚀 STARTING BOOKING SUBMISSION - TEST LOG');
    console.warn('🚀 STARTING BOOKING SUBMISSION - WARN LOG');
    console.error('🚀 STARTING BOOKING SUBMISSION - ERROR LOG');
    Alert.alert('Debug', 'Booking submission started - check console logs');
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
        
        // Ensure locations are in the correct format for backend
        const formatLocation = (location: any) => {
          if (typeof location === 'string') {
            // If it's a string, we need to create a basic object
            // Use Nairobi coordinates as fallback to avoid validation errors
            return {
              address: location,
              latitude: -1.2921, // Nairobi coordinates as fallback
              longitude: 36.8219
            };
          } else if (location && typeof location === 'object') {
            const lat = location.latitude || location.lat;
            const lng = location.longitude || location.lng;
            
            // If we have coordinates but no address, create a descriptive address
            let address = location.address || location.name;
            if (!address && lat !== undefined && lng !== undefined) {
              // Use coordinates to create a descriptive address that can be converted to place name
              address = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            } else if (!address) {
              address = 'Unknown location';
            }
            
            // Ensure we have valid coordinates
            if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
              // Use Nairobi coordinates as fallback
              return {
                address: address || 'Unknown location',
                latitude: -1.2921,
                longitude: 36.8219
              };
            }
            
            return {
              address,
              latitude: parseFloat(lat),
              longitude: parseFloat(lng)
            };
          } else {
            // Fallback for invalid location data - use Nairobi coordinates
            return {
              address: 'Unknown location',
              latitude: -1.2921,
              longitude: 36.8219
            };
          }
        };

        // Complete payload with all required fields for backend
        // Based on the database record structure you provided
        const bookingData = {
          // Core booking fields - match database structure
          bookingType: req.bookingType || (req.type === 'agriTRUK' ? 'Agri' : 'Cargo'),
          bookingMode: 'booking',
          fromLocation: formatLocation(req.fromLocation),
          toLocation: formatLocation(req.toLocation),
          productType: req.productType,
          weightKg: req.weightKg || parseFloat(req.weight) || 0,
          pickUpDate: pickupDate.toISOString(),
          urgencyLevel: req.urgencyLevel || (req.urgency ? req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1) : 'Low'),
          priority: req.priority || req.isPriority || false,
          
          // Cargo specifications - match database structure
          perishable: req.perishable || req.isPerishable || false,
          needsRefrigeration: req.needsRefrigeration || req.isPerishable || false,
          humidyControl: req.humidyControl || req.isPerishable || false, // Note: backend expects 'humidyControl'
          
          // Special cargo and insurance - match database structure
          specialCargo: req.specialCargo || (req.isSpecialCargo ? (req.specialCargoSpecs || []) : []),
          insured: req.insured || req.insureGoods || false,
          value: req.value || (req.insuranceValue ? parseFloat(req.insuranceValue) : 0),
          
          // Additional information - match database structure
          additionalNotes: req.additionalNotes || req.additional || '',
          specialRequest: req.specialRequest || req.additional || '',
          
          // Dimensions and costs - match database structure
          lengthCm: req.lengthCm || 0,
          widthCm: req.widthCm || 0,
          heightCm: req.heightCm || 0,
          tolls: req.tolls || 0,
          fuelSurchargePct: req.fuelSurchargePct || 0,
          waitMinutes: req.waitMinutes || 0,
          nightSurcharge: req.nightSurcharge || false,
          
          // Booking metadata - match database structure
          consolidated: false,
          status: 'pending',
          
          // Recurrence - match database structure
          recurrence: {
            isRecurring: false,
            frequency: null,
            timeFrame: null,
            duration: null,
            startDate: null,
            endDate: null,
            interval: 1,
            occurences: [],
            baseBookingId: null
          }
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
      
      console.log('🚀 Starting booking submission process...');
      console.log('📊 Payload count:', payload.length);
      console.log('📋 First payload keys:', Object.keys(payload[0] || {}));
      
      // Test API connectivity first
      try {
        console.log('🔍 Testing API connectivity...');
        const healthCheck = await fetch('https://agritruk.onrender.com/api/health');
        const healthData = await healthCheck.json();
        console.log('✅ API Health Check:', healthData);
      } catch (healthError) {
        console.error('❌ API Health Check Failed:', healthError);
      }
      
      while (retryCount < maxRetries) {
        try {
          console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries}`);
          console.log('📤 Sending booking data to backend:', JSON.stringify(payload[0], null, 2));
          console.log('🔍 Payload validation:', {
            hasFromLocation: !!payload[0]?.fromLocation,
            hasToLocation: !!payload[0]?.toLocation,
            fromLocationKeys: payload[0]?.fromLocation ? Object.keys(payload[0].fromLocation) : 'N/A',
            toLocationKeys: payload[0]?.toLocation ? Object.keys(payload[0].toLocation) : 'N/A',
            weightKg: payload[0]?.weightKg,
            productType: payload[0]?.productType,
            bookingType: payload[0]?.bookingType,
            bookingMode: payload[0]?.bookingMode
          });
          
          // Attempting booking submission
          response = await apiRequest('/bookings', {
            method: 'POST',
            body: JSON.stringify(payload[0])
          });
          
          console.log('✅ Backend response:', response);
          break; // Success, exit retry loop
        } catch (error: any) {
          retryCount++;
          console.error(`❌ Booking attempt ${retryCount} failed:`, error);
          console.error('Error details:', {
            message: error.message,
            status: error.status,
            response: error.response,
            stack: error.stack
          });
          console.error('Full error object:', JSON.stringify(error, null, 2));
          
          // Additional logging for debugging
          console.error('🚨 BOOKING ERROR - Attempt:', retryCount);
          console.error('🚨 Error type:', typeof error);
          console.error('🚨 Error constructor:', error.constructor.name);
          console.error('🚨 Error keys:', Object.keys(error));
          
          if (retryCount >= maxRetries) {
            throw error; // Re-throw if all retries failed
          }
          
          // Wait before retry (exponential backoff)
          const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      // Booking posted successfully
      console.log('✅ Booking posted successfully:', response);
      console.log('📋 Response structure:', JSON.stringify(response, null, 2));
      
      // Extract booking ID from response - prioritize readable ID from backend
      const extractedBookingId = String(
        response?.readableId ||  // New readable ID from backend
        response?.bookingId || 
        response?.id || 
        response?.data?.bookingId || 
        response?.data?.id ||
        response?.booking?.bookingId ||
        'N/A'
      );
      console.log('✅ Booking created successfully with ID:', extractedBookingId);
      console.log('🔍 Booking ID extraction details:', {
        'response.readableId': response?.readableId,
        'response.bookingId': response?.bookingId,
        'response.id': response?.id,
        'response.data?.bookingId': response?.data?.bookingId,
        'response.data?.id': response?.data?.id,
        'response.booking?.bookingId': response?.booking?.bookingId,
        'final': extractedBookingId
      });
      setBookingId(extractedBookingId);
      setShowSuccessModal(true);

      // Send booking creation notification
      try {
        const { NotificationHelper } = require('../services/notificationHelper');
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          await NotificationHelper.sendBookingNotification('created', {
            userId: user.uid,
            role: 'customer',
            bookingId: extractedBookingId,
            fromLocation: requests[0]?.fromLocation?.address || 'Pickup location',
            toLocation: requests[0]?.toLocation?.address || 'Delivery location'
          });
        }
      } catch (notificationError) {
        console.warn('Failed to send booking creation notification:', notificationError);
      }
    } catch (error: any) {
      // Booking confirmation error

      console.error('Failed to post booking:', error);
      console.error('🚨 FINAL BOOKING ERROR:', error);
      console.error('🚨 Error message:', error.message);
      console.error('🚨 Error type:', typeof error);
      console.error('🚨 Error constructor:', error.constructor.name);
      console.error('🚨 Error stack:', error.stack);
      
      // Check if it's a 500 error (server error)
      if (error.message?.includes('Failed to create booking')) {
        // Backend returned 500 error - this might be a data validation issue
      }
      
      // Don't fallback to local storage - show error instead
      console.error('❌ Backend booking failed, not using fallback');
      setErrorMessage(`Failed to create booking: ${error.message || 'Server error'}. Please check your details and try again.`);
      setShowErrorAlert(true);
    } finally {
      clearTimeout(timeoutId);
      setPosting(false);
    }
  };

  const getRoleBasedNavigation = () => {
    // Determine the correct navigation target based on user role/mode
    switch (mode) {
      case 'business':
        return 'BusinessTabs';
      case 'broker':
        return 'BrokerTabs';
      case 'transporter':
        return 'TransporterTabs';
      case 'shipper':
      default:
        return 'MainTabs';
    }
  };

  const getBookingManagementScreen = () => {
    // Determine the correct booking management screen based on user role/mode
    switch (mode) {
      case 'business':
        return { screen: 'BusinessTabs', params: { screen: 'Management', params: { activeTab: 'requests' } } };
      case 'broker':
        return { screen: 'BrokerTabs', params: { screen: 'Management', params: { activeTab: 'requests' } } };
      case 'transporter':
        return { screen: 'TransporterTabs', params: { screen: 'BookingManagement' } };
      case 'shipper':
      default:
        return { screen: 'MainTabs', params: { screen: 'Activity' } };
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Navigate to the appropriate home screen based on user role
    const targetScreen = getRoleBasedNavigation();
    navigation.navigate(targetScreen);
  };

  const handleViewBooking = () => {
    // Navigate to the appropriate booking management screen based on user role
    const targetScreen = getBookingManagementScreen();
    if (typeof targetScreen === 'string') {
      navigation.navigate(targetScreen);
    } else {
      navigation.navigate(targetScreen.screen, targetScreen.params);
    }
  };

  const handleContinue = () => {
    // Navigate to the appropriate home screen based on user role
    const targetScreen = getRoleBasedNavigation();
    navigation.navigate(targetScreen);
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
            <Text style={styles.bookingDetail}>From: <Text style={{ fontWeight: 'bold' }}>{cleanLocationDisplay(item.fromLocationAddress || (typeof item.fromLocation === 'object' ? (item.fromLocation.address || `Location (${item.fromLocation.latitude}, ${item.fromLocation.longitude})`) : item.fromLocation))}</Text></Text>
            <Text style={styles.bookingDetail}>To: <Text style={{ fontWeight: 'bold' }}>{cleanLocationDisplay(item.toLocationAddress || (typeof item.toLocation === 'object' ? (item.toLocation.address || `Location (${item.toLocation.latitude}, ${item.toLocation.longitude})`) : item.toLocation))}</Text></Text>
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

      <SuccessBookingModal
        visible={showSuccessModal}
        onClose={handleSuccessModalClose}
        bookingId={bookingId}
        isConsolidated={isConsolidated}
        onViewBooking={handleViewBooking}
        onContinue={handleContinue}
      />

      <CustomAlert
        visible={showErrorAlert}
        title="Booking Failed"
        message={errorMessage}
        buttons={[
          {
            text: 'Go Back to Form',
            onPress: () => {
              // Navigate back to the form for correction
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                // If we can't go back, navigate to the appropriate request screen
                const targetScreen = mode === 'business' ? 'BusinessRequest' : 'ServiceRequest';
                navigation.navigate(targetScreen);
              }
              setPosting(false);
            }
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setPosting(false);
            }
          }
        ]}
        onClose={() => setShowErrorAlert(false)}
      />
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
