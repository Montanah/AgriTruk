const admin = require('../config/firebase');
const cron = require('node-cron');
const { RRule } = require('rrule');

async function scheduleRecurringBookings(baseBookingId, recurrenceData) {
  try {
    const baseBookingRef = admin.firestore().collection('bookings').doc(baseBookingId);
    const baseBookingDoc = await baseBookingRef.get();
    
    if (!baseBookingDoc.exists) {
      throw new Error('Base booking not found');
    }

    const baseBooking = baseBookingDoc.data();
    const startDate = baseBooking.recurrence.startDate.toDate();
    const endDate = baseBooking.recurrence.endDate.toDate();

    // Generate recurrence dates
    const dates = generateRecurrenceDates(startDate, endDate, recurrenceData);
    
    // Create child bookings
    const batch = admin.firestore().batch();
    const childBookings = [];

    for (const date of dates) {
      const childBookingId = admin.firestore().collection('bookings').doc().id;
      const childBookingRef = admin.firestore().collection('bookings').doc(childBookingId);
      
      const childBooking = {
        ...baseBooking,
        bookingId: childBookingId,
        baseBookingId: baseBookingId,
        isRecurrenceInstance: true,
        pickUpDate: admin.firestore.Timestamp.fromDate(date),
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      delete childBooking.recurrence;
      delete childBooking.isRecurring;

      batch.set(childBookingRef, childBooking);
      childBookings.push(childBookingId);
    }

    batch.update(baseBookingRef, {
      'recurrence.childBookings': childBookings,
      'recurrence.totalOccurrences': dates.length
    });

    await batch.commit();
    
    console.log(`Created ${dates.length} recurring bookings for base booking ${baseBookingId}`);
    return childBookings;

  } catch (error) {
    console.error('Error scheduling recurring bookings:', error);
    throw error;
  }
}

function generateRecurrenceDates(startDate, endDate, recurrenceData) {
  const { frequency, interval, timeFrame } = recurrenceData;
  
  let rruleFrequency;
  switch (frequency) {
    case 'daily':
      rruleFrequency = RRule.DAILY;
      break;
    case 'weekly':
      rruleFrequency = RRule.WEEKLY;
      break;
    case 'monthly':
      rruleFrequency = RRule.MONTHLY;
      break;
    default:
      throw new Error('Invalid frequency');
  }

  const rule = new RRule({
    freq: rruleFrequency,
    interval: parseInt(interval) || 1,
    dtstart: startDate,
    until: endDate
  });

  return rule.all();
}

module.exports = { scheduleRecurringBookings };