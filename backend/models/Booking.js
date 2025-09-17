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
    vehicleType: bookingData.vehicleType || null,
    status: bookingData.status || 'pending',
    cost: bookingData.cost || 0,
    costBreakdown: bookingData.costBreakdown || { 
      baseFare: 0,
      distanceCost: 0,
      weightCost: 0,
      urgencySurcharge: 0,
      perishableSurcharge: 0,
      refrigerationSurcharge: 0,
      humiditySurcharge: 0,
      insuranceFee: 0,
      priorityFee: 0,
      waitTimeFee: 0,
      tollFee: 0,
      nightSurcharge: 0,
      fuelSurcharge: 0,
    },
    estimatedDuration: bookingData.estimatedDuration || '',
    actualDistance: bookingData.actualDistance || null,
    routePolyline: bookingData.routePolyline || null,
    fuelSurchargePct: bookingData.fuelSurchargePct || 0,
    waitMinutes: bookingData.waitMinutes || 0,
    tolls: bookingData.tolls || 0, 
    nightSurcharge: bookingData.nightSurcharge || false,
    acceptedAt: bookingData.acceptedAt || admin.firestore.Timestamp.now(),
    startedAt: bookingData.startedAt || null,
    completedAt: bookingData.completedAt || null,
    cancelledAt: bookingData.cancelledAt || null,
    cancellationReason: bookingData.cancellationReason || null,
    fromLocation: bookingData.fromLocation || null,
    toLocation: bookingData.toLocation || null,
    productType: bookingData.productType || null,
    weightKg: bookingData.weightKg || null,
    volumetricWeight: bookingData.volumetricWeight || null,
    lengthCm: bookingData.lengthCm || 0,
    widthCm: bookingData.widthCm || 0,
    heightCm: bookingData.heightCm || 0,
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
      occurences: [],
      baseBookingId: null
    },
    pickUpDate: bookingData.pickUpDate || null,
    specialCargo: bookingData.specialCargo || [], 
    consolidated: bookingData.consolidated || false,
    matchedTransporterId: bookingData.matchedTransporterId || null,
    additionalNotes: bookingData.additionalNotes || null,
    statusHistory: bookingData.statusHistory || [{ 
      status: bookingData.status || 'pending',
      timestamp: admin.firestore.Timestamp.now(),
      reason: null,
    }],
  };
  await db.collection('bookings').doc(booking.bookingId).set(booking);
  return booking;
},

  async get(bookingId) {
    const doc = await db.collection('bookings').doc(bookingId).get();
    if (!doc.exists) return [];
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
  async getAllAvailable() {
    const snapshot = await db.collection('bookings').where('status', '==', 'pending').where('transporterId', '==', null).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getOnmyway() {
    const snapshot = await db.collection('bookings').where('toLocation', '==', 'onmyway').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getActiveBookings() {
    try {
      const snapshot = await db.collection('bookings')
        .where('status', 'in', ['pending', 'accepted', 'in-progress', 'picked-up'])
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting active bookings:', error);
      return [];
    }
  },

  async getByTransporterId (transporterId) {
    try {
      const snapshot = await db.collection('bookings')
        .where('transporterId', '==', transporterId)
        .where('status', 'in', ['pending', 'accepted', 'in-progress', 'picked-up'])
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
      console.error('Error getting booking by transporter:', error);
      return null;
    }
  }
};

module.exports = Booking;