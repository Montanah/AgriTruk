import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { apiRequest } from '../utils/api';

// Accepts either a single booking or an array of bookings (for consolidated)
const BookingConfirmationScreen = ({ route, navigation }: any) => {
  const params = route.params || {};
  const requests = params.requests || (params.booking ? [params.booking] : []);
  const isConsolidated = Array.isArray(requests) && requests.length > 1;
  const mode = params.mode || 'shipper'; // shipper, broker, business
  const [pickupDate, setPickupDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [posting, setPosting] = useState(false);

  // Handler for posting booking(s)
  const handlePostBooking = async () => {
    setPosting(true);
    try {
      // Prepare payload for backend booking format
      const payload = requests.map(req => {
        // Use backend booking format if available, otherwise convert from frontend format
        const bookingData = {
          bookingType: req.bookingType || (req.type === 'agriTRUK' ? 'Agri' : 'Cargo'),
          bookingMode: req.bookingMode || req.requestType || 'booking',
          fromLocation: req.fromLocation,
          toLocation: req.toLocation,
          productType: req.productType,
          weightKg: req.weightKg || parseFloat(req.weight) || 0,
          pickUpDate: pickupDate.toISOString(), // override with consolidated date
          urgencyLevel: req.urgencyLevel || (req.urgency ? req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1) : 'Low'),
          priority: req.priority || req.isPriority || false,
          perishable: req.perishable || req.isPerishable || false,
          needsRefrigeration: req.needsRefrigeration || req.isPerishable || false,
          humidyControl: req.humidyControl || req.isPerishable || false,
          specialCargo: req.specialCargo || (req.isSpecialCargo ? req.specialCargoSpecs : []),
          insured: req.insured || req.insureGoods || false,
          value: req.value || (req.insuranceValue ? parseFloat(req.insuranceValue) : 0),
          additionalNotes: req.additionalNotes || req.additional || '',
          recurrence: req.recurrence || {
            isRecurring: req.isRecurring || false,
            frequency: req.recurringFreq || null,
            timeFrame: req.recurringTimeframe || null,
            duration: req.recurringDuration || null,
            startDate: pickupDate.toISOString(),
            endDate: req.recurringEndDate || null,
            interval: 1,
            occurences: [],
            baseBookingId: null
          },
          status: 'pending',
        };
        return bookingData;
      });

      console.log('Posting booking to backend:', payload);

      // Post to backend bookings endpoint
      const response = await apiRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload[0]) // Backend expects single booking, not array
      });

      console.log('Booking posted successfully:', response);
      Alert.alert('Booking posted!', isConsolidated ? 'Your consolidated booking has been posted.' : 'Your booking has been posted.');
      navigation.goBack();
    } catch (error: any) {
      console.error('Failed to post booking:', error);
      Alert.alert('Error', `Failed to post booking: ${error.message}`);
    } finally {
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
            <Text style={styles.bookingDetail}>From: <Text style={{ fontWeight: 'bold' }}>{item.fromLocation}</Text></Text>
            <Text style={styles.bookingDetail}>To: <Text style={{ fontWeight: 'bold' }}>{item.toLocation}</Text></Text>
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
        <MaterialCommunityIcons name="check-circle" size={22} color={colors.white} style={{ marginRight: 8 }} />
        <Text style={styles.postBtnText}>{posting ? 'Posting...' : 'Confirm & Post Booking'}</Text>
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
