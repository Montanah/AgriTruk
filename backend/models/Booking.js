const admin = require("../config/firebase");
const { getAll } = require("./Transporter");
const db = admin.firestore(); 

const Booking = {
  async create(bookingData) {
  const booking = {
    bookingId: bookingData.bookingId || db.collection('bookings').doc().id,
    requestId: bookingData.requestId,
    bookingType: bookingData.bookingType,
    bookingMode: bookingData.bookingMode || 'instant',
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
    fromLocation: bookingData.fromLocation || null,
    toLocation: bookingData.toLocation || null,
    productType: bookingData.productType || null,
    weightKg: bookingData.weightKg || null,
    urgencyLevel: bookingData.urgencyLevel || 'Low',
    perishable: bookingData.perishable || false,
    needsRefrigeration: bookingData.needsRefrigeration || false,
    humidyControl: bookingData.humidyControl || false,
    insured: bookingData.insured || false,
    value: bookingData.value || null,
    priority: bookingData.priority || false,
    recurrence: bookingData.recurrence || {
      isRecurring: false,
      frequency: null,
      timeFrame: null,
      duration: null,
      startDate: null,
      endDate: null,
      interval: null,
      occurences: null,
       baseBookingId: null
    },
    pickUpDate: bookingData.pickUpDate || null,
    specialCargo: bookingData.specialCargo || [], 
    consolidated: bookingData.consolidated || false,
    matchedTransporterId: bookingData.matchedTransporterId || null,
    additionalNotes: bookingData.additionalNotes || null,
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
  },

  async getAll() {
    const snapshot = await db.collection('bookings').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getBookingForUser(userId) {
    const snapshot = await db.collection('bookings').where('userId', '==', userId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getBookingsForTransporter(transporterId) {
    const snapshot = await db.collection('bookings').where('transporterId', '==', transporterId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
};

module.exports = Booking;