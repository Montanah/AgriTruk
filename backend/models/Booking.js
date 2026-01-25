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
      createdAt: bookingData.createdAt || admin.firestore.Timestamp.now(),
      acceptedAt: bookingData.acceptedAt || null,
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
      // Optional linkage fields for broker workflows (safe, backward-compatible)
      brokerData: bookingData.brokerData || null,
      clientId: bookingData.clientId || (bookingData.brokerData && bookingData.brokerData.clientId) || null,
      statusHistory: bookingData.statusHistory || [{
        status: bookingData.status || 'pending',
        timestamp: admin.firestore.Timestamp.now(),
        reason: null,
      }],
      estimatedCostRange: bookingData.estimatedCostRange || {
        min: 0,
        max: 0,
        display: 'Ksh 0 -0'
      }
    };
    await db.collection('bookings').doc(booking.bookingId).set(booking);
    return booking;
  },

  async get(bookingId) {
    const doc = await db.collection('bookings').doc(bookingId).get();
    if (!doc.exists) return null;
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

  // Broker-scoped fetch: bookings created by broker user OR for broker's clients
  async getBrokerScoped(brokerUserId, clientIds = []) {
    const results = [];
    const seen = new Set();

    // 1) Bookings created by broker as user
    const byUser = await db.collection('bookings').where('userId', '==', brokerUserId).get();
    byUser.docs.forEach(doc => { const d = { id: doc.id, ...doc.data() }; if (!seen.has(d.bookingId)) { seen.add(d.bookingId); results.push(d); } });

    // 2) Bookings attributed via brokerData.brokerId
    try {
      const byBroker = await db.collection('bookings').where('brokerData.brokerId', '==', brokerUserId).get();
      byBroker.docs.forEach(doc => { const d = { id: doc.id, ...doc.data() }; if (!seen.has(d.bookingId)) { seen.add(d.bookingId); results.push(d); } });
    } catch (_) { }

    // 3) Bookings for each clientId (Firestore limitation: no array-of-values query on nested without index; do sequentially)
    for (const cid of clientIds) {
      try {
        const byClient = await db.collection('bookings').where('brokerData.clientId', '==', cid).get();
        byClient.docs.forEach(doc => { const d = { id: doc.id, ...doc.data() }; if (!seen.has(d.bookingId)) { seen.add(d.bookingId); results.push(d); } });
      } catch (_) { }
      // Also support legacy top-level clientId
      try {
        const byClientLegacy = await db.collection('bookings').where('clientId', '==', cid).get();
        byClientLegacy.docs.forEach(doc => { const d = { id: doc.id, ...doc.data() }; if (!seen.has(d.bookingId)) { seen.add(d.bookingId); results.push(d); } });
      } catch (_) { }
    }

    return results;
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

  async getByTransporterId(transporterId) {
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
  },

  async cancel(bookingId, reason, userId) {
    try {
      await db.collection('bookings').doc(bookingId).update({
        status: 'cancelled',
        cancelledAt: admin.firestore.Timestamp.now(),
        cancellationReason: 'No reason provided' || reason,
        cancelledBy: userId,
        statusHistory: admin.firestore.FieldValue.arrayUnion({ status: 'cancelled', timestamp: admin.firestore.Timestamp.now(), reason: 'No reason provided' || reason, cancelledBy: userId })
      });
      return true;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return false;
    }
  },

  async startBooking(bookingId) {
    const updates = {
      status: 'in_progress',
      startedAt: admin.firestore.Timestamp.now()
    };
    await db.collection('bookings').doc(bookingId).update(updates);
    return updates;
  },

  async completeBooking(bookingId) {
    const updates = {
      status: 'completed',
      completedAt: admin.firestore.Timestamp.now()
    };
    await db.collection('bookings').doc(bookingId).update(updates);
    const booking = await this.get(bookingId);
    // Update transporter total trips
    await db.collection('companies').doc(booking.companyId).update({
      completedTripsCount: admin.firestore.FieldValue.increment(1)
    });
    
    return updates;
  },

   async countCompletedTripsForCompany(companyId) {
    const snapshot = await db.collection('bookings').where('transporterId', '==', companyId).where('status', '==', 'completed').get();
    return snapshot.size;
  },
};

module.exports = Booking;