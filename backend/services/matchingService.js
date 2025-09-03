const admin = require("../config/firebase");
const db = admin.firestore();
const Transporter = require('../models/Transporter');
const AgriBooking = require('../models/AgriBooking');
const CargoBooking = require('../models/CargoBooking');
const Request = require('../models/Request');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');
const { haversineDistance, calculateDistance } = require('../utils/geoUtils');
const Booking = require("../models/Booking");

class MatchingService {

  static async getActiveSubscribedTransporters() {
    try {
      // Get all active subscribers
      const activeSubscribersSnapshot = await db.collection('subscribers')
        .where('status', '==', 'active')
        .where('isActive', '==', true)
        .where('endDate', '>=', admin.firestore.Timestamp.now())
        .get();
  
      if (activeSubscribersSnapshot.empty) {
        console.log('No active subscribers found');
        return [];
      }
  
      // Extract userIds
      const activeUserIds = activeSubscribersSnapshot.docs.map(doc => doc.data().userId);
      console.log('Active subscriber userIds:', activeUserIds);
  
      // Handle Firestore "in" limitation (max 10 items per query)
      let activeTransporters = [];
      const chunkSize = 10;
      for (let i = 0; i < activeUserIds.length; i += chunkSize) {
        const chunk = activeUserIds.slice(i, i + chunkSize);
        const activeTransportersSnapshot = await db.collection('transporters')
          .where('userId', 'in', chunk)
          .where('status', '==', 'approved')
          .where('acceptingBooking', '==', true)
          .get();
  
        activeTransporters = activeTransporters.concat(
          activeTransportersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        );
      }
  
      console.log('Active subscribed transporters:', activeTransporters);
      return activeTransporters;
  
    } catch (error) {
      console.error('Error fetching active subscribed transporters:', error);
      throw error;
    }
  }

  static async matchBooking(bookingId) {
    const booking = await Booking.get(bookingId);
    console.log('Matching booking:', booking);

    if (booking.status !== 'pending') return null;

    const activeTransporters = await MatchingService.getActiveSubscribedTransporters();
    let suitableTransporters = [];

    // activeTransporters is already an array of transporter objects
    for (const transporter of activeTransporters) {
      const weightKg = booking.weightKg || 0; 
      if (!transporter.vehicleCapacity || transporter.vehicleCapacity < weightKg * 2) continue;

      const lastLocation = transporter.lastKnownLocation;
      const fromLocation = booking.fromLocation || booking.pickUpLocation;
      console.log('lastLocation', lastLocation, 'fromLocation', fromLocation);

      if (lastLocation && fromLocation) {
        const distance = calculateDistance(lastLocation, fromLocation);
        if (distance > 50) continue;
      }

      const needsRefrigeration = booking.needsRefrigeration || booking.requiresRefrigeration || false;
      if (needsRefrigeration && !transporter.refrigerated) continue;
      if (booking.urgentDelivery && !transporter.vehicleType?.includes('urgent')) continue;

      suitableTransporters.push(transporter);
    }

    suitableTransporters.sort((a, b) => b.rating - a.rating || b.vehicleCapacity - a.vehicleCapacity);

    if (suitableTransporters.length > 0) {
      const matchedTransporter = suitableTransporters[0];
      let updateData = {
        matchedTransporterId: matchedTransporter.transporterId,
        status: 'matched',
      };
      await Booking.update(bookingId, updateData);
      
      // await this.notifyMatch(booking, matchedTransporter, booking.bookingType);
      return matchedTransporter;
    }
    return null;
  }

  static async matchConsolidatedBookings(bookingIds, bookingType) {
    if (!Array.isArray(bookingIds) || bookingIds.length < 2) {
      throw new Error('At least two booking IDs are required for consolidation');
    }

    let bookings;
    
    bookings = await Promise.all(bookingIds.map(id => Booking.get(id)));
    
    const totalWeight = bookings.reduce((sum, b) => sum + (b.weightKg || 0), 0);

    const consolidatedBooking = {
      bookingId: db.collection('bookings').doc().id, 
      requestId: `${bookings.map(b => b.requestId).join('_')}`,
      bookingType: 'consolidated',
      userId: bookings[0].userId, // Assuming same user or broker
      fromLocation: bookings[0].fromLocation || bookings[0].pickUpLocation, // Handle variation
      toLocation: bookings[bookings.length - 1].toLocation || bookings[bookings.length - 1].dropOffLocation, // Handle variation
      weightKg: totalWeight,
      status: 'pending',
      consolidated: true,
      pickUpDate: bookings[0].pickUpDate,
    };
    const newBooking = await Booking.create(consolidatedBooking); 
    const matchedTransporter = await this.matchBooking(newBooking.bookingId, 'agri');
    return { newBooking, matchedTransporter };
  }

  static async notifyMatch(booking, transporter, bookingType) {
    const notificationData = {
      userId: booking.userId,
      userType: 'user', // Adjust if broker-initiated
      type: 'booking_matched',
      message: `Your ${bookingType} booking ${booking.bookingId} has been matched with transporter ${transporter.transporterId}.`,
    };
    await Notification.create(notificationData);
    if (transporter.notificationPreferences?.method === 'email' || transporter.notificationPreferences?.method === 'both') {
      await sendEmail(transporter.email, 'Booking Matched', notificationData.message);
    }
    const transporterNotification = {
      userId: transporter.transporterId,
      userType: 'transporter',
      type: 'new_match',
      message: `You have been matched with ${bookingType} booking ${booking.bookingId} from ${booking.fromLocation || booking.pickUpLocation} to ${booking.toLocation || booking.dropOffLocation}.`,
    };
    await Notification.create(transporterNotification);
    if (transporter.notificationPreferences?.method === 'email' || transporter.notificationPreferences?.method === 'both') {
      await sendEmail(transporter.email, 'New Match', transporterNotification.message);
    }
  }

  static async getAvailableBookingsForTransporter(transporterId) {
    const transporter = await Transporter.get(transporterId);
    const agriBookings = await AgriBooking.getPendingBookings();
    const cargoBookings = await CargoBooking.getPendingBookings();
    const requests = await Request.getPendingRequests();

    // Add type labels and merge
    const pendingBookings = [
      ...agriBookings.map(booking => ({ ...booking, type: 'agri' })),
      ...cargoBookings.map(booking => ({ ...booking, type: 'cargo' })),
      ...requests.map(booking => ({ ...booking, type: 'broker' }))
    ];

    return pendingBookings.filter(booking => {
      const fromLocation = booking.fromLocation || booking.pickUpLocation; // Handle variation
      const distance = fromLocation ? calculateDistance(
        transporter.lastKnownLocation,
        fromLocation
      ) : Infinity;
      const needsRefrigeration = booking.needsRefrigeration || booking.requiresRefrigeration || false; // Handle variation
      return distance <= 50 && transporter.vehicleCapacity >= (booking.weightKg || 0) * 2 &&
             (!needsRefrigeration || transporter.refrigerated);
    });
  }
}

module.exports = MatchingService;