const admin = require("../config/firebase");
const db = admin.firestore();

const AgriBooking = {
  async create(bookingData) {
    const booking = {
      bookingId: bookingData.bookingId || db.collection('agriBookings').doc().id,
      requestId: bookingData.requestId,
      userId: bookingData.userId,
      transporterId: bookingData.transporterId || null,
      vehicleId: bookingData.vehicleId || null,
      status: bookingData.status || 'pending',
      cost: bookingData.cost || 0,
      estimatedDuration: bookingData.estimatedDuration || '',
      actualDistance: bookingData.actualDistance || null,
      routePolyline: bookingData.routePolyline || null,
      fuelSurcharge: bookingData.fuelSurcharge || 0,
      waitTimeFee: bookingData.waitTimeFee || 0,
      acceptedAt: bookingData.acceptedAt || admin.firestore.Timestamp.now(),
      startedAt: bookingData.startedAt || null,
      completedAt: bookingData.completedAt || null,
      cancelledAt: bookingData.cancelledAt || null,
      cancellationReason: bookingData.cancellationReason || null,
      // Agri-specific fields
      fromLocation: bookingData.fromLocation || null,
      toLocation: bookingData.toLocation || null,
      weightKg: bookingData.weightKg || null,
      productType: bookingData.productType || null,
      specialRequest: bookingData.specialRequest || null,
      perishable: bookingData.perishable || false,
      needsRefrigeration: bookingData.needsRefrigeration || false,
      urgentDelivery: bookingData.urgentDelivery || false
    };
    await db.collection('agriBookings').doc(booking.bookingId).set(booking);
    return booking;
  },
  async get(bookingId) {
    const doc = await db.collection('agriBookings').doc(bookingId).get();
    if (!doc.exists) throw new Error('AgriBooking not found');
    return doc.data();
  },
  async update(bookingId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('agriBookings').doc(bookingId).update(updated);
    return updated;
  },
   async acceptBooking(bookingId, transporterId, vehicleId) {
    const updates = {
      transporterId,
      vehicleId,
      status: 'accepted',
      acceptedAt: admin.firestore.Timestamp.now()
    };
    await db.collection('agriBookings').doc(bookingId).update(updates);
    return updates;
  },
    async startBooking(bookingId) {
        const updates = {
        status: 'in_progress',
        startedAt: admin.firestore.Timestamp.now()
        };
        await db.collection('agriBookings').doc(bookingId).update(updates);
        return updates;
    },
    async completeBooking(bookingId) {
        const updates = {
        status: 'completed',
        completedAt: admin.firestore.Timestamp.now()
        };
        await db.collection('agriBookings').doc(bookingId).update(updates);
        return updates;
    },
    async cancelBooking(bookingId, cancellationReason) {
        const updates = {
            status: 'cancelled',
            cancelledAt: admin.firestore.Timestamp.now(),
            cancellationReason: cancellationReason || 'No reason provided'
        };
        await db.collection('agriBookings').doc(bookingId).update(updates);
        return updates;
    },
    async getAllBookings(userId) {
        const query = db.collection('agriBookings').where('userId', '==', userId);
        const snapshot = await query.get();
        if (snapshot.empty) return [];
        
        const bookings = [];
        snapshot.forEach(doc => {
            bookings.push({ bookingId: doc.id, ...doc.data() });
        });
        return bookings;
    }
};

module.exports = AgriBooking;