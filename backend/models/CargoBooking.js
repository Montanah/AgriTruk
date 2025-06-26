const admin = require('../config/firebase');
const db = admin.firestore();

const CargoBooking = {
  async create(bookingData) {
    const booking = {
      bookingId: bookingData.bookingId || db.collection('cargoBookings').doc().id,
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
      // Cargo-specific fields
      fromLocation: bookingData.fromLocation || null,
      toLocation: bookingData.toLocation || null,
      weightKg: bookingData.weightKg || null,
      cargoType: bookingData.cargoType || null,
      cargoValue: bookingData.cargoValue || null,
      specialRequest: bookingData.specialRequest || null,
      special: bookingData.special || false,
    };
    await db.collection('cargoBookings').doc(booking.bookingId).set(booking);
    return booking;
  },
  async get(bookingId) {
    const doc = await db.collection('cargoBookings').doc(bookingId).get();
    if (!doc.exists) throw new Error('CargoBooking not found');
    return doc.data();
  },
  async update(bookingId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('cargoBookings').doc(bookingId).update(updated);
    return updated;
  },
  async acceptBooking(bookingId, transporterId, vehicleId) {
    const updates = {
      transporterId,
      vehicleId,
      status: 'accepted',
      acceptedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('cargoBookings').doc(bookingId).update(updates);
    return updates;
  },
  async startBooking(bookingId) {
    const updates = {
      status: 'in_progress',
      startedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('cargoBookings').doc(bookingId).update(updates);
    return updates;
  },
  async completeBooking(bookingId) {
    const updates = {
      status: 'completed',
      completedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('cargoBookings').doc(bookingId).update(updates);
    return updates;
  },
  async cancelBooking(bookingId, reason) {
    const updates = {
      status: 'cancelled',
      cancelledAt: admin.firestore.Timestamp.now(),
      cancellationReason: reason,
    };
    await db.collection('cargoBookings').doc(bookingId).update(updates);
    return updates;
  },
  async getAllBookings() {
    const snapshot = await db.collection('cargoBookings').get();
    if (snapshot.empty) return [];
    return snapshot.docs.map((doc) => ({ bookingId: doc.id, ...doc.data() }));
  },
};

module.exports = CargoBooking;
