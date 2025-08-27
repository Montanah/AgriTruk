const admin = require("../config/firebase");
const db = admin.firestore();

const AgriBooking = {
  async create(bookingData) {
    const booking = {
      bookingId: bookingData.bookingId || db.collection('agriBookings').doc().id,
      requestId: bookingData.requestId,
      bookingType: bookingData.bookingType || 'instant' || 'booking',
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
      consolidated: bookingData.consolidated || false, // Flag for consolidated requests
      matchedTransporterId: bookingData.matchedTransporterId || null,
      additionalNotes: bookingData.additionalNotes || null,
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
        const booking = await this.get(bookingId);
        // Update transporter total trips
        await db.collection('transporters').doc(booking.transporterId).update({
          totalTrips: admin.firestore.FieldValue.increment(1)
        });
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
    async getByUserId(userId) {
        if (!userId) throw new Error('User ID is required to fetch bookings');
        const query = db.collection('agriBookings').where('userId', '==', userId);
        const snapshot = await query.get();
        if (snapshot.empty) return [];
        
        const bookings = [];
        snapshot.forEach(doc => {
            bookings.push({ bookingId: doc.id, ...doc.data() });
        });
        return bookings;
    },
    async getAllTransporterBookings(transporterId) {
        if (!transporterId) throw new Error('Transporter ID is required to fetch bookings');
        const query = db.collection('agriBookings').where('transporterId', '==', transporterId);
        const snapshot = await query.get();
        if (snapshot.empty) return [];
        
        const bookings = [];
        snapshot.forEach(doc => {
            bookings.push({ bookingId: doc.id, ...doc.data() });
        });
        return bookings;
    },
    async getAllBookings() {
        const snapshot = await db.collection('agriBookings').get();
        if (snapshot.empty) return [];
        
        const bookings = [];
        snapshot.forEach(doc => {
            bookings.push({ bookingId: doc.id, ...doc.data() });
        });
        return bookings;
    },
    async rejectBooking(bookingId, reason) {
        const updates = {
            status: 'rejected',
            rejectedAt: admin.firestore.Timestamp.now(),
            rejectionReason: reason || 'No reason provided'
        };
        await db.collection('agriBookings').doc(bookingId).update(updates);
        return updates;
    },
    async getPendingBookings() {
    const snapshot = await db
      .collection('agriBookings')
      .where('status', '==', 'pending')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
};

module.exports = AgriBooking;