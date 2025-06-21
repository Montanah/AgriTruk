const admin = require("../config/firebase");
const db = admin.firestore(); 

// BOOKINGS Model
const Booking = {
  async create(bookingData) {
    const booking = {
      bookingId: bookingData.bookingId || db.collection('bookings').doc().id,
      requestId: bookingData.requestId,
      transporterId: bookingData.transporterId,
      vehicleId: bookingData.vehicleId,
      status: bookingData.status || 'confirmed',
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
      cancellationReason: bookingData.cancellationReason || null
    };
    await db.collection('bookings').doc(booking.bookingId).set(booking);
    return booking;
  },
  async get(bookingId) {
    const doc = await db.collection('bookings').doc(bookingId).get();
    if (!doc.exists) throw new Error('Booking not found');
    return doc.data();
  },
  async update(bookingId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('bookings').doc(bookingId).update(updated);
    return updated;
  }
};

module.exports = Booking;