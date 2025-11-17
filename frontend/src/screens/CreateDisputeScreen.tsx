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
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { disputeService, DisputePriority } from '../services/disputeService';
import { unifiedBookingService } from '../services/unifiedBookingService';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';

const PRIORITIES: { label: string; value: DisputePriority; color: string }[] = [
  { label: 'Low', value: 'low', color: colors.success },
  { label: 'Medium', value: 'medium', color: colors.warning },
  { label: 'High', value: 'high', color: colors.error },
];

const CreateDisputeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { bookingId, edit, disputeId } = (route.params || {}) as { 
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
  const [manualBookingId, setManualBookingId] = useState(''); // For manual entry if bookingId not provided
  const [showBookingSelector, setShowBookingSelector] = useState(false);
  const [availableBookings, setAvailableBookings] = useState<any[]>([]);

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    } else {
      // If no bookingId provided, show warning and optionally load available bookings
      loadAvailableBookings();
    }
  }, [bookingId]);

  const loadAvailableBookings = async () => {
    try {
      setLoadingBooking(true);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      
      // Get user role dynamically
      let userRole = 'shipper'; // default
      try {
        const { doc, getDoc } = require('firebase/firestore');
        const { db } = require('../firebaseConfig');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          userRole = userDoc.data().role || userRole;
        }
      } catch (e) {
        if (user.displayName) {
          const roleMatch = user.displayName.match(/(shipper|broker|business|transporter|driver)/i);
          if (roleMatch) userRole = roleMatch[1].toLowerCase();
        }
      }
      
      let bookings: any[] = [];
      
      // Use the same methods as the respective management screens
      switch (userRole) {
        case 'shipper':
          // Use same method as ActivityScreen
          const { apiRequest } = require('../utils/api');
          const shipperResponse = await apiRequest(`/bookings/shipper/${user.uid}`);
          bookings = shipperResponse.bookings || [];
          break;
          
        case 'broker':
          // Use same method as BrokerManagementScreen
          const brokerBookings = await unifiedBookingService.getBookings('broker');
          bookings = Array.isArray(brokerBookings) ? brokerBookings : [];
          break;
          
        case 'business':
          // Use same method as BusinessManageScreen
          const businessBookings = await unifiedBookingService.getBookings('business');
          bookings = Array.isArray(businessBookings) ? businessBookings : [];
          break;
          
        case 'transporter':
          // Use same method as JobManagementScreen
          const token = await user.getIdToken();
          const { API_ENDPOINTS } = require('../constants/api');
          const transporterResponse = await fetch(`${API_ENDPOINTS.BOOKINGS}/transporter/${user.uid}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (transporterResponse.ok) {
            const transporterData = await transporterResponse.json();
            bookings = transporterData.bookings || transporterData.jobs || [];
          }
          break;
          
        case 'driver':
          // Use same method as DriverJobManagementScreen - get accepted jobs
          const driverToken = await user.getIdToken();
          const { API_ENDPOINTS: DRIVER_API_ENDPOINTS } = require('../constants/api');
          // Try driver/accepted first, fallback to transporter/accepted
          let driverResponse = await fetch(`${DRIVER_API_ENDPOINTS.BOOKINGS}/driver/accepted`, {
            headers: {
              'Authorization': `Bearer ${driverToken}`,
              'Content-Type': 'application/json',
            },
          });
          if (!driverResponse.ok) {
            driverResponse = await fetch(`${DRIVER_API_ENDPOINTS.BOOKINGS}/transporter/accepted`, {
              headers: {
                'Authorization': `Bearer ${driverToken}`,
                'Content-Type': 'application/json',
              },
            });
          }
          if (driverResponse.ok) {
            const driverData = await driverResponse.json();
            bookings = driverData.jobs || driverData.bookings || [];
          }
          break;
          
        default:
          console.warn(`Unknown user role: ${userRole}`);
      }
      
      // Only show accepted/confirmed/assigned bookings - these have assigned transporters/drivers
      // Disputes can only occur when there's a confirmed booking with a driver/transporter
      const acceptedStatuses = ['accepted', 'confirmed', 'assigned', 'picked_up', 'in_transit'];
      const validBookings = bookings
        .filter((b: any) => {
          if (!b) return false;
          const status = (b.status || '').toLowerCase();
          return acceptedStatuses.includes(status);
        })
        .sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return dateB - dateA; // Most recent first
        });
      setAvailableBookings(validBookings.slice(0, 20)); // Show last 20 accepted bookings
      setShowBookingSelector(true);
    } catch (error) {
      console.error('Error loading available bookings:', error);
      // Don't show error to user, just show empty list
      setAvailableBookings([]);
    } finally {
      setLoadingBooking(false);
    }
  };

  const loadBooking = async () => {
    try {
      setLoadingBooking(true);
      // Get user role dynamically
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      
      // Get user role from Firestore or displayName
      let userRole = 'shipper'; // default
      try {
        const { doc, getDoc } = require('firebase/firestore');
        const { db } = require('../firebaseConfig');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          userRole = userDoc.data().role || userRole;
        }
      } catch (e) {
        // Fallback to displayName if Firestore fails
        if (user.displayName) {
          const roleMatch = user.displayName.match(/(shipper|broker|business|transporter|driver)/i);
          if (roleMatch) userRole = roleMatch[1].toLowerCase();
        }
      }
      
      let bookings: any[] = [];
      
      // Use the same methods as the respective management screens
      switch (userRole) {
        case 'shipper':
          // Use same method as ActivityScreen
          const { apiRequest } = require('../utils/api');
          const shipperResponse = await apiRequest(`/bookings/shipper/${user.uid}`);
          bookings = shipperResponse.bookings || [];
          break;
          
        case 'broker':
          // Use same method as BrokerManagementScreen
          const brokerBookings = await unifiedBookingService.getBookings('broker');
          bookings = Array.isArray(brokerBookings) ? brokerBookings : [];
          break;
          
        case 'business':
          // Use same method as BusinessManageScreen
          const businessBookings = await unifiedBookingService.getBookings('business');
          bookings = Array.isArray(businessBookings) ? businessBookings : [];
          break;
          
        case 'transporter':
          // Use same method as JobManagementScreen
          const token = await user.getIdToken();
          const { API_ENDPOINTS } = require('../constants/api');
          const transporterResponse = await fetch(`${API_ENDPOINTS.BOOKINGS}/transporter/${user.uid}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (transporterResponse.ok) {
            const transporterData = await transporterResponse.json();
            bookings = transporterData.bookings || transporterData.jobs || [];
          }
          break;
          
        case 'driver':
          // Use same method as DriverJobManagementScreen - get accepted jobs
          const driverToken = await user.getIdToken();
          const { API_ENDPOINTS: DRIVER_API_ENDPOINTS } = require('../constants/api');
          // Try driver/accepted first, fallback to transporter/accepted
          let driverResponse = await fetch(`${DRIVER_API_ENDPOINTS.BOOKINGS}/driver/accepted`, {
            headers: {
              'Authorization': `Bearer ${driverToken}`,
              'Content-Type': 'application/json',
            },
          });
          if (!driverResponse.ok) {
            driverResponse = await fetch(`${DRIVER_API_ENDPOINTS.BOOKINGS}/transporter/accepted`, {
              headers: {
                'Authorization': `Bearer ${driverToken}`,
                'Content-Type': 'application/json',
              },
            });
          }
          if (driverResponse.ok) {
            const driverData = await driverResponse.json();
            bookings = driverData.jobs || driverData.bookings || [];
          }
          break;
          
        default:
          console.warn(`Unknown user role: ${userRole}`);
      }
      
      // Find the booking by ID - check all possible ID fields including readableId
      const found = bookings.find((b: any) => {
        if (!b) return false;
        // Check all possible ID fields
        const bookingIds = [
          b.id,
          b.bookingId,
          b.readableId,
          b.displayId,
          b.userFriendlyId,
          b.customerReadableId,
          b.shipperReadableId,
          getDisplayBookingId(b), // Also check the display ID
        ].filter(Boolean); // Remove undefined/null values
        
        return bookingIds.some(id => 
          id && (id === bookingId || id.toString() === bookingId.toString())
        );
      });
      
      if (found) {
        // Verify the booking is accepted/confirmed/assigned
        const bookingStatus = (found.status || '').toLowerCase();
        const acceptedStatuses = ['accepted', 'confirmed', 'assigned', 'picked_up', 'in_transit'];
        if (!acceptedStatuses.includes(bookingStatus)) {
          Alert.alert(
            'Booking Not Eligible',
            'This booking is not eligible for dispute. Only accepted bookings with assigned transporters/drivers can have disputes.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
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

    // Use manualBookingId if provided, otherwise use bookingId from params or booking object
    const finalBookingId = manualBookingId.trim() || bookingId || booking?.id || booking?.bookingId;
    
    if (!finalBookingId) {
      Alert.alert(
        'Booking Required',
        'Please select a booking or enter a booking ID. Disputes must be associated with a specific booking.',
        [
          {
            text: 'Select Booking',
            onPress: () => setShowBookingSelector(true),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    // If we have a manual booking ID but no booking object, try to load it
    if (manualBookingId && !booking) {
      try {
        setLoadingBooking(true);
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          Alert.alert('Error', 'Please sign in to create a dispute');
          return;
        }
        
        let userRole = 'shipper';
        try {
          const { doc, getDoc } = require('firebase/firestore');
          const { db } = require('../firebaseConfig');
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            userRole = userDoc.data().role || userRole;
          }
        } catch (e) {
          if (user.displayName) {
            const roleMatch = user.displayName.match(/(shipper|broker|business|transporter|driver)/i);
            if (roleMatch) userRole = roleMatch[1].toLowerCase();
          }
        }
        
        let bookings: any[] = [];
        
        // Use the same methods as the respective management screens
        switch (userRole) {
          case 'shipper':
            // Use same method as ActivityScreen
            const { apiRequest } = require('../utils/api');
            const shipperResponse = await apiRequest(`/bookings/shipper/${user.uid}`);
            bookings = shipperResponse.bookings || [];
            break;
            
          case 'broker':
            // Use same method as BrokerManagementScreen
            const brokerBookings = await unifiedBookingService.getBookings('broker');
            bookings = Array.isArray(brokerBookings) ? brokerBookings : [];
            break;
            
          case 'business':
            // Use same method as BusinessManageScreen
            const businessBookings = await unifiedBookingService.getBookings('business');
            bookings = Array.isArray(businessBookings) ? businessBookings : [];
            break;
            
          case 'transporter':
            // Use same method as JobManagementScreen
            const token = await user.getIdToken();
            const { API_ENDPOINTS } = require('../constants/api');
            const transporterResponse = await fetch(`${API_ENDPOINTS.BOOKINGS}/transporter/${user.uid}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            if (transporterResponse.ok) {
              const transporterData = await transporterResponse.json();
              bookings = transporterData.bookings || transporterData.jobs || [];
            }
            break;
            
          case 'driver':
            // Use same method as DriverJobManagementScreen - get accepted jobs
            const driverToken = await user.getIdToken();
            const { API_ENDPOINTS: DRIVER_API_ENDPOINTS } = require('../constants/api');
            // Try driver/accepted first, fallback to transporter/accepted
            let driverResponse = await fetch(`${DRIVER_API_ENDPOINTS.BOOKINGS}/driver/accepted`, {
              headers: {
                'Authorization': `Bearer ${driverToken}`,
                'Content-Type': 'application/json',
              },
            });
            if (!driverResponse.ok) {
              driverResponse = await fetch(`${DRIVER_API_ENDPOINTS.BOOKINGS}/transporter/accepted`, {
                headers: {
                  'Authorization': `Bearer ${driverToken}`,
                  'Content-Type': 'application/json',
                },
              });
            }
            if (driverResponse.ok) {
              const driverData = await driverResponse.json();
              bookings = driverData.jobs || driverData.bookings || [];
            }
            break;
            
          default:
            console.warn(`Unknown user role: ${userRole}`);
        }
        
        // Find the booking by ID - check all possible ID fields including readableId
        const found = bookings.find((b: any) => {
          if (!b) return false;
          // Check all possible ID fields
          const bookingIds = [
            b.id,
            b.bookingId,
            b.readableId,
            b.displayId,
            b.userFriendlyId,
            b.customerReadableId,
            b.shipperReadableId,
            getDisplayBookingId(b), // Also check the display ID
          ].filter(Boolean); // Remove undefined/null values
          
          return bookingIds.some(id => 
            id && (id === finalBookingId || id.toString() === finalBookingId.toString())
          );
        });
        
        if (!found) {
          Alert.alert(
            'Booking Not Found',
            'Booking not found or not eligible for dispute. Please ensure the booking ID is correct and the booking has been accepted with an assigned transporter/driver.',
            [{ text: 'OK' }]
          );
          setLoadingBooking(false);
          return;
        }
        
        // Verify the booking is accepted/confirmed/assigned
        const bookingStatus = (found.status || '').toLowerCase();
        const acceptedStatuses = ['accepted', 'confirmed', 'assigned', 'picked_up', 'in_transit'];
        if (!acceptedStatuses.includes(bookingStatus)) {
          Alert.alert(
            'Booking Not Eligible',
            'This booking is not eligible for dispute. Only accepted bookings with assigned transporters/drivers can have disputes.',
            [{ text: 'OK' }]
          );
          setLoadingBooking(false);
          return;
        }
        
        setBooking(found);
      } catch (error) {
        console.error('Error loading booking by ID:', error);
        Alert.alert('Error', 'Failed to load booking. Please check the booking ID and try again.');
        setLoadingBooking(false);
        return;
      } finally {
        setLoadingBooking(false);
      }
    }

    // Get transporterId from booking - accepted bookings should already have this
    // Priority order for company drivers (use driverId from enriched data):
    // 1. assignedDriver.driverId (Firestore document ID - preferred for company drivers)
    // 2. assignedDriver.id (fallback)
    // 3. transporter.id or transporterId (for individual transporters or userId)
    // 4. driver.id or driverId (fallback)
    // 5. vehicle.assignedDriverId (if driver is assigned via vehicle)
    // Extract transporterId - for company drivers, use the driverId from assignedDriver
    // The backend can accept either userId (transporterId) or driverId (Firestore document ID)
    // unifiedBookingService sets assignedDriver.id = d.id || d.driverId, so id should have the driverId
    let transporterId = 
      // For company drivers - assignedDriver.id contains the driverId (d.id || d.driverId)
      (booking?.assignedDriver?.id || booking?.assignedDriver?.driverId) ||
      // For individual transporters
      (booking?.transporter?.id || booking?.transporterId) ||
      // Fallback driver fields
      (booking?.driver?.id || booking?.driver?.driverId || booking?.driverId) ||
      // Vehicle-assigned driver
      (booking?.vehicle?.assignedDriverId || booking?.vehicle?.driverId) ||
      // Company ID (last resort - not ideal but better than nothing)
      booking?.company?.id;
    
    // If we still don't have a transporterId but have transporterId (userId), use it
    // The backend should be able to resolve the driver from userId
    if (!transporterId && booking?.transporterId) {
      transporterId = booking.transporterId;
    }
    
    // Log the booking structure for debugging
    console.log('🔍 [CreateDispute] Booking structure:', {
      hasBooking: !!booking,
      bookingId: booking?.id || booking?.bookingId,
      transporter: booking?.transporter,
      transporterId: booking?.transporterId,
      assignedDriver: booking?.assignedDriver,
      driverId: booking?.driverId,
      driver: booking?.driver,
      vehicle: booking?.vehicle,
      company: booking?.company,
      extractedTransporterId: transporterId,
    });
    
    if (!transporterId) {
      console.error('❌ [CreateDispute] No transporter/driver ID found in booking:', booking);
      Alert.alert(
        'Booking Not Eligible',
        'This booking does not have an assigned transporter or driver. Disputes can only be created for accepted bookings with assigned transporters/drivers.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log('✅ [CreateDispute] Using transporterId:', transporterId);

    try {
      setLoading(true);
      
      // Upload attachments if any and convert to evidence URLs
      // TODO: Upload images to backend storage and get URLs
      // For now, we'll use the URIs directly (they should be uploaded first)
      const evidenceUrls = attachments.map(att => att.uri);

      // Get the actual booking ID (not readableId) for the backend
      // Backend expects the Firestore document ID, not the readableId
      const actualBookingId = booking?.id || booking?.bookingId || finalBookingId;
      
      const disputeData = {
        bookingId: actualBookingId, // Use actual ID, not readableId
        transporterId,
        reason: reason.trim(), // Backend uses 'reason'
        priority,
        evidence: evidenceUrls, // Backend uses 'evidence' array
      };

      console.log('📤 [CreateDispute] Submitting dispute:', {
        bookingId: actualBookingId,
        transporterId,
        reason: reason.trim().substring(0, 50) + '...',
        priority,
      });

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
      console.error('❌ [CreateDispute] Error creating dispute:', error);
      const errorMessage = error.message || 'Failed to submit dispute. Please try again.';
      
      // Provide more specific error messages
      if (errorMessage.includes('502') || errorMessage.includes('Bad Gateway')) {
        Alert.alert(
          'Service Unavailable',
          'The server is temporarily unavailable. Please try again in a few moments. If the problem persists, contact support.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('driver') || errorMessage.includes('transporter') || errorMessage.includes('not found')) {
        Alert.alert(
          'Driver/Transporter Not Found',
          'The driver or transporter associated with this booking could not be found. Please ensure the booking has a valid assigned driver or transporter. If the issue persists, contact support.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark || colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {edit ? 'Update Dispute' : 'Create Dispute'}
            </Text>
            <Text style={styles.headerSubtitle}>Submit a new dispute for review</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Booking Selection - Show if bookingId not provided */}
        {!bookingId && !booking && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Select Booking</Text>
            </View>
            <View style={styles.warningCard}>
              <MaterialCommunityIcons name="alert-circle" size={24} color={colors.warning} />
              <Text style={styles.warningText}>
                Disputes can only be created for accepted bookings with assigned transporters/drivers. Please select an accepted booking below or enter a booking ID manually.
              </Text>
            </View>
            
            {/* Manual Booking ID Entry */}
            <View style={styles.manualEntryContainer}>
              <Text style={styles.manualEntryLabel}>Or enter Booking ID manually:</Text>
              <TextInput
                style={styles.manualEntryInput}
                value={manualBookingId}
                onChangeText={setManualBookingId}
                placeholder="Enter booking ID"
                placeholderTextColor={colors.text.light}
                autoCapitalize="none"
              />
            </View>

            {/* Booking Selector */}
            {showBookingSelector && (
              <View style={styles.bookingSelectorContainer}>
                <Text style={styles.selectorTitle}>Select from recent bookings:</Text>
                {loadingBooking ? (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
                ) : availableBookings.length > 0 ? (
                  <View style={styles.bookingList}>
                    {availableBookings.map((b: any) => (
                      <TouchableOpacity
                        key={b.id || b.bookingId}
                        style={styles.bookingOption}
                        onPress={() => {
                          setBooking(b);
                          // Store the actual ID for submission, but also allow readableId for display
                          setManualBookingId(b.id || b.bookingId || b.readableId || '');
                          setShowBookingSelector(false);
                        }}
                      >
                        <MaterialCommunityIcons name="file-document" size={18} color={colors.primary} />
                        <View style={styles.bookingOptionContent}>
                          <Text style={styles.bookingOptionId}>
                            {getDisplayBookingId(b)}
                          </Text>
                          {b.fromLocation && b.toLocation && (
                            <Text style={styles.bookingOptionRoute} numberOfLines={1}>
                              {b.fromLocation.address || 'N/A'} → {b.toLocation.address || 'N/A'}
                            </Text>
                          )}
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text.secondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noBookingsText}>No eligible bookings found</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Booking Information */}
        {booking && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Booking Information</Text>
            </View>
            <LinearGradient
              colors={[colors.background, colors.white]}
              style={styles.bookingCard}
            >
              <View style={styles.bookingIdRow}>
                <MaterialCommunityIcons name="file-document" size={18} color={colors.primary} />
                <Text style={styles.bookingId}>
                  {getDisplayBookingId(booking)}
                </Text>
              </View>
              {booking.fromLocation && (
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={colors.secondary} />
                  <Text style={styles.bookingRoute}>
                    From: {booking.fromLocation.address || 'N/A'}
                  </Text>
                </View>
              )}
              {booking.toLocation && (
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.success} />
                  <Text style={styles.bookingRoute}>
                    To: {booking.toLocation.address || 'N/A'}
                  </Text>
                </View>
              )}
              {/* Show assigned driver or transporter */}
              {(booking.assignedDriver || booking.driver || booking.transporter) && (
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons 
                    name={booking.assignedDriver || booking.driver ? "account-circle" : "truck-delivery"} 
                    size={16} 
                    color={colors.primary} 
                  />
                  <Text style={styles.bookingRoute}>
                    {(booking.assignedDriver || booking.driver) ? 'Driver' : 'Transporter'}: {
                      booking.assignedDriver?.name || 
                      booking.driver?.name || 
                      booking.transporter?.name || 
                      booking.transporter?.companyName || 
                      'N/A'
                    }
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Reason (Backend uses 'reason' not 'issue'/'description') */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="alert-circle" size={20} color={colors.warning} />
            <Text style={styles.sectionTitle}>Reason for Dispute *</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={reason}
            onChangeText={setReason}
            placeholder="Describe the issue or reason for this dispute in detail..."
            placeholderTextColor={colors.text.light}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="flag" size={20} color={colors.error} />
            <Text style={styles.sectionTitle}>Priority Level</Text>
          </View>
          <View style={styles.priorityContainer}>
            {PRIORITIES.map((pri) => (
              <TouchableOpacity
                key={pri.value}
                style={[
                  styles.priorityCard,
                  priority === pri.value && { 
                    backgroundColor: pri.color + '15', 
                    borderColor: pri.color,
                    borderWidth: 2,
                    shadowColor: pri.color,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 4,
                  },
                ]}
                onPress={() => setPriority(pri.value)}
                activeOpacity={0.7}
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
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="camera" size={20} color={colors.secondary} />
            <Text style={styles.sectionTitle}>Attachments (Optional)</Text>
          </View>
          <TouchableOpacity 
            style={styles.addAttachmentButton} 
            onPress={pickImage}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[colors.background, colors.white]}
              style={styles.addAttachmentGradient}
            >
              <MaterialCommunityIcons name="camera-plus" size={28} color={colors.primary} />
              <Text style={styles.addAttachmentText}>Add Photos</Text>
              <Text style={styles.addAttachmentSubtext}>Upload evidence or supporting documents</Text>
            </LinearGradient>
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
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark || colors.primary]}
            style={styles.submitButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
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
          </LinearGradient>
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
  headerGradient: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fonts.size.xl,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.white,
    padding: spacing.md,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  bookingCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  bookingIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  bookingId: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  bookingRoute: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    borderWidth: 2,
    borderColor: colors.border + '60',
  },
  textArea: {
    minHeight: 140,
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
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.xs,
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
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border + '60',
    borderStyle: 'dashed',
  },
  addAttachmentGradient: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addAttachmentText: {
    fontSize: fonts.size.md,
    color: colors.primary,
    fontFamily: fonts.family.bold,
    marginTop: spacing.xs,
  },
  addAttachmentSubtext: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    textAlign: 'center',
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
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.lg,
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
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '15',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning + '40',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    lineHeight: 20,
  },
  manualEntryContainer: {
    marginTop: spacing.md,
  },
  manualEntryLabel: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  manualEntryInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
  },
  bookingSelectorContainer: {
    marginTop: spacing.md,
  },
  selectorTitle: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  loader: {
    marginVertical: spacing.md,
  },
  bookingList: {
    gap: spacing.xs,
  },
  bookingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border + '40',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  bookingOptionContent: {
    flex: 1,
  },
  bookingOptionId: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  bookingOptionRoute: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  noBookingsText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    padding: spacing.md,
    fontStyle: 'italic',
  },
});

export default CreateDisputeScreen;

